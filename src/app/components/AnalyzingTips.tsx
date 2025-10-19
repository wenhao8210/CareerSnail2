"use client";
import React, { useState, useEffect } from "react";

export default function AnalyzingTips({ seconds }: { seconds: number }) {
  const tips = [
    "💡 保持简历一页原则，重点放在最近三年经历。",
    "🚀 每个项目描述以动词开头，如 “设计”、“优化”、“主导”。",
    "📊 尽量量化成果，例如 “提升效率 30%”。",
    "🎯 根据岗位关键词微调简历，比如 AI 产品经理要强调数据驱动决策。",
    "🧩 技能部分建议分为 “专业技能” 和 “软件工具” 两类。",
    "✨ 保持排版整洁，避免过多字体颜色和阴影。",
  ];

  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // ⏳ 每 4 秒切换一次 tip，带淡入淡出动画
  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false); // 先淡出
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % tips.length);
        setFade(true); // 再淡入
      }, 500);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
      <div className="bg-gradient-to-b from-gray-900 to-black border border-purple-500/40 rounded-2xl shadow-2xl p-8 w-[420px] text-center animate-fade-in relative overflow-hidden">
        {/* 🐌 发光蜗牛动画 */}
        <div className="absolute top-2 left-0 w-full overflow-hidden">
          <div className="animate-snail inline-block text-3xl select-none">
            🐌
          </div>
        </div>


        <h2 className="text-lg font-semibold mb-4 mt-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">
          蜗牛正在分析你的简历...大致需要1分钟...
        </h2>

        {/* 💬 当前 Tip 显示区 */}
        <div className="text-gray-300 h-20 flex items-center justify-center mb-4">
          <p
            className={`text-base transition-opacity duration-700 ${fade ? "opacity-100" : "opacity-0"
              }`}
          >
            {tips[index]}
          </p>
        </div>

        <p className="text-sm text-gray-500 mt-2">
          ⏳ 已分析时间：{seconds} 秒
        </p>
      </div>
    </div>
  );
}
