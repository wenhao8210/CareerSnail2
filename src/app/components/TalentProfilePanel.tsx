"use client";
import React, { useRef, useState } from "react";
import { Share2, Download, Save, Star } from "lucide-react";
import { track } from "@/lib/analytics";

// 新 JSON 结构（五维打分，满分5分）
export interface HexagonScoresV2 {
  education: number;      // 教育背景 1-5
  experience: number;     // 实习经历 1-5
  projectDescription: number; // 项目描述 1-5
  achievements: number;   // 成就 1-5
  jobMatch: number;      // 岗位匹配度 1-5
}

const SCORE_META = [
  { key: "education", shortLabel: "学历门槛", chartLabel: "学历" },
  { key: "experience", shortLabel: "相关经历", chartLabel: "经历" },
  { key: "projectDescription", shortLabel: "项目表达", chartLabel: "表达" },
  { key: "achievements", shortLabel: "结果证明", chartLabel: "结果" },
  { key: "jobMatch", shortLabel: "岗位对口", chartLabel: "对口" },
] as const;

// 能力画像数据结构
export interface TalentProfileData {
  oneSentencePosition: string;
  summary: string;

  // 五维能力图 (1-5 分，与简历打分一致)
  hexagonScores: HexagonScoresV2;

  // 最高光一点
  topHighlight: {
    title: string;
    content: string;
  };

  // 潜在风险一点
  topRisk: {
    issue: string;
    impact: string;
  };

  talentTags: {
    direction: string;
    archetype: string;
    riskLevel: "low" | "medium" | "high";
  };

  overallMatch?: number; // 综合匹配度 1-10，用于排名
  rankPercent?: number;
  total?: number;
}

type ProfileTagMeta = {
  title: string;
  shareTitle: string;
  subtitle: string;
};

function getProfileTagMeta(scores: HexagonScoresV2): ProfileTagMeta {
  const E = scores.education;
  const X = scores.experience;
  const P = scores.projectDescription;
  const A = scores.achievements;
  const J = scores.jobMatch;
  const values = [E, X, P, A, J];
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const gap = max - min;
  const otherAvg = (X + P + A + J) / 4;

  if (avg >= 4.2 && min >= 3.9 && J >= 4.2 && A >= 4.0) {
    return {
      title: "Offer收割机",
      shareTitle: "Offer收割机",
      subtitle: "五维都在线，属于筛选里很难被一眼挑出硬伤的头部配置。",
    };
  }

  if (avg >= 3.8 && min >= 3.4 && gap <= 0.9) {
    return {
      title: "五边形战士",
      shareTitle: "五边形战士",
      subtitle: "没有特别夸张的短板，整体配置均衡，属于稳定能打的全面型选手。",
    };
  }

  if (E >= 4.4 && X <= 2.8 && P <= 2.8 && A <= 2.8 && J <= 2.8) {
    return {
      title: "高学历脆皮",
      shareTitle: "小镇做题家 Pro Max",
      subtitle: "学历门槛很亮眼，但真正影响录用的经历、结果和对口度还没立起来。",
    };
  }

  if (E >= 4.0 && min <= 2.2 && avg < 3.3) {
    return {
      title: "高学历脆皮",
      shareTitle: "高学历脆皮",
      subtitle: "底子不差，但整体结构偏脆，后续筛选容易被短板迅速放大。",
    };
  }

  if (E >= 4.0 && otherAvg >= 2.8 && otherAvg < 3.5 && J < 3.5) {
    return {
      title: "纸面学霸",
      shareTitle: "纸面学霸",
      subtitle: "学历帮你先被看到，但实战证据还不足以让招聘方迅速买单。",
    };
  }

  if (E <= 2.8 && X >= 3.5 && A >= 3.3 && J >= 3.3) {
    return {
      title: "野路子黑马",
      shareTitle: "野路子黑马",
      subtitle: "学历不是优势，但实战和结果都能撑起竞争力，属于逆袭型配置。",
    };
  }

  if (P <= 2.5 && (X >= 3.3 || A >= 3.3) && J >= 2.8) {
    return {
      title: "有货不会讲",
      shareTitle: "有货不会讲",
      subtitle: "经历或结果并不算差，但项目表达偏弱，简历没把你的价值讲明白。",
    };
  }

  if (J <= 2.2 && max >= 3.0) {
    return {
      title: "错岗硬冲型",
      shareTitle: "错岗硬冲型",
      subtitle: "不是完全没货，而是方向明显跑偏，投递时很容易先输在岗位错配。",
    };
  }

  if (A <= 2.3 && X >= 3.0 && P >= 3.0 && J >= 2.8) {
    return {
      title: "结果空心型",
      shareTitle: "结果空心型",
      subtitle: "经历看着有一些，表达也还行，但真正能站住的结果证明不够硬。",
    };
  }

  if (max < 2.8) {
    return {
      title: "全低型",
      shareTitle: "全低型",
      subtitle: "五维都还没形成明显优势，当前更像起步阶段，先补硬货比补包装更重要。",
    };
  }

  return {
    title: "待打磨型",
    shareTitle: "待打磨型",
    subtitle: "有一定基础，但暂时还没形成非常鲜明的竞争人格和记忆点。",
  };
}

// 五边形雷达图（5 维，满分 5）
function HexagonRadarV2({ scores }: { scores: HexagonScoresV2 }) {
  const size = 220;
  const center = size / 2;
  const radius = 64;
  const labels = SCORE_META.map((item) => item.chartLabel);
  const values = [
    scores.education,
    scores.experience,
    scores.projectDescription,
    scores.achievements,
    scores.jobMatch,
  ];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
    const r = (value / 5) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const labelPositions = labels.map((_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const labelRadius = radius + 28;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
    };
  });

  const dataPoints = values.map((v, i) => {
    const p = getPoint(i, v);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="drop-shadow-lg overflow-visible mt-4">
        {[0.33, 0.66, 1].map((scale, i) => (
          <polygon
            key={i}
            points={Array.from({ length: 5 }, (_, j) => {
              const angle = (Math.PI * 2 * j) / 5 - Math.PI / 2;
              return `${center + radius * scale * Math.cos(angle)},${center + radius * scale * Math.sin(angle)}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(139, 92, 246, 0.2)"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: 5 }, (_, i) => {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(139, 92, 246, 0.2)" strokeWidth={1} />
          );
        })}
        <polygon points={dataPoints} fill="rgba(139, 92, 246, 0.3)" stroke="#a78bfa" strokeWidth={2} />
        {values.map((v, i) => {
          const p = getPoint(i, v);
          return (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#c4b5fd" stroke="#8b5cf6" strokeWidth={2} />
          );
        })}
        {labels.map((label, i) => (
          <text key={i} x={labelPositions[i].x} y={labelPositions[i].y} textAnchor="middle" dominantBaseline="middle" fill="#c4b5fd" fontSize={11} fontWeight={500}>
            {label}
          </text>
        ))}
      </svg>
      <div className="grid grid-cols-5 gap-2 mt-4 text-xs">
        {SCORE_META.map((item, i) => (
          <div key={item.key} className="flex flex-col items-center">
            <span className="text-slate-400">{item.shortLabel}</span>
            <span className="text-purple-300 font-semibold">{values[i].toFixed(1)}/5</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShareCardRadar({ scores }: { scores: HexagonScoresV2 }) {
  const size = 180;
  const center = size / 2;
  const radius = 48;
  const labels = SCORE_META.map((item) => item.chartLabel);
  const values = [
    scores.education,
    scores.experience,
    scores.projectDescription,
    scores.achievements,
    scores.jobMatch,
  ];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
    const r = (value / 5) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const labelPositions = labels.map((_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const labelRadius = radius + 20;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
    };
  });

  const points = values.map((v, i) => {
    const p = getPoint(i, v);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {[0.33, 0.66, 1].map((scale) => (
          <polygon
            key={scale}
            points={Array.from({ length: 5 }, (_, j) => {
              const angle = (Math.PI * 2 * j) / 5 - Math.PI / 2;
              return `${center + radius * scale * Math.cos(angle)},${center + radius * scale * Math.sin(angle)}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(196, 181, 253, 0.2)"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: 5 }, (_, i) => {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(196, 181, 253, 0.18)" strokeWidth={1} />;
        })}
        <polygon points={points} fill="rgba(167, 139, 250, 0.28)" stroke="#c4b5fd" strokeWidth={2} />
        {values.map((v, i) => {
          const p = getPoint(i, v);
          return <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#ddd6fe" stroke="#8b5cf6" strokeWidth={1.5} />;
        })}
        {labels.map((label, i) => (
          <text key={i} x={labelPositions[i].x} y={labelPositions[i].y} textAnchor="middle" dominantBaseline="middle" fill="#e9d5ff" fontSize={10} fontWeight={500}>
            {label}
          </text>
        ))}
      </svg>
      <div className="grid grid-cols-5 gap-1 mt-2 text-[10px] text-center">
        {SCORE_META.map((item, i) => (
          <div key={item.key}>
            <div className="text-slate-400">{item.chartLabel}</div>
            <div className="text-purple-200 font-semibold">{values[i].toFixed(1)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankDistributionCard({ data }: { data: TalentProfileData }) {
  const percentile = Math.max(0, Math.min(100, data.rankPercent ?? 0));
  const total = Math.max(1, Math.round(data.total ?? 1));
  const estimatedRank = Math.max(1, Math.round(((100 - percentile) / 100) * total) + 1);
  const width = 640;
  const height = 220;
  const paddingX = 36;
  const baselineY = 170;
  const usableWidth = width - paddingX * 2;
  const markerX = paddingX + (percentile / 100) * usableWidth;

  const gaussianY = (xRatio: number) => {
    const x = xRatio * 6 - 3;
    const y = Math.exp(-(x * x) / 2);
    return baselineY - y * 95;
  };

  const curvePoints = Array.from({ length: 80 }, (_, i) => {
    const ratio = i / 79;
    const x = paddingX + ratio * usableWidth;
    const y = gaussianY(ratio);
    return `${x},${y}`;
  }).join(" ");

  const markerRatio = percentile / 100;
  const markerY = gaussianY(markerRatio);

  return (
    <div className="bg-black/60 border border-gray-700 rounded-xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2"><span>📈</span> 竞争位置分布</h3>
          <p className="text-xs text-slate-500 mt-1">基于当前累计样本估算你在整体用户中的大概位置</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">约排第 <span className="text-white font-semibold">{estimatedRank}</span> / {total}</div>
          <div className="text-xs text-purple-300 mt-1">超过 {percentile.toFixed(1)}% 的同类型竞争对手</div>
        </div>
      </div>

      <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 via-black/20 to-blue-950/30 p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[560px]">
          <defs>
            <linearGradient id="bell-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(168,85,247,0.28)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.03)" />
            </linearGradient>
            <linearGradient id="bell-line" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>

          <line x1={paddingX} y1={baselineY} x2={width - paddingX} y2={baselineY} stroke="rgba(148,163,184,0.25)" strokeWidth="1" />
          <polygon
            points={`${paddingX},${baselineY} ${curvePoints} ${width - paddingX},${baselineY}`}
            fill="url(#bell-fill)"
          />
          <polyline
            points={curvePoints}
            fill="none"
            stroke="url(#bell-line)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {[0, 25, 50, 75, 100].map((tick) => {
            const x = paddingX + (tick / 100) * usableWidth;
            return (
              <g key={tick}>
                <line x1={x} y1={baselineY} x2={x} y2={baselineY + 8} stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
                <text x={x} y={baselineY + 24} textAnchor="middle" fill="#94a3b8" fontSize="11">
                  {tick === 0 ? "后段" : tick === 50 ? "中位" : tick === 100 ? "前段" : `${tick}%`}
                </text>
              </g>
            );
          })}

          <line x1={markerX} y1={baselineY} x2={markerX} y2={markerY - 10} stroke="#f472b6" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx={markerX} cy={markerY} r="6" fill="#f9a8d4" stroke="#ec4899" strokeWidth="2" />
          <rect x={Math.max(paddingX, Math.min(markerX - 70, width - paddingX - 140))} y={18} width="140" height="44" rx="10" fill="rgba(15,23,42,0.9)" stroke="rgba(236,72,153,0.45)" />
          <text x={Math.max(paddingX, Math.min(markerX, width - paddingX))} y={36} textAnchor="middle" fill="#f5d0fe" fontSize="12" fontWeight="600">
            我在这个位置
          </text>
          <text x={Math.max(paddingX, Math.min(markerX, width - paddingX))} y={52} textAnchor="middle" fill="#c4b5fd" fontSize="11">
            超过 {percentile.toFixed(1)}%
          </text>
        </svg>
      </div>
    </div>
  );
}

// 分享卡片（无技能标签）
function ShareCard({ data }: { data: TalentProfileData }) {
  const rankText = Math.max(0, Math.round(data.rankPercent ?? 0));
  const profileTag = getProfileTagMeta(data.hexagonScores);

  return (
    <div className="bg-gradient-to-br from-purple-950/80 via-slate-950 to-blue-950/70 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-[0_20px_60px_rgba(76,29,149,0.28)]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🐌</span>
        <span className="text-sm text-purple-300 font-medium">51JOBSNAIL · 分享卡片</span>
      </div>
      <h3 className="text-lg font-bold text-white leading-snug">
        我超过了{rankText}%的同类型竞争对手，快来试试吧
      </h3>
      <p className="text-xs text-slate-400 mt-2 mb-4">目标方向：{data.talentTags.direction}</p>

      <div className="rounded-xl border border-purple-500/20 bg-white/5 p-4 mb-4">
        <div className="text-xs text-purple-300 mb-2">我的定位画像 exp：</div>
        <div className="text-sm text-white leading-6">{data.oneSentencePosition}</div>
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-black/20 p-4">
        <div className="text-xs text-blue-300 mb-1">我的五维筛选图谱</div>
        <div className="text-sm text-white font-semibold mb-3">{profileTag.shareTitle}</div>
        <ShareCardRadar scores={data.hexagonScores} />
      </div>

      <div className="text-xs text-slate-500 mt-4">3分钟生成你的能力画像 → 51jobsnail.chat</div>
    </div>
  );
}

// 标准化 LLM 输出，兼容新旧格式
function normalizeProfileData(raw: unknown): TalentProfileData | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const oneSentencePosition = typeof o.oneSentencePosition === "string" ? o.oneSentencePosition : "";
  const summary = typeof o.summary === "string" ? o.summary : "";
  const talentTags = o.talentTags as Record<string, unknown> | undefined;
  const direction = typeof talentTags?.direction === "string" ? talentTags.direction : "";
  const archetype = typeof talentTags?.archetype === "string" ? talentTags.archetype : "综合型";
  const riskLevel = (talentTags?.riskLevel as "low" | "medium" | "high") || "medium";

  // 五维分数
  const hs = o.hexagonScores as Record<string, unknown> | undefined;
  const hexagonScores: HexagonScoresV2 = {
    education: typeof hs?.education === "number" ? hs.education : 3,
    experience: typeof hs?.experience === "number" ? hs.experience : 3,
    projectDescription: typeof hs?.projectDescription === "number" ? hs.projectDescription : 3,
    achievements: typeof hs?.achievements === "number" ? hs.achievements : 3,
    jobMatch: typeof hs?.jobMatch === "number" ? hs.jobMatch : 3,
  };

  // 兼容旧版六维格式
  if (typeof (hs as any)?.expression === "number") {
    const old = hs as any;
    hexagonScores.education = old.expression ?? hexagonScores.education;
    hexagonScores.experience = old.execution ?? hexagonScores.experience;
    hexagonScores.projectDescription = old.structuredThinking ?? hexagonScores.projectDescription;
    hexagonScores.achievements = old.businessUnderstanding ?? hexagonScores.achievements;
    hexagonScores.jobMatch = (old.techUnderstanding ?? old.learningAgility ?? 3) / 2;
  }

  // topHighlight
  const th = o.topHighlight as Record<string, unknown> | undefined;
  const topHighlight = {
    title: typeof th?.title === "string" ? th.title : "核心经历",
    content: typeof th?.content === "string" ? th.content : "",
  };
  if (!topHighlight.content && Array.isArray(o.keyExperiences) && o.keyExperiences.length > 0) {
    const first = o.keyExperiences[0] as Record<string, unknown>;
    topHighlight.title = typeof first?.title === "string" ? first.title : topHighlight.title;
    topHighlight.content = [first?.highlight, first?.evidence].filter(Boolean).join(" ");
  }

  // topRisk
  const tr = o.topRisk as Record<string, unknown> | undefined;
  let topRisk = {
    issue: typeof tr?.issue === "string" ? tr.issue : "",
    impact: typeof tr?.impact === "string" ? tr.impact : "",
  };
  if (!topRisk.issue && Array.isArray(o.risks) && o.risks.length > 0) {
    const first = o.risks[0] as Record<string, unknown>;
    topRisk = {
      issue: typeof first?.issue === "string" ? first.issue : "",
      impact: typeof first?.impact === "string" ? first.impact : "",
    };
  }

  if (!oneSentencePosition && !summary) return null;

  return {
    oneSentencePosition: oneSentencePosition || "待补充",
    summary: summary || "待补充",
    hexagonScores,
    topHighlight,
    topRisk,
    talentTags: { direction, archetype, riskLevel },
    overallMatch: typeof o.overallMatch === "number" ? o.overallMatch : undefined,
    rankPercent: typeof o.rankPercent === "number" ? o.rankPercent : undefined,
    total: typeof o.total === "number" ? o.total : undefined,
  };
}

export default function TalentProfilePanel({ data: rawData, onSave, onShare }: { data: TalentProfileData; onSave?: () => void; onShare?: () => void }) {
  const data = normalizeProfileData(rawData as unknown) ?? rawData;
  const [showCopied, setShowCopied] = useState(false);
  const profileTag = getProfileTagMeta(data.hexagonScores);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleShare = () => {
    track("profile_share_clicked", { archetype: data.talentTags.archetype });
    const shareText = `【我的AI能力画像】\n\n我超过了${Math.max(0, Math.round(data.rankPercent ?? 0))}%的同类型竞争对手，快来试试吧\n\n我的图谱判词：${profileTag.shareTitle}\n我的定位画像 exp：${data.oneSentencePosition}\n\n3分钟生成你的专属画像 👉 51jobsnail.chat`;
    navigator.clipboard.writeText(shareText).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
    onShare?.();
  };

  const handleDownloadPdf = () => {
    track("profile_pdf_downloaded");

    const target = exportRef.current;
    if (!target) {
      alert("报告内容尚未准备好，请稍后再试。");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      alert("无法打开打印窗口，请检查浏览器是否拦截了弹窗。");
      return;
    }

    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>能力画像报告</title>
          ${styleTags}
          <style>
            body {
              margin: 0;
              padding: 24px;
              background: #050816;
              color: #e5e7eb;
              font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
            }
            .print-shell {
              max-width: 1080px;
              margin: 0 auto;
            }
            button {
              display: none !important;
            }
            @page {
              size: A4;
              margin: 12mm;
            }
          </style>
        </head>
        <body>
          <div class="print-shell">${target.outerHTML}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();

    const triggerPrint = () => {
      printWindow.print();
    };

    if (printWindow.document.readyState === "complete") {
      setTimeout(triggerPrint, 200);
    } else {
      printWindow.onload = () => setTimeout(triggerPrint, 200);
    }
  };

  const riskColors = { low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", medium: "text-amber-400 bg-amber-500/10 border-amber-500/30", high: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
  const riskLabels = { low: "低风险", medium: "中风险", high: "高风险" };

  return (
    <div ref={exportRef} className="mt-10 space-y-8 max-w-4xl w-full mx-auto">
      {/* 核心定位 */}
      <div className="bg-gradient-to-br from-purple-900/30 via-black/60 to-blue-900/30 border border-purple-500/30 rounded-2xl p-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm mb-4">
          <Star size={14} />
          <span>核心定位</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 mb-4">
          {data.oneSentencePosition}
        </h2>
        <p className="text-slate-300 leading-relaxed max-w-2xl mx-auto">{data.summary}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <span className={`px-3 py-1 rounded-full text-sm border ${riskColors[data.talentTags.riskLevel]}`}>{riskLabels[data.talentTags.riskLevel]}</span>
          <span className="px-3 py-1 rounded-full text-sm bg-blue-500/10 border border-blue-500/30 text-blue-300">{data.talentTags.archetype}</span>
          <span className="px-3 py-1 rounded-full text-sm bg-purple-500/10 border border-purple-500/30 text-purple-300">{data.talentTags.direction}</span>
        </div>
      </div>

      <RankDistributionCard data={data} />

      {/* 五维能力图 + 高光/风险 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black/60 border border-gray-700 rounded-xl p-6">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs mb-4">
            图谱判词
          </div>
          <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2"><span>🎯</span> {profileTag.title}</h3>
          <p className="text-sm text-slate-400 mb-2 leading-6">{profileTag.subtitle}</p>
          <HexagonRadarV2 scores={data.hexagonScores} />
        </div>
        <div className="bg-black/60 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-purple-300 mb-5 flex items-center gap-2"><span>💎</span> 高光与短板</h3>
          <div className="space-y-5">
            <div className="border-l-2 border-purple-500/50 pl-4">
              <div className="text-xs text-slate-400 mb-2">核心经历高光</div>
              <h4 className="text-white font-medium mb-1">{data.topHighlight.title}</h4>
              <p className="text-sm text-purple-300 leading-6">{data.topHighlight.content}</p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="text-xs text-slate-400 mb-2">潜在风险与短板</div>
              <h4 className="text-amber-300 font-medium mb-2 text-sm">{data.topRisk.issue}</h4>
              <p className="text-xs text-slate-400 leading-6">{data.topRisk.impact}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 分享卡片预览 */}
      <div className="bg-black/40 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-purple-300 mb-4">分享卡片预览</h3>
        <div className="flex justify-center -mt-1">
          <ShareCard data={data} />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        <button onClick={handleShare} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white rounded-xl font-medium hover:brightness-110 transition">
          <Share2 size={18} />
          {showCopied ? "已复制分享文案" : "分享我的画像"}
        </button>
        <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-6 py-3 bg-black/60 border border-purple-500/50 text-purple-300 rounded-xl font-medium hover:bg-purple-500/10 transition">
          <Download size={18} />
          下载 PDF
        </button>
        <button onClick={onSave} className="flex items-center gap-2 px-6 py-3 bg-black/60 border border-gray-600 text-slate-300 rounded-xl font-medium hover:bg-white/5 transition">
          <Save size={18} />
          保存记录
        </button>
      </div>
      <p className="text-center text-xs text-slate-500">截图上方分享卡片，或直接复制文案发到小红书/朋友圈/求职群</p>
    </div>
  );
}
