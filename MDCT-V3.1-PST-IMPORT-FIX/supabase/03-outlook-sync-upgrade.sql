-- MDCT Outlook / Microsoft 365 upgrade for an EXISTING MDCT database.
-- Run once in Supabase SQL Editor after 01-schema.sql and 02-create-super-admin.sql.

-- 1) Complete Miran system-code reference data.
insert into public.system_codes(code,description) values
(0,'Common / Not system specific'),(1,'Wellhead Facilities / Flow Lines'),(2,'Inlet Facilities'),(3,'Feed Gas Compression'),(4,'Gas Sweetening Unit'),(5,'Molecular Sieve Dehydration Unit'),(6,'TEG Dehydration / EG Regeneration'),(7,'HCDP Control Unit'),(8,'Condensate Stabilization / Flash'),(9,'LPG Recovery'),(10,'Sales Gas Compression'),(11,'Fiscal Metering'),(12,'Outlet Facilities'),(13,'Nitrogen Rejection'),(14,'Dehydration'),(15,'Mercury Removal'),(16,'Firewater Storage / Distribution'),(17,'Dew Point Control'),(18,'Propane Refrigeration'),(19,'Gas Gathering'),(20,'Instrument and Utility Air'),(21,'Separation'),(22,'Fractionation'),(23,'Treating'),(24,'Vapor Recovery'),(25,'Produced Water Treatment'),(26,'Storage and Export'),(27,'Sales Gas and Metering'),(28,'Sales Gas Pipeline'),(29,'Condensate Loading'),(30,'Sulfur Storage / Export'),(31,'Fuel Gas Unit'),(32,'Instrument Air'),(33,'Refrigeration Package'),(34,'Produced Water Treatment Unit'),(35,'Heat Medium Unit'),(36,'Flare Package Cold Vent'),(37,'Incinerator'),(38,'Water Treatment'),(39,'Open / Closed Drain'),(40,'Firewater System'),(41,'Nitrogen Generation'),(42,'Cooling Water'),(43,'HVAC'),(44,'Thermal Oxidizer'),(45,'Hot Oil'),(46,'Utility Water'),(47,'Domestic Water'),(48,'Demin Water'),(49,'Spare'),(51,'Amine Storage'),(52,'Glycol Storage'),(53,'Condensate Storage / Pumping'),(54,'LPG Storage / Pumping'),(55,'Propane Storage'),(56,'Chemical Storage'),(57,'Diesel Storage / Pumping'),(58,'Spare'),(59,'SRU'),(60,'TGTU'),(61,'Degassing'),(62,'Sewage Treatment'),(63,'Diesel Storage / Distribution'),(64,'Methanol Storage / Distribution'),(65,'Chemicals Storage / Injection'),(66,'Flare HP / LT'),(67,'Flare LP'),(68,'Spare'),(69,'Closed Drain'),(70,'Power Generation'),(71,'Emergency Power Generation'),(72,'MV Distribution'),(73,'LV Distribution'),(74,'Corrosion Protection'),(75,'Earthing / Lightning'),(76,'Cable Routing Layout'),(77,'Lighting Layout'),(78,'SCMS'),(79,'Electrical Heat Tracing'),(80,'ICSS'),(81,'PCS'),(82,'ESD'),(83,'Fire and Gas'),(84,'Spare'),(85,'Training Simulator'),(86,'Telecommunications'),(87,'Corrosion Monitoring'),(88,'Machine Monitoring'),(89,'Fiber Optic'),(91,'Foundations'),(92,'Roads / Paving / Fencing / Layout'),(93,'Drainage'),(94,'Structure'),(95,'Buildings'),(96,'Earthwork'),(97,'Camp Cabin'),(98,'Spare'),(99,'Spare')
on conflict(code) do update set description=excluded.description;

-- Add the missing FK safely after reference data exists.
do $$ begin
  if not exists(select 1 from pg_constraint where conname='documents_system_code_fkey') then
    alter table public.documents add constraint documents_system_code_fkey foreign key(system_code) references public.system_codes(code);
  end if;
end $$;

-- 2) Microsoft mailbox connection. No browser/RLS read policy is created on this table.
create table if not exists public.microsoft_connections(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  mailbox_email text,
  microsoft_user_id text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  connected_at timestamptz,
  last_sync_at timestamptz,
  history_started_at timestamptz,
  history_completed_at timestamptz,
  history_next_link text,
  history_complete boolean not null default false,
  messages_scanned bigint not null default 0,
  relevant_messages bigint not null default 0,
  updated_at timestamptz default now()
);
alter table public.microsoft_connections enable row level security;

-- 3) Email metadata only. Message bodies and attachments are NOT stored.
create table if not exists public.email_messages(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  graph_message_id text not null,
  internet_message_id text,
  subject text,
  sender_email text,
  recipient_emails text[],
  received_at timestamptz,
  web_link text,
  is_relevant boolean not null default false,
  parse_confidence text check(parse_confidence in('HIGH','MEDIUM','LOW')),
  parsed_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id,graph_message_id)
);
alter table public.email_messages enable row level security;
create index if not exists ix_email_user_received on public.email_messages(user_id,received_at desc);
create index if not exists ix_email_relevant on public.email_messages(user_id,is_relevant);

alter table public.document_revisions add column if not exists submission_email_id uuid references public.email_messages(id);
alter table public.document_revisions add column if not exists return_email_id uuid references public.email_messages(id);

-- 4) Active-user / role helpers and stricter browser RLS.
create or replace function public.current_profile_role() returns text language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid() and is_active=true
$$;
create or replace function public.is_active_user() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and is_active=true)
$$;

-- Replace broad read policies.
drop policy if exists read_profiles on public.profiles;
drop policy if exists read_contractors on public.contractors;
drop policy if exists read_projects on public.projects;
drop policy if exists read_transmittals on public.transmittals;
drop policy if exists read_documents on public.documents;
drop policy if exists read_revisions on public.document_revisions;

create policy profiles_self_or_super_read on public.profiles for select to authenticated using(id=auth.uid() or public.current_profile_role()='SUPER_ADMIN');
create policy active_read_contractors on public.contractors for select to authenticated using(public.is_active_user());
create policy active_read_projects on public.projects for select to authenticated using(public.is_active_user());
create policy active_read_transmittals on public.transmittals for select to authenticated using(public.is_active_user());
create policy active_read_documents on public.documents for select to authenticated using(public.is_active_user());
create policy active_read_revisions on public.document_revisions for select to authenticated using(public.is_active_user());

-- Browser writes are restricted to Admin/Super Admin. The Vercel server uses the Supabase secret key.
create policy admin_write_contractors on public.contractors for all to authenticated using(public.current_profile_role() in('SUPER_ADMIN','ADMIN')) with check(public.current_profile_role() in('SUPER_ADMIN','ADMIN'));
create policy admin_write_projects on public.projects for all to authenticated using(public.current_profile_role() in('SUPER_ADMIN','ADMIN')) with check(public.current_profile_role() in('SUPER_ADMIN','ADMIN'));
create policy admin_write_transmittals on public.transmittals for all to authenticated using(public.current_profile_role() in('SUPER_ADMIN','ADMIN')) with check(public.current_profile_role() in('SUPER_ADMIN','ADMIN'));
create policy admin_write_documents on public.documents for all to authenticated using(public.current_profile_role() in('SUPER_ADMIN','ADMIN')) with check(public.current_profile_role() in('SUPER_ADMIN','ADMIN'));
create policy admin_write_revisions on public.document_revisions for all to authenticated using(public.current_profile_role() in('SUPER_ADMIN','ADMIN')) with check(public.current_profile_role() in('SUPER_ADMIN','ADMIN'));

-- 5) Lifecycle-aware review flagging. It flags suspicious sequences rather than rejecting them.
create or replace function public.rev_rules() returns trigger language plpgsql as $$
declare prev record;
begin
 new.revision:=upper(trim(new.revision)); new.issue_status:=upper(trim(new.issue_status));
 if new.submitted_date is not null and new.due_date is null then new.due_date:=new.submitted_date+5; end if;
 new.return_status:=case new.return_code when 1 then 'Approved' when 2 then 'Approved with Comments' when 3 then 'Rejected' when 4 then 'For Information Only' else null end;
 new.needs_review:=coalesce(new.needs_review,false);
 if new.issue_status in('IFR','IFA') and new.revision !~ '^[A-Z]+$' then new.needs_review:=true; end if;
 if new.issue_status in('IFC','IFU','IFI','IFD','IFP') and new.revision !~ '^[0-9]+$' then new.needs_review:=true; end if;
 if new.issue_status='RLM' and new.revision !~ '^[0-9]+\.[0-9]+$' then new.needs_review:=true; end if;
 if new.issue_status='AB' and new.revision !~ '^AB[0-9]+$' then new.needs_review:=true; end if;
 if new.revision='A' and new.issue_status<>'IFR' then new.needs_review:=true; end if;
 if tg_op='INSERT' then
   select revision,issue_status,return_code into prev from public.document_revisions where document_id=new.document_id order by submitted_date desc nulls last,created_at desc nulls last limit 1;
   if found then
     if prev.issue_status='IFR' and prev.return_code in(2,3) and new.issue_status<>'IFR' then new.needs_review:=true; end if;
     if prev.issue_status='IFR' and prev.return_code=1 and new.issue_status not in('IFA','RLM','AB') then new.needs_review:=true; end if;
     if prev.issue_status='IFA' and prev.return_code=1 and new.issue_status not in('IFC','IFU','IFI','IFD','IFP','RLM','AB') then new.needs_review:=true; end if;
   end if;
 end if;
 return new;
end $$;

-- created_at is useful for ordering lifecycle events.
alter table public.document_revisions add column if not exists created_at timestamptz default now();

-- Ensure code reference tables remain readable for authenticated active users.
grant select on public.system_codes to authenticated;

-- 6) Update the register view so Open Email also works when no formal transmittal number was parsed.
create or replace view public.document_register_v as
select dr.id revision_id,c.name contractor_name,d.document_number,d.document_title,d.project_code,d.facility_code,d.train_system_code,d.discipline_code,dc.description discipline_name,d.document_type_code,dt.description document_type_name,
dr.revision,dr.issue_status,st.transmittal_number submission_transmittal,dr.submitted_date,dr.due_date,rt.transmittal_number return_transmittal,dr.returned_date,dr.return_code,dr.return_status,
case when dr.returned_date is not null then 'RETURNED' when dr.due_date is not null and current_date>dr.due_date then 'OVERDUE' else 'UNDER REVIEW' end status,
case when dr.returned_date is null and dr.due_date is not null and current_date>dr.due_date then current_date-dr.due_date else 0 end overdue_days,
coalesce(rem.web_link,rt.outlook_email_web_link,sem.web_link,st.outlook_email_web_link) email_web_link
from public.document_revisions dr
join public.documents d on d.id=dr.document_id
left join public.contractors c on c.id=d.contractor_id
left join public.discipline_codes dc on dc.code=d.discipline_code
left join public.document_type_codes dt on dt.code=d.document_type_code
left join public.transmittals st on st.id=dr.submission_transmittal_id
left join public.transmittals rt on rt.id=dr.return_transmittal_id
left join public.email_messages sem on sem.id=dr.submission_email_id
left join public.email_messages rem on rem.id=dr.return_email_id;
grant select on public.document_register_v to authenticated;
