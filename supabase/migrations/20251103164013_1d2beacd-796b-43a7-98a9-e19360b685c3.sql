-- USER_SURVEY table to store welcome quiz responses
create table if not exists user_survey (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  job_role text,
  city text,
  motivation text,
  study_hours text,
  experience text,
  goal text,
  learning_style text,
  expectation text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table user_survey enable row level security;

-- Users can view and edit only their own survey
create policy "Users can manage their own survey"
  on user_survey for all 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);