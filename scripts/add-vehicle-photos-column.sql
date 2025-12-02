-- Add vehicle_photos_urls column to drivers table
-- This column stores URLs of vehicle photos uploaded by drivers

ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS vehicle_photos_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.drivers.vehicle_photos_urls IS 'Array of signed URLs for vehicle photos stored in driver-documents bucket';
