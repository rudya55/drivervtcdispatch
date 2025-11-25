import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileText, User, Building2, Car, MapPin, Euro } from "lucide-react";

interface BonDeCommandeModalProps {
  course: any;
  driver: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BonDeCommandeModal = ({ course, driver, open, onOpenChange }: BonDeCommandeModalProps) => {
  const creationDate = format(new Date(), "dd MMMM yyyy HH:mm", { locale: fr });
  const courseShortId = course.id?.substring(0, 8).toUpperCase() || "N/A";
  
  // Données dispatcher (entreprise qui envoie la course)
  const dispatcherName = course.company_name || "FAST TRANSPORT";
  
  // Calcul des tarifs
  const clientPrice = course.client_price || 0;
  const netDriver = course.net_driver || 0;
  const commission = clientPrice - netDriver;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Bon de Commande
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Date de création */}
          <div className="text-center py-2 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Date de création du bon</p>
            <p className="font-semibold">{creationDate}</p>
          </div>

          {/* Dispatcher en vert */}
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border-2 border-green-500">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-green-700 dark:text-green-300 text-lg">{dispatcherName}</h3>
            </div>
            <p className="text-green-800 dark:text-green-200 text-xs">
              Entreprise dispatrice
            </p>
          </div>

          {/* Ordre de mission */}
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <h3 className="font-bold text-center text-lg mb-1">📋 ORDRE DE MISSION - TRANSPORT VTC</h3>
            <p className="text-center text-muted-foreground">Commande n° {courseShortId}</p>
          </div>

          {/* Passager / Client */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4" />
              <h4 className="font-semibold">PASSAGER / CLIENT</h4>
            </div>
            <p className="font-bold text-lg">{course.client_name || "N/A"}</p>
          </div>

          {/* Entreprise dispatrice détails */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4" />
              <h4 className="font-semibold">ENTREPRISE DISPATRICE</h4>
            </div>
            <p className="font-bold">{dispatcherName}</p>
          </div>

          {/* Sous-traitant / Partenaire (fond rouge) */}
          <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border-2 border-red-500">
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-5 h-5 text-red-600" />
              <h4 className="font-bold text-red-700 dark:text-red-300">SOUS-TRAITANT / PARTENAIRE</h4>
            </div>
            <div className="space-y-1 text-red-900 dark:text-red-100">
              <p><span className="font-semibold">Chauffeur:</span> {driver?.name || "N/A"}</p>
              <p><span className="font-semibold">Véhicule:</span> {driver?.vehicle_brand || "N/A"} {driver?.vehicle_model || ""} {driver?.vehicle_year ? `(${driver.vehicle_year})` : ""}</p>
              <p><span className="font-semibold">Plaque:</span> {driver?.vehicle_plate || "N/A"}</p>
              <p><span className="font-semibold">Société:</span> {driver?.company_name || "N/A"}</p>
              <p><span className="font-semibold">Adresse:</span> {driver?.company_address || "N/A"}</p>
            </div>
          </div>

          {/* Détails de la mission */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4" />
              <h4 className="font-semibold">DÉTAILS DE LA MISSION</h4>
            </div>
            <div className="space-y-2">
              <p><span className="font-semibold">Date & Heure:</span> {format(new Date(course.pickup_date), "dd MMMM yyyy HH:mm", { locale: fr })}</p>
              <p><span className="font-semibold">Passagers:</span> {course.passengers_count || 1} | <span className="font-semibold">Bagages:</span> {course.luggage_count || 0}</p>
              {course.flight_number && (
                <p><span className="font-semibold">✈️ Vol:</span> {course.flight_number}</p>
              )}
              <p><span className="font-semibold">Départ:</span> {course.departure_location || "N/A"}</p>
              <p><span className="font-semibold">Destination:</span> {course.destination_location || "N/A"}</p>
              <p><span className="font-semibold">Type véhicule:</span> {course.vehicle_type || "N/A"}</p>
              {course.notes && (
                <p><span className="font-semibold">Notes:</span> {course.notes}</p>
              )}
            </div>
          </div>

          {/* Tarification */}
          <div className="border rounded-lg p-4 bg-accent/50">
            <div className="flex items-center gap-2 mb-3">
              <Euro className="w-4 h-4" />
              <h4 className="font-semibold">TARIFICATION</h4>
            </div>
            <div className="space-y-1">
              <p className="flex justify-between"><span className="font-semibold">Prix Client:</span> <span>{clientPrice.toFixed(2)}€</span></p>
              <p className="flex justify-between"><span className="font-semibold">Commission:</span> <span>{commission.toFixed(2)}€</span></p>
              <p className="flex justify-between text-lg font-bold border-t pt-2"><span>Net Chauffeur:</span> <span className="text-primary">{netDriver.toFixed(2)}€</span></p>
            </div>
          </div>

          {/* Signatures */}
          <div className="border rounded-lg p-4 mt-4">
            <h4 className="font-semibold mb-4 text-center">✍️ Signatures</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Dispatcher</p>
                <div className="border-b-2 border-dashed h-12"></div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Chauffeur</p>
                <div className="border-b-2 border-dashed h-12"></div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
