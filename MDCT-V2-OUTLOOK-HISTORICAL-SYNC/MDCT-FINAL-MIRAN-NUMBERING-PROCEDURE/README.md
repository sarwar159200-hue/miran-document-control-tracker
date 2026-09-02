# MDCT V2 — Miran Document Control Tracker

Cloud-only MDCT for GitHub + Vercel + Supabase + Microsoft 365.

V2 adds Microsoft 365 delegated read-only mailbox connection, resumable historical email scanning, recent sync, duplicate protection, DCC/document-number parsing, Miran numbering validation, document register updates, Outlook source links, Code-1 to Code-4 KPI cards and monthly/discipline dashboard views.

No document files or attachment contents are stored. Google Drive is not required for this version.

For an existing deployment, run only `supabase/03-outlook-sync-upgrade.sql`, then replace the application code and redeploy.
