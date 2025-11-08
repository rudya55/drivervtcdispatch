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
import { toast } from 'sonner';
import { Loader2, ArrowLeft, FileText, Download, Trash2, Upload } from 'lucide-react';

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
    if (driver) {
      fetchDocuments();
    }
  }, [driver]);

  const fetchDocuments = async () => {
    if (!driver) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('driver-documents')
        .list(driver.id);

      if (error) throw error;

      const docsWithUrls = data.map((file: any) => {
        const { data: { publicUrl } } = supabase.storage
          .from('driver-documents')
          .getPublicUrl(`${driver.id}/${file.name}`);
        
        const category = file.name.split('_')[0];
        
        return {
          name: file.name,
          path: `${driver.id}/${file.name}`,
          url: publicUrl,
          created_at: file.created_at,
          category,
        };
      });

      setDocuments(docsWithUrls);
    } catch (error: any) {
      console.error('Fetch documents error:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !driver) return;

    setUploading(category);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${category}_${Date.now()}.${fileExt}`;
      const filePath = `${driver.id}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('driver-documents')
        .upload(filePath, file);

      if (error) throw error;

      toast.success('Document téléchargé avec succès');
      fetchDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (path: string) => {
    if (!driver) return;

    try {
      const { error } = await supabase.storage
        .from('driver-documents')
        .remove([path]);

      if (error) throw error;

      toast.success('Document supprimé');
      fetchDocuments();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
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
                    {categoryDocs.map((doc) => (
                      <div
                        key={doc.path}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <span className="text-sm truncate">
                            {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.path)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
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
