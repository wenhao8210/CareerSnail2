import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AnalyticsEvent } from "@/lib/analytics";

// 延迟初始化 Supabase 客户端
let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !key) {
      console.warn("⚠️ [Analytics] Supabase 环境变量未配置，埋点将被记录到控制台");
      return null;
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

const ALLOWED_EVENTS: AnalyticsEvent[] = [
  "resume_analysis_complete",
  "mock_interview_deck_created",
  "mock_interview_card_flip",
  "agenda_task_created",
  // 能力画像漏斗事件
  "profile_test_started",
  "profile_resume_uploaded",
  "profile_questions_completed",
  "profile_report_generated",
  "profile_share_clicked",
  "profile_pdf_downloaded",
  "profile_save_clicked",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const event = typeof body?.event === "string" ? body.event.trim() : "";
    if (!event || !ALLOWED_EVENTS.includes(event as AnalyticsEvent)) {
      return NextResponse.json({ error: "invalid event" }, { status: 400 });
    }
    const props =
      body?.props && typeof body.props === "object" && !Array.isArray(body.props)
        ? body.props
        : {};

    // 记录到控制台（无论是否配置了 Supabase）
    console.log("[analytics] Event:", event, props);

    // 尝试写入 Supabase（如果配置了）
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from("analytics_events").insert([
        { event, props },
      ]);
      if (error) {
        console.error("[analytics] Supabase insert error:", error);
        // 不返回错误，因为前端不需要知道
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[analytics]", e);
    return NextResponse.json({ error: "请求无效" }, { status: 500 });
  }
}
