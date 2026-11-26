-- =====================================================================
-- Web design business website -- Supabase schema (course assignment)
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS / OR REPLACE).
-- Not executed against a live project when written: if the editor shows an
-- error, copy the exact message and fix that statement.
--
-- Tables (5):
--   profiles              one row per registered user (clients + admin)
--   projects              "Projects completed" page
--   trainings             "Web design trainings" page
--   training_enrollments  a client applying for a training (links 2 tables)
--   contact_messages      "Contacts" page form submissions
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. profiles (linked to Supabase Auth users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  email        text not null,
  phone        text,
  organisation text,
  role         text not null default 'client' check (role in ('client', 'admin')),
  created_at   timestamptz not null default now()
);

-- Create the profile automatically when someone registers.
-- The role is NEVER read from user-supplied data: everyone starts as 'client'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, organisation)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'organisation'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper functions. SECURITY DEFINER so they can read profiles without
-- re-triggering the profiles policies (avoids "infinite recursion" errors).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- 2. projects
-- ---------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  summary      text not null,
  category     text not null default 'Website',
  client_name  text,
  year         integer check (year between 2000 and 2100),
  image_url    text,
  project_url  text,
  featured     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. trainings
-- ---------------------------------------------------------------------
create table if not exists public.trainings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null,
  level        text not null default 'Beginner'
                 check (level in ('Beginner', 'Intermediate', 'Advanced')),
  duration     text not null,
  mode         text not null default 'In person'
                 check (mode in ('In person', 'Online', 'Hybrid')),
  fee_ugx      integer check (fee_ugx >= 0),
  seats        integer check (seats >= 0),
  start_date   date,
  is_open      boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. training_enrollments (a registered client applies for a training)
-- ---------------------------------------------------------------------
create table if not exists public.training_enrollments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  training_id        uuid not null references public.trainings(id) on delete cascade,
  status             text not null default 'pending'
                       check (status in ('pending', 'confirmed', 'cancelled')),
  payment_status     text not null default 'unpaid'
                       check (payment_status in ('unpaid', 'pay_on_arrival', 'pending_verification', 'paid', 'failed', 'refunded')),
  payment_method     text,
  payment_reference  text,
  flw_transaction_id text,
  amount_paid_ugx    integer not null default 0 check (amount_paid_ugx >= 0),
  paid_at            timestamptz,
  created_at         timestamptz not null default now(),
  unique (user_id, training_id)
);

create index if not exists enrollments_user_idx on public.training_enrollments (user_id);
create index if not exists enrollments_training_idx on public.training_enrollments (training_id);

-- ---------------------------------------------------------------------
-- 5. training_payments (Flutterwave UGX & Pay-on-Arrival payment records)
-- ---------------------------------------------------------------------
create table if not exists public.training_payments (
  id                 uuid primary key default gen_random_uuid(),
  enrollment_id      uuid references public.training_enrollments(id) on delete set null,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  training_id        uuid not null references public.trainings(id) on delete cascade,
  tx_ref             text not null unique,
  flw_transaction_id text,
  provider           text not null default 'flutterwave'
                       check (provider in ('flutterwave', 'pay_on_arrival')),
  payment_channel    text,
  amount_ugx         integer not null check (amount_ugx >= 0),
  currency           text not null default 'UGX',
  status             text not null default 'initiated'
                       check (status in ('initiated', 'pay_on_arrival', 'pending_verification', 'successful', 'failed', 'cancelled')),
  mode               text not null default 'sandbox'
                       check (mode in ('sandbox', 'live', 'offline')),
  payer_name         text,
  payer_email        text,
  payer_phone        text,
  verified_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists training_payments_user_idx on public.training_payments (user_id);
create index if not exists training_payments_enrollment_idx on public.training_payments (enrollment_id);
create index if not exists training_payments_training_idx on public.training_payments (training_id);

-- ---------------------------------------------------------------------
-- 5. contact_messages (public contact form)
-- ---------------------------------------------------------------------
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 100),
  email       text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  subject     text check (char_length(subject) <= 150),
  message     text not null check (char_length(message) between 5 and 2000),
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.projects             enable row level security;
alter table public.trainings            enable row level security;
alter table public.training_enrollments enable row level security;
alter table public.training_payments    enable row level security;
alter table public.contact_messages     enable row level security;

-- profiles: you see and edit yourself; the admin sees everyone.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- You may update your own row, but you cannot change your own role.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- projects and trainings: public read, admin write.
drop policy if exists "projects_select_public" on public.projects;
create policy "projects_select_public" on public.projects
  for select to anon, authenticated using (true);

drop policy if exists "projects_admin_write" on public.projects;
create policy "projects_admin_write" on public.projects
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "trainings_select_public" on public.trainings;
create policy "trainings_select_public" on public.trainings
  for select to anon, authenticated using (true);

drop policy if exists "trainings_admin_write" on public.trainings;
create policy "trainings_admin_write" on public.trainings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- enrollments: apply and view your own; admin sees and manages all.
drop policy if exists "enrollments_select_own_or_admin" on public.training_enrollments;
create policy "enrollments_select_own_or_admin" on public.training_enrollments
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "enrollments_insert_own" on public.training_enrollments;
create policy "enrollments_insert_own" on public.training_enrollments
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "enrollments_delete_own_or_admin" on public.training_enrollments;
create policy "enrollments_delete_own_or_admin" on public.training_enrollments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "enrollments_insert_guard_payment_fields" on public.training_enrollments;
create policy "enrollments_insert_guard_payment_fields" on public.training_enrollments
  as restrictive for insert to authenticated
  with check (
    status = 'pending'
    and payment_status in ('unpaid', 'pay_on_arrival', 'pending_verification')
    and amount_paid_ugx = 0
  );

drop policy if exists "enrollments_update_own_payment" on public.training_enrollments;
create policy "enrollments_update_own_payment" on public.training_enrollments
  for update to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and payment_status in ('unpaid', 'pay_on_arrival', 'pending_verification', 'failed')
    and amount_paid_ugx = 0
  );

drop policy if exists "enrollments_update_admin" on public.training_enrollments;
create policy "enrollments_update_admin" on public.training_enrollments
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- training_payments: view & initiate your own; only verified Edge Function / admin marks paid.
drop policy if exists "payments_select_own_or_admin" on public.training_payments;
create policy "payments_select_own_or_admin" on public.training_payments
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "payments_insert_own" on public.training_payments;
create policy "payments_insert_own" on public.training_payments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status in ('initiated', 'pay_on_arrival', 'pending_verification')
    and verified_at is null
  );

drop policy if exists "payments_update_admin" on public.training_payments;
create policy "payments_update_admin" on public.training_payments
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- contact messages: anyone can send; only the admin can read or manage.
-- (In the app, do NOT chain .select() on the insert: visitors cannot read rows.)
drop policy if exists "contact_insert_anyone" on public.contact_messages;
create policy "contact_insert_anyone" on public.contact_messages
  for insert to anon, authenticated with check (true);

drop policy if exists "contact_select_admin" on public.contact_messages;
create policy "contact_select_admin" on public.contact_messages
  for select to authenticated using (public.is_admin());

drop policy if exists "contact_update_admin" on public.contact_messages;
create policy "contact_update_admin" on public.contact_messages
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "contact_delete_admin" on public.contact_messages;
create policy "contact_delete_admin" on public.contact_messages
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- 7. Table privileges (explicit, so it works whatever the project defaults)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.projects, public.trainings to anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant insert, update, delete on public.projects, public.trainings to authenticated;
grant select, insert, update, delete on public.training_enrollments to authenticated;
grant select, update, delete on public.contact_messages to authenticated;

revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;
revoke execute on function public.current_user_role() from public, anon;
grant  execute on function public.current_user_role() to authenticated;

-- ---------------------------------------------------------------------
-- 8. Sample data (REPLACE with your own real content)
-- ---------------------------------------------------------------------
insert into public.projects (title, summary, category, client_name, year, featured)
select * from (values
  ('Kahawa Connect',
   'Offline-first mobile app that helps Ugandan smallholder coffee farmers map their plots, screen them for deforestation and prepare EUDR evidence reports.',
   'Mobile application', 'Final-year research project', 2026, true),
  ('Sample project 1 - replace with your own work',
   'Describe a real website or class project you built: what it does and who it is for.',
   'Website', 'Your client or course', 2026, false),
  ('Sample project 2 - replace with your own work',
   'Another real project. Add a screenshot URL and a live link when you have them.',
   'Web application', 'Your client or course', 2025, false)
) as v(title, summary, category, client_name, year, featured)
where not exists (select 1 from public.projects);

insert into public.trainings (title, description, level, duration, mode, fee_ugx, seats, start_date)
select * from (values
  ('HTML and CSS Foundations',
   'Build and style responsive pages from scratch: structure, layout, typography and mobile design.',
   'Beginner', '4 weeks', 'In person', 150000, 20, current_date + 30),
  ('JavaScript for the Web',
   'Make pages interactive: forms, the DOM, fetching data and working with an online database.',
   'Intermediate', '6 weeks', 'Hybrid', 250000, 15, current_date + 45),
  ('Build a Business Website with Supabase',
   'Plan, build and launch a dynamic business website with user accounts and a database.',
   'Advanced', '8 weeks', 'Online', 350000, 12, current_date + 60)
) as v(title, description, level, duration, mode, fee_ugx, seats, start_date)
where not exists (select 1 from public.trainings);

-- ---------------------------------------------------------------------
-- 9. Make YOURSELF the admin (run AFTER you register on the site)
-- ---------------------------------------------------------------------
-- update public.profiles set role = 'admin' where email = 'your-email@example.com';
