-- Platform banners use the same private, immutable image broker as company branding.
-- Retain the scoped server identity; allow only the two supported object namespaces.
alter policy "Branding server inserts immutable images" on storage.objects
 with check (
  bucket_id='company-branding'
  and auth.uid()='00000000-0000-4000-8000-000000000083'::uuid
  and auth.jwt()->>'jbfd_branding_storage'='v1'
  and (
   name~'^[0-9a-f-]{36}/[0-9a-f-]{36}\.png$'
   or name~'^platform/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$'
  )
 );
