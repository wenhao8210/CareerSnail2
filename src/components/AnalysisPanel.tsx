"use client";
import React from "react";

function getRankComment(percent: number) {
  if (percent >= 80)
    return "🎯 你已经跻身前 20%，面试官可能已经在路上了！";
  if (percent >= 60)
    return "💪 不错的竞争力，再精修一下项目成果就能冲进前排。";
  if (percent >= 40)
    return "😅 还在池子中漂着，建议优化简历表达并继续多投。";
  if (percent >= 20)
    return "🧩 当前竞争较大，建议重点打磨技能与成果量化。";
  return "🐌 目前竞争力偏弱，但别灰心。调整方向、补充项目经验，你的下一次上传可能就是蜗牛的加速点。";
}

function AnalysisPanel({ data }: { data: any }) {
  const labels = [
    "教育背景",
    "实习与项目经验",
    "技能与工具掌握",
    "表达与逻辑清晰度",
    "成就与量化指标",
  ];

  return (
    <div className="mt-10 bg-black/60 border border-gray-700 shadow-lg rounded-xl p-6 max-w-3xl w-full text-gray-200 animate-fade-in">
      <h2 className="text-xl font-semibold mb-4 text-purple-300">
        🐌 蜗牛分析报告
      </h2>
      {/* 排名与鼓励 */}
      {data.rankPercent && (
        <div className="mt-3 mb-8 text-center">
          <p className="text-lg text-gray-300 mb-2">
            🧭 当前你在所有{" "}
            <span className="text-purple-400 font-semibold">{data.total}</span> 份简历中，
            超过了{" "}
            <span className="text-green-400 font-bold">
              {data.rankPercent.toFixed(1)}%
            </span>{" "}
            的竞争者。
          </p>

          <div className="mb-8 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">
            {getRankComment(data.rankPercent)}
          </div>
        </div>

      )}

      {/* 维度分数条 */}
      <div className="space-y-4">
        {labels.map((label) => (
          <div key={label}>
            <div className="flex justify-between text-sm font-medium mb-2">
              <span>{label}</span>
              <span>{data[label].toFixed(1)}/5</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${(data[label] / 5) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 综合匹配度 */}
      <div className="mt-6">
        <div className="flex justify-between text-sm font-medium mb-1">
          <span>综合匹配度</span>
          <span>{data["综合匹配度"].toFixed(1)}/10</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-400 to-cyan-500 h-2 rounded-full transition-all"
            style={{ width: `${(data["综合匹配度"] / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* 简历总结 */}
      <div className="mt-8 leading-relaxed">
        <p className="font-semibold mb-2 text-purple-300">📋 简历总结</p>
        <p className="text-gray-300">{data["简历总结"]}</p>
      </div>

      
    </div>
  );
}
export default AnalysisPanel;
