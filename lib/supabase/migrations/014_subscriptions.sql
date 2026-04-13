-- Subscriptions: one row per user, updated by Stripe webhook
create table subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end bool default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "read_own_subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- Writes are service-role only (from webhook handler); no insert/update policy.

-- Transcription log: rate limiting
create table transcription_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table transcription_log enable row level security;

create policy "read_own_transcription_log" on transcription_log
  for select using (auth.uid() = user_id);

create index transcription_log_user_created_idx
  on transcription_log(user_id, created_at desc);
