"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import ButtonTreasure from "@/app/components/ButtonTreasure";
import { useUser } from "@/hooks/useAuth";

const STORAGE_KEY = "snail_career_interview_notes";

type Entry = { id: string; title: string; content: string; createdAt: string };

function loadEntries(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
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
    ) as Entry[];
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const { user } = useUser();

  useEffect(() => {
    setEntries(loadEntries());
    loadedRef.current = true;
  }, []);

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

  const handleCreate = (title: string, content: string) => {
    const id = crypto.randomUUID?.() ?? `n-${Date.now()}`;
    const createdAt = new Date().toISOString();
    setEntries((prev) => [...prev, { id, title, content, createdAt }]);
    setShowNewForm(false);
    setSelectedId(id);
  };

  const handleUpdate = (id: string, title: string, content: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, title, content } : e))
    );
    setSelectedId(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("确定删除这条面试记录？")) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelectedId((sid) => (sid === id ? null : sid));
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
              <a href="/snail-island" className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-purple-400 transition rounded-b-xl" onClick={() => setMenuOpen(false)}>蜗牛岛</a>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto relative z-10 pt-40 px-4 sm:px-6 pb-8">
        <div className="max-w-2xl mx-auto">
          {selected ? (
            <DetailView
              entry={selected}
              onSave={(title, content) => handleUpdate(selected.id, title, content)}
              onDelete={() => handleDelete(selected.id)}
              onBack={() => setSelectedId(null)}
            />
          ) : showNewForm ? (
            <NewForm
              onSave={handleCreate}
              onCancel={() => setShowNewForm(false)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">面试记录</h2>
                <button
                  type="button"
                  onClick={() => setShowNewForm(true)}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 transition"
                >
                  新建
                </button>
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
          )}
        </div>
      </div>
    </div>
  );
}

function NewForm({
  onSave,
  onCancel,
}: {
  onSave: (title: string, content: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

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
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="粘贴面试或会议的 script、记录..."
        rows={10}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500/50 resize-y"
      />
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => onSave(title.trim() || "未命名", content)}
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
  onDelete,
  onBack,
}: {
  entry: Entry;
  onSave: (title: string, content: string) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={onBack} className="text-sm text-purple-400 hover:text-purple-300">
          返回列表
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (editing ? onSave(title, content) : setEditing(true))}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 transition"
          >
            {editing ? "保存" : "编辑"}
          </button>
          {editing && (
            <button type="button" onClick={() => { setTitle(entry.title); setContent(entry.content); setEditing(false); }} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-white/10">
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
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white outline-none focus:ring-2 focus:ring-purple-500/50 resize-y"
          />
        </>
      ) : (
        <>
          <h2 className="text-lg font-bold text-white mb-2">{entry.title || "未命名"}</h2>
          <p className="text-xs text-slate-400 mb-3">
            {new Date(entry.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div className="text-slate-200 whitespace-pre-wrap text-sm rounded-lg bg-white/5 p-3 border border-white/10 min-h-[200px]">
            {entry.content || "（无内容）"}
          </div>
        </>
      )}
    </div>
  );
}
