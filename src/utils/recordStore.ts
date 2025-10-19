import fs from "fs";
import path from "path";

const logFile = path.join(process.cwd(), "uploads", "records.json");

// ✅ 初始化文件
function ensureLogFile() {
  if (!fs.existsSync(path.dirname(logFile))) {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
  }
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, JSON.stringify([]));
  }
}

// ✅ 读取全部记录
export function readRecords() {
  ensureLogFile();
  try {
    const data = fs.readFileSync(logFile, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// ✅ 写入新记录
export function addRecord(role: string, score: number) {
  const records = readRecords();
  records.push({
    role,
    score,
    date: new Date().toISOString(),
  });
  fs.writeFileSync(logFile, JSON.stringify(records, null, 2));
}

// ✅ 计算排名（全局，不分岗位）
export function calculateRank(score: number) {
  const records = readRecords();
  const total = records.length;
  const better = records.filter((r: any) => r.score > score).length;
  const rankPercent = total > 0 ? ((total - better) / total) * 100 : 0;

  return { rankPercent, total };
}
