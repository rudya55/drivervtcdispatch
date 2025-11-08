import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Upload, FileText, Download, Trash2 } from 'lucide-react';

type StorageFile = {
  name: string;
  created_at: string;
  metadata: {
    size?: number;
  };
};

const Documents = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<StorageFile[]>([]);

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
        .list(`${driver.id}/`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Fetch documents error:', error);
      if (error.message?.includes('not found')) {
        setDocuments([]);
      } else {
        toast.error('Erreur lors du chargement des documents');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !driver) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${driver.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      toast.success('Document uploadé avec succès');
      fetchDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    if (!driver) return;

    try {
      const { data, error } = await supabase.storage
        .from('driver-documents')
        .download(`${driver.id}/${fileName}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!driver) return;

    try {
      const { error } = await supabase.storage
        .from('driver-documents')
        .remove([`${driver.id}/${fileName}`]);

      if (error) throw error;

      toast.success('Document supprimé');
      fetchDocuments();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Documents" unreadCount={unreadCount} />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Uploader un document</h3>
              <label htmlFor="file-upload">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Choisir un fichier
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Formats acceptés: PDF, JPG, PNG, DOC, DOCX
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          <h3 className="font-semibold px-2">Mes documents</h3>
          {loading ? (
            <Card className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            </Card>
          ) : documents.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Aucun document</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <Card key={doc.name} className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.metadata?.size)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDownload(doc.name)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(doc.name)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Documents;
