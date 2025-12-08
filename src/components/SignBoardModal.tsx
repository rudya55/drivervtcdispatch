import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Building2 } from 'lucide-react';

interface SignBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  companyName?: string;
  companyLogoUrl?: string;
}

export const SignBoardModal = ({ 
  open, 
  onOpenChange, 
  clientName, 
  companyName,
  companyLogoUrl 
}: SignBoardModalProps) => {
  const [logoError, setLogoError] = useState(false);
  
  // Afficher le logo si URL valide et pas d'erreur
  const showLogo = companyLogoUrl && !logoError;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col items-center justify-center bg-background p-8 landscape:h-[90vh] landscape:max-w-6xl">
        {/* Logo du dispatch OU nom de la société */}
        {showLogo ? (
          <div className="mb-8 w-48 h-48 flex items-center justify-center landscape:w-32 landscape:h-32 landscape:mb-4">
            <img 
              src={companyLogoUrl} 
              alt=""
              className="max-w-full max-h-full object-contain"
              onError={() => setLogoError(true)}
            />
          </div>
        ) : companyName ? (
          <div className="mb-8 landscape:mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-primary text-center uppercase tracking-wide landscape:text-2xl">
              {companyName}
            </h2>
          </div>
        ) : (
          <div className="mb-8 w-48 h-48 flex items-center justify-center bg-primary/10 rounded-full landscape:w-24 landscape:h-24 landscape:mb-4">
            <Building2 className="w-24 h-24 text-primary landscape:w-12 landscape:h-12" />
          </div>
        )}

        {/* Nom du client en très grand */}
        <h1 className="text-6xl md:text-8xl font-bold text-center uppercase tracking-wide text-foreground mb-4 landscape:text-5xl landscape:md:text-6xl">
          {clientName}
        </h1>

        {/* Nom de la compagnie (sous le nom client si logo affiché) */}
        {showLogo && companyName && (
          <p className="text-2xl md:text-3xl text-muted-foreground text-center landscape:text-xl">
            {companyName}
          </p>
        )}

        {/* Instructions discrètes */}
        <p className="absolute bottom-4 text-sm text-muted-foreground">
          Appuyez n'importe où pour fermer
        </p>
      </DialogContent>
    </Dialog>
  );
};
