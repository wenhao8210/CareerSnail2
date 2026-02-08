import { NextResponse } from "next/server";

const SILICONFLOW_BASE = "https://api.siliconflow.cn/v1";

export async function POST(req: Request) {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "未配置 SILICONFLOW_API_KEY，请在 .env.local 中配置" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { model, messages, temperature = 0.7, max_tokens = 4000 } = body;

    if (!model || !messages?.length) {
      return NextResponse.json(
        { error: "缺少 model 或 messages" },
        { status: 400 }
      );
    }

    const res = await fetch(`${SILICONFLOW_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      try {
        const err = JSON.parse(text);
        return NextResponse.json(
          { error: err.error?.message || err.message || text },
          { status: res.status }
        );
      } catch {
        return NextResponse.json({ error: text }, { status: res.status });
      }
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "请求失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
