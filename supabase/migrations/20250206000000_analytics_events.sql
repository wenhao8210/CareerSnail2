-- 埋点事件表：在 Supabase Dashboard → SQL Editor 中执行，或使用 Supabase CLI 跑 migration
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  props jsonb default '{}',
  created_at timestamptz not null default now()
);

comment on table public.analytics_events is '前端埋点事件（简历分析完成、创建题库、翻牌、创建任务等）';
comment on column public.analytics_events.event is '事件名：resume_analysis_complete, mock_interview_deck_created, mock_interview_card_flip, agenda_task_created';
comment on column public.analytics_events.props is '扩展参数，如 score, question_count, source 等';

-- 便于按事件、按时间查
create index if not exists idx_analytics_events_event on public.analytics_events (event);
create index if not exists idx_analytics_events_created_at on public.analytics_events (created_at desc);

-- 仅服务端（service_role）可写；anon 禁止插入，避免前端直连滥发
alter table public.analytics_events enable row level security;

create policy "Only service role can insert"
  on public.analytics_events for insert
  with check (false);

create policy "Allow read for dashboard"
  on public.analytics_events for select
  using (true);
