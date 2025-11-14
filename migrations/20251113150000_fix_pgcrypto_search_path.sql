-- Ensure pgcrypto helpers remain accessible inside ensure_client_for_contact
-- even when the function restricts search_path for security reasons.

create extension if not exists "pgcrypto";

create or replace function public.ensure_client_for_contact(contact_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_contact public.workflow_contacts%rowtype;
  v_client_id uuid;
  v_email text;
  v_normalized_email text;
  v_generated_email text;
  v_now timestamptz := timezone('utc', now());
begin
  if contact_id is null then
    return null;
  end if;

  select * into v_contact from public.workflow_contacts where id = contact_id;

  if not found then
    return null;
  end if;

  v_email := coalesce(v_contact.email, '');
  v_normalized_email := nullif(lower(trim(v_email)), '');

  if v_normalized_email is not null then
    select id into v_client_id from auth.users where lower(email) = v_normalized_email limit 1;
  end if;

  if v_client_id is null then
    select p.user_id into v_client_id
    from public.profiles p
    where coalesce((p.metadata ->> 'workflow_contact_id')::uuid, '00000000-0000-0000-0000-000000000000') = contact_id
    limit 1;
  end if;

  if v_client_id is null then
    v_client_id := gen_random_uuid();
    v_generated_email := coalesce(nullif(trim(v_contact.email), ''), concat('workflow+', v_client_id::text, '@fastlease.dev'));

    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      phone,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at
    ) values (
      v_client_id,
      '00000000-0000-0000-0000-000000000000',
      v_generated_email,
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      v_now,
      null,
      null,
      jsonb_build_object(
        'full_name', v_contact.full_name,
        'origin', 'workflow_contact',
        'workflow_contact_id', contact_id
      ),
      'authenticated',
      'authenticated',
      v_now,
      v_now
    );
  end if;

  insert into public.profiles (
    user_id,
    status,
    full_name,
    metadata,
    created_at,
    updated_at
  ) values (
    v_client_id,
    'pending',
    v_contact.full_name,
    jsonb_build_object(
      'origin', 'workflow_contact',
      'workflow_contact_id', contact_id,
      'source_phone', v_contact.phone
    ),
    v_now,
    v_now
  )
  on conflict (user_id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name),
        metadata = coalesce(public.profiles.metadata, '{}'::jsonb) || coalesce(excluded.metadata, '{}'::jsonb);

  insert into public.user_roles (user_id, role, assigned_at)
  values (v_client_id, 'CLIENT', v_now)
  on conflict (user_id, role) do nothing;

  return v_client_id;
end;
$$;

comment on function public.ensure_client_for_contact(uuid) is 'Ensures there is a client (auth.users) linked to the given workflow contact and returns the client_id.';
