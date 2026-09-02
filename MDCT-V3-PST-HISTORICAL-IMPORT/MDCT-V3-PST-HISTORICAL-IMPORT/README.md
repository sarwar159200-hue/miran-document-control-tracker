# MDCT V3 — Historical PST Import (No Microsoft Admin Required)

This version removes Microsoft Graph as a requirement for historical analysis.

## Historical workflow
1. In Classic Outlook, export the relevant DCC folder as one `.pst` file.
2. Log in to MDCT.
3. Open **Historical Import**.
4. Select the PST file.
5. The browser reads the PST and MDCT sends extracted metadata to Supabase in batches.

The PST file itself, attachments and full email bodies are not stored in Supabase.

## Miran logo
The supplied Miran Energy logo is shown on the login page from `public/miran-energy-logo.png`.

## Supabase
If your database already has the V2 Outlook upgrade, run only `supabase/04-pst-import-upgrade.sql`.
If `email_messages` does not exist, run `03-outlook-sync-upgrade.sql` first, then `04-pst-import-upgrade.sql`.

## Vercel
Microsoft environment variables may remain, but V3 historical PST import does not use them.
