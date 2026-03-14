import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** GET：今日埋点总次数，直接调 Supabase 函数 get_today_analytics_count()（按迪拜时间统计） */
export async function GET() {
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !serviceKey) {
      return NextResponse.json({ count: 0 });
    }
    const supabase = createClient(url, serviceKey);
    const { data, error } = await supabase.rpc("get_today_analytics_count");
    if (error) {
      console.error("[analytics/today-count] GET error:", error);
      return NextResponse.json({ count: 0 });
    }
    const count = typeof data === "number" ? data : Number(data) || 0;
    return NextResponse.json({ count: Math.max(0, count) });
  } catch (e) {
    console.error("[analytics/today-count] GET", e);
    return NextResponse.json({ count: 0 });
  }
}
