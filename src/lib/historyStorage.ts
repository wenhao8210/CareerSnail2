/** 单条简历分析历史记录 */
export interface AnalysisRecord {
  role: string;
  score: number;
  date: string; // ISO
  rankPercent?: number;
  total?: number;
}

const STORAGE_KEY = "career_curve_analysis_history";

export function getHistory(): AnalysisRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as AnalysisRecord[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function appendToHistory(record: AnalysisRecord): void {
  const list = getHistory();
  list.push(record);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("保存历史记录失败", e);
  }
}

/** 覆盖本地历史（用于云端拉取后回写） */
export function setHistory(records: AnalysisRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(records) ? records : []));
  } catch (e) {
    console.warn("写入历史记录失败", e);
  }
}

/** 清空全部历史记录，恢复起始状态 */
export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("清空历史记录失败", e);
  }
}

/** 岗位名称脱敏：保留首尾字，中间用 * 替代 */
export function maskRoleName(role: string): string {
  const s = String(role).trim();
  if (!s) return "***";
  if (s.length === 1) return "*";
  if (s.length === 2) return s[0] + "*";
  return s[0] + "*".repeat(s.length - 2) + s[s.length - 1];
}
