-- Fix register_user RPC: add auth.identities entry and provider in raw_app_meta_data.
-- GoTrue's signInWithPassword requires both to exist for email/password login.

create or replace function public.register_user(
  p_email text,
  p_password text,
  p_username text,
  p_full_name text,
  p_phone text,
  p_organization text,
  p_city text,
  p_state text,
  p_role text,
  p_emergency_contact text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_id uuid;
  new_id uuid := gen_random_uuid();
  meta jsonb := jsonb_build_object(
    'username', p_username,
    'full_name', p_full_name,
    'phone', p_phone,
    'organization', p_organization,
    'city', p_city,
    'state', p_state,
    'role', p_role,
    'emergency_contact', p_emergency_contact,
    'app_role', p_role
  );
  app_role_val public.app_role;
begin
  select into app_role_val case
    when p_role = 'coordinator' then 'coordinator'::public.app_role
    when p_role = 'rescue_team' then 'rescue_team'::public.app_role
    when p_role = 'ambulance_team' then 'ambulance_team'::public.app_role
    when p_role = 'fire_response' then 'fire_response'::public.app_role
    else 'civilian'::public.app_role
  end;

  -- Check for existing email in auth.users
  select id into existing_id from auth.users where email = p_email and is_sso_user = false;

  if found then
    if exists (select 1 from public.profiles where id = existing_id) then
      raise exception 'An account with this email already exists.';
    end if;
    -- Orphaned — update auth user and insert profile
    update auth.users set
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = now(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = meta,
      updated_at = now()
    where id = existing_id;

    insert into public.profiles (id, username, full_name, email, phone, organization, city, state, emergency_contact, app_role, created_at, updated_at)
    values (existing_id, p_username, p_full_name, p_email, nullif(p_phone, ''), nullif(p_organization, ''), nullif(p_city, ''), nullif(p_state, ''), nullif(p_emergency_contact, ''), app_role_val, now(), now())
    on conflict (id) do nothing;

    return existing_id;
  end if;

  if exists (select 1 from public.profiles where lower(username) = lower(p_username)) then
    raise exception 'This username is already taken.';
  end if;

  insert into auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    aud, role, created_at, updated_at,
    is_sso_user, is_anonymous
  )
  values (
    new_id, p_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, meta,
    'authenticated', 'authenticated', now(), now(),
    false, false
  );

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (
    new_id, new_id,
    jsonb_build_object('sub', new_id::text, 'email', p_email),
    'email', p_email, now(), now(), now()
  )
  on conflict (id, provider) do nothing;

  -- The trigger on_auth_user_created also inserts the profile.
  -- This insert is a guaranteed backup — if the trigger already inserted,
  -- on conflict do nothing skips it.
  insert into public.profiles (id, username, full_name, email, phone, organization, city, state, emergency_contact, app_role, created_at, updated_at)
  values (new_id, p_username, p_full_name, p_email, nullif(p_phone, ''), nullif(p_organization, ''), nullif(p_city, ''), nullif(p_state, ''), nullif(p_emergency_contact, ''), app_role_val, now(), now())
  on conflict (id) do nothing;

  return new_id;
end;
$$;

-- Backfill: add identities and fix app_meta_data for existing users that lack them.
-- This enables login for users that registered before the fix.

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
select
  u.id,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.email,
  u.email_confirmed_at,
  u.created_at,
  now()
from auth.users u
where
  u.is_sso_user = false
  and u.email is not null
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

update auth.users
set raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
where raw_app_meta_data is null or raw_app_meta_data = '{}'::jsonb;
