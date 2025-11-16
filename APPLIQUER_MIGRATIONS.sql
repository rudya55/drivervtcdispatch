-- ============================================================================
-- SCRIPT COMPLET D'APPLICATION DES MIGRATIONS
-- ============================================================================
-- Ce script combine toutes les migrations nécessaires pour corriger le système
-- de gestion des chauffeurs.
--
-- INSTRUCTIONS:
-- 1. Allez sur: https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp
-- 2. Cliquez sur "SQL Editor" dans le menu de gauche
-- 3. Cliquez sur "+ New query"
-- 4. Copiez-collez TOUT ce fichier
-- 5. Cliquez sur "Run" (ou Ctrl+Enter)
-- 6. Attendez que toutes les commandes soient exécutées
--
-- Date: 2025-01-16
-- Projet: Driver VTC Dispatch
-- ============================================================================

-- Afficher un message de début
DO $$
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  DÉBUT DE L''APPLICATION DES MIGRATIONS                        ║';
  RAISE NOTICE '║  Projet: Driver VTC Dispatch                                  ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
END $$;

-- ============================================================================
-- MIGRATION 1: Ajout du système d'approbation des chauffeurs
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '📦 MIGRATION 1: Ajout de la colonne "approved"...';

-- Add approved column to drivers table
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false NOT NULL;

RAISE NOTICE '✅ Colonne "approved" ajoutée';

-- Create index for better query performance on approved status
CREATE INDEX IF NOT EXISTS idx_drivers_approved ON drivers(approved);

RAISE NOTICE '✅ Index "idx_drivers_approved" créé';

-- Create index for pending drivers queries (approved = false)
CREATE INDEX IF NOT EXISTS idx_drivers_pending ON drivers(approved) WHERE approved = false;

RAISE NOTICE '✅ Index "idx_drivers_pending" créé';

-- Update existing drivers to be approved by default (for backward compatibility)
-- This ensures existing drivers can continue to work
UPDATE drivers
SET approved = true
WHERE approved IS NULL OR approved = false;

RAISE NOTICE '✅ Chauffeurs existants mis à jour (approved = true)';

-- Add comment to the column
COMMENT ON COLUMN drivers.approved IS 'Whether the driver has been approved by an administrator. New drivers must be approved before they can access the app.';

RAISE NOTICE '✅ MIGRATION 1 TERMINÉE';

-- ============================================================================
-- MIGRATION 2: Trigger automatique de création de profil chauffeur
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '📦 MIGRATION 2: Création du trigger automatique...';

-- Create function to auto-create driver profile
CREATE OR REPLACE FUNCTION public.handle_new_driver_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create driver profile if user has 'driver' role in metadata
  IF NEW.raw_user_meta_data->>'role' = 'driver' THEN
    INSERT INTO public.drivers (
      user_id,
      name,
      email,
      phone,
      status,
      approved,
      type
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1), 'Chauffeur'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      'inactive',
      false,  -- New drivers must be approved by admin
      'vtc'
    );

    RAISE LOG 'Driver profile created for user: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE '✅ Fonction "handle_new_driver_user" créée';

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_create_driver ON auth.users;

RAISE NOTICE '✅ Ancien trigger supprimé (si existant)';

-- Create trigger on auth.users insert
CREATE TRIGGER on_auth_user_created_create_driver
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_driver_user();

RAISE NOTICE '✅ Trigger "on_auth_user_created_create_driver" créé';

-- Add comment
COMMENT ON FUNCTION public.handle_new_driver_user() IS 'Automatically creates a driver profile when a new user with role=driver signs up';

RAISE NOTICE '✅ MIGRATION 2 TERMINÉE';

-- ============================================================================
-- VÉRIFICATION ET RÉSUMÉ
-- ============================================================================

DO $$
DECLARE
  total_drivers INTEGER;
  approved_drivers INTEGER;
  pending_drivers INTEGER;
  column_exists BOOLEAN;
  trigger_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  VÉRIFICATION DES MIGRATIONS                                   ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- Check if approved column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'drivers'
    AND column_name = 'approved'
  ) INTO column_exists;

  IF column_exists THEN
    RAISE NOTICE '✅ Colonne "approved" existe';
  ELSE
    RAISE NOTICE '❌ ERREUR: Colonne "approved" n''existe pas!';
  END IF;

  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created_create_driver'
  ) INTO trigger_exists;

  IF trigger_exists THEN
    RAISE NOTICE '✅ Trigger automatique existe';
  ELSE
    RAISE NOTICE '❌ ERREUR: Trigger automatique n''existe pas!';
  END IF;

  -- Count drivers
  SELECT COUNT(*) INTO total_drivers FROM drivers;
  SELECT COUNT(*) INTO approved_drivers FROM drivers WHERE approved = true;
  SELECT COUNT(*) INTO pending_drivers FROM drivers WHERE approved = false;

  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTIQUES:';
  RAISE NOTICE '   Total de chauffeurs: %', total_drivers;
  RAISE NOTICE '   Chauffeurs approuvés: %', approved_drivers;
  RAISE NOTICE '   Chauffeurs en attente: %', pending_drivers;
  RAISE NOTICE '';

  IF column_exists AND trigger_exists THEN
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ✅ MIGRATIONS APPLIQUÉES AVEC SUCCÈS!                         ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Le système d''approbation des chauffeurs est maintenant actif!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PROCHAINES ÉTAPES:';
    RAISE NOTICE '   1. Les nouveaux chauffeurs seront créés avec approved=false';
    RAISE NOTICE '   2. Ils devront être approuvés avant de pouvoir se connecter';
    RAISE NOTICE '   3. Utilisez l''interface admin pour approuver les chauffeurs';
    RAISE NOTICE '      URL: https://driver-dispatch-admin.lovable.app/';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Pour nettoyer tous les comptes existants (OPTIONNEL):';
    RAISE NOTICE '   Exécutez le fichier: supabase/migrations/CLEANUP_drivers.sql';
  ELSE
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ❌ ERREUR LORS DE L''APPLICATION DES MIGRATIONS               ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Contactez le support si l''erreur persiste';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;
