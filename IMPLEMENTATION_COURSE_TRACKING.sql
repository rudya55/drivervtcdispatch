-- ============================================================================
-- IMPLÉMENTATION COMPLÈTE DU SYSTÈME DE TRACKING DES COURSES
-- ============================================================================
-- INSTRUCTIONS :
-- 1. Aller sur https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp/sql
-- 2. Créer une nouvelle requête
-- 3. Copier-coller TOUT le contenu de ce fichier
-- 4. Exécuter le SQL
-- ============================================================================

-- ============================================================================
-- PARTIE 1 : ACTIVER LES EXTENSIONS NÉCESSAIRES
-- ============================================================================

-- Extension pg_net pour les appels HTTP depuis les triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Vérifier que l'extension est bien activée
SELECT * FROM pg_extension WHERE extname = 'pg_net';


-- ============================================================================
-- PARTIE 2 : CRÉER LA TABLE course_tracking
-- ============================================================================

-- Table pour l'historique complet des courses
CREATE TABLE IF NOT EXISTS course_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_course_tracking_course_id ON course_tracking(course_id);
CREATE INDEX IF NOT EXISTS idx_course_tracking_created_at ON course_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_tracking_status ON course_tracking(status);

-- Commentaires pour la documentation
COMMENT ON TABLE course_tracking IS 'Historique complet de tous les changements de statut des courses';
COMMENT ON COLUMN course_tracking.course_id IS 'Référence vers la course';
COMMENT ON COLUMN course_tracking.status IS 'Statut de la course au moment de l''événement';
COMMENT ON COLUMN course_tracking.latitude IS 'Position GPS latitude au moment de l''événement (optionnel)';
COMMENT ON COLUMN course_tracking.longitude IS 'Position GPS longitude au moment de l''événement (optionnel)';
COMMENT ON COLUMN course_tracking.notes IS 'Notes descriptives de l''événement';


-- ============================================================================
-- PARTIE 3 : CONFIGURER ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur la table
ALTER TABLE course_tracking ENABLE ROW LEVEL SECURITY;

-- Policy : Les utilisateurs authentifiés peuvent lire l'historique
CREATE POLICY "Allow authenticated read on course_tracking" 
  ON course_tracking
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Policy : Les utilisateurs authentifiés peuvent insérer des événements
CREATE POLICY "Allow authenticated insert on course_tracking" 
  ON course_tracking
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Policy : Autoriser les triggers système à insérer (security definer)
CREATE POLICY "Allow system insert on course_tracking" 
  ON course_tracking
  FOR INSERT 
  WITH CHECK (true);


-- ============================================================================
-- PARTIE 4 : TRIGGER POUR LOGGER AUTOMATIQUEMENT LES CHANGEMENTS DE STATUT
-- ============================================================================

-- Fonction trigger qui log chaque changement de statut
CREATE OR REPLACE FUNCTION log_course_status_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insérer un événement dans course_tracking pour :
  -- 1. Toute nouvelle course (INSERT)
  -- 2. Tout changement de statut (UPDATE avec statut différent)
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO course_tracking (course_id, status, notes)
    VALUES (
      NEW.id, 
      NEW.status,
      'Course créée avec statut: ' || NEW.status
    );
  ELSIF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO course_tracking (course_id, status, notes)
    VALUES (
      NEW.id, 
      NEW.status,
      'Statut changé de ' || OLD.status || ' à ' || NEW.status
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table courses
DROP TRIGGER IF EXISTS course_status_change_trigger ON courses;
CREATE TRIGGER course_status_change_trigger
  AFTER INSERT OR UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION log_course_status_change();

COMMENT ON FUNCTION log_course_status_change() IS 'Fonction trigger qui enregistre automatiquement chaque changement de statut dans course_tracking';


-- ============================================================================
-- PARTIE 5 : TRIGGER POUR NOTIFICATIONS AUTOMATIQUES LORS DU DISPATCH
-- ============================================================================

-- Fonction trigger qui appelle l'Edge Function pour notifier les chauffeurs
CREATE OR REPLACE FUNCTION notify_drivers_on_course_dispatch()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  supabase_url TEXT := 'https://qroqygbculbfqkbinqmp.supabase.co';
  service_role_key TEXT := current_setting('app.settings.service_role_key', true);
  request_id BIGINT;
BEGIN
  -- Déclencher les notifications si :
  -- 1. Une course est créée directement avec status='dispatched' (INSERT)
  -- 2. Le statut passe à 'dispatched' (UPDATE)
  IF (TG_OP = 'INSERT' AND NEW.status = 'dispatched') OR 
     (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'dispatched' AND NEW.status = 'dispatched') THEN
    
    -- Appeler l'Edge Function notify-drivers-new-course via pg_net
    SELECT INTO request_id extensions.http_post(
      url := supabase_url || '/functions/v1/notify-drivers-new-course',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object('courseId', NEW.id::text)
    );
    
    -- Logger l'appel dans course_tracking
    INSERT INTO course_tracking (course_id, status, notes)
    VALUES (
      NEW.id,
      NEW.status,
      'Notification automatique envoyée aux chauffeurs (request_id: ' || COALESCE(request_id::text, 'N/A') || ')'
    );
    
    RAISE NOTICE 'Edge Function notify-drivers-new-course appelée pour course_id: %, request_id: %', NEW.id, request_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table courses
DROP TRIGGER IF EXISTS trigger_notify_drivers_on_dispatch ON courses;
CREATE TRIGGER trigger_notify_drivers_on_dispatch
  AFTER INSERT OR UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION notify_drivers_on_course_dispatch();

COMMENT ON FUNCTION notify_drivers_on_course_dispatch() IS 'Fonction trigger qui appelle automatiquement l''Edge Function pour notifier les chauffeurs lors du dispatch d''une course';


-- ============================================================================
-- PARTIE 6 : ACTIVER SUPABASE REALTIME SUR course_tracking
-- ============================================================================

-- Activer REPLICA IDENTITY FULL pour capturer toutes les données lors des updates
ALTER TABLE course_tracking REPLICA IDENTITY FULL;

-- Ajouter la table à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE course_tracking;


-- ============================================================================
-- PARTIE 7 : GRANTS ET PERMISSIONS
-- ============================================================================

-- Autoriser les utilisateurs authentifiés à lire course_tracking
GRANT SELECT ON course_tracking TO authenticated;
GRANT SELECT ON course_tracking TO anon;

-- Autoriser les triggers à insérer
GRANT INSERT ON course_tracking TO service_role;


-- ============================================================================
-- VÉRIFICATIONS POST-INSTALLATION
-- ============================================================================

-- 1. Vérifier que la table existe avec toutes les colonnes
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'course_tracking' 
ORDER BY ordinal_position;

-- 2. Vérifier que les index existent
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'course_tracking';

-- 3. Vérifier que les triggers existent
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'courses'
  AND trigger_name IN ('course_status_change_trigger', 'trigger_notify_drivers_on_dispatch')
ORDER BY trigger_name;

-- 4. Vérifier que les RLS policies existent
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'course_tracking';

-- 5. Vérifier que pg_net est activé
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- 6. Vérifier que Realtime est activé
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'course_tracking';


-- ============================================================================
-- ✅ INSTALLATION TERMINÉE
-- ============================================================================
-- Si toutes les vérifications ci-dessus retournent des résultats, 
-- le système est correctement installé !
--
-- Prochaine étape : Exécutez les tests dans le fichier TEST_COURSE_TRACKING.sql
-- ============================================================================
