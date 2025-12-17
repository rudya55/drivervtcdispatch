-- Migration: Créer la table course_stops pour les courses multi-arrêts
-- (Mise à disposition et Transfert)

-- 1. Créer la table course_stops
CREATE TABLE IF NOT EXISTS course_stops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  address TEXT NOT NULL,
  client_name TEXT,
  stop_type TEXT DEFAULT 'dropoff' CHECK (stop_type IN ('pickup', 'dropoff')),
  completed_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index pour performance
CREATE INDEX IF NOT EXISTS idx_course_stops_course_id ON course_stops(course_id);
CREATE INDEX IF NOT EXISTS idx_course_stops_order ON course_stops(course_id, stop_order);

-- 3. Ajouter colonnes à la table courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_type TEXT DEFAULT 'simple';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS current_stop_order INTEGER DEFAULT 0;

-- 4. Index pour filtrer par type de course
CREATE INDEX IF NOT EXISTS idx_courses_course_type ON courses(course_type);

-- 5. Activer Realtime sur course_stops
ALTER PUBLICATION supabase_realtime ADD TABLE course_stops;

-- 6. RLS pour course_stops
ALTER TABLE course_stops ENABLE ROW LEVEL SECURITY;

-- Politique: Les chauffeurs peuvent voir les arrêts de leurs courses
CREATE POLICY "Drivers can view stops for their courses" ON course_stops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN drivers d ON c.driver_id = d.id
      WHERE c.id = course_stops.course_id
      AND d.user_id = auth.uid()
    )
  );

-- Politique: Admin/Fleet managers peuvent tout voir
CREATE POLICY "Admins can view all stops" ON course_stops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'fleet_manager')
    )
  );

-- Politique: Admin/Fleet managers peuvent modifier
CREATE POLICY "Admins can manage stops" ON course_stops
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'fleet_manager')
    )
  );
