-- Add bio column to drivers table for driver profile customization
-- Execute this SQL in your Supabase SQL Editor

ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.drivers.bio IS 'Driver bio/description for their public profile (max 500 characters recommended)';
