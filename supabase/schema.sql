-- USERS
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  full_name text,
  avatar_url text,
  role text check (role in ('student','admin')) default 'student',
  created_at timestamptz default now()
);

-- COURSES
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  cover_image text,
  total_xp integer default 0,
  created_at timestamptz default now()
);

-- MODULES
create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  title text,
  description text,
  order_index integer,
  created_at timestamptz default now()
);

-- LESSONS
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  title text,
  video_url text,
  duration integer,
  order_index integer,
  created_at timestamptz default now()
);

-- PROGRESS
create table if not exists progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  is_completed boolean default false,
  xp_earned integer default 0,
  updated_at timestamptz default now()
);

-- ACHIEVEMENTS
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  icon text,
  rarity text check (rarity in ('common','rare','epic','legendary')) default 'common'
);

-- USER_ACHIEVEMENTS
create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  achievement_id uuid references achievements(id) on delete cascade,
  unlocked_at timestamptz default now()
);

-- ROW LEVEL SECURITY

-- USERS
alter table users enable row level security;

create policy "Users can view and edit only themselves"
  on users for all using (auth.uid() = id) with check (auth.uid() = id);

-- PROGRESS
alter table progress enable row level security;

create policy "Users can manage only their own progress"
  on progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- COURSES, MODULES, LESSONS (public read access)
alter table courses enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;

create policy "All users can read courses" on courses for select using (true);
create policy "All users can read modules" on modules for select using (true);
create policy "All users can read lessons" on lessons for select using (true);

-- ACHIEVEMENTS (public read access)
alter table achievements enable row level security;
create policy "All users can read achievements" on achievements for select using (true);

-- USER_ACHIEVEMENTS
alter table user_achievements enable row level security;
create policy "Users can view only their own achievements"
  on user_achievements for select using (auth.uid() = user_id);

