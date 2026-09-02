# MDCT V2 — Outlook Historical Sync Upgrade

This is an upgrade for the already-working MDCT deployment.

## A. Supabase first
1. Open Supabase > SQL Editor > New query.
2. Open `supabase/03-outlook-sync-upgrade.sql` from this package.
3. Copy the full SQL into Supabase and Run it once.
4. Do NOT rerun `01-schema.sql` on the existing database.

The upgrade adds Microsoft mailbox connection metadata, email metadata, complete Miran system codes, stricter RLS, lifecycle review flags and Outlook links. It does not store document files or attachment contents.

## B. GitHub
Replace the current MDCT code with the files from this package. Keep the same Vercel Root Directory currently used by the project.

Important new files include:
- `app/api/microsoft/connect/route.js`
- `app/api/microsoft/callback/route.js`
- `app/api/microsoft/status/route.js`
- `app/api/microsoft/sync/route.js`
- `lib/microsoft.js`
- `lib/email-parser.js`
- `lib/supabase-server.js`
- `supabase/03-outlook-sync-upgrade.sql`

Commit the changes to `main`.

## C. Vercel
Confirm these environment variables already exist in Production:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_REDIRECT_URI`

`MICROSOFT_REDIRECT_URI` must be exactly:
`https://miran-document-control-tracker.vercel.app/api/microsoft/callback`

Redeploy after the GitHub commit if Vercel does not deploy automatically.

## D. Connect Outlook
1. Sign in to MDCT.
2. Open `Email Sync`.
3. Click `Connect Microsoft 365`.
4. Sign in with `sarwar.khalid@miranenergy.com` and approve the requested delegated read-only permissions.
5. Return to MDCT. Status should show CONNECTED.

## E. Historical data
1. Click `Analyze Historical Emails`.
2. Leave the browser tab open while batches are processed.
3. The process stores a cursor in Supabase, so if it stops or the tab closes, click `Continue Historical Scan` later.
4. The scan traverses older mailbox messages and deduplicates by Microsoft Graph message ID.
5. After the full history is complete, use `Sync Recent Emails` for new/recent messages.

## Security
- Microsoft permissions: delegated `User.Read` and `Mail.Read` only.
- No `Mail.Send` or `Mail.ReadWrite`.
- No organization-wide application mailbox permission.
- Microsoft access/refresh tokens are stored only in the server-accessed Supabase connection table, which has RLS enabled and no browser read policy.
- No attachment contents or documents are stored.
