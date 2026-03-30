
-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  image_url TEXT,
  category TEXT DEFAULT 'general',
  stock INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products for own sites" ON public.products
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = products.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Users can insert products for own sites" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM sites WHERE sites.id = products.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Users can update products for own sites" ON public.products
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = products.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Users can delete products for own sites" ON public.products
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = products.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Service role full access products" ON public.products
  FOR ALL TO service_role USING (true);

CREATE POLICY "Public can view products by site" ON public.products
  FOR SELECT TO public
  USING (true);

-- Payment configs table
CREATE TABLE public.payment_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'flutterwave', 'stripe')),
  public_key TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(site_id, provider)
);

ALTER TABLE public.payment_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payment configs" ON public.payment_configs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = payment_configs.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Service role full access payment_configs" ON public.payment_configs
  FOR ALL TO service_role USING (true);

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_reference TEXT,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orders for own sites" ON public.orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = orders.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Service role full access orders" ON public.orders
  FOR ALL TO service_role USING (true);

CREATE POLICY "Public can insert orders" ON public.orders
  FOR INSERT TO public WITH CHECK (true);

-- Add last_active_at to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Trigger for updated_at on products
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on payment_configs
CREATE TRIGGER update_payment_configs_updated_at BEFORE UPDATE ON public.payment_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
