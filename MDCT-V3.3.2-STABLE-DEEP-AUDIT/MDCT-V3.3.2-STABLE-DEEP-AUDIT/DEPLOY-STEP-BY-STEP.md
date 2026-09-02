# Deploy V3.3.2 without changing the Vercel project again

1. In GitHub, open the folder currently configured as the Vercel Root Directory.
2. Replace its contents with this package's files. Do not create another nested folder.
3. Keep the existing Vercel Root Directory unchanged.
4. Commit the upload. Vercel should deploy automatically.
5. If you instead upload this as a new top-level folder, use `MDCT-V3.3.2-STABLE-DEEP-AUDIT` as Root Directory.

No new Supabase migration is required if `04-pst-import-upgrade.sql` already ran successfully.
