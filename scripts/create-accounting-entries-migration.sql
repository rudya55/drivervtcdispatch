-- =====================================================
-- MIGRATION: CREATE ACCOUNTING_ENTRIES TABLE
-- Exécuter ce script dans la console SQL de Supabase
-- =====================================================

-- Create accounting_entries table for automatic accounting system
-- This table stores financial records for completed courses

CREATE TABLE IF NOT EXISTS public.accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  driver_amount numeric(10,2) NOT NULL,
  fleet_amount numeric(10,2) NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounting_entries_course_id ON public.accounting_entries(course_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_driver_id ON public.accounting_entries(driver_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_created_at ON public.accounting_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_payment_status ON public.accounting_entries(payment_status);

-- RLS policy: Drivers can view their own accounting entries
CREATE POLICY "Drivers can view their own accounting"
  ON public.accounting_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.id = accounting_entries.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

-- RLS policy: Admins and fleet managers can view all accounting entries
CREATE POLICY "Admins can view all accounting"
  ON public.accounting_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'fleet_manager')
    )
  );

-- RLS policy: System can insert accounting entries (via Edge Function with service role)
CREATE POLICY "System can insert accounting"
  ON public.accounting_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS policy: Only admins can update accounting entries
CREATE POLICY "Admins can update accounting"
  ON public.accounting_entries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON public.accounting_entries TO authenticated;
GRANT UPDATE ON public.accounting_entries TO authenticated;

-- =====================================================
-- VERIFICATION: Run this to check if table was created
-- =====================================================
-- SELECT * FROM public.accounting_entries LIMIT 1;
