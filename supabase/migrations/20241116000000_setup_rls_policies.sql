-- Migration: Configuration des politiques RLS pour Driver VTC Dispatch
-- Cette migration sera appliquée automatiquement par Lovable/Supabase
-- Date: 2024-11-16

-- ============================================================================
-- ACTIVER RLS SUR TOUTES LES TABLES
-- ============================================================================

ALTER TABLE IF EXISTS drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS driver_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS course_tracking ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLITIQUES POUR LA TABLE DRIVERS
-- ============================================================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Drivers can view own profile" ON drivers;
DROP POLICY IF EXISTS "Drivers can update own profile" ON drivers;
DROP POLICY IF EXISTS "Drivers can insert own profile" ON drivers;

-- Les chauffeurs peuvent voir leur propre profil
CREATE POLICY "Drivers can view own profile"
ON drivers FOR SELECT
USING (auth.uid() = user_id);

-- Les chauffeurs peuvent mettre à jour leur propre profil
CREATE POLICY "Drivers can update own profile"
ON drivers FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Les chauffeurs peuvent créer leur propre profil
CREATE POLICY "Drivers can insert own profile"
ON drivers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- POLITIQUES POUR LA TABLE COURSES
-- ============================================================================

DROP POLICY IF EXISTS "Drivers can view own courses" ON courses;
DROP POLICY IF EXISTS "Drivers can update own courses" ON courses;

-- Les chauffeurs peuvent voir leurs propres courses
CREATE POLICY "Drivers can view own courses"
ON courses FOR SELECT
USING (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
);

-- Les chauffeurs peuvent mettre à jour leurs propres courses
CREATE POLICY "Drivers can update own courses"
ON courses FOR UPDATE
USING (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- POLITIQUES POUR LA TABLE DRIVER_NOTIFICATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Drivers can view own notifications" ON driver_notifications;
DROP POLICY IF EXISTS "Drivers can update own notifications" ON driver_notifications;

-- Les chauffeurs peuvent voir leurs propres notifications
CREATE POLICY "Drivers can view own notifications"
ON driver_notifications FOR SELECT
USING (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
);

-- Les chauffeurs peuvent mettre à jour leurs propres notifications (marquer comme lu)
CREATE POLICY "Drivers can update own notifications"
ON driver_notifications FOR UPDATE
USING (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- POLITIQUES POUR LA TABLE DRIVER_LOCATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Drivers can view own locations" ON driver_locations;
DROP POLICY IF EXISTS "Drivers can insert own locations" ON driver_locations;
DROP POLICY IF EXISTS "Drivers can update own locations" ON driver_locations;

-- Les chauffeurs peuvent voir leurs propres positions
CREATE POLICY "Drivers can view own locations"
ON driver_locations FOR SELECT
USING (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
);

-- Les chauffeurs peuvent insérer leurs propres positions
CREATE POLICY "Drivers can insert own locations"
ON driver_locations FOR INSERT
WITH CHECK (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
);

-- Les chauffeurs peuvent mettre à jour leurs propres positions
CREATE POLICY "Drivers can update own locations"
ON driver_locations FOR UPDATE
USING (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- POLITIQUES POUR LA TABLE COURSE_TRACKING
-- ============================================================================

DROP POLICY IF EXISTS "Drivers can view own course tracking" ON course_tracking;
DROP POLICY IF EXISTS "Drivers can insert own course tracking" ON course_tracking;

-- Les chauffeurs peuvent voir le tracking de leurs propres courses
CREATE POLICY "Drivers can view own course tracking"
ON course_tracking FOR SELECT
USING (
  course_id IN (
    SELECT c.id FROM courses c
    INNER JOIN drivers d ON c.driver_id = d.id
    WHERE d.user_id = auth.uid()
  )
);

-- Les chauffeurs peuvent insérer le tracking de leurs propres courses
CREATE POLICY "Drivers can insert own course tracking"
ON course_tracking FOR INSERT
WITH CHECK (
  course_id IN (
    SELECT c.id FROM courses c
    INNER JOIN drivers d ON c.driver_id = d.id
    WHERE d.user_id = auth.uid()
  )
);
