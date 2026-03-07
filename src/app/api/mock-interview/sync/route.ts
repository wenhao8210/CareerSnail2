import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/** 云端存储的项目形状（与前端 Project 对应） */
interface ProjectRow {
  project_id: string;
  name: string;
  jd: string;
  resume: string;
  questions: unknown;
  created_at: string;
  updated_at: string;
  is_default: boolean;
}

function toProject(r: ProjectRow) {
  return {
    id: r.project_id,
    name: r.name ?? "",
    jd: r.jd ?? "",
    resume: r.resume ?? "",
    questions: Array.isArray(r.questions) ? r.questions : [],
    createdAt: r.created_at ?? new Date().toISOString(),
    isDefault: r.is_default ?? false,
  };
}

/** GET：拉取云端题库。已登录用 user_id，未登录用 query anonymousId */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(req.url);
    const anonymousId = searchParams.get("anonymousId")?.trim();

    if (user) {
      const { data: rows, error } = await supabase
        .from("interview_projects")
        .select("project_id, name, jd, resume, questions, created_at, updated_at, is_default")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("[mock-interview/sync] GET error:", error);
        return NextResponse.json({ error: "拉取失败" }, { status: 500 });
      }
      const projects = (rows ?? []).map((r: ProjectRow) => toProject(r));
      return NextResponse.json({ projects });
    }

    if (!anonymousId) {
      return NextResponse.json({ error: "未登录且未传 anonymousId" }, { status: 400 });
    }

    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "服务未配置" }, { status: 500 });
    }
    const admin = createServiceClient(url, serviceKey);
    const { data: rows, error } = await admin
      .from("interview_projects_anon")
      .select("project_id, name, jd, resume, questions, created_at, updated_at, is_default")
      .eq("anonymous_id", anonymousId)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("[mock-interview/sync] GET anon error:", error);
      return NextResponse.json({ error: "拉取失败" }, { status: 500 });
    }
    const projects = (rows ?? []).map((r: ProjectRow) => toProject(r));
    return NextResponse.json({ projects });
  } catch (e) {
    console.error("[mock-interview/sync] GET", e);
    return NextResponse.json({ error: "拉取失败" }, { status: 500 });
  }
}

/** POST：同步题库到云端。已登录用 user_id，未登录用 body anonymousId */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    const body = await req.json();
    const list = Array.isArray(body?.projects) ? body.projects : [];
    const anonymousId = typeof body?.anonymousId === "string" ? body.anonymousId.trim() : "";

    if (list.length === 0) {
      return NextResponse.json({ ok: true, message: "无题库可同步" });
    }

    const now = new Date().toISOString();

    if (user) {
      const rows = list.map((p: { id: string; name: string; jd: string; resume: string; questions: unknown[]; createdAt?: string; isDefault?: boolean }) => ({
        user_id: user.id,
        project_id: String(p.id),
        name: String(p.name ?? ""),
        jd: String(p.jd ?? ""),
        resume: String(p.resume ?? ""),
        questions: Array.isArray(p.questions) ? p.questions : [],
        created_at: p.createdAt ?? now,
        updated_at: now,
        is_default: Boolean(p.isDefault),
      }));
      for (const row of rows) {
        const { error } = await supabase.from("interview_projects").upsert(row, {
          onConflict: "user_id,project_id",
          ignoreDuplicates: false,
        });
        if (error) {
          console.error("[mock-interview/sync] POST upsert error:", error);
          return NextResponse.json({ error: "同步失败" }, { status: 500 });
        }
      }
      return NextResponse.json({ ok: true, count: rows.length });
    }

    if (!anonymousId) {
      return NextResponse.json({ error: "未登录且未传 anonymousId" }, { status: 400 });
    }

    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "服务未配置" }, { status: 500 });
    }
    const admin = createServiceClient(url, serviceKey);
    const rows = list.map((p: { id: string; name: string; jd: string; resume: string; questions: unknown[]; createdAt?: string; isDefault?: boolean }) => ({
      anonymous_id: anonymousId,
      project_id: String(p.id),
      name: String(p.name ?? ""),
      jd: String(p.jd ?? ""),
      resume: String(p.resume ?? ""),
      questions: Array.isArray(p.questions) ? p.questions : [],
      created_at: p.createdAt ?? now,
      updated_at: now,
      is_default: Boolean(p.isDefault),
    }));
    for (const row of rows) {
      const { error } = await admin.from("interview_projects_anon").upsert(row, {
        onConflict: "anonymous_id,project_id",
        ignoreDuplicates: false,
      });
      if (error) {
        console.error("[mock-interview/sync] POST anon upsert error:", error);
        return NextResponse.json({ error: "同步失败" }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true, count: rows.length });
  } catch (e) {
    console.error("[mock-interview/sync] POST", e);
    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}
