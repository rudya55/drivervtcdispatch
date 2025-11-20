-- ============================================================================
-- MIGRATION CRITIQUE: Ajout des colonnes de profil et système d'approbation
-- Date: 2025-11-19
-- Objectif: Débloquer la sauvegarde du profil ET la connexion
-- ============================================================================
-- 
-- ⚠️ IMPORTANT: Ce fichier doit être exécuté manuellement dans Supabase
-- Instructions:
-- 1. Aller sur https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- 2. Copier-coller tout le contenu de ce fichier
-- 3. Cliquer sur "Run" pour exécuter
-- 
-- OU via Lovable Cloud:
-- 1. Aller dans l'onglet Cloud
-- 2. Section Database > SQL Editor
-- 3. Coller et exécuter ce SQL
-- ============================================================================

-- Ajout des colonnes de profil chauffeur (pour Profile.tsx)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS company_logo_url text;

-- Ajout de la colonne d'approbation (pour useAuth.ts)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS approved boolean DEFAULT FALSE NOT NULL;

-- ⚡ DÉBLOCAGE IMMÉDIAT : Approuver TOUS les chauffeurs existants
-- Cela permet à l'utilisateur de se connecter immédiatement
UPDATE public.drivers 
SET approved = TRUE 
WHERE approved IS NULL OR approved = FALSE;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_drivers_approved ON public.drivers(approved);
CREATE INDEX IF NOT EXISTS idx_drivers_approved_created ON public.drivers(approved, created_at);

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Migration terminée : colonnes de profil et système d''approbation ajoutés';
  RAISE NOTICE '✅ Tous les chauffeurs existants ont été approuvés automatiquement';
END $$;
