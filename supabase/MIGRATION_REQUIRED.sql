-- ============================================================================
-- MIGRATION COMPLÈTE: Ajout de toutes les colonnes manquantes
-- Date: 2025-11-21
-- Objectif: Activer la sauvegarde complète de tous les paramètres chauffeur
-- ============================================================================
-- 
-- ⚠️ IMPORTANT: Ce fichier doit être exécuté manuellement dans Supabase
-- Instructions:
-- 1. Aller sur https://supabase.com/dashboard (depuis ton téléphone)
-- 2. Ouvrir ton projet > SQL Editor
-- 3. Copier-coller tout le contenu de ce fichier
-- 4. Cliquer sur "Run" pour exécuter
-- 
-- Cette migration ajoute TOUTES les colonnes nécessaires pour:
-- ✅ Profil complet (nom, téléphone, société, adresse, SIRET, photos)
-- ✅ Véhicule (marque, modèle, année, plaque, licence)
-- ✅ Coordonnées bancaires (IBAN, BIC)
-- ✅ Préférences notifications (activé/désactivé, son)
-- ✅ Système d'approbation chauffeur
-- ✅ Informations courses additionnelles
-- ============================================================================

-- ============================================================================
-- PARTIE 1: TABLE DRIVERS - PROFIL & SOCIÉTÉ
-- ============================================================================

-- Ajout des colonnes de profil et société (pour /settings/profile)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS company_logo_url text;

-- ============================================================================
-- PARTIE 2: TABLE DRIVERS - VÉHICULE
-- ============================================================================

-- Ajout des colonnes véhicule (pour /settings/vehicle)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS vehicle_brand text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_year text,
  ADD COLUMN IF NOT EXISTS vehicle_plate text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS vehicle_icon text DEFAULT 'car' CHECK (vehicle_icon IN ('car', 'taxi', 'van', 'motorcycle', 'suv')),
  ADD COLUMN IF NOT EXISTS vehicle_types_accepted text[] DEFAULT ARRAY['Standard', 'Berline', 'Van', 'Minibus', 'First Class'];

-- Index pour améliorer les performances de recherche par type de véhicule
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_types 
  ON public.drivers USING GIN (vehicle_types_accepted);

-- Commenter la colonne
COMMENT ON COLUMN public.drivers.vehicle_types_accepted IS 
  'Types de véhicules que le chauffeur accepte de conduire (filtre pour les courses)';

-- ============================================================================
-- PARTIE 3: TABLE DRIVERS - COORDONNÉES BANCAIRES
-- ============================================================================

-- Ajout des colonnes bancaires (pour /settings/bank-account)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS bic text;

-- ============================================================================
-- PARTIE 4: TABLE DRIVERS - PRÉFÉRENCES NOTIFICATIONS
-- ============================================================================

-- Ajout des colonnes notifications (pour /settings/notifications)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notification_sound text;

-- ============================================================================
-- PARTIE 5: TABLE DRIVERS - SYSTÈME & TECHNIQUE
-- ============================================================================

-- Ajout des colonnes système
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS fcm_token text,
  ADD COLUMN IF NOT EXISTS rating numeric;

-- ============================================================================
-- PARTIE 6: TABLE DRIVERS - SYSTÈME D'APPROBATION
-- ============================================================================

-- Ajout de la colonne d'approbation chauffeur
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS approved boolean DEFAULT FALSE NOT NULL;

-- ⚡ DÉBLOCAGE IMMÉDIAT : Approuver TOUS les chauffeurs existants
-- Cela permet aux chauffeurs actuels de continuer à se connecter
UPDATE public.drivers 
SET approved = TRUE 
WHERE approved IS NULL OR approved = FALSE;

-- ============================================================================
-- PARTIE 7: INDEX POUR PERFORMANCES
-- ============================================================================

-- Index pour les requêtes d'approbation
CREATE INDEX IF NOT EXISTS idx_drivers_approved ON public.drivers(approved);
CREATE INDEX IF NOT EXISTS idx_drivers_approved_created ON public.drivers(approved, created_at);

-- ============================================================================
-- PARTIE 8: TABLE COURSES - INFORMATIONS ADDITIONNELLES
-- ============================================================================

-- Ajout des colonnes courses pour le dispatch et les infos vol
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS dispatch_mode text DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS flight_number text,
  ADD COLUMN IF NOT EXISTS company_name text;

-- Index pour filtrage par dispatch_mode
CREATE INDEX IF NOT EXISTS idx_courses_dispatch_mode 
  ON public.courses (dispatch_mode);

-- ⚡ INITIALISATION: Mettre dispatch_mode = 'auto' pour les courses dispatchées sans chauffeur assigné
UPDATE public.courses 
SET dispatch_mode = 'auto'
WHERE dispatch_mode IS NULL AND status = 'dispatched' AND driver_id IS NULL;

-- ⚡ INITIALISATION: Mettre dispatch_mode = 'manual' pour les courses assignées directement
UPDATE public.courses 
SET dispatch_mode = 'manual'
WHERE dispatch_mode IS NULL AND driver_id IS NOT NULL;

-- ============================================================================
-- PARTIE 8B: TABLE COURSES - TIMESTAMPS DE PROGRESSION
-- ============================================================================

-- Ajout des colonnes de timestamps pour tracker la progression des courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS dropped_off_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Index pour améliorer les performances des requêtes Analytics
CREATE INDEX IF NOT EXISTS idx_courses_driver_completed 
  ON public.courses(driver_id, status, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_courses_completed_at 
  ON public.courses(completed_at) 
  WHERE status = 'completed';

-- ============================================================================
-- PARTIE 9: STORAGE BUCKET POUR DOCUMENTS & PHOTOS
-- ============================================================================

-- S'assurer que le bucket driver-documents existe (pour photos et documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PARTIE 10: POLICIES RLS POUR LE BUCKET (SÉCURITÉ)
-- ============================================================================

-- Permettre aux chauffeurs authentifiés d'uploader leurs propres documents
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Drivers can upload their own documents'
  ) THEN
    CREATE POLICY "Drivers can upload their own documents"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'driver-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Permettre aux chauffeurs de voir leurs propres documents
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Drivers can view their own documents'
  ) THEN
    CREATE POLICY "Drivers can view their own documents"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'driver-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Permettre aux chauffeurs de supprimer leurs propres documents
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Drivers can delete their own documents'
  ) THEN
    CREATE POLICY "Drivers can delete their own documents"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'driver-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- Permettre la lecture publique des photos de profil et logos (pour affichage dans l'app admin)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Public can view profile photos and logos'
  ) THEN
    CREATE POLICY "Public can view profile photos and logos"
      ON storage.objects
      FOR SELECT
      TO public
      USING (
        bucket_id = 'driver-documents' AND
        (
          name LIKE '%/profile_photo%' OR
          name LIKE '%/company_logo%'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- FINALISATION
-- ============================================================================

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Migration terminée avec succès !';
  RAISE NOTICE '✅ Colonnes ajoutées à drivers: profil, véhicule (+ icône personnalisable), banque, notifications, approbation';
  RAISE NOTICE '✅ Colonnes ajoutées à courses: dispatch_mode, flight_number, company_name, timestamps de progression';
  RAISE NOTICE '✅ Index créés pour améliorer les performances des Analytics';
  RAISE NOTICE '✅ Bucket driver-documents créé avec policies RLS';
  RAISE NOTICE '✅ Tous les chauffeurs existants ont été approuvés automatiquement';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Prochaines étapes:';
  RAISE NOTICE '   1. Aller sur /settings/profile';
  RAISE NOTICE '   2. Upload une photo de profil';
  RAISE NOTICE '   3. Remplir les infos société (nom, adresse, SIRET)';
  RAISE NOTICE '   4. Cliquer sur Sauvegarder';
  RAISE NOTICE '   5. Retourner sur /settings → la photo doit apparaître dans l''avatar ! ✅';
  RAISE NOTICE '   6. Tester /analytics → les statistiques du mois doivent s''afficher correctement ! 📊';
END $$;
