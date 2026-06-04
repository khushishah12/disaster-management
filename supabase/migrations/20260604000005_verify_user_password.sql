-- RPC to verify a user's password directly against the stored bcrypt hash.
-- Used as a fallback when GoTrue's signInWithPassword rejects a login
-- for users registered via the old RPC bypass (which stored passwords
-- using extensions.crypt() but may not produce hashes GoTrue accepts).

create or replace function public.verify_user_password(p_email text, p_password text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select id
  from auth.users
  where email = p_email
    and extensions.crypt(p_password, encrypted_password) = encrypted_password
    and is_sso_user = false
  limit 1;
$$;

revoke all on function public.verify_user_password(text, text) from public;
grant execute on function public.verify_user_password(text, text) to anon, authenticated;
