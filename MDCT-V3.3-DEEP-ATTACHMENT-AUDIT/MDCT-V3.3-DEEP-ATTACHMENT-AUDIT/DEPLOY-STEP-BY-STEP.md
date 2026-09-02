# MDCT V3.3 Deployment

1. Upload the `MDCT-V3.3-DEEP-ATTACHMENT-AUDIT` folder to the GitHub repository root.
2. In Vercel set **Root Directory** exactly to:
   `MDCT-V3.3-DEEP-ATTACHMENT-AUDIT`
3. Save and redeploy.
4. Confirm the deployment status is **Ready**.
5. Open MDCT > Historical Import > Deep Attachment Audit.
6. Select the Windows folder containing the exported `.msg` emails from the historical Outlook folder.
7. Click **Start Deep Attachment Audit**.
8. After completion, compare `Document Events Found`, `Register Updates`, and `Needs Review` before relying on the Document Register.

No new Supabase SQL is required for V3.3 if migration 04 was already run.
