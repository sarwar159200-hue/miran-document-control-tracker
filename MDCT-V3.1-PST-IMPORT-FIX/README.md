# MDCT V3.1 — Historical PST Import Fix

This release fixes the Classic Outlook PST read failure seen in Chrome/Edge when Outlook keeps the exported PST locked.

## What changed
- File is selected first; analysis starts only when the user clicks **Start Historical Analysis**.
- Robust browser file reading with stream + FileReader fallback.
- Clear detection/message when Windows/Outlook still locks the PST.
- Visible file-read percentage and email-detection progress.
- Metadata import batch size reduced to 25 for greater Vercel/Supabase reliability.
- Raw PST, email bodies and attachments are not stored in Supabase.

## Important
After exporting the PST, **close Classic Outlook completely**, wait about 10 seconds, then select the PST in MDCT and click **Start Historical Analysis**. You do not need to export the PST again.
