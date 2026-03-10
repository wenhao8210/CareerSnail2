import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/** GET：拉取云端模拟面试扩展（自定义答案/笔记/错题/点赞），需登录 */
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
      .from("user_flashcard_meta")
      .select("custom_answers, question_notes, mistakes, total_likes")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[sync/flashcard-meta] GET error:", error);
      return NextResponse.json({ error: "拉取失败" }, { status: 500 });
    }
    return NextResponse.json({
      customAnswers: row?.custom_answers && typeof row.custom_answers === "object" ? row.custom_answers : {},
      questionNotes: row?.question_notes && typeof row.question_notes === "object" ? row.question_notes : {},
      mistakes: row?.mistakes && typeof row.mistakes === "object" ? row.mistakes : {},
      totalLikes: typeof row?.total_likes === "number" ? row.total_likes : 0,
    });
  } catch (e) {
    console.error("[sync/flashcard-meta] GET", e);
    return NextResponse.json({ error: "拉取失败" }, { status: 500 });
  }
}

/** POST：保存模拟面试扩展到云端，需登录 */
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
    const customAnswers = body?.customAnswers && typeof body.customAnswers === "object" ? body.customAnswers : {};
    const questionNotes = body?.questionNotes && typeof body.questionNotes === "object" ? body.questionNotes : {};
    const mistakes = body?.mistakes && typeof body.mistakes === "object" ? body.mistakes : {};
    const totalLikes = typeof body?.totalLikes === "number" ? body.totalLikes : 0;
    const { error } = await supabase.from("user_flashcard_meta").upsert(
      {
        user_id: user.id,
        custom_answers: customAnswers,
        question_notes: questionNotes,
        mistakes,
        total_likes: totalLikes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("[sync/flashcard-meta] POST error:", error);
      return NextResponse.json({ error: "同步失败" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sync/flashcard-meta] POST", e);
    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}
