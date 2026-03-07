"use client";
import { useState, useEffect, useRef } from "react";
import AnalyzingTips from "./components/AnalyzingTips";
import AnalysisPanel from "./components/AnalysisPanel";
import ButtonTreasure from "./components/ButtonTreasure";
import FeedbackDialog from "./components/FeedbackDialog";
import HistoryChart from "./components/HistoryChart";
import { getHistory, appendToHistory, maskRoleName, type AnalysisRecord } from "@/lib/historyStorage";
import { track } from "@/lib/analytics";

const CLIPBOARD_STORAGE_KEY = "snail_career_clipboard";

type EducationItem = {
  学校名称: string;
  学历: string;
  专业: string;
  起止开始: string;
  起止结束: string;
  学历类型: string;
  成绩排名: string;
};
type InternshipItem = {
  公司名称: string;
  职位名称: string;
  起止开始: string;
  起止结束: string;
  描述: string;
};
type ClipboardData = {
  姓名: string;
  身份证: string;
  手机: string;
  邮箱: string;
  教育背景: EducationItem[];
  实习经历: InternshipItem[];
  求职意向: string;
};

const 学历选项 = ["高中", "专科", "本科", "硕士", "博士"] as const;
const 学历类型选项 = ["统招全日制", "非全日制", "自考", "成人教育", "其他"] as const;
const 成绩排名选项 = ["前 10%", "前 30%", "前 50%", "其他"] as const;

const defaultEducationItem = (): EducationItem => ({
  学校名称: "",
  学历: "本科",
  专业: "",
  起止开始: "",
  起止结束: "",
  学历类型: "统招全日制",
  成绩排名: "",
});
const defaultInternshipItem = (): InternshipItem => ({
  公司名称: "",
  职位名称: "",
  起止开始: "",
  起止结束: "",
  描述: "",
});
const defaultClipboardData = (): ClipboardData => ({
  姓名: "",
  身份证: "",
  手机: "",
  邮箱: "",
  教育背景: [defaultEducationItem()],
  实习经历: [defaultInternshipItem()],
  求职意向: "",
});

function parseTimeToYm(timeStr: string): { start: string; end: string } {
  const s = timeStr.trim();
  const toYm = (x: string) => {
    const m = x.match(/(\d{4})[年.\-/]?(\d{1,2})?/);
    return m ? (m[2] ? m[1] + "-" + String(m[2]).padStart(2, "0") : m[1] + "-01") : "";
  };
  if (s.includes("-")) {
    const [a, b] = s.split("-").map((t) => t.trim());
    return { start: toYm(a), end: toYm(b ?? "") };
  }
  return { start: toYm(s), end: "" };
}

function migrateClipboardData(raw: unknown): ClipboardData {
  const def = defaultClipboardData();
  if (!raw || typeof raw !== "object") return def;
  const o = raw as Record<string, unknown>;
  if (typeof o.姓名 === "string") def.姓名 = o.姓名;
  if (typeof o.身份证 === "string") def.身份证 = o.身份证;
  if (typeof o.手机 === "string") def.手机 = o.手机;
  if (typeof o.邮箱 === "string") def.邮箱 = o.邮箱;
  if (typeof o.求职意向 === "string") def.求职意向 = o.求职意向;
  if (Array.isArray(o.教育背景)) {
    def.教育背景 = o.教育背景
      .filter((x): x is Record<string, unknown> => x && typeof x === "object")
      .map((b) => ({
        学校名称: typeof b.学校名称 === "string" ? b.学校名称 : (typeof (b as { 大学?: string }).大学 === "string" ? (b as { 大学: string }).大学 : ""),
        学历: typeof b.学历 === "string" ? b.学历 : "本科",
        专业: typeof b.专业 === "string" ? b.专业 : "",
        起止开始: typeof b.起止开始 === "string" ? b.起止开始 : "",
        起止结束: typeof b.起止结束 === "string" ? b.起止结束 : "",
        学历类型: typeof b.学历类型 === "string" ? b.学历类型 : "统招全日制",
        成绩排名: typeof b.成绩排名 === "string" ? b.成绩排名 : "",
      }));
    if (def.教育背景.length === 0) def.教育背景 = [defaultEducationItem()];
  } else if (o.教育背景 && typeof o.教育背景 === "object" && !Array.isArray(o.教育背景)) {
    const edu = o.教育背景 as Record<string, unknown>;
    const items: EducationItem[] = [];
    ["本科", "研究生"].forEach((key) => {
      const block = edu[key];
      if (block && typeof block === "object" && block !== null) {
        const b = block as Record<string, string>;
        const timeStr = typeof b.时间 === "string" ? b.时间 : "";
        const { start, end } = parseTimeToYm(timeStr);
        items.push({
          学校名称: typeof b.大学 === "string" ? b.大学 : "",
          学历: key === "研究生" ? "硕士" : "本科",
          专业: typeof b.专业 === "string" ? b.专业 : "",
          起止开始: start,
          起止结束: end,
          学历类型: "统招全日制",
          成绩排名: "",
        });
      }
    });
    if (items.length > 0) def.教育背景 = items;
  } else if (typeof o.教育背景 === "string" && o.教育背景) {
    def.教育背景 = [{ ...defaultEducationItem(), 学校名称: o.教育背景.slice(0, 200) }];
  }
  if (Array.isArray(o.实习经历)) {
    def.实习经历 = o.实习经历.map((x): InternshipItem => {
      if (x && typeof x === "object" && !Array.isArray(x)) {
        const b = x as Record<string, unknown>;
        return {
          公司名称: typeof b.公司名称 === "string" ? b.公司名称 : "",
          职位名称: typeof b.职位名称 === "string" ? b.职位名称 : "",
          起止开始: typeof b.起止开始 === "string" ? b.起止开始 : "",
          起止结束: typeof b.起止结束 === "string" ? b.起止结束 : "",
          描述: typeof b.描述 === "string" ? b.描述 : "",
        };
      }
      return { ...defaultInternshipItem(), 描述: typeof x === "string" ? x : "" };
    });
    if (def.实习经历.length === 0) def.实习经历 = [defaultInternshipItem()];
  } else if (typeof o.实习经历 === "string" && o.实习经历) {
    def.实习经历 = o.实习经历
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ ...defaultInternshipItem(), 描述: s }));
    if (def.实习经历.length === 0) def.实习经历 = [defaultInternshipItem()];
  }
  return def;
}

function parseResumeToClipboard(text: string): Partial<ClipboardData> {
  const t = text.replace(/\s+/g, " ").trim();
  const out: Partial<ClipboardData> = {};
  const idCard = t.match(/\b\d{17}[\dXx]\b/);
  if (idCard) out.身份证 = idCard[0];
  const phone = t.match(/\b1[3-9]\d{9}\b/);
  if (phone) out.手机 = phone[0];
  const email = t.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/);
  if (email) out.邮箱 = email[0];
  const nameMatch = t.match(/^(?:姓名|名字)[：:\s]*([^\n]+?)(?=\s*(?:性别|出生|手机|电话|邮箱|教育|\d{4}))/);
  if (nameMatch) out.姓名 = nameMatch[1].trim();
  else if (t.length > 0) out.姓名 = t.slice(0, 30).split(/\s/)[0] || "";
  const eduBlock = t.match(/(?:教育|学历|毕业|学校)[^]*?(?=(?:实习|工作|项目|技能|自我|求职|$))/i);
  if (eduBlock) {
    const str = eduBlock[0].replace(/\s+/g, " ").trim();
    const uni = str.match(/(?:学校|院校|大学|学院)[：:\s]*([^\s]+(?:\s+[^\s]+){0,2})/i);
    const time = str.match(/(\d{4}[年.\-/]\d{1,2}[月]?[.\-/]\d{1,2}日?|\d{4}[年.\-/]\d{1,2}月?)[^]*?(?:至今|毕业)/) || str.match(/(\d{4}[年.\-/]\d{1,2})/);
    const timeStr = time ? time[1].trim().slice(0, 40) : "";
    const [start, end] = timeStr.includes("-") ? timeStr.split("-").map((s) => s.replace(/\D/g, "-").slice(0, 7)) : [timeStr.slice(0, 7), ""];
    out.教育背景 = [
      { ...defaultEducationItem(), 学校名称: uni ? uni[1].trim().slice(0, 80) : "", 起止开始: start, 起止结束: end },
    ];
  }
  const workBlock = t.match(/(?:实习|工作)经历?[^]*?(?=(?:项目|技能|教育|自我|求职|$))/i);
  if (workBlock) {
    const parts = workBlock[0].split(/\d+[.．、]\s*|[-–]\s*/).map((s) => s.trim()).filter((s) => s.length > 10);
    const raw = parts.length > 0 ? parts : [workBlock[0].replace(/\s+/g, " ").trim().slice(0, 500)];
    out.实习经历 = raw.map((text) => {
      const item = defaultInternshipItem();
      const timeRange = text.match(/(\d{4})[年.\-/]?(\d{1,2})?[^\-]*?[-–至到]\s*(\d{4})[年.\-/]?(\d{1,2})?/);
      if (timeRange) {
        item.起止开始 = timeRange[2] ? `${timeRange[1]}-${String(timeRange[2]).padStart(2, "0")}` : `${timeRange[1]}-01`;
        item.起止结束 = timeRange[4] ? `${timeRange[3]}-${String(timeRange[4]).padStart(2, "0")}` : `${timeRange[3]}-01`;
      }
      item.描述 = text.slice(0, 2000);
      return item;
    });
  }
  const jobMatch = t.match(/(?:求职|意向|岗位)[：:\s]*([^\n]+)/);
  if (jobMatch) out.求职意向 = jobMatch[1].trim();
  return out;
}





function NeonSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (

    <div className="relative w-full max-w-md group mb-4">
      {/* 发光外框 */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-300"></div>

      {/* 主体框 */}
      <div className="relative flex items-center bg-black text-gray-300 rounded-lg border border-gray-700 px-3 py-2">
        {/* 搜索图标 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-400 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
          />
        </svg>

        <input
          type="text"
          placeholder="目标岗位（如：产品经理 / 建筑师）"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500"
        />

        {/* 滤镜图标 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-400 hover:text-purple-400 transition"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4h18M4 8h16M6 12h12M8 16h8M10 20h4"
          />
        </svg>
      </div>
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mainTab, setMainTab] = useState<"analyze" | "history" | "clipboard">("analyze");
  const [historyRecords, setHistoryRecords] = useState<AnalysisRecord[]>([]);
  const [clipboardData, setClipboardData] = useState<ClipboardData>(() => {
    if (typeof window === "undefined") return defaultClipboardData();
    try {
      const raw = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
      if (raw) return migrateClipboardData(JSON.parse(raw));
    } catch {}
    return defaultClipboardData();
  });
  const [clipboardPasteText, setClipboardPasteText] = useState("");
  const [clipboardSaveTip, setClipboardSaveTip] = useState("");
  const [clipboardCopyTip, setClipboardCopyTip] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const resizeTextareaToContent = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(56, el.scrollHeight)}px`;
  };

  const copyClipboardField = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text || "").then(() => {
        setClipboardCopyTip(true);
        setTimeout(() => setClipboardCopyTip(false), 1500);
      }).catch(() => {});
    }
  };
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistoryRecords(getHistory());
  }, []);

  useEffect(() => {
    if (mainTab === "history") setHistoryRecords(getHistory());
  }, [mainTab]);

  useEffect(() => {
    try {
      localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(clipboardData));
    } catch {}
  }, [clipboardData]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      const t = setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
      return () => {
        clearTimeout(t);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [menuOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (loading) {
      setSeconds(0);
      timer = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (!loading && seconds > 0) {
      clearInterval(timer!);
    }
    return () => clearInterval(timer!);
  }, [loading]);

  async function handleUpload() {
    if (!file) return alert("请先选择文件！");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target_role", targetRole);
      formData.append("jd", jdText);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // 🧱 错误检查
      if (!res.ok || data.error) {
        alert(data.error || "上传失败，请稍后再试。");
        setLoading(false);
        return;
      }

      // ✅ 保存 AI 分析 + 排名信息
      setResumeText(data.resumeText);
      const analysis = JSON.parse(data.analysis);
      setResult(
        JSON.stringify({
          ...analysis,
          rankPercent: data.rankPercent,
          total: data.total,
        })
      );
      // ✅ 写入本地历史，供折线图展示
      const score = typeof analysis["综合匹配度"] === "number" ? analysis["综合匹配度"] : 0;
      appendToHistory({
        role: targetRole?.trim() || "未指定岗位",
        score,
        date: new Date().toISOString(),
        rankPercent: data.rankPercent,
        total: data.total,
      });
      setHistoryRecords(getHistory());
      track("resume_analysis_complete", {
        score,
        rank_percent: data.rankPercent,
        total: data.total,
      });
    } catch (err) {
      console.error("❌ 上传出错:", err);
      alert("上传过程中出现错误，请检查网络或重试。");
    }

    setLoading(false);
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-950 to-black text-white overflow-hidden">
      {/* 顶部导航栏：左侧标题+金币 + 右侧菜单 */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 bg-black/40 backdrop-blur-sm border-b border-purple-500/20">
        <div className="flex flex-col gap-2 min-w-0 flex-shrink-0">
          <h1 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 whitespace-nowrap">
            🐌 SNAIL CAREER｜蜗牛简历
          </h1>
          <ButtonTreasure />
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full border font-medium text-sm transition ${menuOpen ? "border-purple-400 bg-purple-500/20 text-purple-300" : "border-purple-400/50 text-purple-300/90 hover:border-purple-400 hover:bg-purple-500/10"}`}
            aria-label="打开菜单"
          >
            <span className="hidden sm:inline">简历优化</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 py-1.5 min-w-[160px] rounded-xl bg-black/95 border-2 border-purple-400/50 shadow-xl shadow-purple-500/20 z-50">
              <a
                href="/"
                className="block px-4 py-3 text-sm font-medium text-purple-400 bg-purple-500/15 hover:bg-purple-500/25 transition rounded-t-xl"
                onClick={() => setMenuOpen(false)}
              >
                简历优化
              </a>
              <a
                href="/mock-interview"
                className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-purple-400 transition"
                onClick={() => setMenuOpen(false)}
              >
                模拟面试
              </a>
<a
                  href="/agenda"
                  className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-purple-400 transition"
                  onClick={() => setMenuOpen(false)}
                >
                  小蜗日程
                </a>
                <a
                  href="/interview-notes"
                  className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-purple-400 transition"
                  onClick={() => setMenuOpen(false)}
                >
                  面试复盘
                </a>
                <a
                  href="/snail-island"
                  className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-purple-400 transition rounded-b-xl"
                  onClick={() => setMenuOpen(false)}
                >
                  蜗牛岛
                </a>
            </div>
          )}
        </div>
      </header>

      {/* 赛博网格背景 */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(100,0,255,0.05)_0%,transparent_70%)]"></div>
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      {/* ⚡️前景内容包裹层 */}
      <div className="relative z-10 flex flex-col items-center pt-40"></div>

      {/* Sub tab：从左边放，与小蜗日程/模拟面试一致 */}
      <div className="w-full flex items-center justify-start gap-2 mb-4 z-10 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setMainTab("analyze")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${mainTab === "analyze" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
        >
          简历分析
        </button>
        <button
          type="button"
          onClick={() => setMainTab("history")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${mainTab === "history" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
        >
          历史记录与排名
        </button>
        <button
          type="button"
          onClick={() => setMainTab("clipboard")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${mainTab === "clipboard" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
        >
          剪贴板
        </button>
      </div>

      {/* 主标题、副标题：仅在「简历分析」tab 显示 */}
      {mainTab === "analyze" && (
        <>
          <h2 className="text-3xl font-bold mt-2 mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-center">
            🐌 SNAIL CAREER｜蜗牛简历，一毫米也算前进
          </h2>
          <p className="text-center text-white text-lg mb-6">
            3分钟 快速评估：多久能收到面试邀约
          </p>
        </>
      )}

      {/* Tab 内容 */}
      {mainTab === "history" ? (
        <div className="w-full px-4 z-10 max-w-lg mx-auto space-y-8">
          {historyRecords.length > 0 ? (
            <>
              {/* 我的排行榜：按分数取前 5，岗位名称脱敏 */}
              <div className="bg-black/50 border border-gray-700 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
                  🏆 我的排行榜 · 前 5 岗位
                </h3>
                <ul className="space-y-2">
                  {[...historyRecords]
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
                    .map((r, i) => (
                      <li
                        key={`${r.date}-${i}`}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-black/40 border border-gray-700/80"
                      >
                        <span className="text-slate-400 font-mono w-6">#{i + 1}</span>
                        <span className="text-gray-200 flex-1 truncate mx-2" title={r.role}>
                          {maskRoleName(r.role)}
                        </span>
                        <span className="text-cyan-400 font-medium tabular-nums">{r.score.toFixed(1)} 分</span>
                        {r.rankPercent != null && (
                          <span className="text-slate-500 text-sm ml-2">超{r.rankPercent.toFixed(0)}%</span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
              <HistoryChart records={historyRecords} />
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 bg-black/40 border border-gray-700 rounded-xl">
              <p className="mb-2">暂无历史记录</p>
              <p className="text-sm">在「简历分析」中完成一次分析后，这里会显示打分与排名的折线图。</p>
            </div>
          )}
        </div>
      ) : mainTab === "clipboard" ? (
        <div className="w-full px-4 z-10 max-w-lg mx-auto space-y-6">
          <p className="text-center text-amber-200/90 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg py-2 px-3">
            📌 以下内容仅保存在本地，不会上传到云端，请放心使用。
          </p>
          <div className="bg-black/50 border border-gray-700 rounded-xl p-4 space-y-3">
            <label className="block text-sm font-medium text-slate-400">从简历文本解析并填充（可选）</label>
            <textarea
              value={clipboardPasteText}
              onChange={(e) => {
                setClipboardPasteText(e.target.value);
                requestAnimationFrame(() => resizeTextareaToContent(e.target));
              }}
              onFocus={(e) => resizeTextareaToContent(e.currentTarget)}
              placeholder="粘贴简历原文，点击下方按钮自动抽取姓名、手机、邮箱、教育、实习等填入下方字段"
              rows={4}
              className="w-full bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none resize-y min-h-[80px]"
            />
            <button
              type="button"
              onClick={() => {
                const parsed = parseResumeToClipboard(clipboardPasteText);
                setClipboardData((prev) => {
                  const next = { ...prev };
                  if (parsed.姓名 != null && parsed.姓名 !== "") next.姓名 = parsed.姓名;
                  if (parsed.身份证 != null && parsed.身份证 !== "") next.身份证 = parsed.身份证;
                  if (parsed.手机 != null && parsed.手机 !== "") next.手机 = parsed.手机;
                  if (parsed.邮箱 != null && parsed.邮箱 !== "") next.邮箱 = parsed.邮箱;
                  if (parsed.求职意向 != null && parsed.求职意向 !== "") next.求职意向 = parsed.求职意向;
                  if (parsed.教育背景?.length) next.教育背景 = [...parsed.教育背景];
                  if (parsed.实习经历?.length) next.实习经历 = [...parsed.实习经历];
                  return next;
                });
              }}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium"
            >
              解析并填充
            </button>
          </div>

          <div className="bg-black/50 border border-gray-700 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["姓名", "身份证", "手机", "邮箱"] as const).map((key) => (
                <div key={key}>
                  <label className="block text-sm text-slate-400 mb-1">{key}</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={clipboardData[key]}
                      onChange={(e) => setClipboardData((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={`输入${key}`}
                      className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none"
                    />
                    <button type="button" onClick={() => copyClipboardField(clipboardData[key])} className="shrink-0 px-3 py-2 rounded-lg border border-gray-500 text-slate-300 hover:border-purple-400 hover:text-white text-xs whitespace-nowrap" title="复制">复制</button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">教育经历</h4>
              <div className="space-y-4">
                {clipboardData.教育背景.map((edu, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-600 p-4 space-y-3 relative">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">学校名称 <span className="text-red-400">*</span></label>
                        <input
                          type="text"
                          value={edu.学校名称}
                          onChange={(e) => setClipboardData((prev) => {
                            const next = [...prev.教育背景];
                            next[idx] = { ...next[idx], 学校名称: e.target.value };
                            return { ...prev, 教育背景: next };
                          })}
                          placeholder="如：天津大学"
                          className="w-full bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">学历 <span className="text-red-400">*</span></label>
                        <select
                          value={edu.学历}
                          onChange={(e) => setClipboardData((prev) => {
                            const next = [...prev.教育背景];
                            next[idx] = { ...next[idx], 学历: e.target.value };
                            return { ...prev, 教育背景: next };
                          })}
                          className="w-full bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none text-sm"
                        >
                          {学历选项.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">专业 <span className="text-red-400">*</span></label>
                        <input
                          type="text"
                          value={edu.专业}
                          onChange={(e) => setClipboardData((prev) => {
                            const next = [...prev.教育背景];
                            next[idx] = { ...next[idx], 专业: e.target.value };
                            return { ...prev, 教育背景: next };
                          })}
                          placeholder="如：建筑"
                          className="w-full bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">起止时间 <span className="text-red-400">*</span></label>
                        <p className="text-[10px] text-slate-500 mb-1">无准确的毕业时间可填写预计毕业时间</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="month"
                            value={edu.起止开始 || ""}
                            onChange={(e) => setClipboardData((prev) => {
                              const next = [...prev.教育背景];
                              next[idx] = { ...next[idx], 起止开始: e.target.value };
                              return { ...prev, 教育背景: next };
                            })}
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none text-sm"
                          />
                          <span className="text-slate-500">-</span>
                          <input
                            type="month"
                            value={edu.起止结束 || ""}
                            onChange={(e) => setClipboardData((prev) => {
                              const next = [...prev.教育背景];
                              next[idx] = { ...next[idx], 起止结束: e.target.value };
                              return { ...prev, 教育背景: next };
                            })}
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">学历类型 <span className="text-red-400">*</span></label>
                        <select
                          value={edu.学历类型}
                          onChange={(e) => setClipboardData((prev) => {
                            const next = [...prev.教育背景];
                            next[idx] = { ...next[idx], 学历类型: e.target.value };
                            return { ...prev, 教育背景: next };
                          })}
                          className="w-full bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none text-sm"
                        >
                          {学历类型选项.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">成绩排名 <span className="text-red-400">*</span></label>
                        <select
                          value={edu.成绩排名}
                          onChange={(e) => setClipboardData((prev) => {
                            const next = [...prev.教育背景];
                            next[idx] = { ...next[idx], 成绩排名: e.target.value };
                            return { ...prev, 教育背景: next };
                          })}
                          className="w-full bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none text-sm"
                        >
                          <option value="">请选择</option>
                          {成绩排名选项.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setClipboardData((prev) => ({
                        ...prev,
                        教育背景: prev.教育背景.filter((_, j) => j !== idx).length > 0 ? prev.教育背景.filter((_, j) => j !== idx) : [defaultEducationItem()],
                      }))}
                      className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                      title="删除本条"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setClipboardData((prev) => ({ ...prev, 教育背景: [...prev.教育背景, defaultEducationItem()] }))}
                  className="w-full py-2 rounded-lg border border-dashed border-gray-500 text-slate-400 hover:border-purple-400 hover:text-purple-300 text-sm"
                >
                  + 添加教育经历
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">实习经历（分条填写，可增删）</h4>
              <div className="space-y-4">
                {clipboardData.实习经历.map((item, i) => (
                  <div key={i} className="rounded-lg border border-gray-600 p-4 space-y-3 relative">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">公司名称 <span className="text-red-400">*</span></label>
                        <input
                          type="text"
                          value={item.公司名称}
                          onChange={(e) => setClipboardData((prev) => {
                            const next = [...prev.实习经历];
                            next[i] = { ...next[i], 公司名称: e.target.value };
                            return { ...prev, 实习经历: next };
                          })}
                          placeholder="如：苏黎世联邦理工大学"
                          className="w-full bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">职位名称 <span className="text-red-400">*</span></label>
                        <input
                          type="text"
                          value={item.职位名称}
                          onChange={(e) => setClipboardData((prev) => {
                            const next = [...prev.实习经历];
                            next[i] = { ...next[i], 职位名称: e.target.value };
                            return { ...prev, 实习经历: next };
                          })}
                          placeholder="如：AI产品经理"
                          className="w-full bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">起止时间 <span className="text-red-400">*</span></label>
                        <div className="flex items-center gap-2">
                          <input
                            type="month"
                            value={item.起止开始 || ""}
                            onChange={(e) => setClipboardData((prev) => {
                              const next = [...prev.实习经历];
                              next[i] = { ...next[i], 起止开始: e.target.value };
                              return { ...prev, 实习经历: next };
                            })}
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none text-sm"
                          />
                          <span className="text-slate-500">-</span>
                          <input
                            type="month"
                            value={item.起止结束 || ""}
                            onChange={(e) => setClipboardData((prev) => {
                              const next = [...prev.实习经历];
                              next[i] = { ...next[i], 起止结束: e.target.value };
                              return { ...prev, 实习经历: next };
                            })}
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none text-sm"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">描述</label>
                        <textarea
                          value={item.描述}
                          onChange={(e) => {
                            setClipboardData((prev) => {
                              const next = [...prev.实习经历];
                              next[i] = { ...next[i], 描述: e.target.value };
                              return { ...prev, 实习经历: next };
                            });
                            requestAnimationFrame(() => resizeTextareaToContent(e.target));
                          }}
                          onFocus={(e) => resizeTextareaToContent(e.currentTarget)}
                          placeholder="项目描述、职责与成果等"
                          rows={3}
                          className="w-full min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none resize-y text-sm min-h-[56px]"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setClipboardData((prev) => {
                        const next = prev.实习经历.filter((_, j) => j !== i);
                        return { ...prev, 实习经历: next.length > 0 ? next : [defaultInternshipItem()] };
                      })}
                      className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                      title="删除本条"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setClipboardData((prev) => ({ ...prev, 实习经历: [...prev.实习经历, defaultInternshipItem()] }))}
                  className="w-full py-2 rounded-lg border border-dashed border-gray-500 text-slate-400 hover:border-purple-400 hover:text-purple-300 text-sm"
                >
                  + 添加实习经历
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">求职意向</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={clipboardData.求职意向}
                  onChange={(e) => setClipboardData((prev) => ({ ...prev, 求职意向: e.target.value }))}
                  placeholder="输入求职意向"
                  className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none"
                />
                <button type="button" onClick={() => copyClipboardField(clipboardData.求职意向)} className="shrink-0 px-3 py-2 rounded-lg border border-gray-500 text-slate-300 hover:border-purple-400 hover:text-white text-xs whitespace-nowrap" title="复制">复制</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(clipboardData));
                    setClipboardSaveTip("已保存到本地");
                    setTimeout(() => setClipboardSaveTip(""), 2000);
                  } catch {}
                }}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium"
              >
                保存
              </button>
              {clipboardSaveTip && <span className="text-green-400 text-sm py-2">{clipboardSaveTip}</span>}
              {clipboardCopyTip && <span className="text-green-400 text-sm py-2">已复制</span>}
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(clipboardData, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "snail_career_clipboard.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 rounded-lg border border-gray-500 hover:border-purple-400 text-slate-300 hover:text-white text-sm font-medium"
              >
                导出 JSON
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    try {
                      const raw = JSON.parse(reader.result as string);
                      const next = migrateClipboardData(raw);
                      setClipboardData(next);
                      localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(next));
                      setClipboardSaveTip("已从 JSON 导入并保存");
                      setTimeout(() => setClipboardSaveTip(""), 2000);
                    } catch {
                      setClipboardSaveTip("JSON 格式无效");
                      setTimeout(() => setClipboardSaveTip(""), 2000);
                    }
                    e.target.value = "";
                  };
                  reader.readAsText(f);
                }}
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="px-4 py-2 rounded-lg border border-gray-500 hover:border-purple-400 text-slate-300 hover:text-white text-sm font-medium"
              >
                导入 JSON
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* 文件上传 */}
      <div className="relative w-full max-w-md mx-auto mb-6 z-10">
        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />
        <label
          htmlFor="resume-upload"
          className="block cursor-pointer bg-black/70 border border-gray-700 rounded-lg p-3 text-center hover:border-purple-400 transition"
        >
          {file ? `📄 ${file.name}` : "点击选择简历文件 (.pdf / .docx)"}
        </label>
      </div>

      {/* JD 岗位描述（可选） */}
      <div className="w-full max-w-md mx-auto mb-4 z-10">
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="粘贴岗位描述 JD（可选，便于更精准匹配）"
          rows={4}
          className="w-full bg-black/70 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50 resize-y min-h-[80px]"
        />
      </div>

      {/* 发光输入框 */}
      <div className="w-full max-w-md mx-auto mb-2">
        <NeonSearchBar value={targetRole} onChange={setTargetRole} />
      </div>

      {/* 上传按钮 */}
      <div className="w-full max-w-md mx-auto">
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full mt-0 px-12 py-2.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-lg font-semibold hover:brightness-110 disabled:opacity-20"
        >

        {loading ? "🐌 蜗牛正在分析中..." : "立即测试！！！"}
        </button>
      </div>

      {/* 🐌 分析中状态（Tips 全屏遮罩） */}
      {loading && <AnalyzingTips seconds={seconds} />}

      {/* 📄 简历原文 */}
      {resumeText && !loading && (
        <div className="bg-black/60 border border-gray-700 rounded-xl p-4 max-w-3xl w-full mt-10 shadow-md">
          <h2 className="text-lg font-semibold mb-2 text-purple-300 flex items-center gap-1">
            📄 简历原文
          </h2>
          <pre className="whitespace-pre-wrap text-gray-300 text-sm max-h-72 overflow-y-auto">
            {resumeText}
          </pre>
        </div>
      )}

      {/* 📊 分析报告 */}
      {!loading && result && (
        <AnalysisPanel data={JSON.parse(result)} />
      )}
      <div className="h-60" /> {/* spacer: 底部与版权之间 40px */}
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-purple-500/20 mt-20 py-10 bg-black/50 text-gray-400 text-sm">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Logo & 简介 */}
          <div>
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 mb-2">
              🐌 SNAIL CAREER
            </h2>
            <p className="text-gray-500 mb-3">蜗牛简历 | 一毫米也算前进。</p>
            <p className="text-xs text-gray-600">
              AI 简历分析与岗位匹配工具，帮助你了解求职进度与优化方向。
            </p>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Resources</h3>
            <ul className="space-y-2">
              <li><a href="https://uiverse.io" className="hover:text-purple-400 transition">UIverse.io</a></li>
              <li><a href="https://cssbuttons.io" className="hover:text-purple-400 transition">Cssbuttons.io</a></li>
              <li><a href="https://pixelrepo.com" className="hover:text-purple-400 transition">Pixelrepo.com</a></li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Information</h3>
            <ul className="space-y-2">
              <li><FeedbackDialog /></li>
              <li><FeedbackDialog kind="cooperation" /></li>
              <li><a href=" https://xhslink.com/m/8bOzZ9dlgop" target="_blank" className="hover:text-purple-400 transition">About me</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-purple-400 transition">Terms</a></li>
              <li><a href="#" className="hover:text-purple-400 transition">Privacy policy</a></li>
              <li><a href="#" className="hover:text-purple-400 transition">Disclaimer</a></li>
            </ul>
          </div>
        </div>

        {/* 底部版权 */}
        <div className="text-center text-gray-600 text-xs mt-10 border-t border-purple-500/10 pt-4">
          © 2025 SNAIL CAREER. All rights reserved. | Made with 💜 by Wenhao Wang
        </div>
      </footer>


    </main>
  );
}
