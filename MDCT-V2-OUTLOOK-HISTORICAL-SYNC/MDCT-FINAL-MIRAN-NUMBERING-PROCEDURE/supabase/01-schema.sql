create extension if not exists pgcrypto;

create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,email text unique not null,full_name text,role text not null default 'VIEWER' check(role in('SUPER_ADMIN','ADMIN','VIEWER')),is_active boolean not null default true,created_at timestamptz default now());
create table public.contractors(id uuid primary key default gen_random_uuid(),name text unique not null,is_active boolean default true);
create table public.facility_codes(code text primary key,description text not null);
create table public.train_codes(code text primary key,description text not null);
create table public.system_codes(code int primary key,description text not null);
create table public.discipline_codes(code text primary key,description text not null);
create table public.document_type_codes(code text primary key,description text not null);
create table public.equipment_codes(code text primary key,description text not null);

insert into public.facility_codes values ('EPF','Early Production Facility'),('SRU','Sulfur Recovery Unit'),('BPP','Bazian Power Plant'),('WP2','Well Pad 2');
insert into public.train_codes values ('0','Common'),('1','Train 1'),('2','Train 2'),('3','Train 3'),('4','SRU Train 1'),('5','SRU Train 2');

insert into public.discipline_codes values
('GE','General for all disciplines'),('AR','Architectural / Building Engineering'),('CE','Civil Engineering'),('CN','Construction'),('CO','Commissioning'),('EG','Engineering General'),('EL','Electrical Engineering'),('HS','Health, Safety, Security & Environment'),('HV','HVAC Engineering'),('IC','Instrumentation & Control'),('IF','Interface Management'),('ME','Mechanical Engineering'),('OM','Operations & Maintenance'),('PC','Process Engineering'),('PI','Piping Engineering'),('PL','Pipeline Engineering'),('PM','Project Management'),('QA','Quality Control / Quality Assurance'),('RI','Risk Management'),('SC','Supply Chain - Procurement & Logistics'),('SE','Structural Engineering'),('TC','Telecommunication Engineering'),('TS','Technical Safety'),('PE','Planning Engineer');

insert into public.document_type_codes values
('ASY','Assembly Drawings'),('BOM','Bill of Materials'),('BOD','Basis of Design'),('BFD','Block Flow Diagram'),('CLC','Calculation'),('CER','Certificate'),('CHL','Checklist'),('C&E','Cause and Effect Chart'),('CON','Contract'),('CST','Cost Estimate'),('DTS','Data Sheet'),('DET','Detail Drawing'),('DWG','Drawing'),('ELD','Engineering Line Diagram'),('GAD','General Arrangements'),('HUD','Hook-up Diagram'),('HMB','Heat and Material Balance'),('IOM','Installation & Operation Manual'),('ISO','Isometric'),('LST','List / Index / Register'),('LPD','Loop Diagram'),('LAY','Layout'),('MAN','Manual'),('MST','Method Statement'),('MTR','Material Requisition'),('MDL','3D Model'),('MRB','Manufacturing Record Book'),('PHL','Philosophy'),('PID','Piping Instrumentation Diagram'),('PFD','Process Flow Diagram'),('PLN','Plan'),('PRD','Procedure'),('PTP','Plot Plan'),('RPT','Report'),('RFQ','Request for Quotation'),('SCH','Schedule'),('SOW','Scope of Works'),('SHD','Shop Drawing'),('SLD','Single Line Diagrams'),('SPC','Specification'),('STD','Standard'),('STY','Study'),('TBE','Technical Bid Evaluation'),('TEN','Technical Note'),('TIE','Tie-in Schedule'),('SWD','Schematic Wiring Diagram'),('UFD','Utility Flow Diagram'),('VFD','Variable Frequency Drive'),('HTP','Heat Trace Panel'),('JNB','Junction Box'),('RFI','Request For Information'),('RFP','Request For Proposal'),('ITP','Inspection and Test Plan');

insert into public.equipment_codes values
('A','Package and Miscellaneous Equipment'),('BL','Boilers'),('B','Blower'),('C','Compressor'),('D','Driver'),('E','Exchanger'),('F','Filters'),('FS','Flare Stack'),('G','Generator'),('H','Heaters'),('J','Jets / Ejectors'),('JB','Junction Box'),('K','Compressors and Expanders'),('I','Instrument'),('PL','Pig Launchers'),('PR','Pig Receivers'),('M','Mixers / Manifolds'),('P','Pumps'),('R','Telecommunication'),('S','Separators'),('T','Storage Tanks'),('TW','Tower'),('U','Safety Equipment'),('V','Vessels'),('W','Weighing Equipment'),('X','Stationary Transport Equipment'),('Y','Wellhead Equipment'),('Z','Loading Arms / Stations'),('GT','Turbine Generator'),('GE','Gas Engine'),('KE','Compressor Engine'),('KT','Compressor Turbine'),('PG','Pump Gearbox'),('PM','Pump Electric'),('KM','Fan Electric Motor'),('EM','Electric Motor'),('EF','Cooler Fan'),('SB','Switchboard'),('DB','Distribution Board'),('UP','AC UPS'),('BC','DC UPS'),('TR','Transformer'),('SS','Soft Starter'),('CM','SCMS'),('MI','Miscellaneous'),('SR','Strainer'),('VA','Valves'),('AD','Air Dryer'),('FA','Fans and Blowers'),('GB','Gear Box'),('DE','Diesel Engine'),('VS','Vent Stack'),('DNP','Drain Pit'),('CPL','Control Panel'),('UH','Unit Heater'),('LPS','Line Pipe Seamless'),('LPL','Line Pipe LSAW'),('BTE','Barred Tee'),('HIB','Hot Induction Bend');

insert into public.contractors(name) values ('Enerflex'),('ILF'),('Technomak'),('Emerson'),('ENKA'),('Havatek'),('IGCC'),('Specserv') on conflict do nothing;

create table public.projects(id uuid primary key default gen_random_uuid(),name text unique not null);
create table public.transmittals(id uuid primary key default gen_random_uuid(),transmittal_number text unique not null,direction text,project_id uuid references public.projects(id),contractor_id uuid references public.contractors(id),transmittal_date date,outlook_email_web_link text,email_subject text,email_sender text);
create table public.documents(id uuid primary key default gen_random_uuid(),document_number text unique not null,document_title text,numbering_format text,project_code text default 'MR',facility_code text references public.facility_codes(code),train_code text references public.train_codes(code),system_code int,train_system_code text,equipment_code text references public.equipment_codes(code),discipline_code text references public.discipline_codes(code),document_type_code text references public.document_type_codes(code),sequence_no text,contractor_id uuid references public.contractors(id),package_name text);
create table public.document_revisions(id uuid primary key default gen_random_uuid(),document_id uuid references public.documents(id) on delete cascade,revision text not null,issue_status text not null check(issue_status in('IFR','IFA','IFC','IFU','IFI','IFD','IFP','RLM','AB')),submission_transmittal_id uuid references public.transmittals(id),submitted_date date,due_date date,return_transmittal_id uuid references public.transmittals(id),returned_date date,return_code int check(return_code in(1,2,3,4)),return_status text,needs_review boolean default false,unique(document_id,revision,issue_status));

create or replace function public.parse_docno() returns trigger language plpgsql as $$
declare p text[];
begin
 new.document_number:=upper(trim(new.document_number)); p:=string_to_array(new.document_number,'-');
 if array_length(p,1)=6 then new.numbering_format:='ENGINEERING';new.project_code:=p[1];new.facility_code:=p[2];new.train_system_code:=p[3];new.train_code:=substring(p[3],1,1);new.system_code:=substring(p[3],2,2)::int;new.discipline_code:=p[4];new.document_type_code:=p[5];new.sequence_no:=p[6];new.equipment_code:=null;
 elsif array_length(p,1)=7 then new.numbering_format:='VENDOR';new.project_code:=p[1];new.facility_code:=p[2];new.train_system_code:=p[3];new.train_code:=substring(p[3],1,1);new.system_code:=substring(p[3],2,2)::int;new.equipment_code:=p[4];new.discipline_code:=p[5];new.document_type_code:=p[6];new.sequence_no:=p[7];
 else raise exception 'Invalid Miran document number structure'; end if;
 if new.project_code<>'MR' then raise exception 'Project code must be MR'; end if;
 if new.train_system_code !~ '^[0-9]{3}$' then raise exception 'TSS must be three digits'; end if;
 if new.sequence_no !~ '^[0-9]{4}$' then raise exception 'Sequence must be four digits'; end if;
 return new;
end $$;
create trigger t_doc before insert or update of document_number on public.documents for each row execute function public.parse_docno();

create or replace function public.rev_rules() returns trigger language plpgsql as $$
begin
 new.revision:=upper(trim(new.revision));new.issue_status:=upper(trim(new.issue_status));
 if new.submitted_date is not null and new.due_date is null then new.due_date:=new.submitted_date+5; end if;
 new.return_status:=case new.return_code when 1 then 'Approved' when 2 then 'Approved with Comments' when 3 then 'Rejected' when 4 then 'For Information Only' else null end;
 if new.issue_status in('IFR','IFA') and new.revision !~ '^[A-Z]+$' then new.needs_review:=true; end if;
 if new.issue_status in('IFC','IFU','IFI','IFD','IFP') and new.revision !~ '^[0-9]+$' then new.needs_review:=true; end if;
 if new.issue_status='RLM' and new.revision !~ '^[0-9]+\.[0-9]+$' then new.needs_review:=true; end if;
 if new.issue_status='AB' and new.revision !~ '^AB[0-9]+$' then new.needs_review:=true; end if;
 return new;
end $$;
create trigger t_rev before insert or update on public.document_revisions for each row execute function public.rev_rules();

create or replace view public.document_register_v as
select dr.id revision_id,c.name contractor_name,d.document_number,d.document_title,d.project_code,d.facility_code,d.train_system_code,d.discipline_code,dc.description discipline_name,d.document_type_code,dt.description document_type_name,
dr.revision,dr.issue_status,st.transmittal_number submission_transmittal,dr.submitted_date,dr.due_date,rt.transmittal_number return_transmittal,dr.returned_date,dr.return_code,dr.return_status,
case when dr.returned_date is not null then 'RETURNED' when dr.due_date is not null and current_date>dr.due_date then 'OVERDUE' else 'UNDER REVIEW' end status,
case when dr.returned_date is null and dr.due_date is not null and current_date>dr.due_date then current_date-dr.due_date else 0 end overdue_days,
coalesce(rt.outlook_email_web_link,st.outlook_email_web_link) email_web_link
from public.document_revisions dr join public.documents d on d.id=dr.document_id left join public.contractors c on c.id=d.contractor_id left join public.discipline_codes dc on dc.code=d.discipline_code left join public.document_type_codes dt on dt.code=d.document_type_code left join public.transmittals st on st.id=dr.submission_transmittal_id left join public.transmittals rt on rt.id=dr.return_transmittal_id;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.profiles(id,email,full_name,role,is_active) values(new.id,lower(new.email),split_part(new.email,'@',1),case when lower(new.email)='sarwar.khalid@miranenergy.com' then 'SUPER_ADMIN' else 'VIEWER' end,true) on conflict(id) do nothing;return new;end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;alter table public.contractors enable row level security;alter table public.projects enable row level security;alter table public.transmittals enable row level security;alter table public.documents enable row level security;alter table public.document_revisions enable row level security;
create policy read_profiles on public.profiles for select to authenticated using(true);
create policy read_contractors on public.contractors for select to authenticated using(true);
create policy read_projects on public.projects for select to authenticated using(true);
create policy read_transmittals on public.transmittals for select to authenticated using(true);
create policy read_documents on public.documents for select to authenticated using(true);
create policy read_revisions on public.document_revisions for select to authenticated using(true);
grant select on public.document_register_v to authenticated;
grant select on public.facility_codes,public.train_codes,public.discipline_codes,public.document_type_codes,public.equipment_codes to authenticated;
create index ix_docno on public.documents(document_number);create index ix_disc on public.documents(discipline_code);create index ix_submitted on public.document_revisions(submitted_date desc);
