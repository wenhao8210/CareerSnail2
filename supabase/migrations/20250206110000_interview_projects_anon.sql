-- 未登录用户用匿名 ID 同步的题库表（不依赖 auth.users）
create table if not exists public.interview_projects_anon (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null,
  project_id text not null,
  name text not null default '',
  jd text not null default '',
  resume text not null default '',
  questions jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_default boolean not null default false,
  unique(anonymous_id, project_id)
);

comment on table public.interview_projects_anon is '匿名用户模拟面试题库（按设备 ID 同步，无需登录）';
create index if not exists idx_interview_projects_anon_anonymous_id on public.interview_projects_anon (anonymous_id);

-- 仅允许 service_role 访问（API 后端用）；前端 anon 无法直接读写
alter table public.interview_projects_anon enable row level security;

create policy "Only service role can access anon projects"
  on public.interview_projects_anon
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');
