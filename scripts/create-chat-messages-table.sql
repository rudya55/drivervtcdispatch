-- Create chat_messages table for chat between fleet/dispatch and drivers
-- Execute this SQL in your Supabase SQL Editor

-- Drop old messages table if exists (optional - uncomment if needed)
-- DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('driver', 'fleet', 'admin')),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  read_by_driver BOOLEAN DEFAULT FALSE,
  read_by_fleet BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_course_id ON public.chat_messages(course_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_driver_id ON public.chat_messages(driver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_delivered_at ON public.chat_messages(delivered_at);

-- RLS policies for drivers
CREATE POLICY "Drivers can view their own messages"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.id = chat_messages.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can insert their own messages"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = 'driver' AND
    sender_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.id = chat_messages.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

-- RLS policies for admin/fleet
CREATE POLICY "Admins can view all messages"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'fleet_manager')
    )
  );

CREATE POLICY "Admins can insert messages"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role IN ('fleet', 'admin') AND
    sender_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'fleet_manager')
    )
  );

-- Update policies for message status
CREATE POLICY "Drivers can update read status"
  ON public.chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.id = chat_messages.driver_id
        AND drivers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.id = chat_messages.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update messages"
  ON public.chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'fleet_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'fleet_manager')
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Table chat_messages créée avec succès!';
END $$;
