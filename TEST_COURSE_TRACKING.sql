-- ============================================================================
-- TESTS DU SYSTÈME DE TRACKING DES COURSES
-- ============================================================================
-- PRÉREQUIS : Avoir exécuté IMPLEMENTATION_COURSE_TRACKING.sql
-- ============================================================================

-- ============================================================================
-- TEST 1 : VÉRIFICATION DE L'INSTALLATION
-- ============================================================================

-- 1.1 : Vérifier que la table course_tracking existe
SELECT COUNT(*) as table_exists 
FROM information_schema.tables 
WHERE table_name = 'course_tracking';
-- Résultat attendu : 1

-- 1.2 : Vérifier que les triggers existent
SELECT COUNT(*) as triggers_count
FROM information_schema.triggers 
WHERE event_object_table = 'courses'
  AND trigger_name IN ('course_status_change_trigger', 'trigger_notify_drivers_on_dispatch');
-- Résultat attendu : 2

-- 1.3 : Vérifier que pg_net est activé
SELECT COUNT(*) as pg_net_active 
FROM pg_extension 
WHERE extname = 'pg_net';
-- Résultat attendu : 1


-- ============================================================================
-- TEST 2 : CRÉATION DE COURSE ET LOGGING AUTOMATIQUE
-- ============================================================================

-- 2.1 : Créer une course test
INSERT INTO courses (
  client_name, 
  client_phone,
  departure_location, 
  destination_location, 
  pickup_date, 
  status, 
  client_price, 
  passengers_count, 
  luggage_count, 
  vehicle_type
)
VALUES (
  'TEST - Logging Automatique', 
  '+33612345678',
  'Paris Gare du Nord, 75010 Paris', 
  'Aéroport Charles de Gaulle, 95700 Roissy', 
  NOW() + interval '2 hours', 
  'pending', 
  65.00, 
  2, 
  3, 
  'Berline'
)
RETURNING id, client_name, status, created_at;

-- Notez l'ID retourné


-- 2.2 : Vérifier que l'événement a été loggé AUTOMATIQUEMENT
SELECT 
  ct.id as tracking_id,
  ct.course_id,
  ct.status,
  ct.notes,
  to_char(ct.created_at, 'YYYY-MM-DD HH24:MI:SS') as tracked_at,
  c.client_name,
  c.status as current_status
FROM course_tracking ct
JOIN courses c ON c.id = ct.course_id
WHERE c.client_name = 'TEST - Logging Automatique'
ORDER BY ct.created_at DESC;

-- ✅ Résultat attendu : 
-- - 1 ligne avec status='pending'
-- - notes='Course créée avec statut: pending'


-- ============================================================================
-- TEST 3 : CHANGEMENT DE STATUT ET LOGGING
-- ============================================================================

-- 3.1 : Dispatcher la course
UPDATE courses 
SET status = 'dispatched', 
    dispatch_mode = 'auto'
WHERE client_name = 'TEST - Logging Automatique';


-- 3.2 : Attendre 2 secondes pour laisser le trigger s'exécuter
SELECT pg_sleep(2);


-- 3.3 : Vérifier l'historique complet
SELECT 
  ct.id as tracking_id,
  ct.status,
  ct.notes,
  to_char(ct.created_at, 'YYYY-MM-DD HH24:MI:SS') as tracked_at
FROM course_tracking ct
JOIN courses c ON c.id = ct.course_id
WHERE c.client_name = 'TEST - Logging Automatique'
ORDER BY ct.created_at ASC;

-- ✅ Résultat attendu : 3 lignes
-- Ligne 1 : status='pending', notes='Course créée avec statut: pending'
-- Ligne 2 : status='dispatched', notes='Statut changé de pending à dispatched'
-- Ligne 3 : status='dispatched', notes='Notification automatique envoyée aux chauffeurs...'


-- ============================================================================
-- TEST 4 : NOTIFICATIONS AUTOMATIQUES AUX CHAUFFEURS
-- ============================================================================

-- 4.1 : Vérifier que des notifications ont été créées
SELECT 
  dn.id as notification_id,
  d.full_name as chauffeur,
  d.is_active,
  dn.type,
  dn.title,
  dn.message,
  dn.read,
  to_char(dn.created_at, 'YYYY-MM-DD HH24:MI:SS') as notified_at
FROM driver_notifications dn
JOIN drivers d ON d.id = dn.driver_id
JOIN courses c ON c.id = dn.course_id
WHERE c.client_name = 'TEST - Logging Automatique'
ORDER BY dn.created_at DESC;

-- ✅ Résultat attendu :
-- - 1 notification par chauffeur ACTIF (is_active = true)
-- - type = 'new_course'
-- - title = 'Nouvelle course disponible'
-- - message contient les détails de la course


-- ============================================================================
-- TEST 5 : CYCLE DE VIE COMPLET D'UNE COURSE
-- ============================================================================

-- 5.1 : Créer une nouvelle course
INSERT INTO courses (
  client_name, 
  client_phone,
  departure_location, 
  destination_location, 
  pickup_date, 
  status, 
  client_price, 
  passengers_count, 
  luggage_count, 
  vehicle_type,
  dispatch_mode
)
VALUES (
  'TEST - Cycle Complet', 
  '+33698765432',
  '15 Rue de la Paix, 75002 Paris', 
  'Tour Eiffel, Champ de Mars, 75007 Paris', 
  NOW() + interval '1 hour', 
  'pending', 
  35.00, 
  1, 
  1, 
  'Berline',
  'auto'
)
RETURNING id;

-- Notez l'ID


-- 5.2 : Simuler tous les changements de statut
BEGIN;

-- Dispatch
UPDATE courses SET status = 'dispatched' 
WHERE client_name = 'TEST - Cycle Complet';

-- Acceptation par un chauffeur
UPDATE courses 
SET status = 'accepted',
    driver_id = (SELECT id FROM drivers WHERE is_active = true LIMIT 1)
WHERE client_name = 'TEST - Cycle Complet';

-- Démarrage
UPDATE courses 
SET status = 'in_progress',
    started_at = NOW()
WHERE client_name = 'TEST - Cycle Complet';

-- Arrivée sur place
UPDATE courses 
SET status = 'arrived',
    arrived_at = NOW()
WHERE client_name = 'TEST - Cycle Complet';

-- Prise en charge client
UPDATE courses 
SET status = 'picked_up',
    picked_up_at = NOW()
WHERE client_name = 'TEST - Cycle Complet';

-- Dépôt client
UPDATE courses 
SET status = 'dropped_off',
    dropped_off_at = NOW()
WHERE client_name = 'TEST - Cycle Complet';

-- Terminée
UPDATE courses 
SET status = 'completed',
    completed_at = NOW(),
    driver_rating = 5,
    driver_comment = 'Client agréable, trajet sans problème'
WHERE client_name = 'TEST - Cycle Complet';

COMMIT;


-- 5.3 : Attendre que tous les triggers se terminent
SELECT pg_sleep(2);


-- 5.4 : Vérifier la timeline complète
SELECT 
  ROW_NUMBER() OVER (ORDER BY ct.created_at) as step,
  ct.status,
  ct.notes,
  to_char(ct.created_at, 'HH24:MI:SS') as time,
  EXTRACT(EPOCH FROM (ct.created_at - LAG(ct.created_at) OVER (ORDER BY ct.created_at))) as seconds_since_last
FROM course_tracking ct
JOIN courses c ON c.id = ct.course_id
WHERE c.client_name = 'TEST - Cycle Complet'
ORDER BY ct.created_at ASC;

-- ✅ Résultat attendu : 9 lignes (8 changements + 1 notification)
-- Step 1: pending (Course créée)
-- Step 2: dispatched (Changement de statut)
-- Step 3: dispatched (Notification envoyée)
-- Step 4: accepted
-- Step 5: in_progress
-- Step 6: arrived
-- Step 7: picked_up
-- Step 8: dropped_off
-- Step 9: completed


-- ============================================================================
-- TEST 6 : PERFORMANCE DES INDEX
-- ============================================================================

-- 6.1 : Tester la performance de recherche par course_id
EXPLAIN ANALYZE
SELECT * FROM course_tracking 
WHERE course_id = (
  SELECT id FROM courses 
  WHERE client_name = 'TEST - Cycle Complet' 
  LIMIT 1
)
ORDER BY created_at DESC;

-- ✅ Vérifier que le plan utilise l'index idx_course_tracking_course_id


-- 6.2 : Tester la performance de recherche par date
EXPLAIN ANALYZE
SELECT * FROM course_tracking 
WHERE created_at >= NOW() - interval '1 hour'
ORDER BY created_at DESC
LIMIT 100;

-- ✅ Vérifier que le plan utilise l'index idx_course_tracking_created_at


-- ============================================================================
-- TEST 7 : REALTIME (vérification de la configuration)
-- ============================================================================

-- 7.1 : Vérifier que course_tracking est dans la publication realtime
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'course_tracking';

-- ✅ Résultat attendu : 1 ligne


-- 7.2 : Vérifier REPLICA IDENTITY
SELECT 
  relname,
  relreplident
FROM pg_class 
WHERE relname = 'course_tracking';

-- ✅ Résultat attendu : relreplident = 'f' (FULL)


-- ============================================================================
-- TEST 8 : SÉCURITÉ RLS (Row Level Security)
-- ============================================================================

-- 8.1 : Vérifier que RLS est activé
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'course_tracking';

-- ✅ Résultat attendu : rowsecurity = true


-- 8.2 : Lister toutes les policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'course_tracking';

-- ✅ Résultat attendu : Au moins 2 policies (SELECT et INSERT)


-- ============================================================================
-- STATISTIQUES GLOBALES
-- ============================================================================

-- Nombre total d'événements trackés
SELECT COUNT(*) as total_events FROM course_tracking;

-- Nombre d'événements par statut
SELECT 
  status,
  COUNT(*) as count
FROM course_tracking
GROUP BY status
ORDER BY count DESC;

-- Courses avec le plus d'événements
SELECT 
  c.client_name,
  c.status as current_status,
  COUNT(ct.id) as events_count,
  MIN(ct.created_at) as first_event,
  MAX(ct.created_at) as last_event
FROM courses c
LEFT JOIN course_tracking ct ON ct.course_id = c.id
WHERE c.client_name LIKE 'TEST -%'
GROUP BY c.id, c.client_name, c.status
ORDER BY events_count DESC;


-- ============================================================================
-- NETTOYAGE (À exécuter à la fin des tests)
-- ============================================================================

-- Supprimer toutes les courses de test
DELETE FROM courses 
WHERE client_name LIKE 'TEST -%';

-- Vérifier que les tracking ont été supprimés (CASCADE)
SELECT COUNT(*) as remaining_test_tracking 
FROM course_tracking ct
JOIN courses c ON c.id = ct.course_id
WHERE c.client_name LIKE 'TEST -%';

-- ✅ Résultat attendu : 0


-- ============================================================================
-- RÉSUMÉ DES TESTS
-- ============================================================================
-- ✅ TEST 1 : Installation vérifiée
-- ✅ TEST 2 : Logging automatique à la création
-- ✅ TEST 3 : Logging des changements de statut
-- ✅ TEST 4 : Notifications automatiques lors du dispatch
-- ✅ TEST 5 : Timeline complète du cycle de vie
-- ✅ TEST 6 : Performance des index
-- ✅ TEST 7 : Configuration Realtime
-- ✅ TEST 8 : Sécurité RLS
-- ============================================================================

-- 🎉 SI TOUS LES TESTS PASSENT, LE SYSTÈME EST OPÉRATIONNEL ! 🎉
