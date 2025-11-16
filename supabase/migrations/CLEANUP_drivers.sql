-- ============================================================================
-- SCRIPT DE NETTOYAGE DES COMPTES CHAUFFEURS
-- ============================================================================
-- ATTENTION: Ce script supprime TOUS les chauffeurs et leurs données associées
-- Utilisez avec précaution - Cette action est IRRÉVERSIBLE!
--
-- Pour exécuter ce script:
-- 1. Connectez-vous à votre dashboard Supabase
-- 2. Allez dans SQL Editor
-- 3. Copiez et exécutez ce script
--
-- Date: 2025-01-16
-- ============================================================================

-- Commencer une transaction pour pouvoir rollback en cas de problème
BEGIN;

-- Désactiver temporairement les triggers pour éviter les effets de bord
SET session_replication_role = replica;

-- 1. Supprimer les positions des chauffeurs
DELETE FROM driver_locations;
RAISE NOTICE 'driver_locations nettoyée';

-- 2. Supprimer le tracking des courses
DELETE FROM course_tracking;
RAISE NOTICE 'course_tracking nettoyée';

-- 3. Supprimer les notifications des chauffeurs
DELETE FROM driver_notifications;
RAISE NOTICE 'driver_notifications nettoyée';

-- 4. Supprimer les courses
DELETE FROM courses;
RAISE NOTICE 'courses nettoyée';

-- 5. Supprimer tous les profils chauffeurs
DELETE FROM drivers;
RAISE NOTICE 'drivers nettoyée';

-- 6. Supprimer les utilisateurs auth (seulement ceux avec role 'driver')
-- ATTENTION: Ceci supprime les comptes d'authentification
DELETE FROM auth.users
WHERE id IN (
  SELECT id FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'driver'
);
RAISE NOTICE 'Comptes auth driver supprimés';

-- Réactiver les triggers
SET session_replication_role = DEFAULT;

-- Si tout s'est bien passé, commiter la transaction
COMMIT;

-- Afficher un résumé
DO $$
DECLARE
  driver_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO driver_count FROM drivers;
  SELECT COUNT(*) INTO user_count FROM auth.users WHERE raw_user_meta_data->>'role' = 'driver';

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'NETTOYAGE TERMINÉ';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Profils drivers restants: %', driver_count;
  RAISE NOTICE 'Comptes auth driver restants: %', user_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Vous pouvez maintenant créer de nouveaux comptes chauffeurs.';
  RAISE NOTICE 'Les nouveaux chauffeurs devront être approuvés par un administrateur.';
  RAISE NOTICE '============================================================================';
END $$;

-- En cas d'erreur, la transaction sera automatiquement annulée (ROLLBACK)
