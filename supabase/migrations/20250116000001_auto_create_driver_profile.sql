-- Migration: Auto-create driver profile on signup
-- This migration creates a trigger that automatically creates a driver profile
-- when a new user signs up with role 'driver'
-- Date: 2025-01-16

-- Create function to auto-create driver profile
CREATE OR REPLACE FUNCTION public.handle_new_driver_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create driver profile if user has 'driver' role in metadata
  IF NEW.raw_user_meta_data->>'role' = 'driver' THEN
    INSERT INTO public.drivers (
      user_id,
      name,
      email,
      phone,
      status,
      approved,
      type
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1), 'Chauffeur'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      'inactive',
      false,  -- New drivers must be approved by admin
      'vtc'
    );

    RAISE LOG 'Driver profile created for user: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_create_driver ON auth.users;

-- Create trigger on auth.users insert
CREATE TRIGGER on_auth_user_created_create_driver
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_driver_user();

-- Add comment
COMMENT ON FUNCTION public.handle_new_driver_user() IS 'Automatically creates a driver profile when a new user with role=driver signs up';
