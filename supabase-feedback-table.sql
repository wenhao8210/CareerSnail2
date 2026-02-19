-- 在 Supabase SQL 编辑器中执行此脚本，创建反馈表
-- Table: feedback（用于「Give feedback」弹窗提交的内容）

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'feedback',
  content text not null,
  created_at timestamptz default now()
);

-- 若表已存在且无 type 列，可单独执行：
-- alter table public.feedback add column if not exists type text not null default 'feedback';

-- 允许通过 service role 插入（API 使用 SUPABASE_SERVICE_ROLE）
alter table public.feedback enable row level security;

create policy "Service role can do all"
  on public.feedback
  for all
  to service_role
  using (true)
  with check (true);
