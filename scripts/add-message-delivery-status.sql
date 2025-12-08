-- Add delivered_at column for WhatsApp-style delivery status
-- Execute this SQL in your Supabase SQL Editor

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_messages_delivered_at ON public.messages(delivered_at);

-- Comment for documentation
COMMENT ON COLUMN public.messages.delivered_at IS 'Timestamp when message was delivered to recipient (WhatsApp-style double check)';
