create extension if not exists pgcrypto;

create table if not exists public.user_plan (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('A', 'B', 'C')),
  source text not null default 'manual' check (source in ('manual', 'checkout', 'admin', 'migration')),
  activated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('A', 'B', 'C')),
  event_type text not null check (event_type in ('set', 'upgrade', 'downgrade', 'renew', 'admin', 'migration')),
  source text not null default 'manual' check (source in ('manual', 'checkout', 'admin', 'migration')),
  effective_from timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_plan_ledger_user_id_created_at
  on public.plan_ledger (user_id, created_at desc);

alter table public.user_plan enable row level security;
alter table public.plan_ledger enable row level security;

create policy "user_plan_select_own"
  on public.user_plan
  for select
  using (auth.uid() = user_id);

create policy "plan_ledger_select_own"
  on public.plan_ledger
  for select
  using (auth.uid() = user_id);