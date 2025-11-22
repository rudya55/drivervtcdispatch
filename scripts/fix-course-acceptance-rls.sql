-- Check existing policies on courses
SELECT * FROM pg_policies WHERE tablename = 'courses';

-- Check existing policies on driver_notifications
SELECT * FROM pg_policies WHERE tablename = 'driver_notifications';

-- FIX: Ensure drivers can update courses to accept them
-- We need a policy that allows UPDATE if:
-- 1. The user is a driver
-- 2. The course status is 'pending' OR 'dispatched'
-- 3. (Optional) The course is dispatched to THIS driver

DROP POLICY IF EXISTS "Drivers can update courses they are assigned to" ON courses;
DROP POLICY IF EXISTS "Drivers can accept pending courses" ON courses;

CREATE POLICY "Drivers can update courses"
ON courses FOR UPDATE
TO authenticated
USING (
  -- Driver can update if they are already the assigned driver
  driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  OR
  -- OR if the course is pending/dispatched (to allow acceptance)
  status IN ('pending', 'dispatched')
);

-- FIX: Ensure drivers can insert notifications
CREATE TABLE IF NOT EXISTS driver_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id),
  course_id UUID REFERENCES courses(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE driver_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can insert their own notifications" ON driver_notifications;

CREATE POLICY "Drivers can insert their own notifications"
ON driver_notifications FOR INSERT
TO authenticated
WITH CHECK (
  driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

-- Allow drivers to view their own notifications
DROP POLICY IF EXISTS "Drivers can view their own notifications" ON driver_notifications;

CREATE POLICY "Drivers can view their own notifications"
ON driver_notifications FOR SELECT
TO authenticated
USING (
  driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

-- Allow drivers to update (mark as read) their own notifications
DROP POLICY IF EXISTS "Drivers can update their own notifications" ON driver_notifications;

CREATE POLICY "Drivers can update their own notifications"
ON driver_notifications FOR UPDATE
TO authenticated
USING (
  driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);
