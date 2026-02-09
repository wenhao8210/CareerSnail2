"use client";

import React, { useMemo } from "react";
import type { AnalysisRecord } from "@/lib/historyStorage";

const CHART_PADDING = { top: 20, right: 20, bottom: 36, left: 44 };
const AXIS_COLOR = "rgba(148, 163, 184, 0.5)";
const SCORE_COLOR = "#22d3ee";
const RANK_COLOR = "#a78bfa";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatAxisDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function HistoryChart({ records }: { records: AnalysisRecord[] }) {
  const sorted = useMemo(() => {
    return [...records].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [records]);

  const { width, height } = { width: 340, height: 220 };
  const innerWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

  const scoreDomain: [number, number] = [0, 10];
  const rankDomain: [number, number] = [0, 100];

  const xScale = (dateStr: string) => {
    if (sorted.length <= 1) return CHART_PADDING.left + innerWidth / 2;
    const times = sorted.map((r) => new Date(r.date).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    const span = max - min || 1;
    const t = (new Date(dateStr).getTime() - min) / span;
    return CHART_PADDING.left + t * innerWidth;
  };

  const yScore = (score: number) => {
    const [min, max] = scoreDomain;
    const n = (score - min) / (max - min);
    const y = 1 - n;
    return CHART_PADDING.top + y * innerHeight;
  };

  const yRank = (rank: number) => {
    const [min, max] = rankDomain;
    const n = (rank - min) / (max - min);
    const y = 1 - n;
    return CHART_PADDING.top + y * innerHeight;
  };

  const scorePath =
    sorted.length > 0
      ? sorted
          .map((r, i) => `${i === 0 ? "M" : "L"} ${xScale(r.date)} ${yScore(r.score)}`)
          .join(" ")
      : "";
  const rankPath =
    sorted.length > 0 && sorted.some((r) => r.rankPercent != null)
      ? sorted
          .filter((r) => r.rankPercent != null)
          .map((r, i, arr) => {
            const x = xScale(r.date);
            const y = yRank(r.rankPercent!);
            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ")
      : "";

  const xTicks = useMemo(() => {
    if (sorted.length === 0) return [];
    if (sorted.length <= 3) return sorted.map((r) => r.date);
    const step = Math.max(1, Math.floor(sorted.length / 4));
    return sorted.filter((_, i) => i % step === 0 || i === sorted.length - 1).map((r) => r.date);
  }, [sorted]);

  return (
    <div className="w-full max-w-lg mx-auto">
      <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
        📈 历史记录 · 打分与排名
      </h3>
      <div className="bg-black/50 border border-gray-700 rounded-xl p-4">
        <svg width={width} height={height} className="overflow-visible">
          {/* Y 轴网格线 (分数 0-10) */}
          {[0, 2, 4, 6, 8, 10].map((v) => {
            const y = yScore(v);
            return (
              <line
                key={v}
                x1={CHART_PADDING.left}
                y1={y}
                x2={CHART_PADDING.left + innerWidth}
                y2={y}
                stroke={AXIS_COLOR}
                strokeDasharray="2,2"
                strokeWidth={0.5}
              />
            );
          })}
          {/* Y 轴刻度 - 分数 */}
          {[0, 5, 10].map((v) => (
            <text
              key={v}
              x={CHART_PADDING.left - 8}
              y={yScore(v)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-slate-400 text-[10px]"
            >
              {v}
            </text>
          ))}
          {/* X 轴刻度 - 日期 */}
          {xTicks.map((dateStr) => (
            <text
              key={dateStr}
              x={xScale(dateStr)}
              y={height - 12}
              textAnchor="middle"
              className="fill-slate-400 text-[10px]"
            >
              {formatAxisDate(dateStr)}
            </text>
          ))}
          {/* 分数折线 */}
          {scorePath && (
            <path
              d={scorePath}
              fill="none"
              stroke={SCORE_COLOR}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {/* 排名折线（有数据时） */}
          {rankPath && (
            <path
              d={rankPath}
              fill="none"
              stroke={RANK_COLOR}
              strokeWidth={2}
              strokeDasharray="4,3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {/* 分数数据点 */}
          {sorted.map((r) => (
            <circle
              key={r.date}
              cx={xScale(r.date)}
              cy={yScore(r.score)}
              r={4}
              fill={SCORE_COLOR}
              className="opacity-90"
            />
          ))}
          {/* 排名数据点 */}
          {sorted.filter((r) => r.rankPercent != null).map((r) => (
            <circle
              key={`rank-${r.date}`}
              cx={xScale(r.date)}
              cy={yRank(r.rankPercent!)}
              r={3}
              fill={RANK_COLOR}
              className="opacity-80"
            />
          ))}
        </svg>
        <div className="flex gap-4 justify-center mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-cyan-400" /> 综合匹配度 (0~10)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded border border-dashed border-purple-400" /> 超过%竞争者 (0~100)
          </span>
        </div>
      </div>
    </div>
  );
}
