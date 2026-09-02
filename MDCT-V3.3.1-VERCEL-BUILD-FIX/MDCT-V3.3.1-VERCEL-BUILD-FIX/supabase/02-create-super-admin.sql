insert into public.profiles(id,email,full_name,role,is_active)
select id,lower(email),'Sarwar Khalid','SUPER_ADMIN',true from auth.users
where lower(email)=lower('sarwar.khalid@miranenergy.com')
on conflict(id) do update set role='SUPER_ADMIN',is_active=true;
