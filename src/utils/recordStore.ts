import { createClient } from "@supabase/supabase-js";

// ✅ 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// ✅ 写入记录
export async function addRecord(role: string, score: number) {
  try {
    const { error } = await supabase.from("records").insert([
      {
        role,
        score,
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      console.error("❌ Supabase 写入失败:", error.message);
    } else {
      console.log("✅ Supabase 写入成功:", { role, score });
    }
  } catch (err) {
    console.error("❌ Supabase 写入异常:", err);
  }
}

// ✅ 计算排名（基于数据库）
export async function calculateRank(score: number) {
  try {
    const { data, error } = await supabase.from("records").select("score");
    if (error || !data) {
      console.error("❌ Supabase 查询失败:", error?.message);
      return { rankPercent: 0, total: 0 };
    }

    const total = data.length;
    const better = data.filter((r) => r.score > score).length;
    const rankPercent = total > 0 ? ((total - better) / total) * 100 : 0;

    return { rankPercent, total };
  } catch (err) {
    console.error("❌ Supabase 查询异常:", err);
    return { rankPercent: 0, total: 0 };
  }
}
