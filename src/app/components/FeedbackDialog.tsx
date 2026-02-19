"use client";

import React, { useState } from "react";

type Kind = "feedback" | "cooperation";

const CONFIG: Record<Kind, { title: string; placeholder: string; buttonLabel: string; successText: string; emptyError: string }> = {
  feedback: {
    title: "反馈",
    placeholder: "输入你的建议或问题...",
    buttonLabel: "Give feedback",
    successText: "感谢你的反馈！",
    emptyError: "请输入反馈内容",
  },
  cooperation: {
    title: "合作",
    placeholder: "请输入您的联系方式和合作事宜",
    buttonLabel: "Cooperation",
    successText: "感谢你的提交！",
    emptyError: "请输入联系方式和合作事宜",
  },
};

export default function FeedbackDialog({ kind = "feedback" }: { kind?: Kind }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const config = CONFIG[kind];

  const submit = async () => {
    const text = content.trim();
    if (!text) {
      setMessage({ type: "error", text: config.emptyError });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, type: kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: (data as { error?: string }).error || "提交失败" });
        return;
      }
      setMessage({ type: "success", text: config.successText });
      setContent("");
      setTimeout(() => {
        setOpen(false);
        setMessage(null);
      }, 1500);
    } catch {
      setMessage({ type: "error", text: "网络错误，请稍后再试" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-inherit hover:text-purple-400 transition text-left bg-transparent border-none cursor-pointer p-0"
      >
        {config.buttonLabel}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-3">{config.title}</h3>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={config.placeholder}
              rows={4}
              className="w-full rounded-lg px-3 py-2 text-sm text-white bg-white/10 border border-white/20 placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              disabled={loading}
            />
            {message && (
              <p
                className={`mt-2 text-sm ${message.type === "success" ? "text-green-400" : "text-red-400"}`}
              >
                {message.text}
              </p>
            )}
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-50 transition"
              >
                {loading ? "提交中..." : "提交"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
