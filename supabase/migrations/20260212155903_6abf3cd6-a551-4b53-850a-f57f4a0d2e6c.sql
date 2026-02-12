
-- Create storage bucket for company documents
INSERT INTO storage.buckets (id, name, public) VALUES ('company-docs', 'company-docs', false);

-- Allow authenticated users to upload to company-docs
CREATE POLICY "Authenticated users can upload company docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-docs' AND auth.role() = 'authenticated');

-- Allow authenticated users to read company docs
CREATE POLICY "Authenticated users can read company docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-docs' AND auth.role() = 'authenticated');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "Authenticated users can update company docs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-docs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete company docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-docs' AND auth.role() = 'authenticated');

-- Add PDF URL column to ad_accounts
ALTER TABLE public.ad_accounts ADD COLUMN company_pdf_url text DEFAULT NULL;
