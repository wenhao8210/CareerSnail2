-- 今日埋点总次数：按迪拜时间（Asia/Dubai）的「今天」统计 analytics_events 条数
-- 前端/API 直接调 get_today_analytics_count() 即可，无需在应用里算时间区间
-- 不需要新建 table，只新建这个函数，函数会查已有的 analytics_events 表

create or replace function public.get_today_analytics_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.analytics_events
  where created_at >= (((now() at time zone 'Asia/Dubai')::date)::timestamp at time zone 'Asia/Dubai')
    and created_at <  (((now() at time zone 'Asia/Dubai')::date)::timestamp at time zone 'Asia/Dubai') + interval '1 day';
$$;

comment on function public.get_today_analytics_count() is '返回今日（迪拜时间 0 点～24 点）analytics_events 条数，供首页「今日已点击」展示';

-- 允许通过 service_role 调用（API 用）；如需匿名读可再 grant 给 anon
grant execute on function public.get_today_analytics_count() to service_role;
