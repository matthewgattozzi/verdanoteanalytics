
-- Create public storage bucket for ad videos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ad-videos', 'ad-videos', true, 524288000)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public can view ad videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-videos');

-- Service role upload
CREATE POLICY "Service role can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad-videos');

-- Service role update
CREATE POLICY "Service role can update videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ad-videos');
