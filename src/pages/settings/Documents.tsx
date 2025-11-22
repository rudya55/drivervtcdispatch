import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { ensureDriverExists } from '@/lib/ensureDriver';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, FileText, Download, Trash2, Upload, CheckCircle2 } from 'lucide-react';

const documentCategories = [
  { id: 'identity', name: "Pièce d'identité", required: true },
  { id: 'vtc_card', name: 'Carte VTC', required: true },
  { id: 'kbis', name: 'K-bis', required: true },
  { id: 'driver_license', name: 'Permis de conduire', required: true },
  { id: 'insurance', name: "Attestation d'assurance", required: true },
  { id: 'rc_pro', name: 'RC Pro', required: true },
];

type DocumentFile = {
  name: string;
  path: string;
  url: string;
  created_at: string;
  category?: string;
};

const Documents = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);

  useEffect(() => {
    fetchDocuments();
  }, [driver]);

  const fetchDocuments = async () => {
    setLoading(true);
    console.log(`[${new Date().toISOString()}] Fetching documents`);

    try {
      // Ensure driver profile exists before fetching
      const { userId } = await ensureDriverExists();
      console.log(`[${new Date().toISOString()}] Using user ID for storage:`, userId);

      const { data, error } = await supabase.storage
        .from('driver-documents')
        .list(userId);

      if (error) {
        console.error('Fetch documents error:', error);
        // Don't throw if bucket doesn't exist yet
        if (error.message?.includes('not found')) {
          console.log('Documents bucket/folder not found yet, will be created on first upload');
          setDocuments([]);
          return;
        }
        throw error;
      }

      const docsWithUrls = data.map((file: any) => {
        const { data: { publicUrl } } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(`${userId}/${file.name}`);
        
        const category = file.name.split('_')[0];
        
        return {
          name: file.name,
          path: `${userId}/${file.name}`,
          url: publicUrl,
          created_at: file.created_at,
          category,
        };
      });

      setDocuments(docsWithUrls);
      console.log(`[${new Date().toISOString()}] Fetched ${docsWithUrls.length} documents`);
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] Fetch documents error:`, error);
      const errorMessage = [
        error.message,
        error.hint,
        error.code
      ].filter(Boolean).join(' - ');
      toast.error(errorMessage || 'Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(category);
    console.log(`[${new Date().toISOString()}] Uploading document for category:`, category);
    console.log(`[${new Date().toISOString()}] File details:`, {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
    });

    try {
      // Validation: file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 10 Mo)');
        setUploading(null);
        return;
      }

      // Validation: file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        toast.error('Format de fichier non supporté. Utilisez PDF, JPG ou PNG.');
        setUploading(null);
        return;
      }

      // Ensure driver profile exists before uploading
      const { userId } = await ensureDriverExists();
      console.log(`[${new Date().toISOString()}] Using user ID for storage:`, userId);

      const fileExt = file.name.split('.').pop();
      const fileName = `${category}_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      console.log(`[${new Date().toISOString()}] Uploading to path:`, filePath);
      
      const { error, data } = await supabase.storage
        .from('driver-documents')
        .upload(filePath, file);

      if (error) {
        console.error(`[${new Date().toISOString()}] ❌ Storage upload error:`, {
          message: error.message,
          error: error
        });
        throw error;
      }

      console.log(`[${new Date().toISOString()}] ✅ Document uploaded successfully:`, data);
      toast.success('Document téléchargé avec succès');
      fetchDocuments();
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] Upload error details:`, {
        message: error.message,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
      
      // Message spécifique pour les erreurs RLS
      if (error.message?.includes('policy') || error.message?.includes('permission') || error.message?.includes('RLS')) {
        toast.error('Erreur de permissions. Vérifiez que le script SQL a bien été exécuté dans Supabase.');
      } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        toast.error('Accès refusé. Vérifiez les permissions du bucket dans Supabase.');
      } else {
        const errorMessage = [
          error.message,
          error.hint,
          error.code
        ].filter(Boolean).join(' - ');
        toast.error(errorMessage || 'Erreur lors du téléchargement');
      }
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (path: string) => {
    console.log(`[${new Date().toISOString()}] Deleting document:`, path);

    try {
      // Ensure driver exists before deleting
      await ensureDriverExists();

      const { error } = await supabase.storage
        .from('driver-documents')
        .remove([path]);

      if (error) throw error;

      console.log(`[${new Date().toISOString()}] ✅ Document deleted successfully`);
      toast.success('Document supprimé');
      fetchDocuments();
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] Delete error:`, error);
      const errorMessage = [
        error.message,
        error.hint,
        error.code
      ].filter(Boolean).join(' - ');
      toast.error(errorMessage || 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Documents" unreadCount={unreadCount} />

      <div className="max-w-lg mx-auto p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        {/* Progress Bar for Required Documents */}
        {(() => {
          const uploadedRequiredCount = documentCategories
            .filter(cat => cat.required)
            .filter(cat => documents.some(doc => doc.category === cat.id))
            .length;
          const totalRequired = documentCategories.filter(cat => cat.required).length;
          const progressPercentage = (uploadedRequiredCount / totalRequired) * 100;

          return (
            <Card className="p-4 mb-4 bg-accent/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Documents obligatoires
                </span>
                <span className="text-sm font-semibold text-primary">
                  {uploadedRequiredCount} / {totalRequired}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </Card>
          );
        })()}

        <div className="space-y-4">
          {documentCategories.map((category) => {
            const categoryDocs = documents.filter(doc => doc.category === category.id);
            const hasDocument = categoryDocs.length > 0;

            return (
              <Card key={category.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{category.name}</h3>
                    {category.required && (
                      <span className="text-xs text-destructive">*</span>
                    )}
                    {hasDocument && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 rounded-full border border-green-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Téléchargé
                      </span>
                    )}
                  </div>
                  {!hasDocument && (
                    <Label
                      htmlFor={`upload-${category.id}`}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                        {uploading === category.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Télécharger
                          </>
                        )}
                      </div>
                      <Input
                        id={`upload-${category.id}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleUpload(category.id, e)}
                        disabled={uploading !== null}
                        className="hidden"
                      />
                    </Label>
                  )}
                </div>

                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : hasDocument ? (
                  <div className="space-y-2">
                    {categoryDocs.map((doc) => {
                      const isImage = /\.(jpg|jpeg|png)$/i.test(doc.name);
                      const fileExt = doc.name.split('.').pop()?.toUpperCase() || 'FILE';
                      
                      return (
                        <div
                          key={doc.path}
                          className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                        >
                          {/* Thumbnail or icon */}
                          {isImage ? (
                            <img
                              src={doc.url}
                              alt={doc.name}
                              className="w-12 h-12 rounded object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center shrink-0">
                              <FileText className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          
                          {/* File info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{doc.name}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-primary/20 text-primary rounded shrink-0">
                                {fileExt}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(doc.url, '_blank')}
                              title="Ouvrir le document"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(doc.path)}
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun document téléchargé
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Documents;
