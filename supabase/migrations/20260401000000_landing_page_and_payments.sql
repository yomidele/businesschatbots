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

CREATE POLICY "Users can view payment confirmations for own sites" ON public.payment_confirmations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = payment_confirmations.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Users can update payment confirmations for own sites" ON public.payment_confirmations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = payment_confirmations.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Service role full access payment_confirmations" ON public.payment_confirmations
  FOR ALL TO service_role USING (true);

CREATE POLICY "Public can insert payment confirmations" ON public.payment_confirmations
  FOR INSERT TO public WITH CHECK (true);

CREATE TRIGGER update_payment_confirmations_updated_at BEFORE UPDATE ON public.payment_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_payment_confirmations_site ON public.payment_confirmations(site_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_order ON public.payment_confirmations(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_status ON public.payment_confirmations(status);
