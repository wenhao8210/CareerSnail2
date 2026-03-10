import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/** GET：拉取云端小蜗日程，需登录 */
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
      .from("user_agenda")
      .select("tasks, date_reminders, everyday_tasks, diary, today_memo, pinned_upcoming")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[sync/agenda] GET error:", error);
      return NextResponse.json({ error: "拉取失败" }, { status: 500 });
    }
    return NextResponse.json({
      tasks: Array.isArray(row?.tasks) ? row.tasks : [],
      dateReminders: Array.isArray(row?.date_reminders) ? row.date_reminders : [],
      everydayTasks: Array.isArray(row?.everyday_tasks) ? row.everyday_tasks : [],
      diary: Array.isArray(row?.diary) ? row.diary : [],
      todayMemo: typeof row?.today_memo === "string" ? row.today_memo : "",
      pinnedUpcoming: Array.isArray(row?.pinned_upcoming) ? row.pinned_upcoming : [],
    });
  } catch (e) {
    console.error("[sync/agenda] GET", e);
    return NextResponse.json({ error: "拉取失败" }, { status: 500 });
  }
}

/** POST：保存小蜗日程到云端，需登录 */
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
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];
    const dateReminders = Array.isArray(body?.dateReminders) ? body.dateReminders : [];
    const everydayTasks = Array.isArray(body?.everydayTasks) ? body.everydayTasks : [];
    const diary = Array.isArray(body?.diary) ? body.diary : [];
    const todayMemo = typeof body?.todayMemo === "string" ? body.todayMemo : "";
    const pinnedUpcoming = Array.isArray(body?.pinnedUpcoming) ? body.pinnedUpcoming : [];
    const { error } = await supabase.from("user_agenda").upsert(
      {
        user_id: user.id,
        tasks,
        date_reminders: dateReminders,
        everyday_tasks: everydayTasks,
        diary,
        today_memo: todayMemo,
        pinned_upcoming: pinnedUpcoming,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("[sync/agenda] POST error:", error);
      return NextResponse.json({ error: "同步失败" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sync/agenda] POST", e);
    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}
