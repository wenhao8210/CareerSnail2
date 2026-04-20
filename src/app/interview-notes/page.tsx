"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { GripVertical, X } from "lucide-react";
import ButtonTreasure from "@/app/components/ButtonTreasure";
import { useUser } from "@/hooks/useAuth";

const STORAGE_KEY = "snail_career_interview_notes";
const AGENDA_TASKS_KEY = "snail_career_agenda_tasks";
const INTERVIEW_ANALYSIS_PASSED_KEY = "snail_career_interview_analysis_passed";
const LEGACY_AGENDA_ANALYSIS_PASSED_KEY = "snail_career_agenda_analysis_passed";
const INTERVIEW_QA_AI_MODEL = "deepseek-ai/DeepSeek-V3";

export type ChecklistItem = { text: string; checked: boolean };
type Entry = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  sourceTaskId?: number;
  checklist?: ChecklistItem[];
};

type AgendaTaskItem = {
  id: number;
  text: string;
  completed: boolean;
  color: string;
  date?: string;
  time?: string;
  note?: string;
  remarks?: string;
};

function getTagsFromNote(note?: string): string[] {
  if (!note?.trim()) return [];
  const matches = note.match(/#[^\s#]+/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).trim()).filter(Boolean))];
}

function loadAgendaTasks(): AgendaTaskItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AGENDA_TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((t: Record<string, unknown>) => ({
        id: Number(t.id),
        text: String(t.text ?? ""),
        completed: Boolean(t.completed),
        color: String(t.color ?? "bg-[#2D8A3E]"),
        date: t.date ? String(t.date) : undefined,
        time: t.time ? String(t.time) : undefined,
        note: t.note ? String(t.note) : undefined,
        remarks: t.remarks ? String(t.remarks) : undefined,
      }))
      .filter((t) => Number.isFinite(t.id) && t.text.trim().length > 0);
  } catch {
    return [];
  }
}

function loadAnalysisPassedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const current = localStorage.getItem(INTERVIEW_ANALYSIS_PASSED_KEY);
    const fallback = localStorage.getItem(LEGACY_AGENDA_ANALYSIS_PASSED_KEY);
    const raw = current || fallback;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = parsed.map((x) => Number(x)).filter((x) => Number.isFinite(x));
    if (!current && ids.length > 0) {
      localStorage.setItem(INTERVIEW_ANALYSIS_PASSED_KEY, JSON.stringify(ids));
    }
    return ids;
  } catch {
    return [];
  }
}

async function organizeTranscriptToQa(rawText: string): Promise<string> {
  const prompt = `你是一位面试复盘整理助手。请把下面这份面试逐字稿/记录整理成清晰的逐条 Q&A。

要求：
1. 按照问答对输出，尽量还原每一个问题与对应回答
2. 使用以下格式，不要输出 JSON：
Q1：问题
A1：回答

Q2：问题
A2：回答

3. 如果原文里有寒暄、闲聊、流程性内容，可省略
4. 如果某段看起来像追问，也单独列一个 Q&A
5. 保持简洁，不要擅自编造不存在的回答
6. 如果内容很乱，就尽量按时间顺序整理成最合理的问答结构

原始文本：
${rawText}`;

  const res = await fetch("/api/siliconflow/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: INTERVIEW_QA_AI_MODEL,
      messages: [{ role: "user" as const, content: prompt }],
      temperature: 0.2,
      max_tokens: 3000,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "整理失败");
  return String(data.choices?.[0]?.message?.content ?? "").trim() || "整理失败，未返回内容";
}

/** 新建面试记录时的默认清单项 */
const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { text: "确保过一遍常见问题", checked: false },
  { text: "热身运动", checked: false },
  { text: "确保打开面试笔记", checked: false },
  { text: "确保录音", checked: false },
  { text: "进入会议", checked: false },
  { text: "准备好gemini", checked: false },
];

function loadEntries(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (x: unknown) =>
          x &&
          typeof x === "object" &&
          "id" in x &&
          "title" in x &&
          "content" in x &&
          "createdAt" in x &&
          typeof (x as Entry).id === "string" &&
          typeof (x as Entry).title === "string" &&
          typeof (x as Entry).content === "string" &&
          typeof (x as Entry).createdAt === "string"
      )
      .map((x: Entry) => ({
        ...x,
        sourceTaskId: typeof (x as Entry).sourceTaskId === "number" ? (x as Entry).sourceTaskId : undefined,
        checklist: Array.isArray((x as Entry).checklist)
          ? (x as Entry).checklist!.map((c) =>
              c && typeof c === "object" && "text" in c && "checked" in c
                ? { text: String(c.text), checked: Boolean(c.checked) }
                : { text: "", checked: false }
            ).filter((c) => c.text)
          : DEFAULT_CHECKLIST.map((c) => ({ ...c })),
      })) as Entry[];
  } catch {
    return [];
  }
}

function saveEntries(entries: Entry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export default function InterviewNotesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [viewTab, setViewTab] = useState<"notes" | "analysis">("notes");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [draftSourceTask, setDraftSourceTask] = useState<AgendaTaskItem | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const { user } = useUser();
  const [agendaTasks, setAgendaTasks] = useState<AgendaTaskItem[]>([]);
  const [analysisPassedTaskIds, setAnalysisPassedTaskIds] = useState<number[]>([]);
  const [analysisPendingExpanded, setAnalysisPendingExpanded] = useState(false);
  const [analysisPassedExpanded, setAnalysisPassedExpanded] = useState(true);
  const [analysisDragTaskId, setAnalysisDragTaskId] = useState<number | null>(null);
  const [analysisDropBucket, setAnalysisDropBucket] = useState<"pending" | "passed" | null>(null);

  useEffect(() => {
    setEntries(loadEntries());
    setAgendaTasks(loadAgendaTasks());
    setAnalysisPassedTaskIds(loadAnalysisPassedIds());
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    const refreshAgendaData = () => {
      setAgendaTasks(loadAgendaTasks());
    };
    window.addEventListener("focus", refreshAgendaData);
    return () => window.removeEventListener("focus", refreshAgendaData);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(INTERVIEW_ANALYSIS_PASSED_KEY, JSON.stringify(analysisPassedTaskIds));
    } catch {}
  }, [analysisPassedTaskIds]);

  // 登录后拉取云端面试复盘；若云端为空且本地有则上传
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/sync/interview-notes");
        if (cancelled) return;
        const j = await r.json();
        if (!r.ok) return;
        const list = Array.isArray(j.entries) ? j.entries : [];
        if (list.length > 0) {
          const valid = list.filter(
            (x: unknown) =>
              x && typeof x === "object" && "id" in x && "title" in x && "content" in x && "createdAt" in x
          ) as Entry[];
          setEntries(valid);
          saveEntries(valid);
        } else {
          const local = loadEntries();
          if (local.length > 0) {
            await fetch("/api/sync/interview-notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entries: local }),
            });
          }
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!loadedRef.current) return;
    saveEntries(entries);
    if (user?.id) {
      const t = setTimeout(() => {
        fetch("/api/sync/interview-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries }),
        }).catch(() => {});
      }, 800);
      return () => clearTimeout(t);
    }
  }, [entries, user?.id]);

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const selected = selectedId ? entries.find((e) => e.id === selectedId) : null;
  const analysisInterviewTasks = agendaTasks.filter((t) => getTagsFromNote(t.note).includes("面试"));
  const recordedTaskIds = new Set(entries.map((e) => e.sourceTaskId).filter((id): id is number => typeof id === "number"));
  const pendingRecordTasks = analysisInterviewTasks.filter((t) => !recordedTaskIds.has(t.id));
  const passedSet = new Set(analysisPassedTaskIds);
  const analysisPendingTasks = analysisInterviewTasks.filter((t) => !passedSet.has(t.id));
  const analysisPassedTasks = analysisInterviewTasks.filter((t) => passedSet.has(t.id));
  const analysisConversionRate = analysisInterviewTasks.length > 0
    ? (analysisPassedTasks.length / analysisInterviewTasks.length) * 100
    : 0;

  useEffect(() => {
    const validIds = new Set(analysisInterviewTasks.map((t) => t.id));
    setAnalysisPassedTaskIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [analysisInterviewTasks]);

  const handleCreate = (title: string, content: string, sourceTaskId?: number) => {
    const id = crypto.randomUUID?.() ?? `n-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const checklist = DEFAULT_CHECKLIST.map((c) => ({ ...c }));
    setEntries((prev) => [...prev, { id, title, content, createdAt, sourceTaskId, checklist }]);
    setShowNewForm(false);
    setDraftSourceTask(null);
    setSelectedId(id);
  };

  const handleUpdate = (id: string, title: string, content: string, checklist?: ChecklistItem[]) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, title, content, ...(checklist != null ? { checklist } : {}) } : e
      )
    );
    setSelectedId(null);
  };

  const handleChecklistChange = (id: string, checklist: ChecklistItem[]) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, checklist } : e))
    );
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("确定删除这条面试记录？")) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelectedId((sid) => (sid === id ? null : sid));
  };

  const moveToBucket = (taskId: number, bucket: "pending" | "passed") => {
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
    if (analysisDragTaskId != null) moveToBucket(analysisDragTaskId, bucket);
    setAnalysisDragTaskId(null);
    setAnalysisDropBucket(null);
  };
  const handleAnalysisDragEnd = () => {
    setAnalysisDragTaskId(null);
    setAnalysisDropBucket(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-slate-100 flex flex-col relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(100,0,255,0.05)_0%,transparent_70%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 bg-black/40 backdrop-blur-sm border-b border-purple-500/20">
        <div className="flex flex-col gap-2 min-w-0 flex-shrink-0">
          <h1 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 whitespace-nowrap">
            🐌 SNAIL CAREER｜面试复盘
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
            <span className="hidden sm:inline">面试复盘</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 py-1.5 min-w-[160px] rounded-xl bg-black/95 border-2 border-purple-400/50 shadow-xl shadow-purple-500/20 z-50">
              <a href="/" className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-purple-400 transition rounded-t-xl" onClick={() => setMenuOpen(false)}>简历优化</a>
              <a href="/mock-interview" className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-purple-400 transition" onClick={() => setMenuOpen(false)}>模拟面试</a>
              <a href="/agenda" className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-purple-400 transition" onClick={() => setMenuOpen(false)}>小蜗日程</a>
              <a href="/interview-notes" className="block px-4 py-3 text-sm font-medium text-purple-400 bg-purple-500/15 hover:bg-purple-500/25 transition" onClick={() => setMenuOpen(false)}>面试复盘</a>
              <a href="/promo" className="block px-4 py-3 text-sm font-medium text-purple-300 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 hover:text-purple-200 transition rounded-b-xl border-t border-purple-500/20" onClick={() => setMenuOpen(false)}>
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

      <div className="flex-1 min-h-0 overflow-y-auto relative z-10 pt-40 px-4 sm:px-6 pb-8">
        <div className="max-w-2xl mx-auto">
          {selected ? (
            <DetailView
              entry={selected}
              onSave={(title, content, checklist) => handleUpdate(selected.id, title, content, checklist)}
              onChecklistChange={(checklist) => handleChecklistChange(selected.id, checklist)}
              onDelete={() => handleDelete(selected.id)}
              onBack={() => setSelectedId(null)}
            />
          ) : showNewForm ? (
            <NewForm
              initialTitle={draftSourceTask ? `${draftSourceTask.date || ""}${draftSourceTask.date ? " " : ""}${draftSourceTask.text}`.trim() : ""}
              initialContent={draftSourceTask?.remarks?.trim() || ""}
              sourceTaskId={draftSourceTask?.id}
              onSave={handleCreate}
              onCancel={() => {
                setShowNewForm(false);
                setDraftSourceTask(null);
              }}
            />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setViewTab("notes")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${viewTab === "notes" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                >
                  面试记录
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab("analysis")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${viewTab === "analysis" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
                >
                  Analysis
                </button>
              </div>

              {viewTab === "notes" ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">面试记录</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftSourceTask(null);
                        setShowNewForm(true);
                      }}
                      className="px-4 py-2 rounded-full text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 transition"
                    >
                      新建
                    </button>
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 mb-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-base font-semibold text-amber-200">待记录</h3>
                        <p className="text-sm text-slate-400 mt-1">这里显示小蜗日程里带 `#面试` tag、但还没转成复盘的内容。</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-black text-white tabular-nums">{pendingRecordTasks.length}</div>
                        <div className="text-xs text-slate-500">待整理</div>
                      </div>
                    </div>
                    {pendingRecordTasks.length === 0 ? (
                      <p className="text-sm text-slate-500">当前没有待记录的面试任务。</p>
                    ) : (
                      <ul className="space-y-2">
                        {pendingRecordTasks.map((task) => (
                          <li key={task.id}>
                            <div className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium text-white truncate">{task.text}</p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {[task.date, task.time].filter(Boolean).join(" ")}
                                  </p>
                                  {task.remarks?.trim() && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.remarks.trim()}</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDraftSourceTask(task);
                                    setShowNewForm(true);
                                  }}
                                  className="px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 transition shrink-0"
                                >
                                  去记录
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {sortedEntries.length === 0 ? (
                    <p className="text-slate-400 text-sm">暂无记录。点击「新建」添加面试日期与名称，并粘贴会议/面试记录。</p>
                  ) : (
                    <ul className="space-y-2">
                      {sortedEntries.map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(e.id)}
                            className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition"
                          >
                            <span className="font-medium text-white block truncate">{e.title || "未命名"}</span>
                            <span className="text-xs text-slate-400 mt-0.5 block">
                              {new Date(e.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <div className="w-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] gap-4 items-start">
                  <div
                    className={`rounded-2xl border transition ${analysisDropBucket === "pending" ? "border-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,0.5)]" : "border-white/10"} bg-black/30`}
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
                    <div className={`overflow-hidden transition-all duration-300 ${analysisPendingExpanded ? "max-h-[1400px] opacity-100" : "max-h-0 opacity-0"}`}>
                      <div className="px-4 pb-4 space-y-3">
                        {analysisPendingTasks.length > 0 ? analysisPendingTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`rounded-2xl border border-emerald-400/30 bg-[#2D8A3E] text-white p-4 cursor-pointer ${analysisDragTaskId === task.id ? "opacity-60" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-black/20 uppercase tracking-wide">待面试</span>
                              <span
                                draggable
                                onDragStart={(e) => handleAnalysisDragStart(e, task.id)}
                                onDragEnd={handleAnalysisDragEnd}
                                className="cursor-grab active:cursor-grabbing shrink-0 p-1 -m-1 rounded opacity-70 hover:opacity-100"
                                aria-label="拖动到已通过"
                              >
                                <GripVertical size={18} className="text-white" strokeWidth={2} />
                              </span>
                            </div>
                            <h3 className="text-base font-black leading-tight tracking-tight mt-2">{task.text}</h3>
                            {(task.date || task.time) && (
                              <p className="text-xs font-medium opacity-90 mt-1 tabular-nums">
                                📅 {[task.date, task.time].filter(Boolean).join(" ")}
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
                          </div>
                        )) : (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-slate-500">
                            这里暂时没有待面试的任务
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 px-5 py-6 text-center bg-black/30">
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
                    <p className="mt-4 text-xs leading-5 text-slate-500">把左边面试卡片拖到右边，自动统计通过数量和转化率。</p>
                  </div>

                  <div
                    className={`rounded-2xl border transition ${analysisDropBucket === "passed" ? "border-emerald-400 shadow-[0_0_0_1px_rgba(74,222,128,0.45)]" : "border-white/10"} bg-black/30`}
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
                    <div className={`overflow-hidden transition-all duration-300 ${analysisPassedExpanded ? "max-h-[1400px] opacity-100" : "max-h-0 opacity-0"}`}>
                      <div className="px-4 pb-4 space-y-3">
                        {analysisPassedTasks.length > 0 ? analysisPassedTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`rounded-2xl border border-emerald-300/40 bg-[#2D8A3E] text-white p-4 ${analysisDragTaskId === task.id ? "opacity-60" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-white/15 uppercase tracking-wide">已通过</span>
                              <span
                                draggable
                                onDragStart={(e) => handleAnalysisDragStart(e, task.id)}
                                onDragEnd={handleAnalysisDragEnd}
                                className="cursor-grab active:cursor-grabbing shrink-0 p-1 -m-1 rounded opacity-70 hover:opacity-100"
                                aria-label="拖动回待面试"
                              >
                                <GripVertical size={18} className="text-white" strokeWidth={2} />
                              </span>
                            </div>
                            <h3 className="text-base font-black leading-tight tracking-tight mt-2">{task.text}</h3>
                            {(task.date || task.time) && (
                              <p className="text-xs font-medium opacity-90 mt-1 tabular-nums">
                                📅 {[task.date, task.time].filter(Boolean).join(" ")}
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
                          </div>
                        )) : (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-slate-500">
                            通过的面试拖到这里
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NewForm({
  initialTitle,
  initialContent,
  sourceTaskId,
  onSave,
  onCancel,
}: {
  initialTitle?: string;
  initialContent?: string;
  sourceTaskId?: number;
  onSave: (title: string, content: string, sourceTaskId?: number) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialTitle || "");
  const [content, setContent] = useState(initialContent || "");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isOrganizing, setIsOrganizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(initialTitle || "");
  }, [initialTitle]);

  useEffect(() => {
    setContent(initialContent || "");
  }, [initialContent]);

  const handleTxtUpload = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setContent(String(reader.result || ""));
      setUploadedFileName(file.name);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleOrganizeQa = async () => {
    if (!content.trim()) {
      alert("请先粘贴内容或上传 txt。");
      return;
    }
    setIsOrganizing(true);
    try {
      const organized = await organizeTranscriptToQa(content);
      setContent(organized);
    } catch (e) {
      alert(e instanceof Error ? e.message : "整理失败，请稍后再试。");
    } finally {
      setIsOrganizing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">新建面试记录</h2>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400" aria-label="关闭">
          <X size={20} />
        </button>
      </div>
      <label className="block text-sm font-medium text-slate-300 mb-1">标题（面试日期和名称）</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="如：2025-02-06 百度AI产品经理面试"
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500/50 mb-4"
      />
      <label className="block text-sm font-medium text-slate-300 mb-1">内容（粘贴会议/面试记录）</label>
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={(e) => {
            handleTxtUpload(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 rounded-lg text-sm font-medium border border-white/15 text-slate-300 hover:bg-white/10 transition"
        >
          上传 txt
        </button>
        <button
          type="button"
          onClick={handleOrganizeQa}
          disabled={isOrganizing}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isOrganizing ? "整理中..." : "一键整理成 Q&A"}
        </button>
        {uploadedFileName && <span className="text-xs text-slate-500 py-2">{uploadedFileName}</span>}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="粘贴面试逐字稿 / 会议记录，或上传 txt 后一键整理成每个 Q&A"
        rows={10}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500/50 resize-y"
      />
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => onSave(title.trim() || "未命名", content, sourceTaskId)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 transition"
        >
          保存
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/10 transition">
          取消
        </button>
      </div>
    </div>
  );
}

function DetailView({
  entry,
  onSave,
  onChecklistChange,
  onDelete,
  onBack,
}: {
  entry: Entry;
  onSave: (title: string, content: string, checklist?: ChecklistItem[]) => void;
  onChecklistChange: (checklist: ChecklistItem[]) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const list = entry.checklist && entry.checklist.length > 0 ? entry.checklist : DEFAULT_CHECKLIST.map((c) => ({ ...c }));
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(list);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const next = entry.checklist && entry.checklist.length > 0 ? entry.checklist : DEFAULT_CHECKLIST.map((c) => ({ ...c }));
    setChecklist(next);
  }, [entry.id, entry.checklist]);

  const toggleCheck = (index: number) => {
    setChecklist((prev) => {
      const next = prev.map((c, i) => (i === index ? { ...c, checked: !c.checked } : c));
      if (!editing) setTimeout(() => onChecklistChange(next), 0);
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={onBack} className="text-sm text-purple-400 hover:text-purple-300">
          返回列表
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (editing ? onSave(title, content, checklist) : setEditing(true))}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 transition"
          >
            {editing ? "保存" : "编辑"}
          </button>
          {editing && (
            <button type="button" onClick={() => { setTitle(entry.title); setContent(entry.content); setChecklist(entry.checklist?.length ? entry.checklist : DEFAULT_CHECKLIST.map((c) => ({ ...c }))); setEditing(false); }} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-white/10">
              取消
            </button>
          )}
          <button type="button" onClick={onDelete} className="px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10">
            删除
          </button>
        </div>
      </div>
      {editing ? (
        <>
          <label className="block text-sm font-medium text-slate-300 mb-1">标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white outline-none focus:ring-2 focus:ring-purple-500/50 mb-4"
          />
          <label className="block text-sm font-medium text-slate-300 mb-1">内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white outline-none focus:ring-2 focus:ring-purple-500/50 resize-y mb-4"
          />
        </>
      ) : (
        <>
          <h2 className="text-lg font-bold text-white mb-2">{entry.title || "未命名"}</h2>
          <p className="text-xs text-slate-400 mb-3">
            {new Date(entry.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div className="text-slate-200 whitespace-pre-wrap text-sm rounded-lg bg-white/5 p-3 border border-white/10 min-h-[200px] mb-4">
            {entry.content || "（无内容）"}
          </div>
        </>
      )}
      {/* 面试前清单：在标题和内容下方，一项一项勾选，勾选后自动保存 */}
      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs font-medium text-slate-400 mb-2">面试前清单</p>
        <ul className="space-y-2">
          {checklist.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleCheck(i)}
                className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-500/50"
              />
              <span className={`text-sm ${item.checked ? "text-slate-500 line-through" : "text-slate-200"}`}>
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
