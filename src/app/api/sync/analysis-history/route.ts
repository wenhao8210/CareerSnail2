import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/** GET：拉取云端简历分析历史，需登录 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const { data: row, error } = await supabase
      .from("user_analysis_history")
      .select("records")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[sync/analysis-history] GET error:", error);
      return NextResponse.json({ error: "拉取失败" }, { status: 500 });
    }
    const records = Array.isArray(row?.records) ? row.records : [];
    return NextResponse.json({ records });
  } catch (e) {
    console.error("[sync/analysis-history] GET", e);
    return NextResponse.json({ error: "拉取失败" }, { status: 500 });
  }
}

/** POST：保存简历分析历史到云端，需登录 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const body = await req.json();
    const records = Array.isArray(body?.records) ? body.records : [];
    const { error } = await supabase.from("user_analysis_history").upsert(
      {
        user_id: user.id,
        records,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("[sync/analysis-history] POST error:", error);
      return NextResponse.json({ error: "同步失败" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sync/analysis-history] POST", e);
    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}
