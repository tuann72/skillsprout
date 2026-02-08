-- =============================================
-- SkillSprout: Initial Schema
-- =============================================

-- 1. Profiles (auto-created on signup)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Lesson Plans
create table public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  skill text not null,
  estimated_minutes integer not null,
  objectives text[] not null default '{}',
  current_level text not null,
  goal_level text not null,
  duration text not null,
  daily_commitment text not null,
  raw_plan jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lesson_plans_user_id on public.lesson_plans(user_id);

-- 3. Lessons
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_id uuid not null references public.lesson_plans(id) on delete cascade,
  lesson_number integer not null,
  layer integer not null,
  topic text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced', 'expert')),
  description text not null,
  resources text[] not null default '{}',
  duration_minutes integer not null,
  connections integer[] not null default '{}',
  created_at timestamptz not null default now(),

  unique (lesson_plan_id, lesson_number)
);

create index idx_lessons_plan_id on public.lessons(lesson_plan_id);

-- 4. Layers
create table public.layers (
  id uuid primary key default gen_random_uuid(),
  lesson_plan_id uuid not null references public.lesson_plans(id) on delete cascade,
  layer_number integer not null,
  theme text not null,

  unique (lesson_plan_id, layer_number)
);

-- 5. Lesson Completions
create table public.lesson_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),

  unique (user_id, lesson_id)
);

create index idx_lesson_completions_user_lesson on public.lesson_completions(user_id, lesson_id);

-- =============================================
-- Row-Level Security
-- =============================================

alter table public.profiles enable row level security;
alter table public.lesson_plans enable row level security;
alter table public.lessons enable row level security;
alter table public.layers enable row level security;
alter table public.lesson_completions enable row level security;

-- Profiles
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Lesson Plans
create policy "Users can view own lesson plans"
  on public.lesson_plans for select using (auth.uid() = user_id);
create policy "Users can insert own lesson plans"
  on public.lesson_plans for insert with check (auth.uid() = user_id);
create policy "Users can delete own lesson plans"
  on public.lesson_plans for delete using (auth.uid() = user_id);

-- Lessons
create policy "Users can view lessons in own plans"
  on public.lessons for select using (
    exists (
      select 1 from public.lesson_plans
      where lesson_plans.id = lessons.lesson_plan_id
      and lesson_plans.user_id = auth.uid()
    )
  );
create policy "Users can insert lessons in own plans"
  on public.lessons for insert with check (
    exists (
      select 1 from public.lesson_plans
      where lesson_plans.id = lessons.lesson_plan_id
      and lesson_plans.user_id = auth.uid()
    )
  );

-- Layers
create policy "Users can view layers in own plans"
  on public.layers for select using (
    exists (
      select 1 from public.lesson_plans
      where lesson_plans.id = layers.lesson_plan_id
      and lesson_plans.user_id = auth.uid()
    )
  );
create policy "Users can insert layers in own plans"
  on public.layers for insert with check (
    exists (
      select 1 from public.lesson_plans
      where lesson_plans.id = layers.lesson_plan_id
      and lesson_plans.user_id = auth.uid()
    )
  );

-- Lesson Completions
create policy "Users can view own completions"
  on public.lesson_completions for select using (auth.uid() = user_id);
create policy "Users can insert own completions"
  on public.lesson_completions for insert with check (auth.uid() = user_id);
create policy "Users can delete own completions"
  on public.lesson_completions for delete using (auth.uid() = user_id);

-- =============================================
-- Auto-create profile on signup
-- =============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
