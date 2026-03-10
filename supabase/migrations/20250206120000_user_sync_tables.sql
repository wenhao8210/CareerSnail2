-- 跨设备同步：剪贴板、简历分析历史、蜗牛岛、面试复盘、小蜗日程、模拟面试扩展、金币
-- 均按 user_id 关联 auth.users，RLS 仅允许本人读写

-- 1. 剪贴板（简历优化）
create table if not exists public.user_clipboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
comment on table public.user_clipboard is '用户剪贴板数据（姓名/教育/实习/求职意向/个人评价等）';
alter table public.user_clipboard enable row level security;
create policy "Users can manage own clipboard"
  on public.user_clipboard for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. 简历分析历史
create table if not exists public.user_analysis_history (
  user_id uuid primary key references auth.users(id) on delete cascade,
  records jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
comment on table public.user_analysis_history is '用户简历分析历史（打分与排名）';
alter table public.user_analysis_history enable row level security;
create policy "Users can manage own analysis history"
  on public.user_analysis_history for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. 蜗牛岛
create table if not exists public.user_snail_island (
  user_id uuid primary key references auth.users(id) on delete cascade,
  grid jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
comment on table public.user_snail_island is '用户蜗牛岛地图';
alter table public.user_snail_island enable row level security;
create policy "Users can manage own snail island"
  on public.user_snail_island for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. 面试复盘
create table if not exists public.user_interview_notes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entries jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
comment on table public.user_interview_notes is '用户面试复盘条目';
alter table public.user_interview_notes enable row level security;
create policy "Users can manage own interview notes"
  on public.user_interview_notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. 小蜗日程（快照：任务、日期提醒、每日任务、日记、备忘录、固定即将到来）
create table if not exists public.user_agenda (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tasks jsonb not null default '[]',
  date_reminders jsonb not null default '[]',
  everyday_tasks jsonb not null default '[]',
  diary jsonb not null default '[]',
  today_memo text not null default '',
  pinned_upcoming jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
comment on table public.user_agenda is '用户小蜗日程（任务/每日/日记/备忘录等）';
alter table public.user_agenda enable row level security;
create policy "Users can manage own agenda"
  on public.user_agenda for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. 模拟面试扩展（自定义答案、笔记、错题本、点赞数）
create table if not exists public.user_flashcard_meta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  custom_answers jsonb not null default '{}',
  question_notes jsonb not null default '{}',
  mistakes jsonb not null default '{}',
  total_likes int not null default 0,
  updated_at timestamptz not null default now()
);
comment on table public.user_flashcard_meta is '用户模拟面试扩展（答案/笔记/错题/点赞）';
alter table public.user_flashcard_meta enable row level security;
create policy "Users can manage own flashcard meta"
  on public.user_flashcard_meta for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. 金币（可选跨设备一致）
create table if not exists public.user_coins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coin_count int not null default 0,
  daily_date date,
  daily_count int not null default 0,
  updated_at timestamptz not null default now()
);
comment on table public.user_coins is '用户金币与每日点击';
alter table public.user_coins enable row level security;
create policy "Users can manage own coins"
  on public.user_coins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
