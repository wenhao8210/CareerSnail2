import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const type = body?.type === "cooperation" ? "cooperation" : "feedback";
    if (!content) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }
    const { error } = await supabase.from("feedback").insert([{ content, type }]);
    if (error) {
      console.error("[feedback] Supabase insert error:", error);
      return NextResponse.json({ error: "提交失败，请稍后再试" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[feedback]", e);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
