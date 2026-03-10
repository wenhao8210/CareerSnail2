"use client";

import React, { useState, useEffect } from "react";

const STORAGE_KEY = "snail_career_new_feature_popup_20250311";

export default function NewFeaturePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) setShow(true);
    } catch {
      setShow(false);
    }
  }, []);

  const handleClose = () => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-gradient-to-b from-slate-900 to-slate-800 p-6 shadow-2xl text-white">
        <div className="text-center mb-5">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#C2319A]/30 text-[#E879B0] border border-[#C2319A]/40">
            3 月 11 日 上新
          </span>
        </div>
        <h2 className="text-xl font-black text-white mb-3 text-center tracking-tight">
          新功能上线
        </h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-4 text-center">
          春招季来了，我们为你准备了这些新能力：
        </p>
        <ul className="space-y-2 text-sm text-slate-200 mb-6">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C2319A] shrink-0" />
            春招投递剪贴板 — 一键填充简历信息
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C2319A] shrink-0" />
            模拟面试 — 刷题、错题本、自定义题库
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C2319A] shrink-0" />
            小蜗日程 — 任务与番茄钟 Focus 模式
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C2319A] shrink-0" />
            面试复盘 — 面试记录与考前清单
          </li>
        </ul>
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-3 rounded-xl font-bold text-white bg-[#C2319A] hover:bg-[#C2319A]/90 active:scale-[0.98] transition"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
