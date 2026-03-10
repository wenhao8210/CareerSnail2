import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/** GET：拉取云端剪贴板，需登录 */
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
      .from("user_clipboard")
      .select("data")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[sync/clipboard] GET error:", error);
      return NextResponse.json({ error: "拉取失败" }, { status: 500 });
    }
    return NextResponse.json({ data: row?.data ?? {} });
  } catch (e) {
    console.error("[sync/clipboard] GET", e);
    return NextResponse.json({ error: "拉取失败" }, { status: 500 });
  }
}

/** POST：保存剪贴板到云端，需登录 */
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
    const data = body && typeof body === "object" ? body : {};
    const { error } = await supabase.from("user_clipboard").upsert(
      {
        user_id: user.id,
        data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("[sync/clipboard] POST error:", error);
      return NextResponse.json({ error: "同步失败" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sync/clipboard] POST", e);
    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}
