
-- Fix storage policies for company-docs bucket: restrict to role-based access
DROP POLICY IF EXISTS "Authenticated users can upload company docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read company docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company docs" ON storage.objects;

-- Builder/employee can manage all company docs
CREATE POLICY "Builder/employee can manage company docs"
ON storage.objects FOR ALL
USING (
  bucket_id = 'company-docs' 
  AND (public.has_role(auth.uid(), 'builder'::public.app_role) OR public.has_role(auth.uid(), 'employee'::public.app_role))
)
WITH CHECK (
  bucket_id = 'company-docs' 
  AND (public.has_role(auth.uid(), 'builder'::public.app_role) OR public.has_role(auth.uid(), 'employee'::public.app_role))
);

-- Clients can only read company docs for their linked accounts
CREATE POLICY "Client can read linked company docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'company-docs'
  AND public.has_role(auth.uid(), 'client'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.ad_accounts a
    INNER JOIN public.user_accounts ua ON ua.account_id = a.id
    WHERE ua.user_id = auth.uid()
    AND a.company_pdf_url LIKE '%' || storage.objects.name
  )
);
