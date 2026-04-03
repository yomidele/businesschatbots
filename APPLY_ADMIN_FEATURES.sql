-- Run this in your Supabase SQL Editor
-- SAFE: Does not modify existing tables, only extends

-- 1. Add delivery_status column to orders (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN delivery_status TEXT DEFAULT 'processing';
  END IF;
END $$;

-- 2. Add conversation_id column to orders (if not exists) for cancellation tracking
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN conversation_id UUID;
  END IF;
END $$;

-- 3. Add customer_address column to orders (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_address'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN customer_address TEXT;
  END IF;
END $$;

-- 4. Add description column to orders (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN description TEXT;
  END IF;
END $$;

-- 5. Create chatbot_themes table for per-website customization
CREATE TABLE IF NOT EXISTS public.chatbot_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#f1f5f9',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#1e293b',
  button_color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(site_id)
);

-- 6. Enable RLS on chatbot_themes
ALTER TABLE public.chatbot_themes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage themes for their own sites
CREATE POLICY "Users can manage own chatbot themes"
ON public.chatbot_themes
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = chatbot_themes.site_id AND sites.user_id = auth.uid()));

-- Allow public read for widget rendering
CREATE POLICY "Public can read chatbot themes"
ON public.chatbot_themes
FOR SELECT TO anon
USING (true);

-- Service role full access
CREATE POLICY "Service role full access chatbot_themes"
ON public.chatbot_themes
FOR ALL TO service_role USING (true);
