# MDCT V3.2 — Large Outlook Historical Import

This release fixes the 5+ GB historical archive workflow without Microsoft Graph/admin approval.

## Important architecture

A normal browser cannot safely load a 5.14 GB PST into one JavaScript ArrayBuffer. V3.2 therefore supports two modes:

- **Standard PST:** for PSTs up to 750 MB.
- **Large Archive Mode:** recommended for multi-GB archives. In Classic Outlook, select all messages in the MDCT Historical folder and drag them once to a Windows folder. Outlook creates `.msg` files. Select that folder in MDCT; the browser reads one `.msg` at a time and sends only extracted metadata to Supabase.

No raw PST, MSG attachment, or full email body is stored in Supabase.

## Vercel Root Directory

If uploaded to GitHub exactly as the package folder shown, use:

`MDCT-V3.2-LARGE-OUTLOOK-IMPORT`

If you replace the files inside your existing V3.1 GitHub folder instead, keep your existing root directory unchanged.
