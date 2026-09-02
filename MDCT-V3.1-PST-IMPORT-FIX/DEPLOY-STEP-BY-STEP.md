# MDCT V3.1 deployment

1. In GitHub, open the exact folder currently configured as the Vercel Root Directory.
2. Replace its existing V3 files with the contents of this ZIP. The ZIP contains `app`, `lib`, `public`, `supabase`, `package.json`, etc. directly at its root — do not create another nested V3.1 folder.
3. Commit the files to `main`.
4. Let Vercel redeploy. Keep the same Root Directory you already configured.
5. No new Supabase SQL migration is required if `04-pst-import-upgrade.sql` was already run successfully.
6. Close Classic Outlook completely. Wait about 10 seconds.
7. In MDCT: Historical Import → Choose File → select the existing PST → Start Historical Analysis.
