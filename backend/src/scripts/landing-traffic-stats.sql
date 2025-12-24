-- Landing DB schema for Traffic Dashboard daily snapshots + exchange rates
-- Safe to run multiple times (IF NOT EXISTS)

create table if not exists public.exchange_rates (
  date date primary key,
  usd_to_kzt numeric(12, 4) not null,
  source text,
  fetched_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists exchange_rates_date_idx
  on public.exchange_rates (date);

create table if not exists public.traffic_stats (
  id uuid default gen_random_uuid() primary key,
  stat_date date not null,
  user_id uuid,
  team text,
  ad_account_id text,
  campaign_id text,
  campaign_name text,
  spend_usd numeric(14, 4) default 0,
  spend_kzt numeric(14, 4) default 0,
  impressions bigint default 0,
  clicks bigint default 0,
  reach bigint default 0,
  ctr numeric(10, 6) default 0,
  cpc_usd numeric(12, 6) default 0,
  cpm_usd numeric(12, 6) default 0,
  frequency numeric(12, 6) default 0,
  usd_to_kzt_rate numeric(12, 4) default 0,
  source text default 'facebook',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists traffic_stats_unique
  on public.traffic_stats (stat_date, user_id, campaign_id);

create index if not exists traffic_stats_date_user_idx
  on public.traffic_stats (stat_date, user_id);

create index if not exists traffic_stats_date_team_idx
  on public.traffic_stats (stat_date, team);

create index if not exists traffic_stats_campaign_idx
  on public.traffic_stats (campaign_id);

create table if not exists public.traffic_sync_state (
  id uuid default gen_random_uuid() primary key,
  scope text not null,
  user_id uuid,
  ad_account_id text,
  campaign_id text,
  etag text,
  last_modified text,
  last_synced_date date,
  updated_at timestamptz default now()
);

create unique index if not exists traffic_sync_state_unique
  on public.traffic_sync_state (scope, user_id, ad_account_id, campaign_id);
