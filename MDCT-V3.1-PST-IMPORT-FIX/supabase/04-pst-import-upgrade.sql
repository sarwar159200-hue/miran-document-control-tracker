-- MDCT V3 PST import upgrade. Run AFTER the previous MDCT schema/upgrades.
-- Reuses email_messages as metadata-only import history. No PST/email body/attachment is stored.
alter table public.email_messages add column if not exists import_source text default 'MICROSOFT_GRAPH';
alter table public.email_messages add column if not exists source_folder text;
create index if not exists ix_email_internet_message on public.email_messages(user_id,internet_message_id);
