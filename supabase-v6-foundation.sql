create extension if not exists pgcrypto;

-- =========================================================
-- PROFILES
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  auth_provider text,
  last_active_team_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- TEAMS
-- =========================================================

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists teams_name_unique_idx
  on public.teams (lower(name));

create unique index if not exists teams_slug_unique_idx
  on public.teams (lower(slug));

-- =========================================================
-- TEAM MEMBERSHIPS
-- One active membership per user in this version
-- =========================================================

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  status text not null default 'active' check (status in ('active')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (team_id, user_id)
);

-- =========================================================
-- JOIN REQUESTS
-- =========================================================

create table if not exists public.team_join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, requester_user_id, status)
);

-- =========================================================
-- INVITES
-- =========================================================

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  is_revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists team_invites_team_idx
  on public.team_invites (team_id);

-- =========================================================
-- MEMBERS (placeholder/team roster)
-- =========================================================

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  color text not null,
  max_pto integer not null default 25 check (max_pto >= 0),
  max_parental integer not null default 0 check (max_parental >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists members_team_name_unique
  on public.members (team_id, lower(name));

-- =========================================================
-- DAYS OFF
-- =========================================================

create table if not exists public.days_off (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  type text not null check (type in ('pto', 'sick', 'parental')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint days_off_date_order check (end_date >= start_date)
);

create index if not exists days_off_team_idx
  on public.days_off (team_id);

create index if not exists days_off_member_idx
  on public.days_off (member_id);

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at
before update on public.teams
for each row
execute function public.set_updated_at();

drop trigger if exists trg_team_memberships_updated_at on public.team_memberships;
create trigger trg_team_memberships_updated_at
before update on public.team_memberships
for each row
execute function public.set_updated_at();

drop trigger if exists trg_team_join_requests_updated_at on public.team_join_requests;
create trigger trg_team_join_requests_updated_at
before update on public.team_join_requests
for each row
execute function public.set_updated_at();

drop trigger if exists trg_days_off_updated_at on public.days_off;
create trigger trg_days_off_updated_at
before update on public.days_off
for each row
execute function public.set_updated_at();

-- =========================================================
-- PROFILE AUTO-CREATION
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    auth_provider
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.app_metadata->>'provider', 'email')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    auth_provider = coalesce(excluded.auth_provider, public.profiles.auth_provider),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================

create or replace function public.current_user_team_id()
returns uuid
language sql
stable
as $$
  select last_active_team_id
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
  )
$$;

create or replace function public.is_team_admin(p_team_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role in ('owner', 'admin')
  )
$$;

create or replace function public.is_team_owner(p_team_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.team_memberships tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role = 'owner'
  )
$$;

-- =========================================================
-- TEAM CREATION FUNCTION
-- =========================================================

create or replace function public.create_team_with_owner(
  p_team_name text,
  p_creator_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_slug text;
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_team_name is null or btrim(p_team_name) = '' then
    raise exception 'Team name is required';
  end if;

  if exists (
    select 1 from public.teams
    where lower(name) = lower(btrim(p_team_name))
  ) then
    raise exception 'A team with this name already exists';
  end if;

  v_slug := lower(regexp_replace(btrim(p_team_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);

  if v_slug = '' then
    v_slug := 'team';
  end if;

  if exists (
    select 1 from public.teams
    where lower(slug) = lower(v_slug)
  ) then
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
  end if;

  insert into public.teams (name, slug, created_by)
  values (btrim(p_team_name), v_slug, v_user_id)
  returning id into v_team_id;

  insert into public.team_memberships (team_id, user_id, role, status)
  values (v_team_id, v_user_id, 'owner', 'active')
  on conflict (user_id) do update
  set
    team_id = excluded.team_id,
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

  update public.profiles
  set last_active_team_id = v_team_id,
      updated_at = now()
  where id = v_user_id;

  if p_creator_name is not null and btrim(p_creator_name) <> '' then
    insert into public.members (team_id, user_id, name, color, max_pto, max_parental)
    values (v_team_id, v_user_id, btrim(p_creator_name), '#3B82F6', 25, 0)
    on conflict do nothing;
  end if;

  return v_team_id;
end;
$$;

-- =========================================================
-- REQUEST APPROVAL FUNCTION
-- =========================================================

create or replace function public.approve_join_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_user_id uuid;
begin
  select team_id, requester_user_id
  into v_team_id, v_user_id
  from public.team_join_requests
  where id = p_request_id
    and status = 'pending';

  if v_team_id is null then
    raise exception 'Request not found or not pending';
  end if;

  if not public.is_team_admin(v_team_id) then
    raise exception 'Not authorized';
  end if;

  insert into public.team_memberships (team_id, user_id, role, status)
  values (v_team_id, v_user_id, 'member', 'active')
  on conflict (user_id) do update
  set
    team_id = excluded.team_id,
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

  update public.profiles
  set last_active_team_id = v_team_id,
      updated_at = now()
  where id = v_user_id;

  update public.team_join_requests
  set status = 'approved',
      updated_at = now()
  where id = p_request_id;

  update public.team_join_requests
  set status = 'cancelled',
      updated_at = now()
  where requester_user_id = v_user_id
    and status = 'pending'
    and id <> p_request_id;
end;
$$;

-- =========================================================
-- REQUEST REJECTION FUNCTION
-- =========================================================

create or replace function public.reject_join_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  select team_id
  into v_team_id
  from public.team_join_requests
  where id = p_request_id
    and status = 'pending';

  if v_team_id is null then
    raise exception 'Request not found or not pending';
  end if;

  if not public.is_team_admin(v_team_id) then
    raise exception 'Not authorized';
  end if;

  update public.team_join_requests
  set status = 'rejected',
      updated_at = now()
  where id = p_request_id;
end;
$$;

-- =========================================================
-- INVITE CREATION FUNCTION
-- =========================================================

create or replace function public.create_team_invite(p_team_id uuid, p_expiry_hours integer default 72)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not public.is_team_admin(p_team_id) then
    raise exception 'Not authorized';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.team_invites (team_id, token, created_by, expires_at)
  values (
    p_team_id,
    v_token,
    auth.uid(),
    now() + make_interval(hours => p_expiry_hours)
  );

  return v_token;
end;
$$;

-- =========================================================
-- ACCEPT INVITE FUNCTION
-- =========================================================

create or replace function public.accept_team_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_user_id uuid;
  v_invite_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id, team_id
  into v_invite_id, v_team_id
  from public.team_invites
  where token = p_token
    and is_revoked = false
    and used_at is null
    and expires_at > now();

  if v_invite_id is null then
    raise exception 'Invite invalid or expired';
  end if;

  insert into public.team_memberships (team_id, user_id, role, status)
  values (v_team_id, v_user_id, 'member', 'active')
  on conflict (user_id) do update
  set
    team_id = excluded.team_id,
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

  update public.profiles
  set last_active_team_id = v_team_id,
      updated_at = now()
  where id = v_user_id;

  update public.team_invites
  set used_by = v_user_id,
      used_at = now()
  where id = v_invite_id;

  return v_team_id;
end;
$$;

-- =========================================================
-- PROMOTE USER FUNCTION
-- =========================================================

create or replace function public.promote_member_to_admin(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  select team_id
  into v_team_id
  from public.team_memberships
  where id = p_membership_id;

  if v_team_id is null then
    raise exception 'Membership not found';
  end if;

  if not public.is_team_owner(v_team_id) then
    raise exception 'Only owner can promote admins';
  end if;

  update public.team_memberships
  set role = 'admin',
      updated_at = now()
  where id = p_membership_id
    and role = 'member';
end;
$$;

-- =========================================================
-- RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.team_join_requests enable row level security;
alter table public.team_invites enable row level security;
alter table public.members enable row level security;
alter table public.days_off enable row level security;

-- PROFILES
drop policy if exists "profiles select self" on public.profiles;
create policy "profiles select self"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- TEAMS
drop policy if exists "teams visible to members" on public.teams;
create policy "teams visible to members"
on public.teams
for select
to authenticated
using (
  public.is_team_member(id)
  or true
);

drop policy if exists "teams create authenticated" on public.teams;
create policy "teams create authenticated"
on public.teams
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "teams update admins" on public.teams;
create policy "teams update admins"
on public.teams
for update
to authenticated
using (public.is_team_admin(id))
with check (public.is_team_admin(id));

-- TEAM MEMBERSHIPS
drop policy if exists "memberships visible to self or team admins" on public.team_memberships;
create policy "memberships visible to self or team admins"
on public.team_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_team_admin(team_id)
);

drop policy if exists "memberships insert via auth funcs only" on public.team_memberships;
create policy "memberships insert via auth funcs only"
on public.team_memberships
for insert
to authenticated
with check (false);

drop policy if exists "memberships update by owner/admin rules" on public.team_memberships;
create policy "memberships update by owner/admin rules"
on public.team_memberships
for update
to authenticated
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

-- JOIN REQUESTS
drop policy if exists "join requests browse own or team admins" on public.team_join_requests;
create policy "join requests browse own or team admins"
on public.team_join_requests
for select
to authenticated
using (
  requester_user_id = auth.uid()
  or public.is_team_admin(team_id)
);

drop policy if exists "join requests create own" on public.team_join_requests;
create policy "join requests create own"
on public.team_join_requests
for insert
to authenticated
with check (requester_user_id = auth.uid());

drop policy if exists "join requests cancel own pending" on public.team_join_requests;
create policy "join requests cancel own pending"
on public.team_join_requests
for update
to authenticated
using (requester_user_id = auth.uid())
with check (requester_user_id = auth.uid());

-- INVITES
drop policy if exists "invites visible to team admins" on public.team_invites;
create policy "invites visible to team admins"
on public.team_invites
for select
to authenticated
using (public.is_team_admin(team_id));

drop policy if exists "invites create disabled direct" on public.team_invites;
create policy "invites create disabled direct"
on public.team_invites
for insert
to authenticated
with check (false);

drop policy if exists "invites update admins" on public.team_invites;
create policy "invites update admins"
on public.team_invites
for update
to authenticated
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

-- MEMBERS
drop policy if exists "members visible to team members" on public.members;
create policy "members visible to team members"
on public.members
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "members managed by admins" on public.members;
create policy "members managed by admins"
on public.members
for insert
to authenticated
with check (public.is_team_admin(team_id));

drop policy if exists "members update by admins" on public.members;
create policy "members update by admins"
on public.members
for update
to authenticated
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

drop policy if exists "members delete by admins" on public.members;
create policy "members delete by admins"
on public.members
for delete
to authenticated
using (public.is_team_admin(team_id));

-- DAYS OFF
drop policy if exists "days_off visible to team members" on public.days_off;
create policy "days_off visible to team members"
on public.days_off
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "days_off managed by admins" on public.days_off;
create policy "days_off managed by admins"
on public.days_off
for insert
to authenticated
with check (public.is_team_admin(team_id));

drop policy if exists "days_off update by admins" on public.days_off;
create policy "days_off update by admins"
on public.days_off
for update
to authenticated
using (public.is_team_admin(team_id))
with check (public.is_team_admin(team_id));

drop policy if exists "days_off delete by admins" on public.days_off;
create policy "days_off delete by admins"
on public.days_off
for delete
to authenticated
using (public.is_team_admin(team_id));

-- =========================================================
-- REALTIME
-- =========================================================

alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.team_memberships;
alter publication supabase_realtime add table public.team_join_requests;
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.days_off;
