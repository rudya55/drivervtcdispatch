-- ============================================
-- SCRIPT À EXÉCUTER DANS SUPABASE SQL EDITOR
-- ============================================
-- Ce script ajoute la colonne vehicle_photos_urls à la table drivers
-- pour stocker les chemins des photos de véhicule

-- Étape 1: Ajouter la colonne si elle n'existe pas
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS vehicle_photos_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.drivers.vehicle_photos_urls IS 'Chemins des photos de véhicule stockées dans driver-documents bucket';

-- Étape 2: Créer un index pour améliorer les performances (optionnel)
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_photos ON public.drivers USING GIN (vehicle_photos_urls);

-- Vérification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drivers' AND column_name = 'vehicle_photos_urls';
