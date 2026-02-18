"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Check, ArrowUpRight, X, Trash2, GripVertical } from "lucide-react";
import ButtonTreasure from "@/app/components/ButtonTreasure";

const PX_PER_DAY = 100;
const TASK_BLOCK_HEIGHT = 72;
/** Overview 里任务方块高度为原来的 80% */
const OVERVIEW_BLOCK_HEIGHT = Math.round(TASK_BLOCK_HEIGHT * 0.8);
/** 已完成任务块再压缩 50% */
const COMPLETED_BLOCK_HEIGHT = Math.round(OVERVIEW_BLOCK_HEIGHT * 0.5);
/** 未完成区固定高度，分隔线始终在此高度底部 */
const UNFINISHED_ZONE_HEIGHT = 260;

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

/** 写任务时可选的预设标签 */
const PRESET_TAGS = ["学习", "生活", "面试"] as const;

/** 按标签给出默认颜色：面试=绿，生活=黄，无标签/学习=紫；可再手动改 */
function getColorFromTags(note?: string): string {
  const tags = !note?.trim() ? [] : (note.match(/#[^\s#]+/g) || []).map((m) => m.slice(1).trim());
  if (tags.includes("面试")) return "bg-[#2D8A3E]"; // 绿
  if (tags.includes("生活")) return "bg-[#B89B2C]"; // 黄
  return "bg-[#9A53D3]"; // 默认紫（无 tag 或 学习）
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

/** Overview 横向日期轴：固定为当月一整月，可左右拉动 */
function getOverviewDateRange(): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** 日期键 yyyy-mm-dd */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AgendaPage(): React.ReactNode {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tasksFilter, setTasksFilter] = useState<"active" | "break" | "done" | "overview">("active");
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  /** 详情弹窗内编辑中的副本，有改动时显示「更新」按钮 */
  const [detailEdit, setDetailEdit] = useState<{ text: string; date: string; time: string; note: string; color: string; remarks: string } | null>(null);
  /** 详情弹窗内添加自定义标签的输入 */
  const [detailTagInput, setDetailTagInput] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [swipeState, setSwipeState] = useState<{ id: number; x: number } | null>(null);
  const [dateReminders, setDateReminders] = useState<Record<string, "magenta" | "green" | null>>({});
  const [dateMenu, setDateMenu] = useState<{ x: number; y: number; dateKey: string } | null>(null);
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
  /** 拖拽结束后抑制一次点击，避免误开详情 */
  const overviewDragJustEndedRef = useRef(false);
  const swipeStartRef = useRef<{ x: number; startX: number } | null>(null);
  const swipeCurrentXRef = useRef<number>(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const overviewScrollRef = useRef<HTMLDivElement>(null);
  const breakPreviewRef = useRef<HTMLDivElement>(null);
  const hasHydratedFromStorageRef = useRef(false);

  const doneCount = tasks.filter((t) => t.completed).length;
  const { start: rangeStart, end: rangeEnd } = getOverviewDateRange();
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
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const addTask = () => {
    const { event, date, time } = parseNewTaskInput(newTaskText);
    if (!event) return;
    setTasks((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: event.toUpperCase(),
        completed: false,
        color: "bg-[#9A53D3]", // 无 tag 默认紫
        ...(date && { date }),
        ...(time && { time }),
      },
    ]);
    setNewTaskText("");
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

  const filteredTasks = tasksFilter === "active" ? tasks.filter((t) => !t.completed) : tasksFilter === "done" ? tasks.filter((t) => t.completed) : [];

  /** 从备注里解析 #标签，用于在标签区显示 */
  const getTagsFromNote = (note?: string): string[] => {
    if (!note?.trim()) return [];
    const matches = note.match(/#[^\s#]+/g) || [];
    return [...new Set(matches.map((m) => m.slice(1).trim()).filter(Boolean))];
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
      localStorage.setItem(AGENDA_DATE_REMINDERS_KEY, JSON.stringify(dateReminders));
    } catch {}
  }, [dateReminders]);

  // 挂载后从 localStorage 恢复，再允许上面的 effect 写入，这样既有首屏一致又不会覆盖本地数据
  useEffect(() => {
    setTasks(loadStoredTasks());
    setDateReminders(loadStoredDateReminders());
    hasHydratedFromStorageRef.current = true;
  }, []);

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
            🐌 SNAIL CAREER｜议事日程
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
            <span className="hidden sm:inline">议事日程</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 py-1.5 min-w-[160px] rounded-xl border border-white/10 shadow-xl z-50" style={{ backgroundColor: "rgba(26,26,26,0.98)" }}>
              <Link href="/" className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 transition rounded-t-xl" onClick={() => setMenuOpen(false)} style={{ color: ACCENT }}>简历优化</Link>
              <Link href="/mock-interview" className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 transition" onClick={() => setMenuOpen(false)} style={{ color: ACCENT }}>模拟面试</Link>
              <Link href="/agenda" className="block px-4 py-3 text-sm font-medium bg-white/10 transition rounded-b-xl" onClick={() => setMenuOpen(false)} style={{ color: ACCENT }}>议事日程</Link>
            </div>
          )}
        </div>
      </header>

      {/* 毛玻璃之下：整块可滚动；sub-tab 位置与简历优化页一致（pt-40 留出顶栏） */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative z-10 pt-40 agenda-body-scroll">
        {/* Sub tab：与简历优化页同一位置、同一样式 */}
        <div className="w-full flex items-center justify-start gap-2 mb-4 z-10 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setTasksFilter("active")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${tasksFilter === "active" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
          >
            Tasks
          </button>
          <button
            type="button"
            onClick={() => setTasksFilter("break")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${tasksFilter === "break" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
          >
            Break task
          </button>
          <button
            type="button"
            onClick={() => setTasksFilter("done")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${tasksFilter === "done" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
          >
            Done
          </button>
          <button
            type="button"
            onClick={() => setTasksFilter("overview")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${tasksFilter === "overview" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
          >
            Overview
          </button>
        </div>
        {tasksFilter !== "overview" ? ( tasksFilter === "break" ? (
          /* Break task：输入 deadline、span、备注，Break 后预览子任务，一键 Apply */
          <div className="max-w-lg mx-auto w-full px-4 py-4">
            <div className="p-4 space-y-4 rounded-2xl border border-white/10" style={{ backgroundColor: BG_DARK }}>
              <h2 className="text-sm font-black text-white/90 uppercase tracking-wider">Break task</h2>
              <div className="grid gap-2">
                <label className="text-xs font-medium text-white/70">Deadline</label>
                <input
                  type="date"
                  value={breakTaskDeadline}
                  onChange={(e) => setBreakTaskDeadline(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/20 text-white outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-medium text-white/70">Span (e.g. 3h or 2d)</label>
                <input
                  type="text"
                  value={breakTaskSpan}
                  onChange={(e) => setBreakTaskSpan(e.target.value)}
                  placeholder="3h / 2d"
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-medium text-white/70">备注（详细内容，用于拆分）</label>
                <textarea
                  value={breakTaskRemarks}
                  onChange={(e) => setBreakTaskRemarks(e.target.value)}
                  placeholder="描述任务内容，用换行或逗号分隔可拆成多个子任务"
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/30 resize-y"
                />
              </div>
              <button
                type="button"
                onClick={() => runBreakTask()}
                disabled={breakBreakLoading}
                className="w-full py-3 rounded-xl text-sm font-black text-white transition opacity-90 hover:opacity-100 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: ACCENT }}
              >
                {breakBreakLoading ? "AI 生成中…" : "Break"}
              </button>
              {breakBreakError && (
                <p className="text-xs text-red-400 mt-1">{breakBreakError}</p>
              )}
            </div>
            {breakPreview && breakPreview.length > 0 && (
              <div ref={breakPreviewRef} className="mt-4 p-4 rounded-2xl border border-white/10 space-y-3" style={{ backgroundColor: BG_DARK }}>
                <p className="text-xs font-black text-white/80 uppercase tracking-wider">Preview（{breakPreview.length} tasks）点击任务可编辑</p>
                <ul className="space-y-2">
                  {breakPreview.map((p, i) => (
                    <li key={i} className="rounded-xl border border-white/10 text-sm overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                      {editingBreakIndex === i ? (
                        <div className="p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={p.text}
                              onChange={(e) => updateBreakPreviewItem(i, { text: e.target.value })}
                              className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-xs font-black bg-white/10 border border-white/20 text-white outline-none focus:ring-1 focus:ring-white/40"
                              placeholder="子任务标题"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingBreakIndex(null)}
                                className="shrink-0 px-2 py-1 rounded text-xs font-medium text-white/80 hover:bg-white/10"
                              >
                                完成
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeBreakPreviewItem(i); setEditingBreakIndex(null); }}
                                className="shrink-0 p-1.5 rounded-lg text-white/70 hover:text-red-400 hover:bg-white/10 transition"
                                aria-label="删除"
                              >
                                <Trash2 size={16} strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="date"
                              value={p.date ?? ""}
                              onChange={(e) => updateBreakPreviewItem(i, { date: e.target.value || "" })}
                              className="rounded-lg px-2 py-1 text-xs bg-white/10 border border-white/20 text-white outline-none focus:ring-1 focus:ring-white/40"
                            />
                            <input
                              type="time"
                              value={p.time ?? ""}
                              onChange={(e) => updateBreakPreviewItem(i, { time: e.target.value || "" })}
                              className="rounded-lg px-2 py-1 text-xs bg-white/10 border border-white/20 text-white outline-none focus:ring-1 focus:ring-white/40 w-20"
                            />
                            <input
                              type="text"
                              value={p.duration ?? ""}
                              onChange={(e) => updateBreakPreviewItem(i, { duration: e.target.value.trim() || "" })}
                              className="rounded-lg px-2 py-1 text-xs bg-white/10 border border-white/20 text-white outline-none focus:ring-1 focus:ring-white/40 w-20"
                              placeholder="预计 30min"
                            />
                          </div>
                        </div>
                      ) : (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setEditingBreakIndex(i)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingBreakIndex(i)}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5 transition"
                        >
                          <input
                            type="checkbox"
                            checked={p.included !== false}
                            onChange={(e) => { e.stopPropagation(); updateBreakPreviewItem(i, { included: e.target.checked }); }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-white/30"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-white truncate">{p.text}</p>
                            <p className="text-xs text-white/60 mt-0.5">
                              {p.date ? formatDateDisplay(p.date) : ""} {p.time ? p.time : ""}
                              {p.duration ? ` · 预计 ${p.duration}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeBreakPreviewItem(i); }}
                            className="shrink-0 p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-white/10 transition"
                            aria-label="删除"
                          >
                            <Trash2 size={16} strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={applyBreakPreview}
                  className="w-full py-3 rounded-xl text-sm font-black text-white bg-green-600 hover:bg-green-500 transition"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 任务列表 + 添加任务：同一滚动流，button 在毛玻璃之下 */
          <div className="max-w-lg mx-auto w-full px-4 py-4">
            <div className="p-4 space-y-3 rounded-b-2xl border border-t-0 border-white/10" style={{ backgroundColor: BG_DARK }}>
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
                    className={`relative z-10 rounded-2xl p-4 flex flex-col min-h-[88px] justify-between cursor-pointer select-none touch-none ${tasksFilter === "done" ? "bg-[#2d2d2d] text-white border border-white/10" : `${task.color} ${getTaskTextClass(task.color)} ${task.completed ? "grayscale" : ""}`}`}
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
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 flex-shrink-0 hover:ring-2 hover:ring-offset-1 ${tasksFilter === "done" ? "border-white/50 bg-white/10 hover:ring-white/50 " + (task.completed ? "bg-white/20" : "") : `${getTaskBorderClass(task.color)} ${task.completed ? getTaskCheckCompletedClass(task.color) : ""} ${getTaskTextClass(task.color) === "text-black" ? "hover:ring-black/30" : "hover:ring-white/50"}`}`}
                        aria-label={task.completed ? "标记未完成" : "标记完成"}
                      >
                        {task.completed && <Check size={12} className={tasksFilter === "done" ? "text-white" : getTaskCheckIconClass(task.color)} strokeWidth={4} />}
                      </button>
                      <span
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className="cursor-grab active:cursor-grabbing touch-none shrink-0 p-1 -m-1 rounded opacity-60 hover:opacity-100 flex items-center"
                        aria-label="拖动排序"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical size={18} className={tasksFilter === "done" ? "text-white" : getTaskTextClass(task.color) === "text-black" ? "text-black" : "text-white"} strokeWidth={2} />
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
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase truncate max-w-[5rem] ${tasksFilter === "done" ? "bg-white/15" : getTaskTextClass(task.color) === "text-black" ? "bg-black/15" : "bg-white/15"}`}
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
            {tasksFilter === "active" && (
              <div className="p-4 border border-t-0 border-white/10 rounded-b-2xl pb-8" style={{ backgroundColor: BG_DARK }}>
                <div className="rounded-full flex items-center h-12 overflow-hidden border border-white/15" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
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
        ) ) : (
          /* Overview：横向日期轴（在整页滚动内，给固定最小高度） */
          <div className="min-h-[70vh] flex flex-col overflow-hidden pb-8">
            <div className="flex-1 min-h-[360px] flex flex-col overflow-hidden">
              <div
                ref={overviewScrollRef}
                className="flex-1 min-h-[320px] overflow-x-auto overflow-y-auto border-t border-white/10 overview-scroll"
                style={{ scrollbarGutter: "stable" }}
              >
                <div className="inline-flex min-w-full min-h-full py-3 px-6" style={{ minWidth: dateKeys.length * PX_PER_DAY + 48 }}>
                  {dateKeys.map((dateKey) => {
                    const hasInterview = (tasksByDate[dateKey] || []).some((t) => getTagsFromNote(t.note).includes("面试"));
                    return (
                    <div key={dateKey} className="shrink-0 flex flex-col border-r border-white/10 last:border-r-0 relative" style={{ width: PX_PER_DAY }}>
                      <div
                        className="shrink-0 w-full pt-1 pb-2 flex flex-col items-center justify-center gap-1 cursor-context-menu select-none relative"
                        onContextMenu={(e) => { e.preventDefault(); setDateMenu({ x: e.clientX, y: e.clientY, dateKey }); }}
                      >
                        {hasInterview && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#7BE861] shrink-0" aria-label="当日有面试" />
                        )}
                        <span className="text-base font-black text-white tabular-nums text-center w-full tracking-wide">{dateKey.slice(5).replace("-", "/")}</span>
                        {dateReminders[dateKey] && (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${dateReminders[dateKey] === "magenta" ? "bg-[#C2319A]" : "bg-[#7BE861]"}`} aria-hidden />
                        )}
                      </div>
                      <div
                        className={`flex-1 flex flex-col px-1 min-h-[280px] pt-[30px] transition-colors ${dragOverDateKey === dateKey ? "bg-white/10 rounded-lg" : ""}`}
                        onDragOver={(e) => handleOverviewDragOver(e, dateKey)}
                        onDragLeave={handleOverviewDragLeave}
                        onDrop={(e) => handleOverviewDrop(e, dateKey)}
                      >
                        {/* 未完成区：固定高度，底边为固定分隔线，完成区从该线下方「落下」 */}
                        <div className="flex flex-col gap-1 flex-shrink-0 overflow-y-auto pb-2" style={{ height: UNFINISHED_ZONE_HEIGHT, minHeight: UNFINISHED_ZONE_HEIGHT }}>
                          {(tasksByDate[dateKey] || []).filter((t) => !t.completed).map((task) => (
                            <div
                              key={task.id}
                              role="button"
                              tabIndex={0}
                              draggable
                              onClick={() => {
                                if (overviewDragJustEndedRef.current) {
                                  overviewDragJustEndedRef.current = false;
                                  return;
                                }
                                setDetailTaskId(task.id);
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
                        {/* 已完成区：从未完成区底边为起点往下排，统一深灰底白字 */}
                        <div className="flex flex-col gap-1 flex-shrink-0 pt-2">
                          {(tasksByDate[dateKey] || []).filter((t) => t.completed).map((task) => (
                            <div
                              key={task.id}
                              role="button"
                              tabIndex={0}
                              draggable
                              onClick={() => {
                                if (overviewDragJustEndedRef.current) {
                                  overviewDragJustEndedRef.current = false;
                                  return;
                                }
                                setDetailTaskId(task.id);
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
