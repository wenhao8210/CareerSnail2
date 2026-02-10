"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, Check, ArrowUpRight, X, Trash2 } from "lucide-react";
import ButtonTreasure from "@/app/components/ButtonTreasure";

const PX_PER_DAY = 100;
const TASK_BLOCK_HEIGHT = 72;

type TaskItem = { id: number; text: string; completed: boolean; color: string; date?: string; time?: string; note?: string };

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

/** 参考图配色：深灰底 + 柔和品红/黄/紫/绿，不晃眼 */
const ACCENT = "#C2319A";        // 品红（顶栏、强调）
const BG_DARK = "#1A1A1A";       // 主背景深灰
const TASK_YELLOW = "#FCF554";   // 干净黄
const TASK_PURPLE = "#9A53D3";   // 中饱和紫
const TASK_LIME = "#7BE861";     // 青柠绿

/** 任务卡片可选颜色（与当前整页配色一致：品红 / 黄 / 紫 / 绿） */
const TASK_THEME_COLORS = ["bg-[#C2319A]", "bg-[#FCF554]", "bg-[#9A53D3]", "bg-[#7BE861]"] as const;

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
    "bg-[#FCF554]": "#fcf554", "bg-[#9A53D3]": "#9a53d3", "bg-[#7BE861]": "#7be861",
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

export default function AgendaPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [agendaTab, setAgendaTab] = useState<"tasks" | "timeline">("tasks");
  const [tasksFilter, setTasksFilter] = useState<"active" | "done">("active");
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [swipeState, setSwipeState] = useState<{ id: number; x: number } | null>(null);
  const [dateReminders, setDateReminders] = useState<Record<string, "magenta" | "green" | null>>({});
  const [dateMenu, setDateMenu] = useState<{ x: number; y: number; dateKey: string } | null>(null);
  const swipeStartRef = useRef<{ x: number; startX: number } | null>(null);
  const swipeCurrentXRef = useRef<number>(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const overviewScrollRef = useRef<HTMLDivElement>(null);

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
        color: TASK_THEME_COLORS[prev.length % TASK_THEME_COLORS.length],
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
  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (detailTaskId === id) setDetailTaskId(null);
    setSwipeState(null);
  };
  const updateTaskColor = (id: number, color: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
  };
  const formatDateDisplay = (dateStr: string) => (dateStr ? dateStr.replace(/-/g, "/") : "");

  const filteredTasks = tasksFilter === "active" ? tasks.filter((t) => !t.completed) : tasks.filter((t) => t.completed);

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

  const setDateReminder = (dateKey: string, value: "magenta" | "green" | null) => {
    setDateReminders((prev) => ({ ...prev, [dateKey]: value }));
    setDateMenu(null);
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

  return (
    <div className="agenda-page-selection min-h-screen flex flex-col text-slate-100 relative overflow-hidden" style={{ backgroundColor: BG_DARK }}>
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

      {/* Sub tab */}
      <div className="flex items-center gap-2 px-4 pt-40 pb-2 border-b border-white/10 relative z-10" style={{ backgroundColor: "rgba(26,26,26,0.6)" }}>
        <button
          type="button"
          onClick={() => setAgendaTab("tasks")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${agendaTab === "tasks" ? "text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
          style={agendaTab === "tasks" ? { backgroundColor: ACCENT } : {}}
        >
          Tasks
        </button>
        <button
          type="button"
          onClick={() => setAgendaTab("timeline")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${agendaTab === "timeline" ? "text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
          style={agendaTab === "timeline" ? { backgroundColor: ACCENT } : {}}
        >
          Overview
        </button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 flex flex-col relative z-10">
        {agendaTab === "tasks" ? (
          /* 初始页：Tasks 全宽居中 */
          <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 min-h-0">
            <div className="p-6 sm:p-8 rounded-t-2xl rounded-bl-[40px] shrink-0" style={{ backgroundColor: ACCENT }}>
              <div className="flex justify-between items-center mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-white/20 text-black">FOCUS MODE</span>
                <span className="text-white/95 font-semibold text-sm tabular-nums">{doneCount} / {tasks.length} DONE</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-4">TASKS</h2>
              <div className="flex gap-6 border-b border-white/20 pb-2">
                <button
                  type="button"
                  onClick={() => setTasksFilter("active")}
                  className={`text-sm font-black uppercase transition ${tasksFilter === "active" ? "text-white border-b-2 border-white" : "text-white/60 hover:text-white/90"}`}
                >
                  ACTIVE
                </button>
                <button
                  type="button"
                  onClick={() => setTasksFilter("done")}
                  className={`text-sm font-black uppercase transition ${tasksFilter === "done" ? "text-white border-b-2 border-white" : "text-white/60 hover:text-white/90"}`}
                >
                  DONE
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto agenda-scroll rounded-b-2xl border border-t-0 border-white/10 min-h-0" style={{ backgroundColor: BG_DARK }}>
              {filteredTasks.map((task) => (
                <div key={task.id} className="relative overflow-hidden rounded-2xl">
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
                    className={`relative z-10 rounded-2xl ${task.color} ${getTaskTextClass(task.color)} p-4 flex flex-col min-h-[88px] justify-between cursor-pointer select-none touch-none ${task.completed ? "grayscale" : ""}`}
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
                        onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                        className={`w-6 h-6 rounded-full border-2 ${getTaskBorderClass(task.color)} flex items-center justify-center shrink-0 flex-shrink-0 hover:ring-2 hover:ring-offset-1 ${task.completed ? getTaskCheckCompletedClass(task.color) : ""} ${getTaskTextClass(task.color) === "text-black" ? "hover:ring-black/30" : "hover:ring-white/50"}`}
                        aria-label={task.completed ? "标记未完成" : "标记完成"}
                      >
                        {task.completed && <Check size={12} className={getTaskCheckIconClass(task.color)} strokeWidth={4} />}
                      </button>
                      <ArrowUpRight size={16} className="opacity-70 shrink-0 pointer-events-none" aria-hidden />
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
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 shrink-0 border border-t-0 border-white/10 rounded-b-2xl" style={{ backgroundColor: BG_DARK }}>
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

            {/* Task 详情弹窗 */}
            {detailTask && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setDetailTaskId(null)}
              >
                <div
                  className={`rounded-2xl ${detailTask.color} ${getTaskTextClass(detailTask.color)} ${detailTask.completed ? "opacity-90" : ""} p-6 w-full max-w-md shadow-xl border ${getTaskTextClass(detailTask.color) === "text-black" ? "border-black/10" : "border-white/10"} ${detailTask.completed ? "grayscale" : ""}`}
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
                  <h3 className={`text-xl font-black leading-tight tracking-tight mt-4 ${detailTask.completed ? "line-through" : ""}`}>
                    {detailTask.text}
                  </h3>
                  <div className="mt-4">
                    <label className="block text-xs font-black uppercase opacity-80 mb-1.5">颜色</label>
                    <div className="flex gap-2 mt-1.5">
                      {TASK_THEME_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateTaskColor(detailTask.id, c)}
                          className={`w-9 h-9 rounded-full border-2 transition ${detailTask.color === c ? "border-white ring-2 ring-offset-2 ring-offset-transparent ring-white/50" : "border-transparent opacity-70 hover:opacity-100"} ${c}`}
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
                        value={detailTask.date || ""}
                        onChange={(e) => updateTaskDate(detailTask.id, e.target.value)}
                        className={`w-full rounded-lg px-3 py-2 text-base font-medium outline-none focus:ring-2 resize-none ${getTaskTextClass(detailTask.color) === "text-black" ? "bg-black/10 border border-black/20 text-black focus:ring-black/30 [color-scheme:light]" : "bg-white/10 border border-white/20 text-white focus:ring-white/30 [color-scheme:dark]"}`}
                      />
                    </div>
                    <div className="w-28 shrink-0">
                      <label className="block text-xs font-black uppercase opacity-80 mb-1.5">时间</label>
                      <input
                        type="time"
                        value={detailTask.time || ""}
                        onChange={(e) => updateTaskTime(detailTask.id, e.target.value)}
                        className={`w-full rounded-lg px-3 py-2 text-base font-medium outline-none focus:ring-2 resize-none ${getTaskTextClass(detailTask.color) === "text-black" ? "bg-black/10 border border-black/20 text-black focus:ring-black/30 [color-scheme:light]" : "bg-white/10 border border-white/20 text-white focus:ring-white/30 [color-scheme:dark]"}`}
                      />
                    </div>
                  </div>
                  {getTagsFromNote(detailTask.note).length > 0 && (
                    <div className="mt-4">
                      <label className="block text-xs font-black uppercase opacity-80 mb-1.5">标签</label>
                      <div className="flex flex-wrap gap-2">
                        {getTagsFromNote(detailTask.note).map((tag) => (
                          <span
                            key={tag}
                            className={`text-xs font-black px-3 py-1 rounded-full ${getTaskTextClass(detailTask.color) === "text-black" ? "bg-black/15" : "bg-white/15"}`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="block text-xs font-black uppercase opacity-80 mb-1.5">备注</label>
                    <textarea
                      value={detailTask.note || ""}
                      onChange={(e) => updateTaskNote(detailTask.id, e.target.value)}
                      placeholder="添加备注，可用 #标签 会在上方显示"
                      rows={3}
                      className={`w-full rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 resize-none ${getTaskTextClass(detailTask.color) === "text-black" ? "bg-black/10 border border-black/20 text-black placeholder:text-black/50 focus:ring-black/30" : "bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:ring-white/30"}`}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm opacity-80">
                      {detailTask.completed ? "已完成" : "未完成"}
                    </p>
                    <button
                      type="button"
                      onClick={() => { deleteTask(detailTask.id); setDetailTaskId(null); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white text-xs font-black transition"
                      aria-label="删除任务"
                    >
                      <Trash2 size={14} strokeWidth={2.5} />
                      删除任务
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Overview：横向日期轴 */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div
                ref={overviewScrollRef}
                className="flex-1 overflow-x-auto overflow-y-auto border-t border-white/10 overview-scroll"
                style={{ scrollbarGutter: "stable" }}
              >
                <div className="inline-flex min-w-full min-h-full py-3 px-6" style={{ minWidth: dateKeys.length * PX_PER_DAY + 48 }}>
                  {dateKeys.map((dateKey) => (
                    <div key={dateKey} className="shrink-0 flex flex-col border-r border-white/10 last:border-r-0" style={{ width: PX_PER_DAY }}>
                      <div
                        className="shrink-0 w-full pt-1 pb-2 flex flex-col items-center justify-center gap-1 cursor-context-menu select-none"
                        onContextMenu={(e) => { e.preventDefault(); setDateMenu({ x: e.clientX, y: e.clientY, dateKey }); }}
                      >
                        <span className="text-xs font-black text-white/70 tabular-nums text-center w-full">{dateKey.slice(5).replace("-", "/")}</span>
                        {dateReminders[dateKey] && (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${dateReminders[dateKey] === "magenta" ? "bg-[#C2319A]" : "bg-[#7BE861]"}`} aria-hidden />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col gap-1 px-1 min-h-[280px]">
                        {(tasksByDate[dateKey] || []).map((task) => (
                          <div
                            key={task.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setDetailTaskId(task.id)}
                            onKeyDown={(e) => e.key === "Enter" && setDetailTaskId(task.id)}
                            className={`rounded-xl ${task.color} ${getTaskTextClass(task.color)} px-2 py-2 flex flex-col justify-center cursor-pointer hover:opacity-95 transition-all border ${getTaskTextClass(task.color) === "text-black" ? "border-black/10" : "border-white/10"} ${task.completed ? "grayscale" : ""}`}
                            style={{ height: TASK_BLOCK_HEIGHT, minHeight: TASK_BLOCK_HEIGHT }}
                          >
                            <p className="text-xs font-black leading-tight truncate">{task.text}</p>
                            {task.time && <p className="text-[10px] font-medium opacity-80 mt-0.5 tabular-nums">{task.time}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .agenda-scroll::-webkit-scrollbar { display: none; }
        .agenda-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .overview-scroll::-webkit-scrollbar { height: 8px; }
        .overview-scroll { scrollbar-width: thin; }
        .agenda-page-selection::selection { background: #C2319A; color: white; }
      `}} />
    </div>
  );
}
