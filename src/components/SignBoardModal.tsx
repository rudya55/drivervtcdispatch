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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col items-center justify-center bg-background p-8">
        {/* Logo du dispatch */}
        {companyLogoUrl ? (
          <div className="mb-8 w-48 h-48 flex items-center justify-center">
            <img 
              src={companyLogoUrl} 
              alt="Logo dispatch"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="mb-8 w-48 h-48 flex items-center justify-center bg-primary/10 rounded-full">
            <Building2 className="w-24 h-24 text-primary" />
          </div>
        )}

        {/* Nom du client en très grand */}
        <h1 className="text-6xl md:text-8xl font-bold text-center uppercase tracking-wide text-foreground mb-4">
          {clientName}
        </h1>

        {/* Nom de la compagnie */}
        {companyName && (
          <p className="text-2xl md:text-3xl text-muted-foreground text-center">
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
