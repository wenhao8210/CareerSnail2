import { createClient } from "@supabase/supabase-js";

// 延迟初始化 Supabase 客户端
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !key) {
      console.warn("⚠️ [Supabase] 环境变量未配置，数据库功能将被禁用");
      return null;
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

// ✅ 写入新记录
export async function addRecord(role: string, score: number) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log("🧾 [LOG] 跳过数据库写入（环境变量未配置）:", role, score);
    return;
  }

  console.log("🧾 [LOG] Writing to Supabase:", role, score);
  const { data, error } = await supabase
    .from("records")
    .insert([{ role, score }]);

  if (error) {
    console.error("❌ [Supabase Insert Error]:", error);
  } else {
    console.log("✅ [Supabase Inserted]:", data);
  }
}

// ✅ 计算全局排名
export async function calculateRank(score: number) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log("📊 [Rank] 跳过排名计算（环境变量未配置），返回默认值");
    return { rankPercent: 50, total: 1 }; // 返回默认值，避免前端报错
  }

  const { data, error } = await supabase
    .from("records")
    .select("score");

  if (error || !data) {
    console.error("❌ [Supabase Fetch Error]:", error);
    return { rankPercent: 50, total: 1 };
  }

  const total = data.length;
  const better = data.filter((r) => r.score > score).length;
  const rankPercent = total > 0 ? ((total - better) / total) * 100 : 0;

  console.log(`📊 [Rank] total=${total}, rank=${rankPercent.toFixed(1)}%`);
  return { rankPercent, total };
}
