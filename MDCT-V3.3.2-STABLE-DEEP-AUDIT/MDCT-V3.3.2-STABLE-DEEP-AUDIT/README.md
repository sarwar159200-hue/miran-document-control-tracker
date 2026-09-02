# MDCT V3.3.2 — Stable Deep Attachment Audit

This build removes the direct PST parser dependency that could stop Vercel during dependency installation.

For the 5.14 GB historical mailbox, use **Historical Import → Deep Attachment Audit** and select the folder of Outlook `.msg` files exported from Classic Outlook.

The audit inspects every direct attachment, ZIP contents, and attached `.msg` messages; it extracts document metadata only and does not store the engineering documents.

## Deployment

Best option: replace the files inside your existing Vercel root folder and keep the current Root Directory unchanged. Vercel will redeploy from the commit automatically.

If uploaded as a separate top-level folder, Root Directory: `MDCT-V3.3.2-STABLE-DEEP-AUDIT`.
