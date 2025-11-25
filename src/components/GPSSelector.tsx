import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Navigation, Copy, Map, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface GPSSelectorProps {
  address: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label?: string;
}

export const GPSSelector = ({ address, open, onOpenChange, label = "Adresse" }: GPSSelectorProps) => {
  const encodedAddress = encodeURIComponent(address);

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(url, '_blank');
    onOpenChange(false);
  };

  const openWaze = () => {
    const url = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
    window.open(url, '_blank');
    onOpenChange(false);
  };

  const openAppleMaps = () => {
    const url = `maps://maps.apple.com/?q=${encodedAddress}`;
    window.location.href = url;
    onOpenChange(false);
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Adresse copiée !');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="p-3 bg-muted rounded-lg mb-4">
            <p className="text-sm">{address}</p>
          </div>

          <Button
            onClick={openGoogleMaps}
            variant="outline"
            className="w-full justify-start gap-3"
            size="lg"
          >
            <Map className="w-5 h-5 text-blue-600" />
            <span className="flex-1 text-left">Ouvrir avec Google Maps</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Button>

          <Button
            onClick={openWaze}
            variant="outline"
            className="w-full justify-start gap-3"
            size="lg"
          >
            <Navigation className="w-5 h-5 text-cyan-600" />
            <span className="flex-1 text-left">Ouvrir avec Waze</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Button>

          <Button
            onClick={openAppleMaps}
            variant="outline"
            className="w-full justify-start gap-3"
            size="lg"
          >
            <Map className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left">Ouvrir avec Apple Plans</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Button>

          <Button
            onClick={copyAddress}
            variant="outline"
            className="w-full justify-start gap-3"
            size="lg"
          >
            <Copy className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-left">Copier l'adresse</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
