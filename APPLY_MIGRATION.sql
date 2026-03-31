-- Apply pending migration: landing_page_and_payments
-- Run this in your Supabase SQL Editor

-- Add slug column to sites for landing page URL
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_slug ON public.sites(slug);

-- Add chat configuration columns to sites
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS show_chat_on_landing_page BOOLEAN DEFAULT true;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS chat_mode TEXT DEFAULT 'sales' CHECK (chat_mode IN ('sales', 'support', 'mixed'));

-- Add show_products column to sites
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS show_products_on_landing BOOLEAN DEFAULT true;

-- Create manual_payment_config table for businesses without payment gateway
CREATE TABLE IF NOT EXISTS public.manual_payment_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL UNIQUE REFERENCES public.sites(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_payment_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own manual payment config" ON public.manual_payment_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = manual_payment_config.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Service role full access manual_payment_config" ON public.manual_payment_config
  FOR ALL TO service_role USING (true);

CREATE POLICY "Public can read manual payment config by site" ON public.manual_payment_config
  FOR SELECT TO public
  USING (true);

CREATE TRIGGER update_manual_payment_config_updated_at BEFORE UPDATE ON public.manual_payment_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create payment_confirmations table for manual payment proof uploads
CREATE TABLE IF NOT EXISTS public.payment_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  proof_url TEXT NOT NULL,
  proof_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access payment_confirmations" ON public.payment_confirmations
  FOR ALL TO service_role USING (true);

CREATE POLICY "Users can view site payment confirmations" ON public.payment_confirmations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = payment_confirmations.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Users can manage payment confirmations they reviewed" ON public.payment_confirmations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = payment_confirmations.site_id AND sites.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sites WHERE sites.id = payment_confirmations.site_id AND sites.user_id = auth.uid()));

CREATE TRIGGER update_payment_confirmations_updated_at BEFORE UPDATE ON public.payment_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create landing_pages table for generated landing pages
CREATE TABLE IF NOT EXISTS public.landing_pages (
  id TEXT NOT NULL PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  html_content TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'modern' CHECK (theme IN ('modern', 'classic', 'minimal')),
  cta_type TEXT NOT NULL DEFAULT 'buy' CHECK (cta_type IN ('buy', 'contact', 'book')),
  products_used JSONB,
  business_name TEXT,
  url_slug TEXT,
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own landing pages" ON public.landing_pages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = landing_pages.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Service role full access landing_pages" ON public.landing_pages
  FOR ALL TO service_role USING (true);

CREATE POLICY "Public can view published landing pages" ON public.landing_pages
  FOR SELECT TO public
  USING (is_published = true);

CREATE TRIGGER update_landing_pages_updated_at BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster landing page lookups
CREATE INDEX IF NOT EXISTS idx_landing_pages_site_id ON public.landing_pages(site_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_created_at ON public.landing_pages(created_at DESC);
