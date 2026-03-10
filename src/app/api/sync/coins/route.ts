import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/** GET：拉取云端金币数据，需登录 */
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
      .from("user_coins")
      .select("coin_count, daily_date, daily_count")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[sync/coins] GET error:", error);
      return NextResponse.json({ error: "拉取失败" }, { status: 500 });
    }
    return NextResponse.json({
      coinCount: typeof row?.coin_count === "number" ? row.coin_count : 0,
      dailyDate: row?.daily_date ?? null,
      dailyCount: typeof row?.daily_count === "number" ? row.daily_count : 0,
    });
  } catch (e) {
    console.error("[sync/coins] GET", e);
    return NextResponse.json({ error: "拉取失败" }, { status: 500 });
  }
}

/** POST：保存金币到云端，需登录 */
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
    const coinCount = typeof body?.coinCount === "number" ? body.coinCount : 0;
    const dailyDate = body?.dailyDate ?? null;
    const dailyCount = typeof body?.dailyCount === "number" ? body.dailyCount : 0;
    const { error } = await supabase.from("user_coins").upsert(
      {
        user_id: user.id,
        coin_count: coinCount,
        daily_date: dailyDate,
        daily_count: dailyCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("[sync/coins] POST error:", error);
      return NextResponse.json({ error: "同步失败" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sync/coins] POST", e);
    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}
