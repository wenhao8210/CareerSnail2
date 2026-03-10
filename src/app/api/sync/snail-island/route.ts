import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/** GET：拉取云端蜗牛岛，需登录 */
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
      .from("user_snail_island")
      .select("grid")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[sync/snail-island] GET error:", error);
      return NextResponse.json({ error: "拉取失败" }, { status: 500 });
    }
    const grid = Array.isArray(row?.grid) ? row.grid : [];
    return NextResponse.json({ grid });
  } catch (e) {
    console.error("[sync/snail-island] GET", e);
    return NextResponse.json({ error: "拉取失败" }, { status: 500 });
  }
}

/** POST：保存蜗牛岛到云端，需登录 */
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
    const grid = Array.isArray(body?.grid) ? body.grid : [];
    const { error } = await supabase.from("user_snail_island").upsert(
      {
        user_id: user.id,
        grid,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("[sync/snail-island] POST error:", error);
      return NextResponse.json({ error: "同步失败" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sync/snail-island] POST", e);
    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}
