-- Attribution Safety Net Migration for Landing DB
-- Adds Ad Account mapping table and supports unassigned traffic

-- 1. Create integration_ad_accounts table (Ad Account → Team mapping)
create table if not exists public.integration_ad_accounts (
  account_id varchar(50) primary key,  -- Facebook Ad Account ID (e.g., act_123456)
  team_name varchar(100) not null,     -- Team name (e.g., 'Kenesary')
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists integration_ad_accounts_team_idx
  on public.integration_ad_accounts (team_name);

-- 2. Allow 'Unassigned' team in traffic_stats (no schema change needed, just documenting)
-- The 'team' column already accepts TEXT, so 'Unassigned' is a valid value

-- 3. Create manual_attribution_log table (audit trail for manual assignments)
create table if not exists public.manual_attribution_log (
  id uuid default gen_random_uuid() primary key,
  admin_user_id uuid,                  -- Who made the change
  admin_email text,                    -- Email of admin
  stat_date date not null,             -- Date of traffic stat
  campaign_id text not null,           -- Campaign ID that was reassigned
  old_team text,                       -- Previous team value
  new_team text not null,              -- New team value
  reason text,                         -- Optional reason
  created_at timestamptz default now()
);

create index if not exists manual_attribution_log_date_idx
  on public.manual_attribution_log (stat_date);

create index if not exists manual_attribution_log_campaign_idx
  on public.manual_attribution_log (campaign_id);

-- 4. Add helpful comment to traffic_stats for documentation
comment on column public.traffic_stats.team is
  'Team name from attribution: UTM source (fb_teamname) → Ad Account mapping → Manual assignment. Can be ''Unassigned'' if no match found.';
