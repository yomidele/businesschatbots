
-- Add delivery_status and status columns to orders (without breaking existing data)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Create payments table to track individual payment transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  reference TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access payments" ON public.payments FOR ALL TO service_role USING (true);
CREATE POLICY "Users can view payments for own sites" ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = payments.site_id AND sites.user_id = auth.uid()));
CREATE POLICY "Public can insert payments" ON public.payments FOR INSERT TO public WITH CHECK (true);

-- Create receipts table
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access receipts" ON public.receipts FOR ALL TO service_role USING (true);
CREATE POLICY "Users can view receipts for own sites" ON public.receipts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = receipts.site_id AND sites.user_id = auth.uid()));
CREATE POLICY "Public can insert receipts" ON public.receipts FOR INSERT TO public WITH CHECK (true);

-- Create themes table for per-site widget theming
CREATE TABLE IF NOT EXISTS public.themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL UNIQUE REFERENCES public.sites(id) ON DELETE CASCADE,
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  secondary_color TEXT NOT NULL DEFAULT '#8b5cf6',
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  text_color TEXT NOT NULL DEFAULT '#1f2937',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own themes" ON public.themes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = themes.site_id AND sites.user_id = auth.uid()));
CREATE POLICY "Service role full access themes" ON public.themes FOR ALL TO service_role USING (true);
CREATE POLICY "Public can view themes" ON public.themes FOR SELECT TO public USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_site_id ON public.payments(site_id);
CREATE INDEX IF NOT EXISTS idx_receipts_order_id ON public.receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_receipts_site_id ON public.receipts(site_id);

-- Updated_at triggers
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_themes_updated_at BEFORE UPDATE ON public.themes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
