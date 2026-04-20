"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Check, ArrowUpRight, X, Trash2, GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
import ButtonTreasure from "@/app/components/ButtonTreasure";
import FeedbackDialog from "@/app/components/FeedbackDialog";
import PomodoroTomato from "@/app/components/PomodoroTomato";
import { track } from "@/lib/analytics";
import { useUser } from "@/hooks/useAuth";

const PX_PER_DAY = 100;
const TASK_BLOCK_HEIGHT = 72;
/** Overview 里任务方块高度为原来的 80% */
const OVERVIEW_BLOCK_HEIGHT = Math.round(TASK_BLOCK_HEIGHT * 0.8);
/** 已完成任务块再压缩 50% */
const COMPLETED_BLOCK_HEIGHT = Math.round(OVERVIEW_BLOCK_HEIGHT * 0.5);
/** 未完成区固定高度，与已完成区基本平分；分隔线始终在此高度底部 */
const UNFINISHED_ZONE_HEIGHT = 380;

type TaskItem = { id: number; text: string; completed: boolean; color: string; date?: string; time?: string; note?: string; remarks?: string };

/** 解析 NEW TASK 输入：识别「时间+事件」或「日期 时间 事件」，返回事件文案与可选的日期、时间 */
function parseNewTaskInput(raw: string): { event: string; date?: string; time?: string } {
  let text = raw.trim();
  if (!text) return { event: "" };

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  let date: string | undefined;
  let time: string | undefined;

  // 相对日期：今天、明天、后天
  const relativeMatch = text.match(/^(今天|明天|后天)\s*/);
  if (relativeMatch) {
    const [keyword] = relativeMatch;
    text = text.slice(keyword.length).trim();
    const d = new Date(today);
    if (keyword === "明天") d.setDate(d.getDate() + 1);
    else if (keyword === "后天") d.setDate(d.getDate() + 2);
    date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // 星期几：下周一、这周一、周一、星期一 等（周一=1 Mon … 周日=0 Sun，与 getDay() 一致）
  if (!date) {
    const weekDayMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0 };
    const weekMatch = text.match(/^(下|这)?(?:周|星期)([一二三四五六日])\s*/);
    if (weekMatch) {
      const [, prefix, cn] = weekMatch;
      const wantDay = weekDayMap[cn];
      if (wantDay !== undefined) {
        text = text.slice(weekMatch[0].length).trim();
        const d = new Date(today);
        const currentDay = d.getDay();
        let daysToAdd = (wantDay - currentDay + 7) % 7;
        if (prefix === "下") {
          daysToAdd = daysToAdd === 0 ? 7 : daysToAdd;
        }
        d.setDate(d.getDate() + daysToAdd);
        date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
    }
  }

  // 时间 14:00 或 9:30（1-2位小时:2位分钟）
  const timeMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (timeMatch) {
    const [, h, m] = timeMatch;
    time = `${h.padStart(2, "0")}:${m}`;
    text = text.replace(timeMatch[0], " ").replace(/\s+/g, " ").trim();
  }

  // 日期格式：yyyy-mm-dd、yyyy/mm/dd、mm/dd、mm-dd、X月X号、X月X日
  if (!date) {
    const fullDateMatch = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (fullDateMatch) {
      const [, y, m, d] = fullDateMatch;
      date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      text = text.replace(fullDateMatch[0], " ").replace(/\s+/g, " ").trim();
    } else {
      const cnDateMatch = text.match(/(\d{1,2})月(\d{1,2})[号日]?/);
      if (cnDateMatch) {
        const [, m, d] = cnDateMatch;
        date = `${yyyy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        text = text.replace(cnDateMatch[0], " ").replace(/\s+/g, " ").trim();
      } else {
        const shortDateMatch = text.match(/\b(\d{1,2})[-/](\d{1,2})\b/);
        if (shortDateMatch) {
          const [, m, d] = shortDateMatch;
          date = `${yyyy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          text = text.replace(shortDateMatch[0], " ").replace(/\s+/g, " ").trim();
        }
      }
    }
  }

  const event = text.replace(/\s+/g, " ").trim();
  return { event, date, time };
}

/** 参考图配色：深灰底 + 柔和品红/黄/紫/绿，不晃眼；黄/绿偏深以便白字可读 */
const ACCENT = "#C2319A";        // 品红（顶栏、强调）
const BG_DARK = "#1A1A1A";       // 主背景深灰
const TASK_YELLOW = "#B89B2C";   // 深黄/金（白字可读）
const TASK_PURPLE = "#9A53D3";   // 中饱和紫
const TASK_LIME = "#2D8A3E";     // 深绿（白字可读）

/** 任务卡片可选颜色（与当前整页配色一致：品红 / 黄 / 紫 / 绿，黄绿已调深配白字） */
const TASK_THEME_COLORS = ["bg-[#C2319A]", "bg-[#B89B2C]", "bg-[#9A53D3]", "bg-[#2D8A3E]"] as const;

/** Break task 使用与模拟面试相同的 AI */
const BREAK_TASK_AI_MODEL = "deepseek-ai/DeepSeek-V3";

/** 从背景 class 或 hex 得到亮度 (0–1)，亮则用黑字 */
function getLuminanceFromBg(bg: string): number | null {
  const hexMatch = bg.match(/#([0-9A-Fa-f]{6})/);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const TAILWIND_HEX: Record<string, string> = {
    "bg-white": "#ffffff", "bg-gray-50": "#f9fafb", "bg-gray-100": "#f3f4f6", "bg-slate-50": "#f8fafc", "bg-slate-100": "#f1f5f9",
    "bg-[#B89B2C]": "#b89b2c", "bg-[#9A53D3]": "#9a53d3", "bg-[#2D8A3E]": "#2d8a3e",
    "bg-[#C2319A]": "#c2319a", "bg-[#E91E8C]": "#e91e8c", "bg-purple-500": "#a855f7", "bg-purple-400": "#c084fc",
    "bg-fuchsia-400": "#e879f9", "bg-pink-500": "#ec4899", "bg-pink-400": "#f472b6",
    "bg-blue-600": "#2563eb", "bg-blue-500": "#3b82f6", "bg-blue-400": "#60a5fa",
    "bg-indigo-500": "#6366f1", "bg-indigo-400": "#818cf8",
    "bg-green-500": "#22c55e", "bg-green-400": "#4ade80", "bg-emerald-400": "#34d399",
    "bg-lime-400": "#a3e635", "bg-teal-400": "#2dd4bf", "bg-cyan-400": "#22d3ee",
  };
  const hex = TAILWIND_HEX[bg];
  if (!hex) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const TASK_LUMINANCE_THRESHOLD = 0.45; // 高于此亮度用黑字
function isTaskBgLight(bg: string): boolean {
  const L = getLuminanceFromBg(bg);
  return L != null && L > TASK_LUMINANCE_THRESHOLD;
}
function getTaskTextClass(bg: string): string {
  return isTaskBgLight(bg) ? "text-black" : "text-white";
}
function getTaskBorderClass(bg: string): string {
  return isTaskBgLight(bg) ? "border-black" : "border-white";
}
function getTaskCheckCompletedClass(bg: string): string {
  return isTaskBgLight(bg) ? "bg-black" : "bg-white";
}
function getTaskCheckIconClass(bg: string): string {
  return isTaskBgLight(bg) ? "text-white" : "text-[#9A53D3]";
}

/** 时间轴日程条：根据背景色亮度决定文字颜色（亮则黑字） */
function getAgendaTextClass(bgClass: string): "text-black" | "text-white" {
  const hexMatch = bgClass.match(/#([0-9A-Fa-f]{6})/);
  if (!hexMatch) return "text-white";
  const hex = hexMatch[1];
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "text-black" : "text-white";
}

const INITIAL_TASKS: TaskItem[] = [
  { id: 101, text: "CHECK THE LOGS", completed: false, color: TASK_THEME_COLORS[0] },
  { id: 102, text: "PREPARE THE BRIEF", completed: true, color: TASK_THEME_COLORS[1] },
  { id: 103, text: "SET UP A VIDEO CONFERENCE", completed: false, color: TASK_THEME_COLORS[2] },
  { id: 104, text: "REVIEW DESIGN SYSTEM", completed: false, color: TASK_THEME_COLORS[0] },
];

const AGENDA_TASKS_KEY = "snail_career_agenda_tasks";
const AGENDA_DATE_REMINDERS_KEY = "snail_career_agenda_date_reminders";
const AGENDA_ANALYSIS_PASSED_KEY = "snail_career_agenda_analysis_passed";

/** 写任务时可选的预设标签 */
const PRESET_TAGS = ["学习", "生活", "面试"] as const;

/** 按标签给出默认颜色：面试=绿，生活=黄，无标签/学习=紫；可再手动改 */
function getColorFromTags(note?: string): string {
  const tags = !note?.trim() ? [] : (note.match(/#[^\s#]+/g) || []).map((m) => m.slice(1).trim());
  if (tags.includes("面试")) return "bg-[#2D8A3E]"; // 绿
  if (tags.includes("生活")) return "bg-[#B89B2C]"; // 黄
  return "bg-[#9A53D3]"; // 默认紫（无 tag 或 学习）
}

/** 从备注里解析 #标签，用于筛选与展示 */
function getTagsFromNote(note?: string): string[] {
  if (!note?.trim()) return [];
  const matches = note.match(/#[^\s#]+/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).trim()).filter(Boolean))];
}

function loadStoredTasks(): TaskItem[] {
  if (typeof window === "undefined") return INITIAL_TASKS;
  try {
    const raw = localStorage.getItem(AGENDA_TASKS_KEY);
    if (!raw) return INITIAL_TASKS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_TASKS;
    const list = parsed.map((t: Record<string, unknown>) => ({
      id: Number(t.id),
      text: String(t.text ?? ""),
      completed: Boolean(t.completed),
      color: String(t.color ?? TASK_THEME_COLORS[0]),
      date: t.date ? String(t.date) : undefined,
      time: t.time ? String(t.time) : undefined,
      note: t.note ? String(t.note) : undefined,
      remarks: t.remarks ? String(t.remarks) : undefined,
    }));
    return list.filter((t) => t.text.length > 0).length > 0 ? list : INITIAL_TASKS;
  } catch {
    return INITIAL_TASKS;
  }
}

function loadStoredDateReminders(): Record<string, "magenta" | "green" | null> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(AGENDA_DATE_REMINDERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object") return {};
    const out: Record<string, "magenta" | "green" | null> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === "magenta" || v === "green" || v === null) out[String(k)] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Overview 横向日期轴：指定年月的整月范围 */
function getOverviewDateRangeFromMonth(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** 日期键 yyyy-mm-dd */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Duolingo 风格的完成音效：短促双音上行 */
function playCompletionSound(): void {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const playTone = (freq: number, startTime: number, duration = 0.12) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    playTone(523.25, 0);    // C5
    playTone(659.25, 0.08); // E5
    playTone(783.99, 0.16); // G5
  } catch {
    // 忽略静音或权限等错误
  }
}

/** 某年某月的日历格（6 行 × 7 列），每格为 { dateKey, day, isCurrentMonth } */
function getCalendarGrid(year: number, month: number): Array<{ dateKey: string; day: number; isCurrentMonth: boolean }> {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();
  const grid: Array<{ dateKey: string; day: number; isCurrentMonth: boolean }> = [];
  const padStart = startDay;
  for (let i = 0; i < padStart; i++) {
    const d = new Date(year, month - 1, 1 - (padStart - i));
    grid.push({
      dateKey: toDateKey(d),
      day: d.getDate(),
      isCurrentMonth: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    grid.push({
      dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      isCurrentMonth: true,
    });
  }
  const remaining = 42 - grid.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month, i);
    grid.push({
      dateKey: toDateKey(d),
      day: d.getDate(),
      isCurrentMonth: false,
    });
  }
  return grid;
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
const MONTH_NAMES = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

/** 每日任务：手动输入名称，自动表情，按日勾选完成，显示连续点亮次数；打卡时可选心情，点进可看历史日期与当天表情 */
type EverydayTask = { id: string; name: string; emoji: string; color: string; completedDates: string[]; moods?: Record<string, string> };
const AGENDA_EVERYDAY_TASKS_KEY = "snail_career_agenda_everyday_tasks";
const AGENDA_DIARY_KEY = "snail_career_agenda_diary";
const EVERYDAY_TILE_COLORS = ["#C2319A", "#B89B2C", "#9A53D3", "#2D8A3E", "#1E88E5", "#E65100", "#00897B", "#7B1FA2"];
const EVERYDAY_EMOJIS = ["📌", "✅", "📖", "🏃", "💪", "🎯", "⭐", "🔥", "🌱", "📝", "🧘", "☕", "🎨", "📞", "💡", "🚀"];
/** 打卡后可选心情表情 */
const MOOD_EMOJIS = ["😊", "😢", "😐", "😤", "🎉", "💪", "😴", "🔥", "❤️", "👍"];
function getEmojiForTask(name: string): string {
  if (!name.trim()) return EVERYDAY_EMOJIS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i) | 0;
  return EVERYDAY_EMOJIS[Math.abs(h) % EVERYDAY_EMOJIS.length];
}
function getStreak(completedDates: string[]): number {
  const set = new Set(completedDates);
  const todayKey = toDateKey(new Date());
  if (!set.has(todayKey)) return 0;
  let count = 0;
  const d = new Date();
  for (;;) {
    const key = toDateKey(d);
    if (!set.has(key)) break;
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
function loadEverydayTasks(): EverydayTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AGENDA_EVERYDAY_TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t: Record<string, unknown>) => ({
      id: String(t.id ?? ""),
      name: String(t.name ?? ""),
      emoji: String(t.emoji ?? getEmojiForTask(String(t.name ?? ""))),
      color: String(t.color ?? EVERYDAY_TILE_COLORS[0]),
      completedDates: Array.isArray(t.completedDates) ? t.completedDates.filter((x): x is string => typeof x === "string") : [],
      moods: t.moods && typeof t.moods === "object" && !Array.isArray(t.moods)
        ? (t.moods as Record<string, string>)
        : {},
    })).filter((t) => t.id);
  } catch {
    return [];
  }
}

export default function AgendaPage(): React.ReactNode {
  const { user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tasksFilter, setTasksFilter] = useState<"home" | "active" | "done" | "overview">("overview");
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [analysisPassedTaskIds, setAnalysisPassedTaskIds] = useState<number[]>([]);
  const [analysisPendingExpanded, setAnalysisPendingExpanded] = useState(false);
  const [analysisPassedExpanded, setAnalysisPassedExpanded] = useState(true);
  const [analysisDragTaskId, setAnalysisDragTaskId] = useState<number | null>(null);
  const [analysisDropBucket, setAnalysisDropBucket] = useState<"pending" | "passed" | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  /** 详情弹窗内编辑中的副本，有改动时显示「更新」按钮 */
  const [detailEdit, setDetailEdit] = useState<{ text: string; date: string; time: string; note: string; color: string; remarks: string } | null>(null);
  /** 详情弹窗内添加自定义标签的输入 */
  const [detailTagInput, setDetailTagInput] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [swipeState, setSwipeState] = useState<{ id: number; x: number } | null>(null);
  const [dateReminders, setDateReminders] = useState<Record<string, "magenta" | "green" | null>>({});
  const [dateMenu, setDateMenu] = useState<{ x: number; y: number; dateKey: string } | null>(null);
  /** Overview 当日空白处右键菜单：创建/添加任务 */
  const [overviewDayMenu, setOverviewDayMenu] = useState<{ x: number; y: number; dateKey: string } | null>(null);
  /** Overview 中任务块右键菜单（删除等） */
  const [overviewTaskMenu, setOverviewTaskMenu] = useState<{ x: number; y: number; taskId: number } | null>(null);
  /** Break task：deadline、span、备注；Break 后得到的子任务预览 */
  const [breakTaskDeadline, setBreakTaskDeadline] = useState("");
  const [breakTaskSpan, setBreakTaskSpan] = useState("");
  const [breakTaskRemarks, setBreakTaskRemarks] = useState("");
  const [breakPreview, setBreakPreview] = useState<(Array<{ text: string; date?: string; time?: string; duration?: string; included?: boolean }> | null)>(null);
  const [editingBreakIndex, setEditingBreakIndex] = useState<number | null>(null);
  const [breakBreakLoading, setBreakBreakLoading] = useState(false);
  const [breakBreakError, setBreakBreakError] = useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<number | null>(null);
  /** Overview 拖拽到日期列：当前悬停的日期 */
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  /** 每日任务（右侧栏）：名称、表情、颜色、完成日期，连续点亮次数 */
  const [everydayTasks, setEverydayTasks] = useState<EverydayTask[]>([]);
  const [newEverydayName, setNewEverydayName] = useState("");
  const [editingEverydayId, setEditingEverydayId] = useState<string | null>(null);
  /** 刚打卡待选心情的任务 id */
  const [pendingMoodTaskId, setPendingMoodTaskId] = useState<string | null>(null);
  /** 点进查看历史的每日任务 id */
  const [everydayDetailId, setEverydayDetailId] = useState<string | null>(null);
  /** 历史日历当前显示的月年 */
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth() + 1);
  /** 每日任务历史里右键「补签」菜单 */
  const [everydayRetroMenu, setEverydayRetroMenu] = useState<{ x: number; y: number; dateKey: string; taskId: string } | null>(null);
  /** 补签后待选表情：{ taskId, dateKey } */
  const [pendingRetroMood, setPendingRetroMood] = useState<{ taskId: string; dateKey: string } | null>(null);
  /** 补签验证密码弹层：点击补签后弹出输入框 */
  const [retroPasswordPending, setRetroPasswordPending] = useState<{ taskId: string; dateKey: string } | null>(null);
  const [retroPasswordInput, setRetroPasswordInput] = useState("");
  /** 日记：按日期记录的评论，发布后可在「查看日记」中查看 */
  const [diaryEntries, setDiaryEntries] = useState<Record<string, string>>({});
  const [diaryViewOpen, setDiaryViewOpen] = useState(false);
  const [diaryPublishFeedback, setDiaryPublishFeedback] = useState(false);
  const diaryLoadedRef = useRef(false);
  /** Overview 当前查看的月份（用于日期轴左右切换） */
  const [overviewYear, setOverviewYear] = useState(() => new Date().getFullYear());
  const [overviewMonth, setOverviewMonth] = useState(() => new Date().getMonth() + 1);
  /** 拖拽结束后抑制一次点击，避免误开详情 */
  const overviewDragJustEndedRef = useRef(false);
  const swipeStartRef = useRef<{ x: number; startX: number } | null>(null);
  const swipeCurrentXRef = useRef<number>(0);
  const agendaImportInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const overviewScrollRef = useRef<HTMLDivElement>(null);
  const breakPreviewRef = useRef<HTMLDivElement>(null);
  const hasHydratedFromStorageRef = useRef(false);
  const everydayHydratedRef = useRef(false);
  const todayMemoLoadedRef = useRef(false);

  /** Today 页右侧备忘录（激励自己的话），存 localStorage */
  const [todayMemo, setTodayMemo] = useState("");
  const AGENDA_TODAY_MEMO = "agenda_today_memo";

  /** 近期即将到来最多保留 3 件，确定后只显示这 3 件，可重置 */
  const [pinnedUpcomingIds, setPinnedUpcomingIds] = useState<number[]>([]);
  /** Focus mode 中选为番茄钟目标的任务 id（右侧显示番茄钟，并展示当前任务名） */
  const [focusPomodoroTaskId, setFocusPomodoroTaskId] = useState<number | null>(null);
  const AGENDA_PINNED_UPCOMING = "agenda_pinned_upcoming";
  const PINNED_UPCOMING_MAX = 3;
  const pinnedUpcomingLoadedRef = useRef(false);

  const { start: rangeStart, end: rangeEnd } = getOverviewDateRangeFromMonth(overviewYear, overviewMonth);
  const dateKeys: string[] = [];
  for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
    dateKeys.push(toDateKey(new Date(d)));
  }
  const tasksByDate: Record<string, TaskItem[]> = {};
  dateKeys.forEach((k) => (tasksByDate[k] = []));
  tasks.forEach((t) => {
    if (t.date && tasksByDate[t.date]) {
      tasksByDate[t.date].push(t);
    }
  });
  dateKeys.forEach((k) => {
    tasksByDate[k].sort((a, b) => {
      const ta = a.time || "00:00";
      const tb = b.time || "00:00";
      return ta.localeCompare(tb);
    });
  });

  const toggleTask = (id: number) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      const task = next.find((t) => t.id === id);
      if (task?.completed) playCompletionSound();
      return next;
    });
  };

  const addTask = () => {
    const { event, date, time } = parseNewTaskInput(newTaskText);
    if (!event) return;
    const todayStr = toDateKey(new Date());
    setTasks((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: event.toUpperCase(),
        completed: false,
        color: "bg-[#9A53D3]", // 无 tag 默认紫
        date: date || todayStr, // Tasks 里新建默认今天
        ...(time && { time }),
      },
    ]);
    setNewTaskText("");
    track("agenda_task_created", { source: "tasks" });
  };

  /** 在指定日期创建任务（Overview 右键菜单用），返回新任务 id */
  const addTaskWithDate = (dateKey: string, openDetail: boolean) => {
    const id = Date.now();
    setTasks((prev) => [
      ...prev,
      {
        id,
        text: "新任务",
        completed: false,
        color: TASK_THEME_COLORS[prev.length % TASK_THEME_COLORS.length],
        date: dateKey,
      },
    ]);
    setOverviewDayMenu(null);
    if (openDetail) setDetailTaskId(id);
    track("agenda_task_created", { source: "overview" });
  };

  const updateTaskDate = (id: number, date: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, date: date || undefined } : t)));
  };
  const updateTaskTime = (id: number, time: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, time: time || undefined } : t)));
  };
  const updateTaskNote = (id: number, note: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, note } : t)));
  };
  const updateTaskRemarks = (id: number, remarks: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, remarks: remarks.trim() || undefined } : t)));
  };
  const updateTaskText = (id: number, text: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, text: text.trim() || t.text } : t)));
  };
  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (detailTaskId === id) setDetailTaskId(null);
    setSwipeState(null);
  };
  const updateTaskColor = (id: number, color: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
  };
  const formatDateDisplay = (dateStr: string) => (dateStr ? dateStr.replace(/-/g, "/") : "");

  const addEverydayTask = (name: string) => {
    setEverydayTasks((prev) => [
      ...prev,
      {
        id: `everyday-${Date.now()}`,
        name,
        emoji: getEmojiForTask(name),
        color: EVERYDAY_TILE_COLORS[prev.length % EVERYDAY_TILE_COLORS.length],
        completedDates: [],
        moods: {},
      },
    ]);
    setNewEverydayName("");
  };

  const filteredTasks = tasksFilter === "active" ? tasks.filter((t) => !t.completed) : tasksFilter === "done" ? tasks.filter((t) => t.completed) : [];
  const analysisInterviewTasks = tasks.filter((t) => getTagsFromNote(t.note).includes("面试"));
  const analysisPassedTaskIdSet = new Set(analysisPassedTaskIds);
  const analysisPendingTasks = analysisInterviewTasks.filter((t) => !analysisPassedTaskIdSet.has(t.id));
  const analysisPassedTasks = analysisInterviewTasks.filter((t) => analysisPassedTaskIdSet.has(t.id));
  const analysisConversionRate = analysisInterviewTasks.length > 0
    ? (analysisPassedTasks.length / analysisInterviewTasks.length) * 100
    : 0;
  const todayKey = toDateKey(new Date());
  const todayTasks = tasks.filter((t) => !t.completed && t.date === todayKey);
  const upcomingTasks = (() => {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const endKey = toDateKey(end);
    return tasks
      .filter((t) => !t.completed && t.date && t.date > todayKey && t.date <= endKey)
      .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.time || "").localeCompare(b.time || ""));
  })();

  /** Focus mode：今天 + 近期 7 天合并为候选池，选出最重要的 3 件 */
  const focusPoolTasks = [...todayTasks, ...upcomingTasks];
  const displayedFocusTasks =
    pinnedUpcomingIds.length >= PINNED_UPCOMING_MAX
      ? pinnedUpcomingIds
          .map((id) => tasks.find((t) => t.id === id))
          .filter((t): t is TaskItem => t != null)
      : focusPoolTasks;
  const pinUpcoming = (taskId: number) => {
    setPinnedUpcomingIds((prev) =>
      prev.includes(taskId) ? prev : prev.length >= PINNED_UPCOMING_MAX ? prev : [...prev, taskId]
    );
  };
  const resetPinnedUpcoming = () => setPinnedUpcomingIds([]);

  const handleExportAgendaJson = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks,
      dateReminders,
      everydayTasks,
      diaryEntries,
      todayMemo,
      pinnedUpcomingIds,
      analysisPassedTaskIds,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `snail-agenda-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    track("agenda_json_exported");
  };

  const handleImportAgendaClick = () => {
    agendaImportInputRef.current?.click();
  };

  const handleImportAgendaJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Record<string, unknown>;

      const nextTasks = Array.isArray(parsed.tasks) ? parsed.tasks as TaskItem[] : null;
      const nextDateReminders = parsed.dateReminders && typeof parsed.dateReminders === "object" && !Array.isArray(parsed.dateReminders)
        ? parsed.dateReminders as Record<string, "magenta" | "green" | null>
        : null;
      const nextEverydayTasks = Array.isArray(parsed.everydayTasks) ? parsed.everydayTasks as EverydayTask[] : null;
      const nextDiaryEntries = parsed.diaryEntries && typeof parsed.diaryEntries === "object" && !Array.isArray(parsed.diaryEntries)
        ? parsed.diaryEntries as Record<string, string>
        : null;
      const nextTodayMemo = typeof parsed.todayMemo === "string" ? parsed.todayMemo : null;
      const nextPinnedUpcomingIds = Array.isArray(parsed.pinnedUpcomingIds) ? parsed.pinnedUpcomingIds.map((x) => Number(x)).filter((x) => Number.isFinite(x)) : null;
      const nextAnalysisPassedTaskIds = Array.isArray(parsed.analysisPassedTaskIds) ? parsed.analysisPassedTaskIds.map((x) => Number(x)).filter((x) => Number.isFinite(x)) : null;

      if (!nextTasks || !nextDateReminders || !nextEverydayTasks || !nextDiaryEntries || nextTodayMemo == null || !nextPinnedUpcomingIds || !nextAnalysisPassedTaskIds) {
        alert("JSON 格式不正确，无法导入。");
        return;
      }

      setTasks(nextTasks);
      setDateReminders(nextDateReminders);
      setEverydayTasks(nextEverydayTasks);
      setDiaryEntries(nextDiaryEntries);
      setTodayMemo(nextTodayMemo);
      setPinnedUpcomingIds(nextPinnedUpcomingIds);
      setAnalysisPassedTaskIds(nextAnalysisPassedTaskIds);
      track("agenda_json_imported");
      alert("小蜗日程 JSON 导入成功。");
    } catch (error) {
      console.error("导入 agenda JSON 失败:", error);
      alert("导入失败，请检查 JSON 文件内容。");
    } finally {
      event.target.value = "";
    }
  };

  const SWIPE_DELETE_WIDTH = 88;
  const handleSwipeStart = (taskId: number, clientX: number) => {
    const currentX = swipeState?.id === taskId ? swipeState.x : 0;
    swipeStartRef.current = { x: currentX, startX: clientX };
    swipeCurrentXRef.current = currentX;
    setSwipeState(prev => (prev?.id === taskId ? prev : { id: taskId, x: 0 }));
  };
  const handleSwipeMove = (taskId: number, clientX: number) => {
    if (!swipeStartRef.current || swipeState?.id !== taskId) return;
    const delta = clientX - swipeStartRef.current.startX;
    let nextX = swipeStartRef.current.x + delta;
    nextX = Math.min(0, Math.max(-SWIPE_DELETE_WIDTH, nextX));
    swipeCurrentXRef.current = nextX;
    setSwipeState({ id: taskId, x: nextX });
  };
  const handleSwipeEnd = (taskId: number) => {
    if (swipeState?.id !== taskId) return;
    const currentX = swipeCurrentXRef.current;
    const snapOpen = currentX < -SWIPE_DELETE_WIDTH / 2;
    setSwipeState({ id: taskId, x: snapOpen ? -SWIPE_DELETE_WIDTH : 0 });
    swipeStartRef.current = null;
  };
  const handleSwipeDelete = (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    deleteTask(taskId);
  };

  const detailTask = detailTaskId != null ? tasks.find((t) => t.id === detailTaskId) : null;

  // 打开详情时同步编辑副本；关闭时清空
  useEffect(() => {
    if (detailTask) {
      setDetailEdit({
        text: detailTask.text,
        date: detailTask.date ?? "",
        time: detailTask.time ?? "",
        note: detailTask.note ?? "",
        color: detailTask.color,
        remarks: detailTask.remarks ?? "",
      });
    } else {
      setDetailEdit(null);
      setDetailTagInput("");
    }
  }, [detailTaskId]);

  const detailDirty =
    detailTask &&
    detailEdit &&
    (detailEdit.text !== detailTask.text ||
      detailEdit.date !== (detailTask.date ?? "") ||
      detailEdit.time !== (detailTask.time ?? "") ||
      detailEdit.note !== (detailTask.note ?? "") ||
      detailEdit.color !== detailTask.color ||
      detailEdit.remarks !== (detailTask.remarks ?? ""));

  const applyDetailEdit = () => {
    if (!detailTask || !detailEdit) return;
    updateTaskText(detailTask.id, detailEdit.text);
    updateTaskDate(detailTask.id, detailEdit.date);
    updateTaskTime(detailTask.id, detailEdit.time);
    updateTaskNote(detailTask.id, detailEdit.note);
    updateTaskColor(detailTask.id, detailEdit.color);
    updateTaskRemarks(detailTask.id, detailEdit.remarks);
    setDetailEdit(null);
  };

  const setDateReminder = (dateKey: string, value: "magenta" | "green" | null) => {
    setDateReminders((prev) => ({ ...prev, [dateKey]: value }));
    setDateMenu(null);
  };

  const reorderTasks = (fromFilteredIndex: number, toFilteredIndex: number) => {
    if (fromFilteredIndex === toFilteredIndex) return;
    const fromId = filteredTasks[fromFilteredIndex].id;
    const toId = filteredTasks[toFilteredIndex].id;
    setTasks((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === fromId);
      const toIdx = prev.findIndex((t) => t.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [removed] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, removed);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.stopPropagation();
    setDragTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(taskId));
  };
  const handleDragOver = (e: React.DragEvent, taskId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragTaskId !== taskId) setDragOverTaskId(taskId);
  };
  const handleDragLeave = () => setDragOverTaskId(null);
  const handleDragEnd = () => {
    if (dragTaskId != null && dragOverTaskId != null) {
      const fromIdx = filteredTasks.findIndex((t) => t.id === dragTaskId);
      const toIdx = filteredTasks.findIndex((t) => t.id === dragOverTaskId);
      if (fromIdx !== -1 && toIdx !== -1) reorderTasks(fromIdx, toIdx);
    }
    setDragTaskId(null);
    setDragOverTaskId(null);
  };
  const handleDrop = (e: React.DragEvent, taskId: number) => {
    e.preventDefault();
    if (dragTaskId == null || dragTaskId === taskId) {
      setDragTaskId(null);
      setDragOverTaskId(null);
      return;
    }
    const fromIdx = filteredTasks.findIndex((t) => t.id === dragTaskId);
    const toIdx = filteredTasks.findIndex((t) => t.id === taskId);
    if (fromIdx !== -1 && toIdx !== -1) reorderTasks(fromIdx, toIdx);
    setDragTaskId(null);
    setDragOverTaskId(null);
  };

  const moveAnalysisTaskToBucket = (taskId: number, bucket: "pending" | "passed") => {
    setAnalysisPassedTaskIds((prev) => {
      if (bucket === "passed") return prev.includes(taskId) ? prev : [...prev, taskId];
      return prev.filter((id) => id !== taskId);
    });
  };
  const handleAnalysisDragStart = (e: React.DragEvent, taskId: number) => {
    e.stopPropagation();
    setAnalysisDragTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(taskId));
  };
  const handleAnalysisBucketDragOver = (e: React.DragEvent, bucket: "pending" | "passed") => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setAnalysisDropBucket(bucket);
  };
  const handleAnalysisBucketDragLeave = () => setAnalysisDropBucket(null);
  const handleAnalysisBucketDrop = (e: React.DragEvent, bucket: "pending" | "passed") => {
    e.preventDefault();
    if (analysisDragTaskId != null) moveAnalysisTaskToBucket(analysisDragTaskId, bucket);
    setAnalysisDragTaskId(null);
    setAnalysisDropBucket(null);
  };
  const handleAnalysisDragEnd = () => {
    setAnalysisDragTaskId(null);
    setAnalysisDropBucket(null);
  };

  /** Overview：拖拽任务到日期列时更新任务日期 */
  const handleOverviewDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(taskId));
    overviewDragJustEndedRef.current = false;
  };
  const handleOverviewDragEnd = () => {
    overviewDragJustEndedRef.current = true;
    setDragOverDateKey(null);
  };
  const handleOverviewDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDateKey(dateKey);
  };
  const handleOverviewDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDateKey(null);
  };
  const handleOverviewDrop = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const taskId = parseInt(id, 10);
    if (!Number.isNaN(taskId)) updateTaskDate(taskId, dateKey);
    setDragOverDateKey(null);
  };

  /** Break task：调用 AI（与模拟面试同接口）拆成 2–5 个子任务并分配时间 */
  const runBreakTask = async () => {
    const deadlineStr = breakTaskDeadline.trim();
    if (!deadlineStr) {
      setBreakPreview(null);
      setBreakBreakError("请填写 Deadline");
      return;
    }
    const spanRaw = breakTaskSpan.trim() || "1d";
    const remarks = breakTaskRemarks.trim();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    setBreakBreakError(null);
    setBreakPreview(null);
    setBreakBreakLoading(true);

    const prompt = `你是一个任务拆解助手。用户有一个任务的 deadline、时间跨度(span) 和备注描述，请将该任务拆成 2～5 个子任务，并为每个子任务分配建议的日期和时间（从今天到 deadline 之间均匀或按难度分布）。

今日日期：${todayStr}
Deadline：${deadlineStr}
时间跨度(span)：${spanRaw}（如 3h 表示 3 小时，2d 表示 2 天）
任务备注/详细描述：
${remarks || "（用户未填写，请根据 deadline 与 span 拆成 3 个通用步骤）"}

请仅输出一个 JSON 对象，不要其他说明，格式如下：
- date：yyyy-mm-dd，安排日期
- time：HH:mm，安排时间（建议 09:00、14:00 等整点）
- duration：预计耗时，如 "30min"、"1h"、"1.5h"
{"tasks":[{"text":"子任务标题（简短）","date":"yyyy-mm-dd","time":"HH:mm","duration":"30min"},...]}

要求：tasks 数组长度为 2～5；text 简洁清晰；日期在今日与 deadline 之间；每条必须包含 time 和 duration。`;

    try {
      const res = await fetch("/api/siliconflow/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: BREAK_TASK_AI_MODEL,
          messages: [{ role: "user" as const, content: prompt }],
          temperature: 0.5,
          max_tokens: 1500,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "请求失败");
      }
      let content = (data.choices?.[0]?.message?.content ?? "").trim();
      const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlock) content = codeBlock[1].trim();
      const parsed = JSON.parse(content);
      const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
      const preview: Array<{ text: string; date?: string; time?: string; duration?: string; included?: boolean }> = rawTasks
        .slice(0, 5)
        .map((t: { text?: string; date?: string; time?: string; duration?: string }) => ({
          text: String(t?.text ?? "子任务").trim().toUpperCase() || "子任务",
          date: t?.date ? String(t.date).slice(0, 10) : undefined,
          time: t?.time ? String(t.time).slice(0, 5) : undefined,
          duration: t?.duration ? String(t.duration).trim() : undefined,
          included: true,
        }));
      if (preview.length === 0) throw new Error("未返回有效子任务");
      setBreakPreview(preview);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "生成失败，请重试";
      setBreakBreakError(msg);
      setBreakPreview(null);
    } finally {
      setBreakBreakLoading(false);
    }
  };

  const updateBreakPreviewItem = (index: number, patch: Partial<{ text: string; date: string; time: string; duration: string; included: boolean }>) => {
    if (!breakPreview) return;
    setBreakPreview(breakPreview.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const removeBreakPreviewItem = (index: number) => {
    if (!breakPreview) return;
    const next = breakPreview.filter((_, i) => i !== index);
    setBreakPreview(next.length > 0 ? next : null);
    setEditingBreakIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const applyBreakPreview = () => {
    if (!breakPreview?.length) return;
    const toApply = breakPreview.filter((p) => p.included !== false);
    if (!toApply.length) return;
    const baseId = Date.now();
    setTasks((prev) => [
      ...prev,
      ...toApply.map((p, i) => ({
        id: baseId + i,
        text: p.text,
        completed: false,
        color: "bg-[#9A53D3]",
        ...(p.date && { date: p.date }),
        ...(p.time && { time: p.time }),
        ...(p.duration && { remarks: `预计：${p.duration}` }),
      })),
    ]);
    setEditingBreakIndex(null);
    setBreakPreview(null);
    setBreakTaskDeadline("");
    setBreakTaskSpan("");
    setBreakTaskRemarks("");
    setTasksFilter("active");
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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
    const close = () => setDateMenu(null);
    if (dateMenu) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [dateMenu]);

  useEffect(() => {
    const close = () => setOverviewDayMenu(null);
    if (overviewDayMenu) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [overviewDayMenu]);

  useEffect(() => {
    const close = () => setOverviewTaskMenu(null);
    if (overviewTaskMenu) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [overviewTaskMenu]);

  useEffect(() => {
    const close = () => setEverydayRetroMenu(null);
    if (everydayRetroMenu) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [everydayRetroMenu]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (editingBreakIndex === null) return;
      if (breakPreviewRef.current && !breakPreviewRef.current.contains(e.target as Node)) setEditingBreakIndex(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingBreakIndex]);

  // 仅在与 localStorage 同步后再写入，避免挂载时用初始值覆盖用户数据
  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedFromStorageRef.current) return;
    try {
      localStorage.setItem(AGENDA_TASKS_KEY, JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedFromStorageRef.current) return;
    try {
      localStorage.setItem(AGENDA_ANALYSIS_PASSED_KEY, JSON.stringify(analysisPassedTaskIds));
    } catch {}
  }, [analysisPassedTaskIds]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedFromStorageRef.current) return;
    try {
      localStorage.setItem(AGENDA_DATE_REMINDERS_KEY, JSON.stringify(dateReminders));
    } catch {}
  }, [dateReminders]);

  useEffect(() => {
    if (typeof window === "undefined" || !everydayHydratedRef.current) return;
    try {
      localStorage.setItem(AGENDA_EVERYDAY_TASKS_KEY, JSON.stringify(everydayTasks));
    } catch {}
  }, [everydayTasks]);

  // 挂载后从 localStorage 恢复，再允许上面的 effect 写入，这样既有首屏一致又不会覆盖本地数据
  useEffect(() => {
    setTasks(loadStoredTasks());
    setDateReminders(loadStoredDateReminders());
    setEverydayTasks(loadEverydayTasks());
    if (typeof window !== "undefined") {
      try {
        setTodayMemo(localStorage.getItem(AGENDA_TODAY_MEMO) || "");
        const raw = localStorage.getItem(AGENDA_PINNED_UPCOMING);
        if (raw) {
          try {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length <= PINNED_UPCOMING_MAX && arr.every((x) => typeof x === "number")) {
              setPinnedUpcomingIds(arr);
            }
          } catch {}
        }
        const diaryRaw = localStorage.getItem(AGENDA_DIARY_KEY);
        if (diaryRaw) {
          try {
            const obj = JSON.parse(diaryRaw);
            if (obj && typeof obj === "object" && !Array.isArray(obj)) {
              const next: Record<string, string> = {};
              for (const [k, v] of Object.entries(obj)) {
                if (typeof k === "string" && typeof v === "string") next[k] = v;
              }
              setDiaryEntries(next);
            }
          } catch {}
        }
        const analysisRaw = localStorage.getItem(AGENDA_ANALYSIS_PASSED_KEY);
        if (analysisRaw) {
          try {
            const ids = JSON.parse(analysisRaw);
            if (Array.isArray(ids)) {
              setAnalysisPassedTaskIds(ids.map((x) => Number(x)).filter((x) => Number.isFinite(x)));
            }
          } catch {}
        }
        diaryLoadedRef.current = true;
      } catch {}
      todayMemoLoadedRef.current = true;
      pinnedUpcomingLoadedRef.current = true;
    }
    hasHydratedFromStorageRef.current = true;
    everydayHydratedRef.current = true;
  }, []);

  useEffect(() => {
    const validIds = new Set(analysisInterviewTasks.map((t) => t.id));
    setAnalysisPassedTaskIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [analysisInterviewTasks]);

  useEffect(() => {
    if (typeof window === "undefined" || !todayMemoLoadedRef.current) return;
    try {
      localStorage.setItem(AGENDA_TODAY_MEMO, todayMemo);
    } catch {}
  }, [todayMemo]);

  useEffect(() => {
    if (typeof window === "undefined" || !pinnedUpcomingLoadedRef.current) return;
    try {
      localStorage.setItem(AGENDA_PINNED_UPCOMING, JSON.stringify(pinnedUpcomingIds));
    } catch {}
  }, [pinnedUpcomingIds]);

  useEffect(() => {
    if (typeof window === "undefined" || !diaryLoadedRef.current) return;
    try {
      localStorage.setItem(AGENDA_DIARY_KEY, JSON.stringify(diaryEntries));
    } catch {}
  }, [diaryEntries]);

  // 登录后拉取云端小蜗日程；若云端为空且本地有则上传
  useEffect(() => {
    if (!user?.id || !hasHydratedFromStorageRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/sync/agenda");
        if (cancelled) return;
        const j = await r.json();
        if (!r.ok) return;
        const cloudTasks = Array.isArray(j.tasks) ? j.tasks : [];
        const hasCloud = cloudTasks.length > 0 || (j.todayMemo && String(j.todayMemo).trim()) || (Array.isArray(j.everydayTasks) && j.everydayTasks.length > 0);
        if (hasCloud) {
          if (cloudTasks.length > 0) {
            const list = cloudTasks.map((t: Record<string, unknown>) => ({
              id: Number(t.id),
              text: String(t.text ?? ""),
              completed: Boolean(t.completed),
              color: String(t.color ?? TASK_THEME_COLORS[0]),
              date: t.date ? String(t.date) : undefined,
              time: t.time ? String(t.time) : undefined,
              note: t.note ? String(t.note) : undefined,
              remarks: t.remarks ? String(t.remarks) : undefined,
            }));
            setTasks(list.filter((t: TaskItem) => t.text.length > 0).length > 0 ? list : INITIAL_TASKS);
            try { localStorage.setItem(AGENDA_TASKS_KEY, JSON.stringify(list)); } catch {}
          }
          if (j.dateReminders && typeof j.dateReminders === "object") {
            const dr: Record<string, "magenta" | "green" | null> = {};
            for (const [k, v] of Object.entries(j.dateReminders)) {
              if (v === "magenta" || v === "green" || v === null) dr[String(k)] = v;
            }
            setDateReminders(dr);
            try { localStorage.setItem(AGENDA_DATE_REMINDERS_KEY, JSON.stringify(dr)); } catch {}
          }
          if (Array.isArray(j.everydayTasks) && j.everydayTasks.length > 0) {
            const et = j.everydayTasks.map((t: Record<string, unknown>) => ({
              id: String(t.id ?? ""),
              name: String(t.name ?? ""),
              emoji: String(t.emoji ?? getEmojiForTask(String(t.name ?? ""))),
              color: String(t.color ?? EVERYDAY_TILE_COLORS[0]),
              completedDates: Array.isArray(t.completedDates) ? t.completedDates.filter((x): x is string => typeof x === "string") : [],
              moods: t.moods && typeof t.moods === "object" && !Array.isArray(t.moods) ? (t.moods as Record<string, string>) : {},
            })).filter((t: EverydayTask) => t.id);
            setEverydayTasks(et);
            try { localStorage.setItem(AGENDA_EVERYDAY_TASKS_KEY, JSON.stringify(et)); } catch {}
          }
          if (j.todayMemo !== undefined) {
            const memo = String(j.todayMemo ?? "");
            setTodayMemo(memo);
            try { localStorage.setItem(AGENDA_TODAY_MEMO, memo); } catch {}
          }
          if (Array.isArray(j.pinnedUpcoming) && j.pinnedUpcoming.length <= PINNED_UPCOMING_MAX) {
            const ids = j.pinnedUpcoming.filter((x: unknown) => typeof x === "number") as number[];
            setPinnedUpcomingIds(ids);
            try { localStorage.setItem(AGENDA_PINNED_UPCOMING, JSON.stringify(ids)); } catch {}
          }
          if (j.diary && typeof j.diary === "object" && !Array.isArray(j.diary)) {
            const next: Record<string, string> = {};
            for (const [k, v] of Object.entries(j.diary)) {
              if (typeof k === "string" && typeof v === "string") next[k] = v;
            }
            setDiaryEntries(next);
            try { localStorage.setItem(AGENDA_DIARY_KEY, JSON.stringify(next)); } catch {}
          }
        } else {
          try {
            const localTasks = typeof window !== "undefined" ? localStorage.getItem(AGENDA_TASKS_KEY) : null;
            const localDr = typeof window !== "undefined" ? localStorage.getItem(AGENDA_DATE_REMINDERS_KEY) : null;
            const localEt = typeof window !== "undefined" ? localStorage.getItem(AGENDA_EVERYDAY_TASKS_KEY) : null;
            const localDiary = typeof window !== "undefined" ? localStorage.getItem(AGENDA_DIARY_KEY) : null;
            const localMemo = typeof window !== "undefined" ? localStorage.getItem(AGENDA_TODAY_MEMO) : null;
            const localPinned = typeof window !== "undefined" ? localStorage.getItem(AGENDA_PINNED_UPCOMING) : null;
            const payload = {
              tasks: localTasks ? JSON.parse(localTasks) : [],
              dateReminders: localDr ? JSON.parse(localDr) : {},
              everydayTasks: localEt ? JSON.parse(localEt) : [],
              diary: localDiary ? JSON.parse(localDiary) : {},
              todayMemo: localMemo ?? "",
              pinnedUpcoming: localPinned ? JSON.parse(localPinned) : [],
            };
            fetch("/api/sync/agenda", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
          } catch (_) {}
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // 登录后日程变更时防抖上传
  useEffect(() => {
    if (!user?.id || !hasHydratedFromStorageRef.current) return;
    const t = setTimeout(() => {
      fetch("/api/sync/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks,
          dateReminders,
          everydayTasks,
          diary: diaryEntries,
          todayMemo,
          pinnedUpcoming: pinnedUpcomingIds,
        }),
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [user?.id, tasks, dateReminders, everydayTasks, diaryEntries, todayMemo, pinnedUpcomingIds]);

  // Overview 下保证当天日期列在横向滚动区域中间
  useEffect(() => {
    if (tasksFilter !== "overview" || !overviewScrollRef.current) return;
    const todayKey = toDateKey(new Date());
    const todayIndex = dateKeys.indexOf(todayKey);
    if (todayIndex === -1) return;
    const el = overviewScrollRef.current;
    const run = () => {
      if (!el) return;
      const containerWidth = el.clientWidth;
      const scrollLeft = todayIndex * PX_PER_DAY - containerWidth / 2 + PX_PER_DAY / 2;
      el.scrollLeft = Math.max(0, Math.min(scrollLeft, el.scrollWidth - containerWidth));
    };
    requestAnimationFrame(run);
    const t = setTimeout(run, 100);
    return () => clearTimeout(t);
  }, [tasksFilter]);

  const content = (<div
    className="agenda-page-selection min-h-screen flex flex-col text-slate-100 relative overflow-hidden"
    style={{ backgroundColor: BG_DARK }}
  >
      {/* 柔和光晕 + 细网格 */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(194,49,154,0.04)_0%,transparent_70%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* 顶部导航栏 */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 backdrop-blur-sm border-b border-white/10" style={{ backgroundColor: "rgba(26,26,26,0.85)" }}>
        <div className="flex flex-col gap-2 min-w-0 flex-shrink-0">
          <h1 className="text-lg sm:text-xl font-bold whitespace-nowrap" style={{ color: ACCENT }}>
            🐌 SNAIL CAREER｜小蜗日程
          </h1>
          <ButtonTreasure />
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/20 font-medium text-sm text-slate-200 hover:bg-white/5 transition"
            aria-label="打开菜单"
            style={{ color: ACCENT }}
          >
            <span className="hidden sm:inline">小蜗日程</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 py-1.5 min-w-[160px] rounded-xl border border-white/10 shadow-xl z-50" style={{ backgroundColor: "rgba(26,26,26,0.98)" }}>
              <Link href="/" className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 transition rounded-t-xl" onClick={() => setMenuOpen(false)} style={{ color: ACCENT }}>简历优化</Link>
              <Link href="/mock-interview" className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 transition" onClick={() => setMenuOpen(false)} style={{ color: ACCENT }}>模拟面试</Link>
              <Link href="/agenda" className="block px-4 py-3 text-sm font-medium bg-white/10 transition" onClick={() => setMenuOpen(false)} style={{ color: ACCENT }}>小蜗日程</Link>
              <Link href="/interview-notes" className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 transition" onClick={() => setMenuOpen(false)} style={{ color: ACCENT }}>面试复盘</Link>
                <Link href="/promo" className="block px-4 py-3 text-sm font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 hover:text-purple-200 transition rounded-b-xl border-t border-purple-500/20" onClick={() => setMenuOpen(false)}>
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    宣传片
                  </span>
                </Link>
            </div>
          )}
        </div>
      </header>

      {/* 毛玻璃之下：整块可滚动；sub-tab 位置与简历优化页一致（pt-40 留出顶栏） */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative z-10 pt-40 agenda-body-scroll">
        <input
          ref={agendaImportInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportAgendaJson}
        />

        {/* Sub tab：与简历优化页同一位置、同一样式 */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 z-10 px-4 sm:px-6">
          <div className="flex items-center justify-start gap-2">
            <button
              type="button"
              onClick={() => setTasksFilter("overview")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${tasksFilter === "overview" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setTasksFilter("active")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${tasksFilter === "active" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
            >
              Tasks
            </button>
            <button
              type="button"
              onClick={() => setTasksFilter("home")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${tasksFilter === "home" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
            >
              Focus mode
            </button>
            <button
              type="button"
              onClick={() => setTasksFilter("done")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${tasksFilter === "done" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
            >
              Done
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportAgendaJson}
              className="px-4 py-2 rounded-full text-sm font-medium border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition"
            >
              导出 JSON
            </button>
            <button
              type="button"
              onClick={handleImportAgendaClick}
              className="px-4 py-2 rounded-full text-sm font-medium border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition"
            >
              导入 JSON
            </button>
          </div>
        </div>
        {tasksFilter !== "overview" ? ( tasksFilter === "home" ? (
          /* Focus mode：仅番茄钟闹钟，画布宽度约两倍（max-w-md → max-w-4xl） */
          <div className="w-full py-4 flex flex-col items-center justify-center pl-4 pr-4 min-h-[320px]">
            <div className="w-full max-w-4xl flex-1 min-h-0 min-w-0 overflow-auto">
              <PomodoroTomato currentTaskName={undefined} />
            </div>
          </div>
        ) : (
          /* 任务列表（左）+ 每日任务（右）：左右等分、顶格、中间留空 */
          <div className={`w-full py-4 flex ${tasksFilter === "active" ? "flex-row gap-8 pl-4 pr-4" : tasksFilter === "analysis" ? "px-4" : "max-w-lg mx-auto px-4"}`}>
            {/* 左侧：常规 tasks，顶格靠左 */}
            <div className={tasksFilter === "active" ? "flex-1 min-w-0 flex flex-col items-stretch w-full" : "w-full"}>
            {tasksFilter === "analysis" ? (
              <div className="w-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] gap-4 items-start">
                <div
                  className={`rounded-2xl border transition ${analysisDropBucket === "pending" ? "border-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,0.5)]" : "border-white/10"}`}
                  style={{ backgroundColor: BG_DARK }}
                  onDragOver={(e) => handleAnalysisBucketDragOver(e, "pending")}
                  onDragLeave={handleAnalysisBucketDragLeave}
                  onDrop={(e) => handleAnalysisBucketDrop(e, "pending")}
                >
                  <button
                    type="button"
                    onClick={() => setAnalysisPendingExpanded((v) => !v)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Interviewing</p>
                      <h3 className="text-lg font-semibold text-white mt-1">待面试</h3>
                      <p className="text-sm text-slate-400 mt-1">共 {analysisPendingTasks.length} 个面试机会</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black text-white tabular-nums">{analysisPendingTasks.length}</div>
                      <div className="text-xs text-slate-500 mt-1">{analysisPendingExpanded ? "点击折叠" : "点击展开"}</div>
                    </div>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: analysisPendingExpanded ? "auto" : 0, opacity: analysisPendingExpanded ? 1 : 0 }}
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {analysisPendingTasks.length > 0 ? analysisPendingTasks.map((task) => (
                        <motion.div
                          key={task.id}
                          layout
                          transition={{ type: "spring", stiffness: 320, damping: 28 }}
                          className={`rounded-2xl border border-emerald-400/30 bg-[#2D8A3E] text-white p-4 cursor-pointer ${analysisDragTaskId === task.id ? "opacity-60" : ""}`}
                          onClick={() => setDetailTaskId(task.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-black/20 uppercase tracking-wide">待面试</span>
                            <span
                              draggable
                              onDragStart={(e) => handleAnalysisDragStart(e, task.id)}
                              onDragEnd={handleAnalysisDragEnd}
                              onClick={(e) => e.stopPropagation()}
                              className="cursor-grab active:cursor-grabbing shrink-0 p-1 -m-1 rounded opacity-70 hover:opacity-100"
                              aria-label="拖动到已通过"
                            >
                              <GripVertical size={18} className="text-white" strokeWidth={2} />
                            </span>
                          </div>
                          <h3 className="text-base font-black leading-tight tracking-tight mt-2">{task.text}</h3>
                          {(task.date || task.time) && (
                            <p className="text-xs font-medium opacity-90 mt-1 tabular-nums">
                              📅 {[task.date ? formatDateDisplay(task.date) : null, task.time].filter(Boolean).join(" ")}
                            </p>
                          )}
                          {getTagsFromNote(task.note).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {getTagsFromNote(task.note).map((tag) => (
                                <span key={tag} className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase truncate max-w-[5rem] bg-white/15">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {task.remarks?.trim() && (
                            <p className="text-xs opacity-90 mt-1.5 line-clamp-2 break-words">
                              {task.remarks.trim()}
                            </p>
                          )}
                        </motion.div>
                      )) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-slate-500">
                          这里暂时没有待面试的任务
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                <div className="rounded-2xl border border-white/10 px-5 py-6 text-center" style={{ backgroundColor: BG_DARK }}>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-300">Conversion</p>
                  <div className="mt-4 text-4xl font-black text-white tabular-nums">{analysisConversionRate.toFixed(0)}%</div>
                  <p className="mt-2 text-sm text-slate-400">通过率</p>
                  <div className="mt-6 space-y-3 text-sm">
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                      <div className="text-slate-500">总面试</div>
                      <div className="text-xl font-bold text-white tabular-nums">{analysisInterviewTasks.length}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3">
                      <div className="text-emerald-200/80">已通过</div>
                      <div className="text-xl font-bold text-emerald-300 tabular-nums">{analysisPassedTasks.length}</div>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-500">把左边的面试卡片拖到右边，系统会自动统计通过数量和转化率。</p>
                </div>

                <div
                  className={`rounded-2xl border transition ${analysisDropBucket === "passed" ? "border-emerald-400 shadow-[0_0_0_1px_rgba(74,222,128,0.45)]" : "border-white/10"}`}
                  style={{ backgroundColor: BG_DARK }}
                  onDragOver={(e) => handleAnalysisBucketDragOver(e, "passed")}
                  onDragLeave={handleAnalysisBucketDragLeave}
                  onDrop={(e) => handleAnalysisBucketDrop(e, "passed")}
                >
                  <button
                    type="button"
                    onClick={() => setAnalysisPassedExpanded((v) => !v)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Passed</p>
                      <h3 className="text-lg font-semibold text-white mt-1">已通过</h3>
                      <p className="text-sm text-slate-400 mt-1">共 {analysisPassedTasks.length} 个通过结果</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black text-white tabular-nums">{analysisPassedTasks.length}</div>
                      <div className="text-xs text-slate-500 mt-1">{analysisPassedExpanded ? "点击折叠" : "点击展开"}</div>
                    </div>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: analysisPassedExpanded ? "auto" : 0, opacity: analysisPassedExpanded ? 1 : 0 }}
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {analysisPassedTasks.length > 0 ? analysisPassedTasks.map((task) => (
                        <motion.div
                          key={task.id}
                          layout
                          transition={{ type: "spring", stiffness: 320, damping: 28 }}
                          className={`rounded-2xl border border-emerald-300/40 bg-[#2D8A3E] text-white p-4 cursor-pointer ${analysisDragTaskId === task.id ? "opacity-60" : ""}`}
                          onClick={() => setDetailTaskId(task.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-white/15 uppercase tracking-wide">已通过</span>
                            <span
                              draggable
                              onDragStart={(e) => handleAnalysisDragStart(e, task.id)}
                              onDragEnd={handleAnalysisDragEnd}
                              onClick={(e) => e.stopPropagation()}
                              className="cursor-grab active:cursor-grabbing shrink-0 p-1 -m-1 rounded opacity-70 hover:opacity-100"
                              aria-label="拖动回待面试"
                            >
                              <GripVertical size={18} className="text-white" strokeWidth={2} />
                            </span>
                          </div>
                          <h3 className="text-base font-black leading-tight tracking-tight mt-2">{task.text}</h3>
                          {(task.date || task.time) && (
                            <p className="text-xs font-medium opacity-90 mt-1 tabular-nums">
                              📅 {[task.date ? formatDateDisplay(task.date) : null, task.time].filter(Boolean).join(" ")}
                            </p>
                          )}
                          {getTagsFromNote(task.note).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {getTagsFromNote(task.note).map((tag) => (
                                <span key={tag} className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase truncate max-w-[5rem] bg-white/15">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {task.remarks?.trim() && (
                            <p className="text-xs opacity-90 mt-1.5 line-clamp-2 break-words">
                              {task.remarks.trim()}
                            </p>
                          )}
                        </motion.div>
                      )) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-slate-500">
                          通过的面试拖到这里
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : (
            <div className="w-full p-4 space-y-3 rounded-b-2xl border border-t-0 border-white/10" style={{ backgroundColor: BG_DARK }}>
              {filteredTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className={`relative overflow-hidden rounded-2xl ${dragOverTaskId === task.id ? "ring-2 ring-inset ring-white/40 rounded-2xl" : ""} ${dragTaskId === task.id ? "opacity-60" : ""}`}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDragLeave={handleDragLeave}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, task.id)}
                >
                  {/* 左滑露出的删除区：露出来时提高 z-index 确保可点击（已完成任务也能删） */}
                  <button
                    type="button"
                    onClick={(e) => handleSwipeDelete(e, task.id)}
                    className={`absolute right-0 top-0 bottom-0 w-[88px] flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-black rounded-r-2xl transition-colors ${swipeState?.id === task.id && swipeState.x < -20 ? "z-20" : "z-0"}`}
                    aria-label="删除任务"
                  >
                    <Trash2 size={18} strokeWidth={2.5} />
                    删除
                  </button>
                  <div
                    role="button"
                    tabIndex={0}
                    className={`relative z-10 rounded-2xl p-4 flex flex-col min-h-[88px] justify-between cursor-pointer select-none touch-none ${`${task.color} ${getTaskTextClass(task.color)} ${task.completed ? "grayscale" : ""}`}`}
                    style={{
                      transform: `translateX(${swipeState?.id === task.id ? swipeState.x : 0}px)`,
                      transition: swipeStartRef.current ? "none" : "transform 0.2s ease-out",
                    }}
                    onPointerDown={(e) => { handleSwipeStart(task.id, e.clientX); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
                    onPointerMove={(e) => handleSwipeMove(task.id, e.clientX)}
                    onPointerUp={(e) => { handleSwipeEnd(task.id); (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); }}
                    onPointerCancel={(e) => { handleSwipeEnd(task.id); (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); }}
                    onClick={() => { if (swipeState?.id === task.id && swipeState.x < -20) return; setDetailTaskId(task.id); }}
                    onKeyDown={(e) => e.key === "Enter" && setDetailTaskId(task.id)}
                  >
                    <div className="flex justify-between items-start">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 flex-shrink-0 hover:ring-2 hover:ring-offset-1 ${`${getTaskBorderClass(task.color)} ${task.completed ? getTaskCheckCompletedClass(task.color) : ""} ${getTaskTextClass(task.color) === "text-black" ? "hover:ring-black/30" : "hover:ring-white/50"}`}`}
                        aria-label={task.completed ? "标记未完成" : "标记完成"}
                      >
                        {task.completed && <Check size={12} className={getTaskCheckIconClass(task.color)} strokeWidth={4} />}
                      </button>
                      <span
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className="cursor-grab active:cursor-grabbing touch-none shrink-0 p-1 -m-1 rounded opacity-60 hover:opacity-100 flex items-center"
                        aria-label="拖动排序"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical size={18} className={getTaskTextClass(task.color) === "text-black" ? "text-black" : "text-white"} strokeWidth={2} />
                      </span>
                    </div>
                    <h3 className={`text-base font-black leading-tight tracking-tight mt-2 ${task.completed ? "line-through" : ""}`}>
                      {task.text}
                    </h3>
                    {(task.date || task.time) && (
                      <p className="text-xs font-medium opacity-80 mt-1 tabular-nums">
                        📅 {[task.date ? formatDateDisplay(task.date) : null, task.time].filter(Boolean).join(" ")}
                      </p>
                    )}
                    {getTagsFromNote(task.note).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {getTagsFromNote(task.note).map((tag) => (
                          <span
                            key={tag}
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase truncate max-w-[5rem] ${getTaskTextClass(task.color) === "text-black" ? "bg-black/15" : "bg-white/15"}`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {task.remarks?.trim() && (
                      <p className="text-xs opacity-80 mt-1.5 line-clamp-2 break-words">
                        {task.remarks.trim()}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            )}
            {tasksFilter === "active" && (
              <div className="w-full p-4 border border-t-0 border-white/10 rounded-b-2xl pb-8" style={{ backgroundColor: BG_DARK }}>
                <div className="w-full rounded-full flex items-center h-12 overflow-hidden border border-white/15" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    placeholder="例如：14:00 开会 或 明天 9:30 写报告"
                    className="flex-1 bg-transparent px-4 text-xs font-black tracking-widest outline-none placeholder:text-gray-600 min-w-0 text-white"
                  />
                  <button
                    type="button"
                    onClick={addTask}
                    className="w-12 h-full text-white flex items-center justify-center hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: ACCENT }}
                    disabled={!newTaskText.trim()}
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>
            )}
            </div>

            {/* 右侧：每日任务 Everyday tasks，与左侧同高、顶格靠右，添加任务在最下面 */}
            {tasksFilter === "active" && (
              <div className="flex-1 min-w-0 flex flex-col items-end self-stretch">
              <div className="w-max max-w-full flex flex-col rounded-2xl border border-white/10 overflow-hidden flex-1 min-h-0" style={{ backgroundColor: BG_DARK }}>
                <h3 className="text-xs font-black text-white/90 uppercase tracking-wider px-2 py-1.5 border-b border-white/10 shrink-0">
                  Everyday tasks
                </h3>
                <div className="flex-1 overflow-y-auto p-1 min-h-0">
                  <div className="grid grid-cols-2 gap-1 w-[284px]" style={{ gridTemplateColumns: "140px 140px" }}>
                    {everydayTasks.map((et) => {
                      const todayKey = toDateKey(new Date());
                      const doneToday = et.completedDates.includes(todayKey);
                      const streak = getStreak(et.completedDates);
                      const isEditing = editingEverydayId === et.id;
                      return (
                        <div
                          key={et.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            const now = new Date();
                            setCalendarYear(now.getFullYear());
                            setCalendarMonth(now.getMonth() + 1);
                            setEverydayDetailId(et.id);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && (() => { const now = new Date(); setCalendarYear(now.getFullYear()); setCalendarMonth(now.getMonth() + 1); setEverydayDetailId(et.id); })()}
                          className={`w-[140px] h-[140px] shrink-0 rounded-xl flex flex-col p-2 transition-all relative cursor-pointer border ${doneToday ? "ring-2 ring-white/50 ring-offset-0 brightness-110 border-[#DD8C4E]" : "grayscale border-white/10"}`}
                          style={{ backgroundColor: et.color }}
                        >
                          {/* 顶行：左上任务图标，右上连续徽章 */}
                          <div className="flex justify-between items-start gap-1 shrink-0">
                            <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-3xl leading-none bg-[#F58220] shadow-sm" aria-hidden>
                              {doneToday && et.moods?.[todayKey] ? et.moods[todayKey] : et.emoji}
                            </div>
                            {doneToday && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F58220]/90 text-white text-sm font-black tabular-nums leading-none shrink-0" title={`连续 ${streak} 天`}>
                                <span className="leading-none text-base">🔥</span>
                                <span>{streak}</span>
                              </span>
                            )}
                          </div>
                          {/* 中间：任务标题，大号加粗居中 */}
                          <div className="flex-1 flex items-center justify-center min-h-0 py-1">
                            {isEditing ? (
                              <input
                                type="text"
                                value={et.name}
                                onChange={(e) =>
                                  setEverydayTasks((prev) =>
                                    prev.map((t) => (t.id !== et.id ? t : { ...t, name: e.target.value, emoji: getEmojiForTask(e.target.value) }))
                                  )}
                                onBlur={() => setEditingEverydayId(null)}
                                onKeyDown={(e) => e.key === "Enter" && setEditingEverydayId(null)}
                                className="w-full text-xs font-bold bg-white/20 border border-white/40 rounded px-1 py-0.5 text-white placeholder:text-white/60 outline-none max-w-full text-center"
                                placeholder="任务名称"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <p
                                className="text-sm font-bold text-white leading-tight line-clamp-2 break-words w-full text-center cursor-pointer px-0.5"
                                style={{ textShadow: "0 0 1px rgba(0,0,0,0.5)" }}
                                onClick={(e) => { e.stopPropagation(); setEditingEverydayId(et.id); }}
                                title="点击编辑名称"
                              >
                                {et.name || "点击编辑"}
                              </p>
                            )}
                          </div>
                          {/* 底行：左下勾选/心情 */}
                          <div className="flex justify-between items-end gap-1 shrink-0">
                            <div className="flex flex-col items-start gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (doneToday) {
                                    setEverydayTasks((prev) =>
                                      prev.map((t) =>
                                        t.id !== et.id
                                          ? t
                                          : {
                                              ...t,
                                              completedDates: t.completedDates.filter((d) => d !== todayKey),
                                              moods: (() => {
                                                const m = { ...(t.moods || {}) };
                                                delete m[todayKey];
                                                return m;
                                              })(),
                                            }
                                      )
                                    );
                                    setPendingMoodTaskId((id) => (id === et.id ? null : id));
                                  } else {
                                    playCompletionSound();
                                    setEverydayTasks((prev) =>
                                      prev.map((t) =>
                                        t.id !== et.id ? t : { ...t, completedDates: [...t.completedDates, todayKey].sort() }
                                      )
                                    );
                                    setPendingMoodTaskId(et.id);
                                  }
                                }}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${doneToday ? "bg-white border-[#F58220]" : "border-white/60 bg-transparent"}`}
                                aria-label={doneToday ? "取消今日完成" : "标记今日完成"}
                              >
                                {doneToday && <Check size={12} className="text-[#1A1A1A]" strokeWidth={4} />}
                              </button>
                              {pendingMoodTaskId === et.id && (
                                <div className="flex flex-wrap gap-0.5 max-w-full" onClick={(e) => e.stopPropagation()}>
                                  {MOOD_EMOJIS.map((m) => (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => {
                                        setEverydayTasks((prev) =>
                                          prev.map((t) =>
                                            t.id !== et.id
                                              ? t
                                              : { ...t, moods: { ...(t.moods || {}), [todayKey]: m } }
                                          )
                                        );
                                        setPendingMoodTaskId(null);
                                      }}
                                      className="w-6 h-6 flex items-center justify-center rounded text-base hover:bg-white/20"
                                    >
                                      {m}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="shrink-0 p-4 pb-6 border-t border-white/10 space-y-3" style={{ backgroundColor: BG_DARK }}>
                  <div className="rounded-full flex items-center h-10 overflow-hidden border border-white/15" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
                    <input
                      type="text"
                      value={newEverydayName}
                      onChange={(e) => setNewEverydayName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (newEverydayName.trim() ? addEverydayTask(newEverydayName.trim()) : null)}
                      placeholder="输入每日任务名称"
                      className="flex-1 min-w-0 bg-transparent px-3 text-xs font-medium outline-none placeholder:text-white/50 text-white"
                    />
                    <button
                      type="button"
                      onClick={() => newEverydayName.trim() && addEverydayTask(newEverydayName.trim())}
                      className="w-10 h-full text-white flex items-center justify-center hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: ACCENT }}
                      disabled={!newEverydayName.trim()}
                    >
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-white/80 uppercase tracking-wider mb-1">发布评论（当天）</label>
                    <textarea
                      value={diaryEntries[toDateKey(new Date())] ?? ""}
                      onChange={(e) => setDiaryEntries((prev) => ({ ...prev, [toDateKey(new Date())]: e.target.value }))}
                      placeholder="写一句当天的想法，会一并记入日记"
                      rows={2}
                      className="w-full rounded-lg px-3 py-2 text-xs bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/30 resize-none"
                    />
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDiaryPublishFeedback(true);
                          setTimeout(() => setDiaryPublishFeedback(false), 1500);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shrink-0 transition"
                        style={{ backgroundColor: ACCENT }}
                      >
                        发布
                      </button>
                      {diaryPublishFeedback && <span className="text-xs text-white/70">已记录到日记</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDiaryViewOpen(true)}
                    className="w-full py-2 rounded-lg text-xs font-bold text-white border border-white/30 hover:bg-white/10 transition"
                  >
                    查看日记
                  </button>
                </div>
              </div>
              </div>
            )}

            {/* 每日任务历史详情：日历视图，日期上显示当天心情 */}
            {everydayDetailId && (() => {
              const et = everydayTasks.find((t) => t.id === everydayDetailId);
              if (!et) return null;
              const completedSet = new Set(et.completedDates || []);
              const todayKey = toDateKey(new Date());
              const grid = getCalendarGrid(calendarYear, calendarMonth);
              const goPrevMonth = () => {
                if (calendarMonth === 1) {
                  setCalendarMonth(12);
                  setCalendarYear((y) => y - 1);
                } else setCalendarMonth((m) => m - 1);
              };
              const goNextMonth = () => {
                if (calendarMonth === 12) {
                  setCalendarMonth(1);
                  setCalendarYear((y) => y + 1);
                } else setCalendarMonth((m) => m + 1);
              };
              const goToday = () => {
                const now = new Date();
                setCalendarYear(now.getFullYear());
                setCalendarMonth(now.getMonth() + 1);
              };
              return (
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => { setEverydayDetailId(null); setPendingRetroMood(null); }}
                >
                  <div
                    className="w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden shadow-xl"
                    style={{ backgroundColor: BG_DARK }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-3 border-b border-white/10 flex items-center justify-between" style={{ backgroundColor: et.color }}>
                      <span className="text-base font-bold text-white truncate">{et.name || "未命名"}</span>
                      <button
                        type="button"
                        onClick={() => { setEverydayDetailId(null); setPendingRetroMood(null); }}
                        className="p-1.5 rounded-full hover:bg-white/20 text-white"
                        aria-label="关闭"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-white">
                          {calendarYear}年 {MONTH_NAMES[calendarMonth - 1]}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={goPrevMonth}
                            className="p-1.5 rounded hover:bg-white/10 text-white"
                            aria-label="上一月"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={goNextMonth}
                            className="p-1.5 rounded hover:bg-white/10 text-white"
                            aria-label="下一月"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-0.5 mb-2">
                        {WEEKDAY_LABELS.map((w) => (
                          <div key={w} className="text-center text-[10px] font-medium text-white/60 py-0.5">
                            {w}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">
                        {grid.map((cell) => {
                          const isToday = cell.dateKey === todayKey;
                          const hasMood = completedSet.has(cell.dateKey);
                          const mood = et.moods?.[cell.dateKey];
                          const canRetro = cell.dateKey <= todayKey;
                          return (
                            <div
                              key={cell.dateKey}
                              onContextMenu={(e) => {
                                if (!canRetro) return;
                                e.preventDefault();
                                setEverydayRetroMenu({ x: e.clientX, y: e.clientY, dateKey: cell.dateKey, taskId: et.id });
                              }}
                              className={`min-h-[36px] flex flex-col items-center justify-center rounded border text-center cursor-context-menu ${
                                !cell.isCurrentMonth ? "text-white/40" : "text-white"
                              } ${hasMood ? "bg-blue-500/20 border-blue-400/50" : isToday ? "border-white/60" : "border-transparent"}`}
                            >
                              <span className="text-xs font-medium tabular-nums">{cell.day}</span>
                              {hasMood && (
                                <span className="text-sm leading-tight mt-0.5" title={mood || "已打卡"}>
                                  {mood ?? "✓"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {pendingRetroMood && pendingRetroMood.taskId === et.id && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs font-bold text-white/80 mb-2">选择补签表情</p>
                          <div className="flex flex-wrap gap-1">
                            {MOOD_EMOJIS.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  const { taskId, dateKey } = pendingRetroMood;
                                  playCompletionSound();
                                  setEverydayTasks((prev) =>
                                    prev.map((t) =>
                                      t.id !== taskId ? t : { ...t, moods: { ...(t.moods || {}), [dateKey]: m } }
                                    )
                                  );
                                  setPendingRetroMood(null);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-white/20 border border-white/20"
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const name = et.name?.trim() || "未命名";
                            if (!window.confirm(`是否删除：${name}\n\n删除后所有的历史记录将一起被删除。`)) return;
                            setEverydayTasks((prev) => prev.filter((t) => t.id !== et.id));
                            setEditingEverydayId((id) => (id === et.id ? null : id));
                            setEverydayDetailId(null);
                            setPendingRetroMood(null);
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          删除
                        </button>
                        <button type="button" onClick={goToday} className="text-xs text-blue-400 hover:text-blue-300">
                          今天
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 每日任务历史：右键补签菜单 */}
            {everydayRetroMenu && (
              <div
                className="fixed z-[100] py-1 min-w-[120px] rounded-lg bg-black/95 border border-white/10 shadow-xl"
                style={{ left: everydayRetroMenu.x, top: everydayRetroMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm font-medium text-white hover:bg-white/10"
                  onClick={() => {
                    setRetroPasswordPending({ taskId: everydayRetroMenu.taskId, dateKey: everydayRetroMenu.dateKey });
                    setRetroPasswordInput("");
                    setEverydayRetroMenu(null);
                  }}
                >
                  补签
                </button>
              </div>
            )}

            {/* 补签验证密码弹层 */}
            {retroPasswordPending && (
              <div
                className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4"
                onClick={() => { setRetroPasswordPending(null); setRetroPasswordInput(""); }}
              >
                <div
                  className="w-full max-w-xs rounded-2xl border border-white/10 p-4 shadow-xl"
                  style={{ backgroundColor: BG_DARK }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-sm font-bold text-white mb-3">请输入验证密码</p>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    value={retroPasswordInput}
                    onChange={(e) => setRetroPasswordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (retroPasswordInput !== "8023") {
                          setRetroPasswordInput("");
                          return;
                        }
                        const { taskId, dateKey } = retroPasswordPending;
                        setEverydayTasks((prev) =>
                          prev.map((t) =>
                            t.id !== taskId
                              ? t
                              : { ...t, completedDates: t.completedDates.includes(dateKey) ? t.completedDates : [...t.completedDates, dateKey].sort() }
                          )
                        );
                        setPendingRetroMood({ taskId, dateKey });
                        setRetroPasswordPending(null);
                        setRetroPasswordInput("");
                      }
                      if (e.key === "Escape") {
                        setRetroPasswordPending(null);
                        setRetroPasswordInput("");
                      }
                    }}
                    placeholder="密码"
                    className="w-full rounded-lg px-3 py-2 text-white bg-white/10 border border-white/20 placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/30 mb-3"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setRetroPasswordPending(null); setRetroPasswordInput(""); }}
                      className="px-3 py-1.5 rounded-lg text-sm text-white/70 hover:bg-white/10"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (retroPasswordInput !== "8023") {
                          setRetroPasswordInput("");
                          return;
                        }
                        const { taskId, dateKey } = retroPasswordPending;
                        setEverydayTasks((prev) =>
                          prev.map((t) =>
                            t.id !== taskId
                              ? t
                              : { ...t, completedDates: t.completedDates.includes(dateKey) ? t.completedDates : [...t.completedDates, dateKey].sort() }
                          )
                        );
                        setPendingRetroMood({ taskId, dateKey });
                        setRetroPasswordPending(null);
                        setRetroPasswordInput("");
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: ACCENT }}
                    >
                      确定
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 查看日记弹层 */}
            {diaryViewOpen && (() => {
              const allDateKeys = new Set<string>(Object.keys(diaryEntries));
              everydayTasks.forEach((et) => (et.completedDates || []).forEach((d) => allDateKeys.add(d)));
              const sortedDates = Array.from(allDateKeys).sort((a, b) => b.localeCompare(a));
              const formatDateLabel = (dateKey: string) => {
                const [y, m, d] = dateKey.split("-").map(Number);
                return `${y}年${m}月${d}日`;
              };
              const getCompletedTaskNames = (dateKey: string) =>
                everydayTasks.filter((t) => (t.completedDates || []).includes(dateKey)).map((t) => t.name || "未命名");
              return (
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => setDiaryViewOpen(false)}
                >
                  <div
                    className="w-full max-w-md max-h-[80vh] rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col"
                    style={{ backgroundColor: BG_DARK }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-3 border-b border-white/10 flex items-center justify-between shrink-0" style={{ backgroundColor: ACCENT }}>
                      <span className="text-base font-bold text-white">日记</span>
                      <button
                        type="button"
                        onClick={() => setDiaryViewOpen(false)}
                        className="p-1.5 rounded-full hover:bg-white/20 text-white"
                        aria-label="关闭"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {sortedDates.length === 0 ? (
                        <p className="text-sm text-white/60">暂无记录。在「发布评论」里写当天的想法，或完成每日任务，就会出现在这里。</p>
                      ) : (
                        sortedDates.map((dateKey) => (
                          <div key={dateKey} className="rounded-xl border border-white/15 p-3 space-y-2" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                            <div className="text-sm font-bold text-white/90">{formatDateLabel(dateKey)}</div>
                            {diaryEntries[dateKey]?.trim() && (
                              <p className="text-xs text-white/80 whitespace-pre-wrap">{diaryEntries[dateKey].trim()}</p>
                            )}
                            {getCompletedTaskNames(dateKey).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {getCompletedTaskNames(dateKey).map((name) => (
                                  <span key={name} className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white/80">
                                    {name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) ) : (
          /* Overview：横向日期轴（在整页滚动内，给固定最小高度）+ 左右月份切换 */
          <div className="min-h-[70vh] flex flex-col overflow-hidden pb-8">
            <div className="flex-1 min-h-[360px] flex flex-col overflow-hidden">
              <div className="flex flex-1 min-h-[55vh] border-t border-white/10 items-start">
                <button
                  type="button"
                  onClick={() => {
                    if (overviewMonth === 1) {
                      setOverviewMonth(12);
                      setOverviewYear((y) => y - 1);
                    } else setOverviewMonth((m) => m - 1);
                  }}
                  className="shrink-0 w-10 sm:w-12 h-12 flex items-center justify-center border-r border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors rounded-br-sm"
                  aria-label="上一月"
                >
                  <ChevronLeft size={22} />
                </button>
                <div
                  ref={overviewScrollRef}
                  className="flex-1 min-w-0 min-h-[55vh] overflow-x-auto overflow-y-auto overview-scroll"
                  style={{ scrollbarGutter: "stable" }}
                >
                  <div className="inline-flex min-w-full min-h-full py-3 px-6" style={{ minWidth: dateKeys.length * PX_PER_DAY + 48 }}>
                  {dateKeys.map((dateKey) => {
                    const isToday = dateKey === todayKey;
                    const dayOfWeek = new Date(dateKey + "T12:00:00").getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const hasInterview = (tasksByDate[dateKey] || []).some((t) => getTagsFromNote(t.note).includes("面试"));
                    return (
                    <div
                      key={dateKey}
                      className={`shrink-0 flex flex-col border-r last:border-r-0 relative ${isToday ? "border-[#C2319A]/50 bg-[#C2319A]/10 rounded-lg" : isWeekend ? "border-white/5" : "border-white/10"}`}
                      style={{ width: PX_PER_DAY }}
                    >
                      <div
                        className="shrink-0 w-full pt-1 pb-2 flex flex-col items-center justify-center gap-1 cursor-context-menu select-none relative"
                        onContextMenu={(e) => { e.preventDefault(); setDateMenu({ x: e.clientX, y: e.clientY, dateKey }); }}
                      >
                        {hasInterview && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#7BE861] shrink-0" aria-label="当日有面试" />
                        )}
                        <span className={`text-base font-black tabular-nums text-center w-full tracking-wide ${isToday ? "text-[#C2319A]" : isWeekend ? "text-white/50" : "text-white"}`}>
                          {dateKey.slice(5).replace("-", "/")}
                        </span>
                        {dateReminders[dateKey] && (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${dateReminders[dateKey] === "magenta" ? "bg-[#C2319A]" : "bg-[#7BE861]"}`} aria-hidden />
                        )}
                      </div>
                      <div
                        className={`flex-1 flex flex-col px-1 min-h-0 pt-[30px] transition-colors cursor-context-menu ${isToday ? "bg-[#C2319A]/5" : ""} ${dragOverDateKey === dateKey ? "bg-white/10 rounded-lg" : ""}`}
                          style={{ minHeight: UNFINISHED_ZONE_HEIGHT * 2 + 48 }}
                        onDragOver={(e) => handleOverviewDragOver(e, dateKey)}
                        onDragLeave={handleOverviewDragLeave}
                        onDrop={(e) => handleOverviewDrop(e, dateKey)}
                        onContextMenu={(e) => {
                          if ((e.target as HTMLElement).closest("[data-overview-task]")) return;
                          e.preventDefault();
                          setOverviewDayMenu({ x: e.clientX, y: e.clientY, dateKey });
                        }}
                      >
                        {/* 未完成区：固定高度，底边为固定分隔线，完成区从该线下方「落下」 */}
                        <div className="flex flex-col gap-1 flex-shrink-0 overflow-y-auto pb-2" style={{ height: UNFINISHED_ZONE_HEIGHT, minHeight: UNFINISHED_ZONE_HEIGHT }}>
                          {(tasksByDate[dateKey] || []).filter((t) => !t.completed).map((task) => (
                            <div
                              key={task.id}
                              data-overview-task
                              role="button"
                              tabIndex={0}
                              draggable
                              onClick={(e) => {
                                if (e.button !== 0) return; // 仅左键打开详情，右键留给空白处菜单
                                if (overviewDragJustEndedRef.current) {
                                  overviewDragJustEndedRef.current = false;
                                  return;
                                }
                                setDetailTaskId(task.id);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOverviewTaskMenu({ x: e.clientX, y: e.clientY, taskId: task.id });
                              }}
                              onKeyDown={(e) => e.key === "Enter" && setDetailTaskId(task.id)}
                              onDragStart={(e) => handleOverviewDragStart(e, task.id)}
                              onDragEnd={handleOverviewDragEnd}
                              className={`rounded-xl ${task.color} ${getTaskTextClass(task.color)} px-2 py-2 flex flex-col justify-center cursor-grab active:cursor-grabbing hover:opacity-95 transition-all border min-h-[44px] ${getTaskTextClass(task.color) === "text-black" ? "border-black/10" : "border-white/10"}`}
                            >
                              <p className="text-xs font-black leading-tight break-words">{task.text}</p>
                              {task.time && <p className="text-[10px] font-medium opacity-80 mt-0.5 tabular-nums">{task.time}</p>}
                            </div>
                          ))}
                        </div>
                        {/* 已完成区：与未完成区基本平分高度，可滚动 */}
                        <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto pt-2" style={{ minHeight: UNFINISHED_ZONE_HEIGHT }}>
                          {(tasksByDate[dateKey] || []).filter((t) => t.completed).map((task) => (
                            <div
                              key={task.id}
                              data-overview-task
                              role="button"
                              tabIndex={0}
                              draggable
                              onClick={(e) => {
                                if (e.button !== 0) return;
                                if (overviewDragJustEndedRef.current) {
                                  overviewDragJustEndedRef.current = false;
                                  return;
                                }
                                setDetailTaskId(task.id);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOverviewTaskMenu({ x: e.clientX, y: e.clientY, taskId: task.id });
                              }}
                              onKeyDown={(e) => e.key === "Enter" && setDetailTaskId(task.id)}
                              onDragStart={(e) => handleOverviewDragStart(e, task.id)}
                              onDragEnd={handleOverviewDragEnd}
                              className="rounded-xl bg-[#2d2d2d] text-white px-2 py-1.5 flex flex-col justify-center cursor-grab active:cursor-grabbing hover:opacity-95 transition-all border border-white/10"
                              style={{ height: COMPLETED_BLOCK_HEIGHT, minHeight: COMPLETED_BLOCK_HEIGHT }}
                            >
                              <p className="text-xs font-black leading-tight truncate line-through">{task.text}</p>
                              {task.time && <p className="text-[10px] font-medium opacity-80 mt-0.5 tabular-nums">{task.time}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );})}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (overviewMonth === 12) {
                      setOverviewMonth(1);
                      setOverviewYear((y) => y + 1);
                    } else setOverviewMonth((m) => m + 1);
                  }}
                  className="shrink-0 w-10 sm:w-12 h-12 flex items-center justify-center border-l border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors rounded-bl-sm"
                  aria-label="下一月"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>
            {dateMenu && (
              <div className="fixed z-[100] py-1 min-w-[140px] rounded-lg bg-black/95 border border-white/10 shadow-xl" style={{ left: dateMenu.x, top: dateMenu.y }} onClick={(e) => e.stopPropagation()}>
                <button type="button" className="w-full px-3 py-2 text-left text-sm font-medium text-white hover:bg-white/10 flex items-center gap-2" onClick={() => setDateReminder(dateMenu.dateKey, "magenta")}>
                  <span className="w-2 h-2 rounded-full bg-[#C2319A]" /> 洋红色提醒
                </button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm font-medium text-white hover:bg-white/10 flex items-center gap-2" onClick={() => setDateReminder(dateMenu.dateKey, "green")}>
                  <span className="w-2 h-2 rounded-full bg-[#7BE861]" /> 绿色提醒
                </button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm font-medium text-white/70 hover:bg-white/10" onClick={() => setDateReminder(dateMenu.dateKey, null)}>
                  取消提醒
                </button>
              </div>
            )}
            {overviewDayMenu && (
              <div className="fixed z-[100] py-1 min-w-[140px] rounded-lg bg-black/95 border border-white/10 shadow-xl" style={{ left: overviewDayMenu.x, top: overviewDayMenu.y }} onClick={(e) => e.stopPropagation()}>
                <button type="button" className="w-full px-3 py-2 text-left text-sm font-medium text-white hover:bg-white/10" onClick={() => addTaskWithDate(overviewDayMenu.dateKey, true)}>
                  创建任务
                </button>
              </div>
            )}
            {overviewTaskMenu && (
              <div className="fixed z-[100] py-1 min-w-[120px] rounded-lg bg-black/95 border border-white/10 shadow-xl" style={{ left: overviewTaskMenu.x, top: overviewTaskMenu.y }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm font-medium text-red-400 hover:bg-white/10"
                  onClick={() => {
                    deleteTask(overviewTaskMenu.taskId);
                    setOverviewTaskMenu(null);
                  }}
                >
                  删除
                </button>
              </div>
            )}
          </div>
        )}

        {/* Task 详情弹窗：放在分支外，ACTIVE/DONE/OVERVIEW 下都能打开 */}
        {detailTask && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDetailTaskId(null)}
          >
            <div
              className={`rounded-2xl ${detailEdit?.color ?? detailTask.color} ${getTaskTextClass(detailEdit?.color ?? detailTask.color)} ${detailTask.completed ? "opacity-90" : ""} p-6 w-full max-w-md shadow-xl border ${getTaskTextClass(detailEdit?.color ?? detailTask.color) === "text-black" ? "border-black/10" : "border-white/10"} ${detailTask.completed ? "grayscale" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <button
                  type="button"
                  onClick={() => toggleTask(detailTask.id)}
                  className={`w-8 h-8 rounded-full border-2 ${getTaskBorderClass(detailTask.color)} flex items-center justify-center shrink-0 ${detailTask.completed ? getTaskCheckCompletedClass(detailTask.color) : ""}`}
                  aria-label={detailTask.completed ? "标记未完成" : "标记完成"}
                >
                  {detailTask.completed && <Check size={16} className={getTaskCheckIconClass(detailTask.color)} strokeWidth={4} />}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTaskId(null)}
                  className={`p-2 rounded-full transition ${getTaskTextClass(detailTask.color) === "text-black" ? "hover:bg-black/10 text-black/70 hover:text-black" : "hover:bg-white/10 text-white/80 hover:text-white"}`}
                  aria-label="关闭"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-black uppercase opacity-80 mb-1.5">任务名称</label>
                <input
                  type="text"
                  value={detailEdit?.text ?? detailTask.text}
                  onChange={(e) => detailEdit && setDetailEdit({ ...detailEdit, text: e.target.value })}
                  className={`w-full rounded-lg px-3 py-2 text-xl font-black leading-tight tracking-tight outline-none focus:ring-2 ${getTaskTextClass(detailEdit?.color ?? detailTask.color) === "text-black" ? "bg-black/10 border border-black/20 text-black focus:ring-black/30" : "bg-white/10 border border-white/20 text-white focus:ring-white/30"} ${detailTask.completed ? "line-through opacity-90" : ""}`}
                  placeholder="任务名称"
                />
              </div>
              <div className="mt-4">
                <label className="block text-xs font-black uppercase opacity-80 mb-1.5">颜色</label>
                <div className="flex gap-2 mt-1.5">
                  {TASK_THEME_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => detailEdit && setDetailEdit({ ...detailEdit, color: c })}
                      className={`w-9 h-9 rounded-full border-2 transition ${(detailEdit?.color ?? detailTask.color) === c ? "border-white ring-2 ring-offset-2 ring-offset-transparent ring-white/50" : "border-transparent opacity-70 hover:opacity-100"} ${c}`}
                      aria-label={`选择${c}`}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-black uppercase opacity-80 mb-1.5">日期 (yyyy/mm/dd)</label>
                  <input
                    type="date"
                    value={detailEdit?.date ?? detailTask.date ?? ""}
                    onChange={(e) => detailEdit && setDetailEdit({ ...detailEdit, date: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-base font-medium outline-none focus:ring-2 resize-none ${getTaskTextClass(detailTask.color) === "text-black" ? "bg-black/10 border border-black/20 text-black focus:ring-black/30 [color-scheme:light]" : "bg-white/10 border border-white/20 text-white focus:ring-white/30 [color-scheme:dark]"}`}
                  />
                </div>
                <div className="w-28 shrink-0">
                  <label className="block text-xs font-black uppercase opacity-80 mb-1.5">时间</label>
                  <input
                    type="time"
                    value={detailEdit?.time ?? detailTask.time ?? ""}
                    onChange={(e) => detailEdit && setDetailEdit({ ...detailEdit, time: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-base font-medium outline-none focus:ring-2 resize-none ${getTaskTextClass(detailTask.color) === "text-black" ? "bg-black/10 border border-black/20 text-black focus:ring-black/30 [color-scheme:light]" : "bg-white/10 border border-white/20 text-white focus:ring-white/30 [color-scheme:dark]"}`}
                  />
                </div>
              </div>
              {/* 标签：在详情里调整，预设 #学习 #生活 #面试 + 自定义 */}
              <div className="mt-4">
                <label className="block text-xs font-black uppercase opacity-80 mb-1.5">标签</label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_TAGS.map((tag) => {
                    const currentTags = getTagsFromNote(detailEdit?.note ?? detailTask.note ?? "");
                    const selected = currentTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (!detailEdit) return;
                          const next = selected ? currentTags.filter((t) => t !== tag) : [...currentTags, tag];
                          const note = next.length > 0 ? next.map((t) => `#${t}`).join(" ") : "";
                          setDetailEdit({ ...detailEdit, note, color: getColorFromTags(note) });
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition border ${selected ? "bg-[#C2319A]/30 border-[#C2319A]" : "border-white/20 opacity-80 hover:opacity-100"} ${getTaskTextClass(detailEdit?.color ?? detailTask.color) === "text-black" ? "text-black border-black/30" : "text-white border-white/20"}`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                  {getTagsFromNote(detailEdit?.note ?? detailTask.note ?? "")
                    .filter((tag) => !(PRESET_TAGS as readonly string[]).includes(tag))
                    .map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getTaskTextClass(detailEdit?.color ?? detailTask.color) === "text-black" ? "bg-black/15" : "bg-white/15"}`}
                      >
                        #{tag}
                        <button
                          type="button"
                        onClick={() => {
                          if (!detailEdit) return;
                          const current = getTagsFromNote(detailEdit.note ?? "");
                          const next = current.filter((t) => t !== tag);
                          const note = next.length > 0 ? next.map((t) => `#${t}`).join(" ") : "";
                          setDetailEdit({ ...detailEdit, note, color: getColorFromTags(note) });
                        }}
                          className="p-0.5 rounded hover:opacity-70"
                          aria-label={`移除 ${tag}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  <span className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      value={detailTagInput}
                      onChange={(e) => setDetailTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const raw = detailTagInput.trim().replace(/^#+/, "");
                          if (!raw || !detailEdit) return;
                          const current = getTagsFromNote(detailEdit.note ?? "");
                          if (current.includes(raw)) return;
                          const note = [...current, raw].map((t) => `#${t}`).join(" ");
                          setDetailEdit({ ...detailEdit, note, color: getColorFromTags(note) });
                          setDetailTagInput("");
                        }
                      }}
                      placeholder="自定义"
                      className={`w-16 rounded px-2 py-1 text-xs outline-none focus:ring-1 ${getTaskTextClass(detailEdit?.color ?? detailTask.color) === "text-black" ? "bg-black/10 border border-black/20 text-black placeholder:text-black/50" : "bg-white/10 border border-white/20 text-white placeholder:text-white/50"}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const raw = detailTagInput.trim().replace(/^#+/, "");
                        if (!raw || !detailEdit) return;
                        const current = getTagsFromNote(detailEdit.note ?? "");
                        if (current.includes(raw)) return;
                        const note = [...current, raw].map((t) => `#${t}`).join(" ");
                        setDetailEdit({ ...detailEdit, note, color: getColorFromTags(note) });
                        setDetailTagInput("");
                      }}
                      className={`px-2 py-1 rounded text-xs font-medium ${getTaskTextClass(detailEdit?.color ?? detailTask.color) === "text-black" ? "bg-black/20 text-black" : "bg-white/20 text-white"}`}
                    >
                      添加
                    </button>
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-black uppercase opacity-80 mb-1.5">备注</label>
                <textarea
                  value={detailEdit?.remarks ?? detailTask.remarks ?? ""}
                  onChange={(e) => detailEdit && setDetailEdit({ ...detailEdit, remarks: e.target.value })}
                  placeholder="自由填写备注..."
                  rows={3}
                  className={`w-full rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 resize-none ${getTaskTextClass(detailEdit?.color ?? detailTask.color) === "text-black" ? "bg-black/10 border border-black/20 text-black placeholder:text-black/50 focus:ring-black/30" : "bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:ring-white/30"}`}
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm opacity-80">
                  {detailTask.completed ? "已完成" : "未完成"}
                </p>
                {detailDirty && (
                  <button
                    type="button"
                    onClick={applyDetailEdit}
                    className="px-4 py-2 rounded-lg bg-[#C2319A] hover:opacity-90 text-white text-sm font-bold transition"
                  >
                    更新
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer：与首页一致 */}
      <footer className="border-t border-purple-500/20 mt-20 py-10 bg-black/50 text-gray-400 text-sm shrink-0">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 mb-2">
              🐌 SNAIL CAREER
            </h2>
            <p className="text-gray-500 mb-3">蜗牛简历 | 一毫米也算前进。</p>
            <p className="text-xs text-gray-600">
              AI 简历分析与岗位匹配工具，帮助你了解求职进度与优化方向。
            </p>
          </div>
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Resources</h3>
            <ul className="space-y-2">
              <li><a href="https://uiverse.io" className="hover:text-purple-400 transition">UIverse.io</a></li>
              <li><a href="https://cssbuttons.io" className="hover:text-purple-400 transition">Cssbuttons.io</a></li>
              <li><a href="https://pixelrepo.com" className="hover:text-purple-400 transition">Pixelrepo.com</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Information</h3>
            <ul className="space-y-2">
              <li><FeedbackDialog /></li>
              <li><FeedbackDialog kind="cooperation" /></li>
              <li><a href="https://xhslink.com/m/8bOzZ9dlgop" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition">About me</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-purple-400 transition">Terms</a></li>
              <li><a href="#" className="hover:text-purple-400 transition">Privacy policy</a></li>
              <li><a href="#" className="hover:text-purple-400 transition">Disclaimer</a></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-gray-600 text-xs mt-10 border-t border-purple-500/10 pt-4">
          © 2025 SNAIL CAREER. All rights reserved. | Made with 💜 by Wenhao Wang
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .agenda-body-scroll::-webkit-scrollbar { width: 8px; }
        .agenda-body-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .agenda-body-scroll::-webkit-scrollbar-thumb { background: rgba(194,49,154,0.5); border-radius: 4px; }
        .agenda-body-scroll { scrollbar-width: thin; scrollbar-color: rgba(194,49,154,0.5) rgba(255,255,255,0.05); }
        .overview-scroll::-webkit-scrollbar { height: 8px; }
        .overview-scroll { scrollbar-width: thin; }
        .agenda-page-selection::selection { background: #C2319A; color: white; }
      `}} />
    </div>
  );
  return content;
}
