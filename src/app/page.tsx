"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import AnalyzingTips from "./components/AnalyzingTips";
import AnalysisPanel from "./components/AnalysisPanel";
import TalentProfilePanel, { type TalentProfileData } from "./components/TalentProfilePanel";
import ButtonTreasure from "./components/ButtonTreasure";
import FeedbackDialog from "./components/FeedbackDialog";
import TodayLoginCount from "./components/TodayLoginCount";
import HistoryChart from "./components/HistoryChart";
import { getHistory, appendToHistory, clearHistory, setHistory, maskRoleName, type AnalysisRecord } from "@/lib/historyStorage";
import { useUser } from "@/hooks/useAuth";
import { track } from "@/lib/analytics";

const CLIPBOARD_STORAGE_KEY = "snail_career_clipboard";
const FEATURE_BANNER_STORAGE_KEY = "snail_feature_banner_seen_2026_03_14";
const MOCK_INTERVIEW_AUTO_CREATE_KEY = "snail_mock_interview_auto_create";

const FEATURE_BANNER_VERSIONS = [
  {
    id: "2026-03-14",
    badge: "3 月 14 日 上新",
    title: "新功能上线",
    intro: "这次不是只看分数了，你现在可以直接生成更完整、更有传播性的能力画像报告：",
    items: [
      "AI 能力画像报告：一句定位、五维图谱、高光短板、竞争位置分布",
      "动态追问题流：按岗位方向出题，前面回答会影响后面的问题内容",
      "作品集辅助判断：支持补充作品集链接或上传文件一起分析",
      "分享能力增强：分享卡片、图谱判词、浏览器打印导出 PDF",
    ],
  },
  {
    id: "2026-03-11",
    badge: "3 月 11 日 上新",
    title: "新功能上线",
    intro: "春招季来了，我们为你准备了这些新能力：",
    items: [
      "春招投递剪贴板 — 一键填充简历信息",
      "模拟面试 — 刷题、错题本、自定义题库",
      "小蜗日程 — 任务与番茄钟 Focus 模式",
      "面试复盘 — 面试记录与考前清单",
    ],
  },
] as const;

/** 从 LLM 输出中提取 JSON（可能被 ```json ... ``` 包裹） */
function extractJsonFromText(text: string): string | null {
  const trimmed = String(text ?? "").trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlock) return jsonBlock[1].trim();
  const braceStart = trimmed.indexOf("{");
  if (braceStart >= 0) {
    let depth = 0;
    for (let i = braceStart; i < trimmed.length; i++) {
      if (trimmed[i] === "{") depth++;
      if (trimmed[i] === "}") {
        depth--;
        if (depth === 0) return trimmed.slice(braceStart, i + 1);
      }
    }
  }
  return null;
}

type EducationItem = {
  学校名称: string;
  学院名称: string;
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
  个人评价: string;
  个人评价模板: string[];
};

/** 历史记录为空时展示的示例数据（仅供参考） */
const SAMPLE_HISTORY_RECORDS: AnalysisRecord[] = [
  { role: "前端开发工程师", score: 8.2, date: new Date(Date.now() - 4 * 24 * 3600000).toISOString(), rankPercent: 78, total: 100 },
  { role: "产品经理", score: 7.5, date: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), rankPercent: 65, total: 100 },
  { role: "Java 开发", score: 8.8, date: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), rankPercent: 85, total: 100 },
  { role: "数据分析师", score: 7.0, date: new Date(Date.now() - 1 * 24 * 3600000).toISOString(), rankPercent: 55, total: 100 },
  { role: "UI 设计师", score: 9.0, date: new Date().toISOString(), rankPercent: 92, total: 100 },
];

/** 能力画像示例数据（用于示例报告预览，新 JSON 结构） */
const SAMPLE_TALENT_PROFILE: TalentProfileData = {
  oneSentencePosition: "具备商业化敏感度的 AI 产品潜力型选手",
  summary: "在当前的 AI 人才市场中，纯技术背景的候选人往往缺乏对用户情绪的感知，而传统互联网产品经理又容易受限于「确定性」的路径依赖。你的核心壁垒在于：以建筑与景观设计的空间体验为底色，以「Vibe Coding」的敏捷开发为武器，通过三段从底层到应用层的核心大厂实习，构建了极度务实的 AI 商业化与评测调优思维。",
  hexagonScores: {
    education: 4.5,
    experience: 4.2,
    projectDescription: 4.0,
    achievements: 3.8,
    jobMatch: 4.2,
  },
  topHighlight: {
    title: "大厂 AI 产品实习",
    content: "独立完成 LLM 评测体系搭建，将评测效率提升 40%，体现从 0 到 1 的落地能力",
  },
  topRisk: {
    issue: "成果量化不足",
    impact: "简历中定性描述多，难以通过初筛",
  },
  talentTags: {
    direction: "AI产品经理",
    archetype: "潜力型",
    riskLevel: "medium",
  },
  overallMatch: 8.4,
  rankPercent: 82.3,
  total: 100,
};

const 学历选项 = ["高中", "专科", "本科", "硕士", "博士"] as const;
const 学历类型选项 = ["统招全日制", "非全日制", "自考", "成人教育", "其他"] as const;
const 成绩排名选项 = ["前 10%", "前 30%", "前 50%", "其他"] as const;

const defaultEducationItem = (): EducationItem => ({
  学校名称: "",
  学院名称: "",
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
const DEFAULT_个人评价_模板1 = "本人学习能力强，具备良好的团队协作与沟通能力，能适应快节奏工作环境。";
const defaultClipboardData = (): ClipboardData => ({
  姓名: "",
  身份证: "",
  手机: "",
  邮箱: "",
  教育背景: [defaultEducationItem()],
  实习经历: [defaultInternshipItem()],
  求职意向: "",
  个人评价: "",
  个人评价模板: [DEFAULT_个人评价_模板1],
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

/** 将 YYYY-MM 或 YYYY-MM-DD 转为 yyyy-mm-dd，仅月份时补 01 */
function formatDateToYyyyMmDd(val: string): string {
  if (!val || !val.trim()) return "";
  const m = val.trim().match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (!m) return val;
  const y = m[1], mon = String(m[2]).padStart(2, "0");
  if (m[3]) return `${y}-${mon}-${String(m[3]).padStart(2, "0")}`;
  return `${y}-${mon}-01`;
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
  if (typeof o.个人评价 === "string") def.个人评价 = o.个人评价;
  if (Array.isArray(o.个人评价模板)) {
    def.个人评价模板 = o.个人评价模板.filter((x): x is string => typeof x === "string");
    if (def.个人评价模板.length === 0) def.个人评价模板 = [DEFAULT_个人评价_模板1];
  }
  if (Array.isArray(o.教育背景)) {
    def.教育背景 = o.教育背景
      .filter((x): x is Record<string, unknown> => x && typeof x === "object")
      .map((b) => ({
        学校名称: typeof b.学校名称 === "string" ? b.学校名称 : (typeof (b as { 大学?: string }).大学 === "string" ? (b as { 大学: string }).大学 : ""),
        学院名称: typeof b.学院名称 === "string" ? b.学院名称 : (typeof (b as { 学院?: string }).学院 === "string" ? (b as { 学院: string }).学院 : ""),
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
          学院名称: typeof b.学院 === "string" ? b.学院 : "",
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
    const uni = str.match(/(?:学校|院校|大学)[：:\s]*([^\s]+(?:\s+[^\s]+){0,2})/i);
    const college = str.match(/(?:学院)[：:\s]*([^\s]+(?:\s+[^\s]+)?)/i);
    const time = str.match(/(\d{4}[年.\-/]\d{1,2}[月]?[.\-/]\d{1,2}日?|\d{4}[年.\-/]\d{1,2}月?)[^]*?(?:至今|毕业)/) || str.match(/(\d{4}[年.\-/]\d{1,2})/);
    const timeStr = time ? time[1].trim().slice(0, 40) : "";
    const [start, end] = timeStr.includes("-") ? timeStr.split("-").map((s) => s.replace(/\D/g, "-").slice(0, 7)) : [timeStr.slice(0, 7), ""];
    out.教育背景 = [
      { ...defaultEducationItem(), 学校名称: uni ? uni[1].trim().slice(0, 80) : "", 学院名称: college ? college[1].trim().slice(0, 80) : "", 起止开始: start, 起止结束: end },
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

type QuestionOption = {
  value: string;
  label: string;
  desc: string;
};

type QuestionFlowContext = {
  role: string;
  answers: Record<string, string>;
  hasPortfolio: "" | "yes" | "no";
};

// 能力画像问题类型
type QuestionItem = {
  id: string;
  stage: "base" | "role" | "followup";
  type: "text" | "choice";
  question?: string;
  placeholder?: string;
  options?: QuestionOption[];
  roles?: string[];
  helperText?: string;
  getQuestion?: (ctx: QuestionFlowContext) => string;
  getPlaceholder?: (ctx: QuestionFlowContext) => string;
  shouldShow?: (ctx: QuestionFlowContext) => boolean;
};

const VIBE_CODING_OPTIONS: QuestionOption[] = [
  { value: "often", label: "经常", desc: "平时会用它做小功能或快速验证想法" },
  { value: "sometimes", label: "偶尔", desc: "试过几次，能辅助自己完成一些东西" },
  { value: "never", label: "还没试过", desc: "暂时没有系统用过，想先看看别人怎么做" },
];

const ANALYSIS_MODEL = "gpt-5";

const BASE_PROFILE_QUESTIONS: QuestionItem[] = [
  {
    id: "favorite_product",
    stage: "base",
    question: "你觉得最牛的一个产品是什么？为什么？",
    placeholder: "产品名 + 你最服的一点，1-2 句就行",
    type: "text",
    helperText: "不用回答得很标准，说真实想法就行。",
  },
  {
    id: "vibe_coding_experience",
    stage: "base",
    question: "你做过 Vibe Coding 吗？",
    type: "choice",
    options: VIBE_CODING_OPTIONS,
  },
  {
    id: "deepest_case",
    stage: "role",
    getQuestion: (ctx) => {
      if (ctx.role === "product" || ctx.role === "ai_product") return "讲一个你做过、印象最深的需求";
      if (ctx.role === "operation") return "讲一个你做过、印象最深的运营动作";
      if (ctx.role === "data") return "讲一个你做过、印象最深的分析题目";
      if (ctx.role === "development") return "讲一个你做过、印象最深的功能";
      if (ctx.role === "design") return "讲一个你做过、印象最深的设计需求";
      return "讲一个你做过、印象最深的一件事";
    },
    getPlaceholder: (ctx) => {
      if (ctx.role === "product" || ctx.role === "ai_product") {
        return "它要解决什么问题？你为什么对它印象深？";
      }
      if (ctx.role === "operation") {
        return "你做了什么动作？目标是什么？为什么它让你印象深？";
      }
      if (ctx.role === "data") {
        return "你分析了什么问题？最后得出了什么结论？";
      }
      if (ctx.role === "development") {
        return "这个功能是做什么的？难点在哪？你做了什么？";
      }
      if (ctx.role === "design") {
        return "这个设计要解决什么体验问题？你做了哪些关键决定？";
      }
      return "说清楚背景、你做了什么、为什么这件事让你印象深。";
    },
    type: "text",
    helperText: "一句话起步也可以，不用写太长。",
  },
];

// 目标岗位选项
const TARGET_DIRECTIONS = [
  { value: "product", label: "产品经理", icon: "📱" },
  { value: "operation", label: "运营", icon: "🚀" },
  { value: "data", label: "数据分析", icon: "📊" },
  { value: "development", label: "开发", icon: "💻" },
  { value: "ai_product", label: "AI产品", icon: "🤖" },
  { value: "design", label: "设计", icon: "🎨" },
  { value: "other", label: "其他", icon: "🔍" },
];

function getQuestionRoleKey(selectedDirection: string) {
  return selectedDirection || "other";
}

function buildMockInterviewJd(direction: string, roleLabel: string) {
  const displayRole = roleLabel.trim() || "目标岗位";

  if (direction === "product") {
    return `${displayRole}（通用要求）：
- 能独立完成需求分析、方案设计与推动落地
- 具备用户洞察、产品判断和跨团队协作能力
- 能从实际业务问题中抽象目标、优先级和验证方法`;
  }
  if (direction === "ai_product") {
    return `${displayRole}（通用要求）：
- 理解大模型/AI产品的能力边界，能把技术能力转成产品价值
- 能完成需求设计、效果评估与迭代优化
- 关注用户体验、业务结果与落地效率`;
  }
  if (direction === "operation") {
    return `${displayRole}（通用要求）：
- 能围绕增长、转化或内容目标设计运营动作
- 具备复盘沉淀、数据分析和跨团队协同能力
- 能把运营动作落到具体执行和结果追踪上`;
  }
  if (direction === "data") {
    return `${displayRole}（通用要求）：
- 能定位业务问题并设计分析思路
- 熟悉指标拆解、异常排查和业务洞察输出
- 能把分析结论转化为实际决策建议`;
  }
  if (direction === "development") {
    return `${displayRole}（通用要求）：
- 能独立负责功能开发、问题排查和性能优化
- 具备良好的工程实现能力与协作能力
- 能结合真实业务场景说明技术取舍与落地结果`;
  }
  if (direction === "design") {
    return `${displayRole}（通用要求）：
- 能基于用户问题完成设计方案并推动落地
- 兼顾体验、视觉表达和实现成本
- 能清楚说明设计思路、迭代过程和结果反馈`;
  }
  return `${displayRole}（通用要求）：
- 请结合候选人简历内容，围绕岗位相关能力生成面试题
- 重点考察真实经历、问题解决能力、表达与思考深度
- 优先追问候选人最有代表性的项目、成果与判断`;
}

function getDynamicQuestions(role: string) {
  const ctx: QuestionFlowContext = { role, answers: {}, hasPortfolio: "" };
  return BASE_PROFILE_QUESTIONS.map((item) => ({
    ...item,
    question: item.getQuestion ? item.getQuestion(ctx) : item.question || "",
    placeholder: item.getPlaceholder ? item.getPlaceholder(ctx) : item.placeholder,
  }));
}

export default function Home() {
  // ===== 原有状态 =====
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
  const [showFeatureBanner, setShowFeatureBanner] = useState(false);
  const [selectedFeatureVersion, setSelectedFeatureVersion] = useState<(typeof FEATURE_BANNER_VERSIONS)[number]["id"]>("2026-03-14");
  const importInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();

  // ===== 能力画像新状态 =====
  const [currentStep, setCurrentStep] = useState<"upload" | "direction" | "questions" | "analyzing" | "result">("upload");
  const [selectedDirection, setSelectedDirection] = useState("");
  const [hasPortfolio, setHasPortfolio] = useState<"" | "yes" | "no">("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [talentProfile, setTalentProfile] = useState<TalentProfileData | null>(null);
  const [showSample, setShowSample] = useState(false);
  const [showInterviewPrompt, setShowInterviewPrompt] = useState(false);
  const dynamicQuestions = useMemo(
    () => getDynamicQuestions(getQuestionRoleKey(selectedDirection)),
    [selectedDirection]
  );
  const currentQuestion = dynamicQuestions[currentQuestionIndex];
  const activeFeatureBanner = FEATURE_BANNER_VERSIONS.find((item) => item.id === selectedFeatureVersion) || FEATURE_BANNER_VERSIONS[0];

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
    if (typeof window === "undefined") return;
    try {
      const seen = localStorage.getItem(FEATURE_BANNER_STORAGE_KEY);
      if (!seen) setShowFeatureBanner(true);
    } catch {
      setShowFeatureBanner(true);
    }
  }, []);

  useEffect(() => {
    if (mainTab === "history") setHistoryRecords(getHistory());
  }, [mainTab]);

  const closeFeatureBanner = () => {
    setShowFeatureBanner(false);
    try {
      localStorage.setItem(FEATURE_BANNER_STORAGE_KEY, "1");
    } catch {}
  };

  useEffect(() => {
    if (currentQuestionIndex >= dynamicQuestions.length) {
      setCurrentQuestionIndex(Math.max(dynamicQuestions.length - 1, 0));
    }
  }, [currentQuestionIndex, dynamicQuestions.length]);

  // 登录后拉取云端剪贴板；若云端为空且本地有数据则上传
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/sync/clipboard");
        if (cancelled) return;
        const j = await r.json();
        if (!r.ok) return;
        const data = j.data;
        if (data && typeof data === "object" && (data.姓名 !== undefined || data.求职意向 !== undefined || data.个人评价 !== undefined || Array.isArray(data.教育背景))) {
          const next = migrateClipboardData(data);
          setClipboardData(next);
          try {
            localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(next));
          } catch {}
        } else {
          const raw = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
          if (raw) {
            try {
              const local = JSON.parse(raw);
              if (local && typeof local === "object") {
                await fetch("/api/sync/clipboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(local) });
              }
            } catch {}
          }
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // 登录后剪贴板变更时防抖上传云端
  useEffect(() => {
    if (!user?.id) return;
    const t = setTimeout(() => {
      fetch("/api/sync/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clipboardData),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [user?.id, clipboardData]);

  // 登录后拉取云端简历分析历史；若云端为空且本地有则上传
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/sync/analysis-history");
        if (cancelled) return;
        const j = await r.json();
        if (!r.ok) return;
        const records = Array.isArray(j.records) ? j.records : [];
        if (records.length > 0) {
          setHistory(records);
          setHistoryRecords(records);
        } else {
          const local = getHistory();
          if (local.length > 0) {
            await fetch("/api/sync/analysis-history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ records: local }),
            });
          }
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

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

  useEffect(() => {
    if (currentStep !== "result" || !talentProfile || !resumeText.trim()) {
      setShowInterviewPrompt(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowInterviewPrompt(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentStep, talentProfile, resumeText]);

  // 能力画像生成函数
  async function handleProfileGenerate() {
    if (!file) return;
    setCurrentStep("analyzing");
    setLoading(true);
    setSeconds(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target_role", targetRole);
      formData.append("jd", jdText);
      formData.append("has_portfolio", hasPortfolio || "no");
      if (portfolioLink.trim()) formData.append("portfolio_link", portfolioLink.trim());
      if (portfolioFile) formData.append("portfolio_file", portfolioFile);
      // 追加结构化问题答案
      formData.append(
        "question_answers",
        JSON.stringify({
          roleKey: getQuestionRoleKey(selectedDirection),
          targetRole: targetRole.trim(),
          hasPortfolio,
          portfolioLink: portfolioLink.trim(),
          questions: dynamicQuestions.map((item) => ({
            id: item.id,
            stage: item.stage,
            question: item.question,
            answer: questionAnswers[item.id] || "",
          })),
          rawAnswers: questionAnswers,
        })
      );
      formData.append("mode", "talent_profile"); // 标记为能力画像模式
      formData.append("model", ANALYSIS_MODEL);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(data.error || "生成失败，请稍后再试。");
        setCurrentStep("questions");
        setLoading(false);
        return;
      }

      // 解析能力画像数据（支持从 markdown 代码块中提取 JSON）
      let profileData: TalentProfileData;
      const rawStr = String(data.analysis ?? "");
      let jsonStr = rawStr;
      try {
        JSON.parse(rawStr);
      } catch {
        const extracted = extractJsonFromText(rawStr);
        if (extracted) jsonStr = extracted;
      }
      try {
        profileData = JSON.parse(jsonStr) as TalentProfileData;
        profileData.rankPercent = data.rankPercent;
        profileData.total = data.total;
      } catch (e) {
        console.error("❌ 能力画像 JSON 解析失败:", e, "raw:", rawStr?.slice(0, 200));
        alert("AI 返回格式异常，无法解析报告。请重试或更换模型。");
        setCurrentStep("questions");
        setLoading(false);
        return;
      }

      setTalentProfile(profileData);
      setResumeText(data.resumeText);
      track("profile_report_generated", {
        direction: selectedDirection,
        archetype: profileData.talentTags?.archetype ?? "",
      });

      // 保存历史
      appendToHistory({
        role: targetRole?.trim() || "能力画像",
        score: profileData.overallMatch ?? 8.0,
        date: new Date().toISOString(),
        rankPercent: data.rankPercent,
        total: data.total,
      });
      setHistoryRecords(getHistory());

      setCurrentStep("result");
    } catch (err) {
      console.error("❌ 生成出错:", err);
      alert("生成过程中出现错误，请检查网络或重试。");
      setCurrentStep("questions");
    } finally {
      setLoading(false);
    }
  }

  function handleGenerateInterviewFromReport() {
    if (typeof window === "undefined") return;
    if (!resumeText.trim()) {
      alert("当前没有可用于生成题库的简历内容。");
      return;
    }

    const payload = {
      projectName: `${targetRole?.trim() || "能力画像"} - 模拟面试题库`,
      jdContent: buildMockInterviewJd(selectedDirection, targetRole),
      resumeContent: resumeText.trim(),
      autoGenerate: true,
    };

    try {
      window.localStorage.setItem(MOCK_INTERVIEW_AUTO_CREATE_KEY, JSON.stringify(payload));
    } catch {}

    setShowInterviewPrompt(false);
    window.location.href = "/mock-interview";
  }

  // 重置能力画像流程
  function resetProfileFlow() {
    setCurrentStep("upload");
    setFile(null);
    setSelectedDirection("");
    setTargetRole("");
    setHasPortfolio("");
    setPortfolioLink("");
    setPortfolioFile(null);
    setQuestionAnswers({});
    setCurrentQuestionIndex(0);
    setTalentProfile(null);
    setResumeText("");
    setResult("");
    setShowInterviewPrompt(false);
  }

  async function handleUpload() {
    if (!file) return alert("请先选择文件！");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target_role", targetRole);
      formData.append("jd", jdText);
      formData.append("mode", "legacy"); // 传统模式

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
      if (user) {
        fetch("/api/sync/analysis-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: getHistory() }),
        }).catch(() => {});
      }
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
      {showFeatureBanner && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-3xl rounded-[28px] border border-slate-500/40 bg-slate-900/95 shadow-[0_0_80px_rgba(168,85,247,0.18)] px-8 py-10">
            <div className="flex justify-end mb-6">
              <button
                type="button"
                onClick={() => setSelectedFeatureVersion((prev) => prev === "2026-03-14" ? "2026-03-11" : "2026-03-14")}
                className="rounded-full border border-slate-600/70 bg-slate-800/60 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition"
              >
                {selectedFeatureVersion === "2026-03-14" ? "历史版本" : "返回最新版本"}
              </button>
            </div>

            <h2 className="text-center text-4xl font-black text-white tracking-tight mb-5">{activeFeatureBanner.title}</h2>
            <p className="text-center text-slate-300 text-lg mb-8">
              {activeFeatureBanner.intro}
            </p>

            <div className="max-w-2xl mx-auto space-y-4 text-lg text-slate-100 mb-10">
              {activeFeatureBanner.items.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-fuchsia-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={closeFeatureBanner}
              className="block w-full max-w-2xl mx-auto rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-600 py-5 text-2xl font-bold text-white hover:brightness-110 transition"
            >
              知道了
            </button>
          </div>
        </div>
      )}

      {/* 顶部导航栏：左侧标题+金币 + 右侧菜单 */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 bg-black/40 backdrop-blur-sm border-b border-purple-500/20">
        <div className="flex flex-col gap-2 min-w-0 flex-shrink-0">
          <h1 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 whitespace-nowrap">
            🐌 SNAIL CAREER｜蜗牛简历
          </h1>
          <ButtonTreasure />
        </div>
        <div className="hidden sm:flex items-center">
          <TodayLoginCount />
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg ${menuOpen ? "bg-purple-500 text-white border-2 border-purple-400 shadow-purple-500/30" : "bg-purple-600 text-white border-2 border-purple-400 hover:bg-purple-500 hover:border-purple-300"}`}
            aria-label="打开菜单"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>打开菜单</span>
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
                  href="/promo"
                  className="block px-4 py-3 text-sm font-medium text-purple-300 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 hover:text-purple-200 transition rounded-b-xl border-t border-purple-500/20"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    宣传片
                  </span>
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
            🐌 AI 求职能力画像
          </h2>
          <p className="text-center text-white text-lg mb-2">
            3分钟看清：你最像什么样的人、强项在哪、适合什么岗位
          </p>
          <p className="text-center text-slate-400 text-sm mb-6">
            上传简历 + 回答 3 个问题，生成可分享的个人能力画像报告
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
                    🏆 我的排行榜 · 前 5 岗位
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.confirm("确定要清空全部历史记录与排名吗？此操作不可恢复。")) {
                        clearHistory();
                        setHistoryRecords(getHistory());
                        if (user) {
                          fetch("/api/sync/analysis-history", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ records: [] }),
                          }).catch(() => {});
                        }
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/50 text-red-400 hover:bg-red-500/20 transition"
                  >
                    删除记录
                  </button>
                </div>
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
            <div className="w-full space-y-6">
              <div className="text-center py-4 px-4 rounded-xl bg-amber-500/15 border border-amber-500/40">
                <p className="text-amber-200 font-medium">暂无历史记录</p>
                <p className="text-sm text-amber-200/80 mt-1">在「简历分析」中完成一次分析后，这里会显示你的真实打分与排名。</p>
              </div>
              {/* 示例结果（仅供参考） */}
              <div className="bg-black/50 border-2 border-dashed border-purple-500/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2 mb-1">
                  📋 示例结果（仅供参考）
                </h3>
                <p className="text-xs text-slate-500 mb-4">以下为模拟数据，便于了解分析完成后的展示效果。</p>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">🏆 排行榜示例 · 前 5 岗位</h4>
                  <ul className="space-y-2">
                    {[...SAMPLE_HISTORY_RECORDS]
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 5)
                      .map((r, i) => (
                        <li
                          key={`sample-${i}`}
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
                <HistoryChart records={SAMPLE_HISTORY_RECORDS} />
              </div>
            </div>
          )}
        </div>
      ) : mainTab === "clipboard" ? (
        <div className="w-full px-6 z-10 max-w-5xl mx-auto space-y-6">
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
                    <button type="button" onClick={() => copyClipboardField(clipboardData[key])} className="shrink-0 px-3 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制">复制</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border-2 border-purple-500/40 bg-purple-500/10 p-5 mb-2">
              <div className="border-l-4 border-purple-400 pl-4 py-2 mb-4">
                <h4 className="text-base font-semibold text-purple-200 mb-0.5">一、教育经历</h4>
                <p className="text-xs text-slate-500">共 {clipboardData.教育背景.length} 条 · 校园经历</p>
              </div>
              <div className="space-y-4">
                {clipboardData.教育背景.map((edu, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-600 p-4 space-y-3 relative">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">学校名称 <span className="text-red-400">*</span></label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={edu.学校名称}
                            onChange={(e) => setClipboardData((prev) => {
                              const next = [...prev.教育背景];
                              next[idx] = { ...next[idx], 学校名称: e.target.value };
                              return { ...prev, 教育背景: next };
                            })}
                            placeholder="如：天津大学"
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none text-sm"
                          />
                          <button type="button" onClick={() => copyClipboardField(edu.学校名称)} className="shrink-0 px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制">复制</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">学院名称</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={edu.学院名称}
                            onChange={(e) => setClipboardData((prev) => {
                              const next = [...prev.教育背景];
                              next[idx] = { ...next[idx], 学院名称: e.target.value };
                              return { ...prev, 教育背景: next };
                            })}
                            placeholder="如：建筑学院"
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none text-sm"
                          />
                          <button type="button" onClick={() => copyClipboardField(edu.学院名称)} className="shrink-0 px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制">复制</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">学历 <span className="text-red-400">*</span></label>
                        <div className="flex gap-2 items-center">
                          <select
                            value={edu.学历}
                            onChange={(e) => setClipboardData((prev) => {
                              const next = [...prev.教育背景];
                              next[idx] = { ...next[idx], 学历: e.target.value };
                              return { ...prev, 教育背景: next };
                            })}
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none text-sm"
                          >
                            {学历选项.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                          <button type="button" onClick={() => copyClipboardField(edu.学历)} className="shrink-0 px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制">复制</button>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">专业 <span className="text-red-400">*</span></label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={edu.专业}
                            onChange={(e) => setClipboardData((prev) => {
                              const next = [...prev.教育背景];
                              next[idx] = { ...next[idx], 专业: e.target.value };
                              return { ...prev, 教育背景: next };
                            })}
                            placeholder="如：建筑"
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none text-sm"
                          />
                          <button type="button" onClick={() => copyClipboardField(edu.专业)} className="shrink-0 px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制">复制</button>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">起止时间 <span className="text-red-400">*</span></label>
                        <p className="text-[10px] text-slate-500 mb-1">无准确的毕业时间可填写预计毕业时间</p>
                        <div className="flex items-center gap-2 flex-wrap">
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
                          <button type="button" onClick={() => copyClipboardField(formatDateToYyyyMmDd(edu.起止开始))} className="shrink-0 px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制起始日期 (yyyy-mm-dd)">复制</button>
                          <button type="button" onClick={() => copyClipboardField(formatDateToYyyyMmDd(edu.起止结束))} className="shrink-0 px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制终止日期 (yyyy-mm-dd)">复制</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">学历类型 <span className="text-red-400">*</span></label>
                        <div className="flex gap-2 items-center">
                          <select
                            value={edu.学历类型}
                            onChange={(e) => setClipboardData((prev) => {
                              const next = [...prev.教育背景];
                              next[idx] = { ...next[idx], 学历类型: e.target.value };
                              return { ...prev, 教育背景: next };
                            })}
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none text-sm"
                          >
                            {学历类型选项.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                          <button type="button" onClick={() => copyClipboardField(edu.学历类型)} className="shrink-0 px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制">复制</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">成绩排名 <span className="text-red-400">*</span></label>
                        <div className="flex gap-2 items-center">
                          <select
                            value={edu.成绩排名}
                            onChange={(e) => setClipboardData((prev) => {
                              const next = [...prev.教育背景];
                              next[idx] = { ...next[idx], 成绩排名: e.target.value };
                              return { ...prev, 教育背景: next };
                            })}
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:border-purple-400 focus:outline-none text-sm"
                          >
                            <option value="">请选择</option>
                            {成绩排名选项.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                          <button type="button" onClick={() => copyClipboardField(edu.成绩排名)} className="shrink-0 px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制">复制</button>
                        </div>
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

            <div className="my-8 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" aria-hidden />

            <div className="rounded-xl border-2 border-cyan-500/40 bg-cyan-500/10 p-5">
              <div className="border-l-4 border-cyan-400 pl-4 py-2 mb-4">
                <h4 className="text-base font-semibold text-cyan-200 mb-0.5">二、实习经历</h4>
                <p className="text-xs text-slate-500">共 {clipboardData.实习经历.length} 条 · 分条填写，可增删</p>
              </div>
              <div className="space-y-4">
                {clipboardData.实习经历.map((item, i) => (
                  <div key={i} className="rounded-lg border border-gray-600 p-4 space-y-3 relative">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">公司名称 <span className="text-red-400">*</span></label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={item.公司名称}
                            onChange={(e) => setClipboardData((prev) => {
                              const next = [...prev.实习经历];
                              next[i] = { ...next[i], 公司名称: e.target.value };
                              return { ...prev, 实习经历: next };
                            })}
                            placeholder="如：苏黎世联邦理工大学"
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none text-sm"
                          />
                          <button type="button" onClick={() => copyClipboardField(item.公司名称)} className="shrink-0 px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制">复制</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">职位名称 <span className="text-red-400">*</span></label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={item.职位名称}
                            onChange={(e) => setClipboardData((prev) => {
                              const next = [...prev.实习经历];
                              next[i] = { ...next[i], 职位名称: e.target.value };
                              return { ...prev, 实习经历: next };
                            })}
                            placeholder="如：AI产品经理"
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none text-sm"
                          />
                          <button type="button" onClick={() => copyClipboardField(item.职位名称)} className="shrink-0 px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制">复制</button>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">起止时间 <span className="text-red-400">*</span></label>
                        <div className="flex items-center gap-2 flex-wrap">
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
                          <button type="button" onClick={() => copyClipboardField(formatDateToYyyyMmDd(item.起止开始))} className="shrink-0 px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制起始日期 (yyyy-mm-dd)">复制</button>
                          <button type="button" onClick={() => copyClipboardField(formatDateToYyyyMmDd(item.起止结束))} className="shrink-0 px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制终止日期 (yyyy-mm-dd)">复制</button>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1">描述</label>
                        <div className="flex gap-2 items-start">
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
                            className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none resize-y text-sm min-h-[56px]"
                          />
                          <div className="flex flex-col gap-1 shrink-0">
                            <button type="button" onClick={() => copyClipboardField(item.描述)} className="px-2 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制">复制</button>
                          </div>
                        </div>
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

            <div className="mt-8 rounded-xl border-2 border-gray-600/80 bg-black/30 p-5">
              <label className="block text-sm text-slate-400 mb-2">求职意向</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={clipboardData.求职意向}
                  onChange={(e) => setClipboardData((prev) => ({ ...prev, 求职意向: e.target.value }))}
                  placeholder="输入求职意向"
                  className="flex-1 min-w-0 bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none"
                />
                <button type="button" onClick={() => copyClipboardField(clipboardData.求职意向)} className="shrink-0 px-3 py-2 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制">复制</button>
              </div>
            </div>

            <div className="mt-8 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-5">
              <div className="border-l-4 border-amber-400 pl-4 py-2 mb-4">
                <h4 className="text-base font-semibold text-amber-200 mb-0.5">三、个人评价</h4>
                <p className="text-xs text-slate-500">可选用下方模板或自写，支持添加多个模板</p>
              </div>
              <textarea
                value={clipboardData.个人评价}
                onChange={(e) => setClipboardData((prev) => ({ ...prev, 个人评价: e.target.value }))}
                onFocus={(e) => resizeTextareaToContent(e.currentTarget)}
                placeholder="填写个人评价 / 自我评价..."
                rows={3}
                className="w-full bg-black/60 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none resize-y text-sm min-h-[72px] mb-3"
              />
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs text-slate-500 mr-1">使用模板：</span>
                {clipboardData.个人评价模板.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setClipboardData((prev) => ({ ...prev, 个人评价: prev.个人评价模板[i] ?? "" }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-500/40 text-purple-300 hover:bg-purple-500/20 transition"
                  >
                    模板{i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setClipboardData((prev) => ({ ...prev, 个人评价模板: [...prev.个人评价模板, ""] }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-500 text-slate-400 hover:border-purple-400 hover:text-purple-300 transition"
                >
                  + 添加个人评价模板
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => copyClipboardField(clipboardData.个人评价)} className="px-3 py-1.5 rounded-lg border border-amber-600/60 text-amber-200/90 hover:border-amber-500/70 hover:bg-amber-500/5 text-xs whitespace-nowrap" title="复制">复制</button>
                <span className="text-[10px] text-slate-500">个人评价与模板均随下方「保存」按钮一起保存</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-8 mt-8 border-t border-gray-700">
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
          {/* ===== 能力画像新流程 ===== */}
          {currentStep === "upload" && (
            <div className="w-full max-w-md mx-auto z-10 animate-fade-in">
              {/* 步骤指示器 */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {["上传简历", "选择方向", "补充问答", "生成画像"].map((step, idx) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      idx === 0 ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-500"
                    }`}>
                      {idx + 1}
                    </div>
                    {idx < 3 && <div className="w-8 h-0.5 bg-gray-800" />}
                  </div>
                ))}
              </div>

              {/* 文件上传 */}
              <div className="relative mb-6">
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFile(f);
                      track("profile_resume_uploaded");
                    }
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="resume-upload"
                  className="block cursor-pointer bg-black/70 border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-purple-400 hover:bg-black/80 transition group"
                >
                  <div className="text-4xl mb-3">📄</div>
                  {file ? (
                    <p className="text-purple-300 font-medium">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-gray-300 font-medium mb-1">点击上传简历</p>
                      <p className="text-xs text-gray-500">支持 PDF、Word 格式</p>
                    </>
                  )}
                </label>
              </div>

              {/* 下一步按钮 */}
              <button
                onClick={() => {
                  if (!file) {
                    alert("请先上传简历文件");
                    return;
                  }
                  track("profile_test_started", { model: ANALYSIS_MODEL });
                  setCurrentStep("direction");
                }}
                disabled={!file}
                className="w-full py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                下一步：选择求职方向
              </button>

              {/* 示例报告入口 */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowSample(true)}
                  className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-2"
                >
                  查看示例画像报告
                </button>
              </div>
            </div>
          )}

          {/* ===== 选择方向 ===== */}
          {currentStep === "direction" && (
            <div className="w-full max-w-lg mx-auto z-10 animate-fade-in">
              {/* 步骤指示器 */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {["上传简历", "选择方向", "补充问答", "生成画像"].map((step, idx) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      idx === 1 ? "bg-purple-600 text-white" : idx < 1 ? "bg-purple-600/50 text-white" : "bg-gray-800 text-gray-500"
                    }`}>
                      {idx + 1}
                    </div>
                    {idx < 3 && <div className={`w-8 h-0.5 ${idx < 1 ? "bg-purple-600/50" : "bg-gray-800"}`} />}
                  </div>
                ))}
              </div>

              <h3 className="text-xl font-semibold text-white text-center mb-6">
                你想往哪个方向发展？
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {TARGET_DIRECTIONS.map((dir) => (
                  <button
                    key={dir.value}
                    onClick={() => {
                      setSelectedDirection(dir.value);
                      setTargetRole(dir.label);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      selectedDirection === dir.value
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-gray-700 bg-black/50 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-2xl mb-2">{dir.icon}</div>
                    <div className={`font-medium ${selectedDirection === dir.value ? "text-purple-300" : "text-gray-300"}`}>
                      {dir.label}
                    </div>
                  </button>
                ))}
              </div>

              {/* 自定义方向输入 */}
              <div className="mb-6">
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="或者手动输入目标岗位（如：增长产品经理）"
                  className="w-full bg-black/70 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none"
                />
              </div>

              <div className="mb-6 bg-black/50 border border-gray-700 rounded-xl p-5">
                <h4 className="text-white font-medium mb-4">是否有作品集展示？</h4>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setHasPortfolio("yes")}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      hasPortfolio === "yes"
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-gray-700 bg-black/50 hover:border-gray-600"
                    }`}
                  >
                    <div className={`font-medium ${hasPortfolio === "yes" ? "text-purple-300" : "text-white"}`}>有作品集</div>
                    <div className="text-sm text-slate-400 mt-1">可以上传文件或填写链接</div>
                  </button>
                  <button
                    onClick={() => {
                      setHasPortfolio("no");
                      setPortfolioLink("");
                      setPortfolioFile(null);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      hasPortfolio === "no"
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-gray-700 bg-black/50 hover:border-gray-600"
                    }`}
                  >
                    <div className={`font-medium ${hasPortfolio === "no" ? "text-purple-300" : "text-white"}`}>暂无作品集</div>
                    <div className="text-sm text-slate-400 mt-1">按简历与问答继续分析</div>
                  </button>
                </div>

                {hasPortfolio === "yes" && (
                  <div className="space-y-4">
                    <input
                      type="url"
                      value={portfolioLink}
                      onChange={(e) => setPortfolioLink(e.target.value)}
                      placeholder="作品集链接，如 Notion / 飞书 / GitHub / 个人网站"
                      className="w-full bg-black/70 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none"
                    />
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">或者上传作品集文件</label>
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={(e) => setPortfolioFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-purple-500/20 file:px-4 file:py-2 file:text-purple-300 hover:file:bg-purple-500/30"
                      />
                      <p className="text-xs text-slate-500 mt-2">支持 PDF、DOCX、TXT、MD。填链接、传文件，二选一即可。</p>
                      {portfolioFile && <p className="text-xs text-purple-300 mt-2">已选择：{portfolioFile.name}</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep("upload")}
                  className="flex-1 py-3 bg-black/60 border border-gray-600 text-gray-300 rounded-xl font-medium hover:bg-white/5 transition"
                >
                  上一步
                </button>
                <button
                  onClick={() => {
                    if (!targetRole && !selectedDirection) {
                      alert("请选择或输入目标方向");
                      return;
                    }
                    if (!hasPortfolio) {
                      alert("请先选择是否有作品集展示");
                      return;
                    }
                    if (hasPortfolio === "yes" && !portfolioLink.trim() && !portfolioFile) {
                      alert("请上传作品集文件或填写作品集链接");
                      return;
                    }
                    setCurrentQuestionIndex(0);
                    setCurrentStep("questions");
                  }}
                  disabled={!targetRole && !selectedDirection}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  下一步
                </button>
              </div>
            </div>
          )}

          {/* ===== 补充问答 ===== */}
          {currentStep === "questions" && (
            <div className="w-full max-w-lg mx-auto z-10 animate-fade-in">
              {/* 步骤指示器 */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {["上传简历", "选择方向", "补充问答", "生成画像"].map((step, idx) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      idx === 2 ? "bg-purple-600 text-white" : idx < 2 ? "bg-purple-600/50 text-white" : "bg-gray-800 text-gray-500"
                    }`}>
                      {idx + 1}
                    </div>
                    {idx < 3 && <div className={`w-8 h-0.5 ${idx < 2 ? "bg-purple-600/50" : "bg-gray-800"}`} />}
                  </div>
                ))}
              </div>

              {/* 进度条 */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                  <span>问题 {currentQuestionIndex + 1} / {dynamicQuestions.length}</span>
                  <span>{Math.round(((currentQuestionIndex + 1) / dynamicQuestions.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${((currentQuestionIndex + 1) / dynamicQuestions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* 当前问题 */}
              {currentQuestion && (
                <div className="bg-black/60 border border-gray-700 rounded-xl p-6 mb-6">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs mb-4">
                    {currentQuestion.stage === "base" ? "基础题" : currentQuestion.stage === "role" ? "岗位题" : "追问题"}
                  </div>
                  <h4 className="text-lg font-medium text-white mb-4">
                    {currentQuestion.question}
                  </h4>

                  {/* 选择题类型 */}
                  {currentQuestion.type === "choice" && currentQuestion.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentQuestion.options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setQuestionAnswers(prev => ({
                            ...prev,
                            [currentQuestion.id]: option.label
                          }))}
                          className={`p-4 rounded-xl border-2 text-left transition ${
                            questionAnswers[currentQuestion.id] === option.label
                              ? "border-purple-500 bg-purple-500/20"
                              : "border-gray-700 bg-black/50 hover:border-gray-600"
                          }`}
                        >
                          <div className={`font-medium mb-1 ${
                            questionAnswers[currentQuestion.id] === option.label
                              ? "text-purple-300"
                              : "text-white"
                          }`}>
                            {option.label}
                          </div>
                          <div className="text-sm text-slate-400">{option.desc}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 文本输入类型 */}
                  {currentQuestion.type === "text" && (
                    <>
                      <textarea
                        value={questionAnswers[currentQuestion.id] || ""}
                        onChange={(e) => setQuestionAnswers(prev => ({
                          ...prev,
                          [currentQuestion.id]: e.target.value
                        }))}
                        placeholder={currentQuestion.placeholder}
                        rows={5}
                        className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none resize-y"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        {currentQuestion.helperText || "提示：用具体事例回答，会让画像更精准。"}
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (currentQuestionIndex > 0) {
                      setCurrentQuestionIndex(prev => prev - 1);
                    } else {
                      setCurrentStep("direction");
                    }
                  }}
                  className="flex-1 py-3 bg-black/60 border border-gray-600 text-gray-300 rounded-xl font-medium hover:bg-white/5 transition"
                >
                  {currentQuestionIndex > 0 ? "上一题" : "上一步"}
                </button>
                <button
                  onClick={() => {
                    if (!currentQuestion || !(questionAnswers[currentQuestion.id] || "").trim()) {
                      alert("请先完成当前问题");
                      return;
                    }
                    if (currentQuestionIndex < dynamicQuestions.length - 1) {
                      setCurrentQuestionIndex(prev => prev + 1);
                    } else {
                      // 最后一题，提交生成
                      track("profile_questions_completed");
                      handleProfileGenerate();
                    }
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:brightness-110 transition"
                >
                  {currentQuestionIndex < dynamicQuestions.length - 1 ? "下一题" : "生成能力画像"}
                </button>
              </div>
            </div>
          )}

          {/* ===== 分析中 ===== */}
          {currentStep === "analyzing" && <AnalyzingTips seconds={seconds} />}

          {/* ===== 结果展示 ===== */}
          {currentStep === "result" && talentProfile && (
            <div className="w-full animate-fade-in">
              <TalentProfilePanel
                data={talentProfile}
                onSave={() => {
                  // 保存到历史记录
                  appendToHistory({
                    role: targetRole?.trim() || "能力画像",
                    score: talentProfile.overallMatch ?? 8.0,
                    date: new Date().toISOString(),
                    rankPercent: talentProfile.rankPercent,
                    total: talentProfile.total,
                  });
                  setHistoryRecords(getHistory());
                  alert("已保存到历史记录");
                }}
                onShare={() => {
                  console.log("分享画像");
                }}
              />

              {/* 再来一次按钮 */}
              <div className="text-center mt-8">
                <button
                  onClick={resetProfileFlow}
                  className="px-6 py-3 bg-black/60 border border-gray-600 text-gray-300 rounded-xl font-medium hover:bg-white/5 transition"
                >
                  再测一次（换方向）
                </button>
              </div>

              <div className="h-40" />
            </div>
          )}

          {showInterviewPrompt && currentStep === "result" && talentProfile && (
            <div className="fixed inset-x-4 bottom-6 z-[70] flex justify-center pointer-events-none">
              <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-950/95 shadow-[0_20px_80px_rgba(34,211,238,0.16)] backdrop-blur-md p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-cyan-300 mb-2">看完报告了？</p>
                    <h3 className="text-lg font-semibold text-white leading-snug mb-2">基于这份简历，一键生成模拟面试题目</h3>
                    <p className="text-sm text-slate-400 leading-6">会自动带入当前简历内容和岗位方向，跳转到模拟面试并开始建题。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInterviewPrompt(false)}
                    className="text-slate-500 hover:text-slate-300 transition text-lg leading-none"
                    aria-label="关闭提示"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInterviewPrompt(false)}
                    className="flex-1 rounded-xl border border-slate-700 bg-black/40 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 transition"
                  >
                    稍后再说
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateInterviewFromReport}
                    className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white hover:brightness-110 transition"
                  >
                    去生成题目
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===== 示例报告预览 ===== */}
          {showSample && (
            <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">示例能力画像报告</h3>
                  <button
                    onClick={() => setShowSample(false)}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                  >
                    关闭预览
                  </button>
                </div>
                <TalentProfilePanel data={SAMPLE_TALENT_PROFILE} />
              </div>
            </div>
          )}

          {/* 🐌 分析中状态（Tips 全屏遮罩） */}
          {loading && currentStep !== "analyzing" && <AnalyzingTips seconds={seconds} />}

          {/* 📄 简历原文 */}
          {resumeText && !loading && currentStep !== "result" && (
            <div className="bg-black/60 border border-gray-700 rounded-xl p-4 max-w-3xl w-full mt-10 shadow-md">
              <h2 className="text-lg font-semibold mb-2 text-purple-300 flex items-center gap-1">
                📄 简历原文
              </h2>
              <pre className="whitespace-pre-wrap text-gray-300 text-sm max-h-72 overflow-y-auto">
                {resumeText}
              </pre>
            </div>
          )}

          {/* 📊 旧版分析报告 */}
          {!loading && result && currentStep !== "result" && (
            <AnalysisPanel data={JSON.parse(result)} />
          )}
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
