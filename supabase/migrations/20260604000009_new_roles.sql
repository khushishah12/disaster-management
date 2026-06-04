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
-- NOTE: worker_role type and profiles.role column were already dropped in
-- 20260603000007_remove_worker_role.sql, so this function must NOT reference them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  app_role_value public.app_role := coalesce(
    (meta ->> 'app_role')::public.app_role,
    case
      when meta ->> 'role' = 'civilian' then 'civilian'::public.app_role
      when meta ->> 'role' = 'coordinator' then 'coordinator'::public.app_role
      when meta ->> 'role' = 'rescue_team' then 'rescue_team'::public.app_role
      when meta ->> 'role' = 'ambulance_team' then 'ambulance_team'::public.app_role
      when meta ->> 'role' = 'fire_response' then 'fire_response'::public.app_role
      when meta ->> 'role' = 'hospital_coordinator' then 'hospital_coordinator'::public.app_role
      when meta ->> 'role' = 'shelter_department' then 'shelter_department'::public.app_role
      else 'civilian'::public.app_role
    end
  );
begin
  insert into public.profiles (
    id, username, full_name, email, phone, organization,
    emergency_contact, app_role
  )
  values (
    new.id,
    coalesce(meta ->> 'username', split_part(new.email, '@', 1)),
    coalesce(meta ->> 'full_name', ''),
    new.email,
    nullif(meta ->> 'phone', ''),
    nullif(meta ->> 'organization', ''),
    nullif(meta ->> 'emergency_contact', ''),
    app_role_value
  )
  on conflict (id) do update set
    username = excluded.username,
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    organization = excluded.organization,
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
