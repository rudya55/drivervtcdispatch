# 📋 Configuration Course Tracking & Notifications Automatiques

## ✅ Composants créés automatiquement

- ✅ **Type TypeScript** `CourseTracking` ajouté dans `src/lib/supabase.ts`
- ✅ **Composant React** `CourseHistory` créé pour afficher l'historique
- ✅ **Intégration** dans `CompletedCourseDetails` pour voir l'historique des courses terminées

## 🔧 À faire manuellement : Exécuter le SQL dans Supabase

### Option 1 : Via l'éditeur SQL Supabase (RECOMMANDÉ)

1. Allez sur https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp/sql
2. Créez une nouvelle requête
3. Copiez-collez le SQL ci-dessous
4. Exécutez

### Option 2 : Via les migrations Supabase CLI

1. Créez le fichier : `supabase/migrations/20250109_course_tracking_system.sql`
2. Collez le SQL ci-dessous
3. Exécutez : `supabase db push`

---

## 📝 SQL À EXÉCUTER

```sql
-- =========================================
-- 1. CRÉATION TABLE COURSE_TRACKING
-- =========================================

CREATE TABLE IF NOT EXISTS course_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_course_tracking_course_id ON course_tracking(course_id);
CREATE INDEX IF NOT EXISTS idx_course_tracking_created_at ON course_tracking(created_at DESC);

-- RLS Policy
ALTER TABLE course_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated users" ON course_tracking
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON course_tracking
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =========================================
-- 2. TRIGGER : LOG CHANGEMENTS DE STATUT
-- =========================================

CREATE OR REPLACE FUNCTION log_course_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log uniquement si le statut change
  IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) OR TG_OP = 'INSERT' THEN
    INSERT INTO course_tracking (course_id, status, notes)
    VALUES (
      NEW.id, 
      NEW.status,
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'Course créée avec statut: ' || NEW.status
        ELSE 'Statut changé de ' || OLD.status || ' à ' || NEW.status
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS course_status_change_trigger ON courses;
CREATE TRIGGER course_status_change_trigger
  AFTER INSERT OR UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION log_course_status_change();

-- =========================================
-- 3. TRIGGER : NOTIFICATION AUTOMATIQUE
-- =========================================

CREATE OR REPLACE FUNCTION notify_drivers_on_course_dispatch()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  http_request_id BIGINT;
BEGIN
  -- Récupérer les variables depuis les secrets Supabase
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.supabase_service_role_key', true);
  
  -- Si pas configuré, utiliser les valeurs par défaut du projet
  IF supabase_url IS NULL THEN
    supabase_url := 'https://qroqygbculbfqkbinqmp.supabase.co';
  END IF;
  
  -- Si la course est créée avec status=dispatched OU passe à dispatched
  IF (TG_OP = 'INSERT' AND NEW.status = 'dispatched') OR 
     (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'dispatched' AND NEW.status = 'dispatched') THEN
    
    -- Appeler l'Edge Function via HTTP (nécessite l'extension pg_net)
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/notify-drivers-new-course',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object('courseId', NEW.id)
      ) INTO http_request_id;
      
      -- Log de la notification envoyée
      INSERT INTO course_tracking (course_id, status, notes)
      VALUES (
        NEW.id,
        'dispatched',
        'Notification automatique envoyée aux chauffeurs (request_id: ' || COALESCE(http_request_id::TEXT, 'unknown') || ')'
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log d'erreur si la notification échoue
        INSERT INTO course_tracking (course_id, status, notes)
        VALUES (
          NEW.id,
          'dispatched',
          'Erreur notification: ' || SQLERRM
        );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_drivers_on_dispatch ON courses;
CREATE TRIGGER trigger_notify_drivers_on_dispatch
  AFTER INSERT OR UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION notify_drivers_on_course_dispatch();

-- =========================================
-- 4. ACTIVER REALTIME
-- =========================================

ALTER TABLE course_tracking REPLICA IDENTITY FULL;

-- Ajouter à la publication realtime (si elle existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE course_tracking;
  END IF;
END $$;

-- =========================================
-- 5. COMMENTAIRES
-- =========================================

COMMENT ON TABLE course_tracking IS 'Historique complet des changements de statut et événements pour chaque course';
COMMENT ON COLUMN course_tracking.status IS 'Statut de la course au moment de l''événement';
COMMENT ON COLUMN course_tracking.latitude IS 'Position GPS optionnelle au moment de l''événement';
COMMENT ON COLUMN course_tracking.longitude IS 'Position GPS optionnelle au moment de l''événement';
COMMENT ON COLUMN course_tracking.notes IS 'Notes descriptives ou contexte de l''événement';
```

---

## 🧪 Tester le système

### 1. Vérifier la table
```sql
SELECT * FROM course_tracking ORDER BY created_at DESC LIMIT 10;
```

### 2. Tester le trigger de log
```sql
-- Créer une course test
INSERT INTO courses (client_name, departure_location, destination_location, pickup_date, status, client_price, passengers_count, luggage_count, vehicle_type)
VALUES ('Test Client', 'Paris', 'Orly', NOW() + interval '2 hours', 'pending', 45.00, 1, 2, 'Berline');

-- Vérifier que l'événement a été loggé
SELECT * FROM course_tracking WHERE course_id = (SELECT id FROM courses WHERE client_name = 'Test Client' ORDER BY created_at DESC LIMIT 1);
```

### 3. Tester les notifications automatiques
```sql
-- Passer une course à 'dispatched'
UPDATE courses 
SET status = 'dispatched' 
WHERE client_name = 'Test Client' 
  AND status = 'pending';

-- Vérifier dans course_tracking qu'il y a bien:
-- 1. Une ligne pour le changement pending -> dispatched
-- 2. Une ligne pour la notification envoyée
SELECT * FROM course_tracking 
WHERE course_id = (SELECT id FROM courses WHERE client_name = 'Test Client' ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at DESC;

-- Vérifier que les notifications chauffeurs ont été créées
SELECT * FROM driver_notifications 
WHERE course_id = (SELECT id FROM courses WHERE client_name = 'Test Client' ORDER BY created_at DESC LIMIT 1);
```

---

## 📊 Ce qui fonctionne après la migration

### Automatique
- ✅ **Historique** : Chaque changement de statut est automatiquement loggé dans `course_tracking`
- ✅ **Notifications automatiques** : Quand une course passe à `dispatched`, tous les chauffeurs actifs (mode auto) ou le chauffeur assigné (mode manuel) reçoivent une notification
- ✅ **Traçabilité** : Tous les événements avec timestamp, notes et position GPS (si disponible)

### Dans l'interface chauffeur
- ✅ **Timeline visuelle** : L'historique complet s'affiche dans les détails d'une course terminée
- ✅ **Icônes** : Chaque étape a son icône et sa couleur
- ✅ **Timestamps précis** : Heure exacte de chaque action
- ✅ **GPS tracking** : Si disponible, position GPS affichée pour chaque événement

---

## 🔍 Dépannage

### Erreur "extension pg_net does not exist"
L'extension `pg_net` est nécessaire pour que les triggers puissent appeler les Edge Functions via HTTP. Elle est normalement activée par défaut sur Supabase.

Si vous avez cette erreur, exécutez :
```sql
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
```

### Les notifications ne partent pas
Vérifiez que :
1. L'extension `pg_net` est activée
2. La `service_role_key` est accessible dans le trigger
3. L'Edge Function `notify-drivers-new-course` est bien déployée

Consultez les logs dans `course_tracking` pour voir les erreurs :
```sql
SELECT * FROM course_tracking WHERE notes LIKE '%Erreur%';
```

---

## ✨ Résumé

Après avoir exécuté ce SQL, votre système dispatch sera **100% automatique** :

1. **Course créée** → Loggée automatiquement
2. **Course dispatched** → Notifications envoyées automatiquement aux chauffeurs
3. **Chauffeur accepte/démarre/termine** → Chaque étape loggée automatiquement
4. **Historique visible** → Timeline complète dans l'interface chauffeur

🎯 **Zéro action manuelle nécessaire** après la configuration initiale !
