-- Create user roles enum and table
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    created_at timestamp with time zone default now(),
    unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS policies for user_roles
create policy "Users can view their own roles"
on public.user_roles
for select
using (auth.uid() = user_id);

create policy "Admins can manage all roles"
on public.user_roles
for all
using (public.has_role(auth.uid(), 'admin'));

-- Dashboard stats table
create table public.dashboard_stats (
    id uuid primary key default gen_random_uuid(),
    active_today integer default 0,
    active_today_change numeric(5,2) default 0,
    messages_today integer default 0,
    messages_today_change numeric(5,2) default 0,
    active_week integer default 0,
    active_week_change numeric(5,2) default 0,
    at_risk integer default 0,
    updated_at timestamp with time zone default now()
);

alter table public.dashboard_stats enable row level security;

create policy "Admins can view dashboard stats"
on public.dashboard_stats
for select
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update dashboard stats"
on public.dashboard_stats
for all
using (public.has_role(auth.uid(), 'admin'));

-- Insert initial stats row
insert into public.dashboard_stats (active_today, active_today_change, messages_today, messages_today_change, active_week, active_week_change, at_risk)
values (45, 12, 234, 8, 127, 15, 12);

-- Admin reports table
create table public.admin_reports (
    id uuid primary key default gen_random_uuid(),
    period_label text not null,
    start_date date not null,
    end_date date not null,
    created_at timestamp with time zone default now(),
    active_users integer,
    sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
    issues_count integer default 0,
    summary text,
    key_points jsonb,
    recommendations jsonb,
    report_file_url text
);

alter table public.admin_reports enable row level security;

create policy "Admins can view all reports"
on public.admin_reports
for select
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can create reports"
on public.admin_reports
for insert
with check (public.has_role(auth.uid(), 'admin'));