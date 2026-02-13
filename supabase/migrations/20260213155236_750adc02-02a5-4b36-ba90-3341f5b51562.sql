
-- Create public storage bucket for ad thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-thumbnails', 'ad-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public can view ad thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-thumbnails');

-- Allow service role (edge functions) to upload
CREATE POLICY "Service role can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad-thumbnails');

-- Allow service role to update thumbnails
CREATE POLICY "Service role can update thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ad-thumbnails');
