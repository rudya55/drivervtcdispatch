-- ============================================================================
-- MIGRATION: Fix Storage RLS for Multi-Role Document Access
-- ============================================================================
-- This migration fixes document storage by:
-- 1. Using auth.uid() instead of driver.id for storage paths
-- 2. Implementing multi-role access (admin, fleet_manager, driver)
-- 3. Adding created_by column to link drivers to fleet managers
-- ============================================================================

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS (to avoid RLS recursion)
-- ============================================================================

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if a driver belongs to a fleet manager
CREATE OR REPLACE FUNCTION public.driver_belongs_to_fleet_manager(_driver_user_id uuid, _fleet_manager_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.drivers d
    WHERE d.user_id = _driver_user_id
      AND d.created_by = _fleet_manager_user_id
  )
$$;

-- ============================================================================
-- ADD created_by COLUMN TO DRIVERS
-- ============================================================================

-- Add column to link drivers to their fleet manager
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Index for fleet manager queries
CREATE INDEX IF NOT EXISTS idx_drivers_created_by ON public.drivers(created_by);

-- ============================================================================
-- DROP OLD STORAGE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Drivers can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Drivers can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Drivers can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for profile photos and logos" ON storage.objects;

-- ============================================================================
-- NEW MULTI-ROLE STORAGE POLICIES
-- ============================================================================

-- 1. INSERT: Drivers can upload their own documents
CREATE POLICY "Drivers can upload their own documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'driver-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 2. SELECT: Multi-role read access
CREATE POLICY "Multi-role document view policy"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'driver-documents' AND
    (
      -- Admins can view ALL documents
      public.has_role(auth.uid(), 'admin'::app_role) OR
      
      -- Drivers can view their own documents
      auth.uid()::text = (storage.foldername(name))[1] OR
      
      -- Fleet Managers can view documents of THEIR drivers
      (
        public.has_role(auth.uid(), 'fleet_manager'::app_role) AND
        public.driver_belongs_to_fleet_manager(
          ((storage.foldername(name))[1])::uuid,  -- driver's user_id (folder name)
          auth.uid()                               -- fleet manager's user_id
        )
      )
    )
  );

-- 3. DELETE: Admins and owners can delete
CREATE POLICY "Multi-role document delete policy"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'driver-documents' AND
    (
      -- Admins can delete anything
      public.has_role(auth.uid(), 'admin'::app_role) OR
      
      -- Drivers can delete their own documents
      auth.uid()::text = (storage.foldername(name))[1]
    )
  );

-- ============================================================================
-- ENSURE BUCKET EXISTS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- To apply this migration:
-- 1. Copy this SQL code
-- 2. Open your Supabase dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
-- 3. Paste the code in the SQL editor
-- 4. Click "Run" or press Ctrl+Enter
-- 5. Verify success: Check that all commands executed without errors
-- ============================================================================