-- 模拟面试题库云端同步：按用户存储项目列表
create table if not exists public.interview_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null,
  name text not null default '',
  jd text not null default '',
  resume text not null default '',
  questions jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_default boolean not null default false,
  unique(user_id, project_id)
);

comment on table public.interview_projects is '用户模拟面试题库（云端同步）';
create index if not exists idx_interview_projects_user_id on public.interview_projects (user_id);

alter table public.interview_projects enable row level security;

create policy "Users can manage own interview projects"
  on public.interview_projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
