# MDCT V3 Deployment — Cloud Only

1. Supabase SQL Editor: run `supabase/04-pst-import-upgrade.sql` if V2 schema is already installed.
2. GitHub: replace the current MDCT application folder with the contents of this package.
3. Make sure Vercel Root Directory points to the folder containing `package.json`.
4. Vercel redeploys from GitHub automatically.
5. Open MDCT and sign in.
6. Open **Historical Import**.
7. Select the `.pst` exported from Classic Outlook.
8. Keep the browser tab open until the import completes.
9. Review the Dashboard and Document Register. Low-confidence records are marked for review.

No Google Drive is required. No Microsoft tenant approval is required for PST import.
