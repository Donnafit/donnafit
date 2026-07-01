-- Create products-images bucket for product photo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products-images',
  'products-images',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access for all product images
CREATE POLICY "Product images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products-images');

-- Admin users can upload product images
CREATE POLICY "Admin users can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'products-images'
    AND auth.role() = 'authenticated'
  );

-- Admin users can update product images
CREATE POLICY "Admin users can update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'products-images'
    AND auth.role() = 'authenticated'
  );

-- Admin users can delete product images
CREATE POLICY "Admin users can delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'products-images'
    AND auth.role() = 'authenticated'
  );
