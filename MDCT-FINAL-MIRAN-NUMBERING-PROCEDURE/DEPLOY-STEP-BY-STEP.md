# Deploy from zero
1. Create a PRIVATE GitHub repository named `miran-document-control-tracker`.
2. Upload all files from this package.
3. Create Supabase project.
4. Run `supabase/01-schema.sql`.
5. In Supabase Authentication create `sarwar.khalid@miranenergy.com`.
6. Run `supabase/02-create-super-admin.sql`.
7. Copy Supabase Project URL, Publishable Key and Secret Key.
8. Import the GitHub repository into Vercel.
9. Add Vercel environment variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   - SUPABASE_SECRET_KEY
10. Deploy.
11. Set Supabase Authentication Site URL to the Vercel URL.
12. Do not configure Google Drive. No documents are stored.
