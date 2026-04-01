-- ============================================
-- FIX 1: Storage RLS Policies for product-images bucket
-- ============================================

-- Create the product-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload to product-images bucket
CREATE POLICY "Allow authenticated uploads to product-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow public read access to product-images
CREATE POLICY "Allow public read product-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated update product-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated delete product-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- ============================================
-- FIX 2: Payment Links Fallback Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  link TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payment links"
ON public.payment_links
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = payment_links.site_id AND sites.user_id = auth.uid()));

CREATE POLICY "Service role full access payment_links"
ON public.payment_links
FOR ALL TO service_role USING (true);

CREATE POLICY "Public can read payment links by site"
ON public.payment_links
FOR SELECT TO public
USING (true);

CREATE INDEX IF NOT EXISTS idx_payment_links_site_amount ON public.payment_links(site_id, amount);
