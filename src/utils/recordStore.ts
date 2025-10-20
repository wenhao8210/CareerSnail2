import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// ✅ 写入新记录
export async function addRecord(role: string, score: number) {
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
  const { data, error } = await supabase
    .from("records")
    .select("score");

  if (error || !data) {
    console.error("❌ [Supabase Fetch Error]:", error);
    return { rankPercent: 0, total: 0 };
  }

  const total = data.length;
  const better = data.filter((r) => r.score > score).length;
  const rankPercent = total > 0 ? ((total - better) / total) * 100 : 0;

  console.log(`📊 [Rank] total=${total}, rank=${rankPercent.toFixed(1)}%`);
  return { rankPercent, total };
}
