-- Add new roles to the app_role enum
do $$
begin
  if not exists (select 1 from pg_enum where enumlabel = 'hospital_coordinator' and enumtypid = 'public.app_role'::regtype) then
    alter type public.app_role add value 'hospital_coordinator';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'shelter_department' and enumtypid = 'public.app_role'::regtype) then
    alter type public.app_role add value 'shelter_department';
  end if;
end $$;

-- Update handle_new_user to include the new roles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  role_value text := coalesce(meta ->> 'role', 'Volunteer');
  app_role_value public.app_role := coalesce(
    (meta ->> 'app_role')::public.app_role,
    case
      when role_value = 'Volunteer' then 'civilian'::public.app_role
      when role_value = 'Disaster Coordinator' then 'admin'::public.app_role
      when role_value = 'Police' then 'coordinator'::public.app_role
      when role_value = 'Rescue Worker' then 'rescue_team'::public.app_role
      when role_value = 'Medical Staff' then 'ambulance_team'::public.app_role
      when role_value = 'Fire Department' then 'fire_response'::public.app_role
      when role_value = 'hospital_coordinator' then 'hospital_coordinator'::public.app_role
      when role_value = 'shelter_department' then 'shelter_department'::public.app_role
      else 'civilian'::public.app_role
    end
  );
begin
  insert into public.profiles (
    id,
    username,
    full_name,
    email,
    phone,
    organization,
    role,
    emergency_contact,
    app_role
  )
  values (
    new.id,
    coalesce(meta ->> 'username', split_part(new.email, '@', 1)),
    coalesce(meta ->> 'full_name', ''),
    new.email,
    nullif(meta ->> 'phone', ''),
    nullif(meta ->> 'organization', ''),
    role_value::public.worker_role,
    nullif(meta ->> 'emergency_contact', ''),
    app_role_value
  )
  on conflict (id) do update set
    username = excluded.username,
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    organization = excluded.organization,
    role = excluded.role,
    emergency_contact = excluded.emergency_contact,
    app_role = excluded.app_role,
    updated_at = now();

  update auth.users
  set raw_app_meta_data =
    raw_app_meta_data || jsonb_build_object('app_role', app_role_value)
  where id = new.id;

  return new;
end;
$$;
