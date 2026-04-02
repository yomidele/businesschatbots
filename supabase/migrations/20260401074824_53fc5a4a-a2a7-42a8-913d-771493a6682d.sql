-- Create product-images bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for product-images bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated uploads to product-images' AND tablename = 'objects') THEN
    CREATE POLICY "Allow authenticated uploads to product-images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read product-images' AND tablename = 'objects') THEN
    CREATE POLICY "Allow public read product-images"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated update product-images' AND tablename = 'objects') THEN
    CREATE POLICY "Allow authenticated update product-images"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated delete product-images' AND tablename = 'objects') THEN
    CREATE POLICY "Allow authenticated delete product-images"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'product-images');
  END IF;
END $$;