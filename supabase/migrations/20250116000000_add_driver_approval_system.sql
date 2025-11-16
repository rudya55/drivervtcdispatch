-- Migration: Add driver approval system
-- This migration adds the approval workflow for new drivers
-- Date: 2025-01-16

-- Add approved column to drivers table
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false NOT NULL;

-- Create index for better query performance on approved status
CREATE INDEX IF NOT EXISTS idx_drivers_approved ON drivers(approved);

-- Create index for pending drivers queries (approved = false)
CREATE INDEX IF NOT EXISTS idx_drivers_pending ON drivers(approved) WHERE approved = false;

-- Update existing drivers to be approved by default (for backward compatibility)
-- This ensures existing drivers can continue to work
UPDATE drivers
SET approved = true
WHERE approved IS NULL OR approved = false;

-- Add comment to the column
COMMENT ON COLUMN drivers.approved IS 'Whether the driver has been approved by an administrator. New drivers must be approved before they can access the app.';
