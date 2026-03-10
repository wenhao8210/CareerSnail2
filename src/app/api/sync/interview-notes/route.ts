import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/** GET：拉取云端面试复盘，需登录 */
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
      .from("user_interview_notes")
      .select("entries")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[sync/interview-notes] GET error:", error);
      return NextResponse.json({ error: "拉取失败" }, { status: 500 });
    }
    const entries = Array.isArray(row?.entries) ? row.entries : [];
    return NextResponse.json({ entries });
  } catch (e) {
    console.error("[sync/interview-notes] GET", e);
    return NextResponse.json({ error: "拉取失败" }, { status: 500 });
  }
}

/** POST：保存面试复盘到云端，需登录 */
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
    const entries = Array.isArray(body?.entries) ? body.entries : [];
    const { error } = await supabase.from("user_interview_notes").upsert(
      {
        user_id: user.id,
        entries,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("[sync/interview-notes] POST error:", error);
      return NextResponse.json({ error: "同步失败" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sync/interview-notes] POST", e);
    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}
