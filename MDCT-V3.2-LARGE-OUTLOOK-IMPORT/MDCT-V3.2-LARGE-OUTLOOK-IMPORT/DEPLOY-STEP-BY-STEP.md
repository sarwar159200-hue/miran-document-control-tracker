# Deploy MDCT V3.2

1. Upload the contents of this package to GitHub.
2. Recommended clean folder name: `MDCT-V3.2-LARGE-OUTLOOK-IMPORT`.
3. In Vercel → Settings → Build and Deployment → Root Directory, set exactly:
   `MDCT-V3.2-LARGE-OUTLOOK-IMPORT`
4. Save and redeploy.
5. No new Supabase SQL is required if `04-pst-import-upgrade.sql` was already run successfully.
6. Sign in → Historical Import.
7. For a 5.14 GB archive use **Large Archive Mode**.
8. In Classic Outlook, open the historical folder, select all emails, and drag them to one Windows folder. This is a one-time export; no additional software is needed.
9. In MDCT choose that folder and click **Start Large Archive Analysis**.

The importer reads one `.msg` at a time, parses metadata and attachment names in browser memory, sends small metadata batches to the existing API, and does not upload the original messages.
