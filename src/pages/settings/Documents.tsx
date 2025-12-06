import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Loader2, ArrowLeft, FileText, Download, Trash2, Upload, 
  CheckCircle, Clock, XCircle, X
} from 'lucide-react';

// Documents avec recto/verso pour Carte VTC, Permis et Pièce d'identité
const DRIVER_DOCUMENTS = [
  // Carte VTC - Recto/Verso
  { key: 'vtc_card_front', label: 'Carte VTC (Recto)', required: true, group: 'vtc_card' },
  { key: 'vtc_card_back', label: 'Carte VTC (Verso)', required: true, group: 'vtc_card' },
  
  // Permis de conduire - Recto/Verso
  { key: 'driving_license_front', label: 'Permis de conduire (Recto)', required: true, group: 'driving_license' },
  { key: 'driving_license_back', label: 'Permis de conduire (Verso)', required: true, group: 'driving_license' },
  
  // Pièce d'identité - Recto/Verso
  { key: 'id_card_front', label: 'Pièce d\'identité (Recto)', required: true, group: 'id_card' },
  { key: 'id_card_back', label: 'Pièce d\'identité (Verso)', required: true, group: 'id_card' },
  
  // Autres documents (page unique)
  { key: 'kbis', label: 'K-bis ou Carte Artisan', required: true, group: 'kbis' },
  { key: 'insurance', label: 'Attestation d\'assurance', required: true, group: 'insurance' },
  { key: 'rc_pro', label: 'RC Professionnelle', required: false, group: 'rc_pro' },
];

interface DocumentRecord {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

// Modal de prévisualisation plein écran
const ImagePreviewModal = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  title 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  imageUrl: string; 
  title: string;
}) => {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 left-4 flex justify-between items-center">
        <p className="text-white font-medium truncate">{title}</p>
        <button 
          className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          onClick={onClose}
        >
          <X className="w-8 h-8" />
        </button>
      </div>
      <div 
        className="max-w-full max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt={title}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
      </div>
    </div>
  );
};

const Documents = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [existingDocs, setExistingDocs] = useState<Record<string, DocumentRecord>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  
  // État pour la prévisualisation
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const userId = session?.user?.id;

  // Grouper les documents par catégorie
  const groupedDocuments = useMemo(() => {
    const groups: Record<string, typeof DRIVER_DOCUMENTS> = {};
    DRIVER_DOCUMENTS.forEach(doc => {
      if (!groups[doc.group]) groups[doc.group] = [];
      groups[doc.group].push(doc);
    });
    return groups;
  }, []);

  // Labels des groupes
  const groupLabels: Record<string, string> = {
    vtc_card: 'Carte VTC',
    driving_license: 'Permis de conduire',
    id_card: 'Pièce d\'identité',
    kbis: 'K-bis ou Carte Artisan',
    insurance: 'Attestation d\'assurance',
    rc_pro: 'RC Professionnelle',
  };

  // Charger les documents existants
  const loadExistingDocuments = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('[Documents] Erreur chargement:', error);
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.log('[Documents] Table driver_documents non créée, affichage vide');
          setExistingDocs({});
          setLoading(false);
          return;
        }
        toast.error('Erreur lors du chargement des documents');
        return;
      }

      const docsMap: Record<string, DocumentRecord> = {};
      data?.forEach(doc => {
        docsMap[doc.document_type] = doc;
      });
      setExistingDocs(docsMap);

      // Générer les signed URLs pour les documents existants
      const urls: Record<string, string> = {};
      for (const doc of data || []) {
        const { data: signedData } = await supabase.storage
          .from('driver-documents')
          .createSignedUrl(doc.file_path, 3600);
        if (signedData?.signedUrl) {
          urls[doc.document_type] = signedData.signedUrl;
        }
      }
      setSignedUrls(urls);
    } catch (err) {
      console.error('[Documents] Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExistingDocuments();
  }, [userId]);

  // Upload un document
  const handleUpload = async (docType: string, file: File) => {
    if (!userId) {
      toast.error('Vous devez être connecté');
      return;
    }

    // Vérifier si le document existe déjà - demander confirmation
    if (existingDocs[docType]) {
      const confirmReplace = window.confirm(
        'Un document existe déjà pour cette catégorie. Voulez-vous le remplacer ?'
      );
      if (!confirmReplace) return;
    }

    // Validation côté client
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    
    if (file.size > maxSize) {
      toast.error('Le fichier est trop volumineux (max 10MB)');
      return;
    }
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez PDF, JPG ou PNG');
      return;
    }

    setUploading(docType);
    
    try {
      // Récupérer le driver_id
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${docType}_${Date.now()}.${fileExt}`;

      // Supprimer l'ancien fichier si existe
      const existingDoc = existingDocs[docType];
      if (existingDoc) {
        await supabase.storage
          .from('driver-documents')
          .remove([existingDoc.file_path]);
        
        await supabase
          .from('driver_documents')
          .delete()
          .eq('id', existingDoc.id);
      }

      // Upload le nouveau fichier
      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('[Documents] Erreur upload:', uploadError);
        if (uploadError.message?.includes('policy') || uploadError.message?.includes('permission')) {
          toast.error('Erreur de permissions. Le bucket storage n\'est pas configuré.');
        } else if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
          toast.error('Le bucket de stockage n\'existe pas. Contactez l\'administrateur.');
        } else {
          toast.error('Erreur lors de l\'upload du fichier');
        }
        return;
      }

      // Insérer les métadonnées dans la table
      const { error: dbError } = await supabase
        .from('driver_documents')
        .insert({
          user_id: userId,
          driver_id: driverData?.id,
          document_type: docType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          status: 'pending'
        });

      if (dbError) {
        console.error('[Documents] Erreur insertion:', dbError);
        if (dbError.message?.includes('does not exist') || dbError.code === '42P01') {
          toast.error('La table driver_documents n\'existe pas encore. Migration en attente.');
        } else {
          toast.error('Erreur lors de l\'enregistrement du document');
        }
        return;
      }

      toast.success('Document uploadé avec succès');
      await loadExistingDocuments();
    } catch (err) {
      console.error('[Documents] Erreur:', err);
      toast.error('Erreur inattendue');
    } finally {
      setUploading(null);
    }
  };

  // Supprimer un document
  const handleDelete = async (docType: string) => {
    const doc = existingDocs[docType];
    if (!doc) return;

    const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?');
    if (!confirmDelete) return;

    try {
      await supabase.storage
        .from('driver-documents')
        .remove([doc.file_path]);

      await supabase
        .from('driver_documents')
        .delete()
        .eq('id', doc.id);

      toast.success('Document supprimé');
      await loadExistingDocuments();
    } catch (err) {
      console.error('[Documents] Erreur suppression:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Télécharger un document
  const handleDownload = async (docType: string) => {
    const url = signedUrls[docType];
    if (url) {
      window.open(url, '_blank');
    } else {
      const doc = existingDocs[docType];
      if (!doc) return;
      
      const { data } = await supabase.storage
        .from('driver-documents')
        .createSignedUrl(doc.file_path, 3600);
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        toast.error('Impossible de télécharger le document');
      }
    }
  };

  // Ouvrir la prévisualisation
  const openPreview = (url: string, title: string) => {
    setPreviewImage({ url, title });
  };

  // Rendu du statut
  const renderStatus = (doc: DocumentRecord) => {
    switch (doc.status) {
      case 'approved':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Validé
          </Badge>
        );
      case 'rejected':
        return (
          <div className="flex flex-col gap-1">
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              <XCircle className="w-3 h-3 mr-1" />
              Rejeté
            </Badge>
            {doc.rejection_reason && (
              <span className="text-xs text-red-400">{doc.rejection_reason}</span>
            )}
          </div>
        );
      default:
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
    }
  };

  // Calcul de la progression
  const requiredDocs = DRIVER_DOCUMENTS.filter(d => d.required);
  const uploadedRequired = requiredDocs.filter(d => existingDocs[d.key]).length;
  const progressPercent = (uploadedRequired / requiredDocs.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Modal de prévisualisation */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={true}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={previewImage.title}
        />
      )}

      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Documents administratifs</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Progression des documents obligatoires */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Documents obligatoires</span>
              <span className="text-sm text-muted-foreground">
                {uploadedRequired} / {requiredDocs.length}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {progressPercent === 100 && (
              <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Tous les documents obligatoires sont téléchargés
              </p>
            )}
          </CardContent>
        </Card>

        {/* Liste des documents groupés */}
        {Object.entries(groupedDocuments).map(([groupKey, docs]) => {
          const isRequired = docs.some(d => d.required);
          const allUploaded = docs.every(d => existingDocs[d.key]);
          
          return (
            <Card key={groupKey}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {groupLabels[groupKey]}
                    {isRequired && (
                      <span className="text-red-500 text-xs">*</span>
                    )}
                  </CardTitle>
                  {allUploaded && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complet
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-2 space-y-3">
                {/* Affichage des documents du groupe (recto/verso côte à côte si 2) */}
                <div className={docs.length === 2 ? "grid grid-cols-2 gap-3" : "space-y-3"}>
                  {docs.map((docConfig) => {
                    const doc = existingDocs[docConfig.key];
                    const isUploading = uploading === docConfig.key;
                    const signedUrl = signedUrls[docConfig.key];
                    const isImage = doc && /\.(jpg|jpeg|png)$/i.test(doc.file_name);
                    const sideLabel = docs.length === 2 
                      ? (docConfig.key.endsWith('_front') ? 'Recto' : 'Verso')
                      : null;

                    return (
                      <div key={docConfig.key} className="space-y-2">
                        {sideLabel && (
                          <p className="text-xs font-medium text-muted-foreground">{sideLabel}</p>
                        )}
                        
                        {doc ? (
                          <div className="space-y-2">
                            <div className="bg-muted/50 p-2 rounded-lg">
                              {/* Thumbnail cliquable */}
                              {isImage && signedUrl ? (
                                <img
                                  src={signedUrl}
                                  alt={doc.file_name}
                                  className="w-full h-24 rounded object-contain border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => openPreview(signedUrl, docConfig.label)}
                                />
                              ) : (
                                <div 
                                  className="w-full h-24 rounded bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
                                  onClick={() => handleDownload(docConfig.key)}
                                >
                                  <FileText className="w-8 h-8 text-primary" />
                                </div>
                              )}
                              
                              {/* Statut */}
                              <div className="mt-2 flex items-center justify-between">
                                {renderStatus(doc)}
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleDownload(docConfig.key)}
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                                    onClick={() => handleDelete(docConfig.key)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Option de remplacer */}
                            <label className="cursor-pointer block text-center">
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUpload(docConfig.key, file);
                                  e.target.value = '';
                                }}
                                disabled={isUploading}
                              />
                              <span className="text-xs text-primary underline">
                                Remplacer
                              </span>
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(docConfig.key, file);
                                e.target.value = '';
                              }}
                              disabled={isUploading}
                            />
                            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center hover:border-primary/50 transition-colors h-24 flex flex-col items-center justify-center">
                              {isUploading ? (
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground mt-1">
                                    Ajouter
                                  </span>
                                </>
                              )}
                            </div>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        <p className="text-xs text-muted-foreground text-center">
          * Documents obligatoires pour pouvoir recevoir des courses
        </p>
      </div>
    </div>
  );
};

export default Documents;
