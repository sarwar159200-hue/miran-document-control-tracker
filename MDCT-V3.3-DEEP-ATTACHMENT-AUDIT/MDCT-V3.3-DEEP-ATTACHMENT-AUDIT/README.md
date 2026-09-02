# MDCT V3.3 — Deep Attachment Audit

This release focuses on completeness of the historical Document Register.

## What changed
- Treats every Outlook message as a container, not as one document.
- Enumerates every direct attachment separately.
- Opens ZIP attachments in browser memory and enumerates files inside them (including nested ZIPs to a safe depth).
- Opens attached Outlook `.msg` messages and inspects their attachment names too.
- Uses attachment-level Miran document numbers to create document events.
- Applies the user-confirmed Miran/Lazo workflow heuristic:
  - Lazo + `Dear colleagues` => strong SUBMISSION/internal-circulation signal.
  - Lazo without `Dear colleagues` + return/review wording or Code-1..4 => strong RETURN signal.
  - uncertain direction => Needs Review; it is not guessed.
- Adds import reconciliation counters: direct attachments, nested/ZIP items, document events, submissions, returns.
- Does not store raw emails, PST/MSG files, PDFs, drawings or attachments in Supabase.

## Important
For the 5.14 GB historical archive, use **Deep Attachment Audit** with the `.msg` folder workflow. Do not use Standard PST mode.

No new Supabase migration is required if `04-pst-import-upgrade.sql` was already applied.
