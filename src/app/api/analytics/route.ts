import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AnalyticsEvent } from "@/lib/analytics";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

const ALLOWED_EVENTS: AnalyticsEvent[] = [
  "resume_analysis_complete",
  "mock_interview_deck_created",
  "mock_interview_card_flip",
  "agenda_task_created",
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
    const { error } = await supabase.from("analytics_events").insert([
      { event, props },
    ]);
    if (error) {
      console.error("[analytics] Supabase insert error:", error);
      return NextResponse.json({ error: "写入失败" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[analytics]", e);
    return NextResponse.json({ error: "请求无效" }, { status: 500 });
  }
}
