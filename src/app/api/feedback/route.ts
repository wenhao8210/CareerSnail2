import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 兼容使用 SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_URL
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

// 延迟初始化 Supabase 客户端
let supabase: ReturnType<typeof createClient> | null = null;
function getSupabaseClient() {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const type = body?.type === "cooperation" ? "cooperation" : "feedback";
    if (!content) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }

    const client = getSupabaseClient();
    if (!client) {
      console.warn("[feedback] Supabase 未配置，跳过数据库写入");
      return NextResponse.json({ ok: true, warning: "反馈未保存到数据库（服务未配置）" });
    }

    const { error } = await client.from("feedback").insert([{ content, type }] as any);
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
