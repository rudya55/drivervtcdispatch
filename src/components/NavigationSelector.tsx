import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Navigation, MapPin, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

type NavigationApp = 'waze' | 'google' | 'apple';

interface NavigationSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: string;
  departureLocation?: string;
}

export const NavigationSelector = ({
  open,
  onOpenChange,
  destination,
  departureLocation
}: NavigationSelectorProps) => {
  const [selectedApp, setSelectedApp] = useState<NavigationApp>('google');

  useEffect(() => {
    // Charger la préférence sauvegardée
    const saved = localStorage.getItem('preferred_navigation_app');
    if (saved && ['waze', 'google', 'apple'].includes(saved)) {
      setSelectedApp(saved as NavigationApp);
    }
  }, []);

  const savePreference = (app: NavigationApp) => {
    localStorage.setItem('preferred_navigation_app', app);
  };

  const openNavigation = () => {
    // Encoder l'adresse pour l'URL
    const encodedDestination = encodeURIComponent(destination);
    const encodedDeparture = departureLocation ? encodeURIComponent(departureLocation) : null;

    let url = '';

    switch (selectedApp) {
      case 'waze':
        // Waze supporte q= pour la destination
        url = `https://waze.com/ul?q=${encodedDestination}&navigate=yes`;
        break;

      case 'google':
        // Google Maps avec départ et arrivée
        if (encodedDeparture) {
          url = `https://www.google.com/maps/dir/?api=1&origin=${encodedDeparture}&destination=${encodedDestination}&travelmode=driving`;
        } else {
          url = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving`;
        }
        break;

      case 'apple':
        // Apple Maps (fonctionne uniquement sur iOS/macOS)
        if (encodedDeparture) {
          url = `maps://?saddr=${encodedDeparture}&daddr=${encodedDestination}&dirflg=d`;
        } else {
          url = `maps://?daddr=${encodedDestination}&dirflg=d`;
        }
        break;
    }

    // Sauvegarder la préférence
    savePreference(selectedApp);

    // Ouvrir l'application de navigation
    try {
      window.open(url, '_blank');
      toast.success(`Ouverture de ${getAppName(selectedApp)}...`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Erreur lors de l\'ouverture de la navigation');
    }
  };

  const getAppName = (app: NavigationApp): string => {
    switch (app) {
      case 'waze': return 'Waze';
      case 'google': return 'Google Maps';
      case 'apple': return 'Apple Maps';
    }
  };

  const getAppDescription = (app: NavigationApp): string => {
    switch (app) {
      case 'waze': return 'Alertes trafic en temps réel';
      case 'google': return 'Navigation classique et fiable';
      case 'apple': return 'Intégré à votre iPhone';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Choisir l'application de navigation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Destination */}
          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Destination</p>
              <p className="text-sm font-medium truncate">{destination}</p>
            </div>
          </div>

          {/* Choix de l'app */}
          <RadioGroup value={selectedApp} onValueChange={(v) => setSelectedApp(v as NavigationApp)}>
            <div className="space-y-3">
              {/* Waze */}
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                <RadioGroupItem value="waze" id="waze" />
                <Label htmlFor="waze" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
                      W
                    </div>
                    <div>
                      <p className="font-semibold">Waze</p>
                      <p className="text-xs text-muted-foreground">{getAppDescription('waze')}</p>
                    </div>
                  </div>
                </Label>
              </div>

              {/* Google Maps */}
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                <RadioGroupItem value="google" id="google" />
                <Label htmlFor="google" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xl">
                      G
                    </div>
                    <div>
                      <p className="font-semibold">Google Maps</p>
                      <p className="text-xs text-muted-foreground">{getAppDescription('google')}</p>
                    </div>
                  </div>
                </Label>
              </div>

              {/* Apple Maps */}
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                <RadioGroupItem value="apple" id="apple" />
                <Label htmlFor="apple" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Apple Maps</p>
                      <p className="text-xs text-muted-foreground">{getAppDescription('apple')}</p>
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>

          <p className="text-xs text-muted-foreground text-center">
            💡 Votre choix sera enregistré pour les prochaines fois
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={openNavigation} className="gap-2">
            <Navigation className="w-4 h-4" />
            Démarrer la navigation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
