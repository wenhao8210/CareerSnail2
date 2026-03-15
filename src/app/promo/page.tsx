"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import PromoVideo from "../components/PromoVideo";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function PromoPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 bg-black/40 backdrop-blur-sm border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-300">返回</span>
          </Link>
          <div className="flex items-center gap-2">
            <motion.div
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
            <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              CareerCurve 宣传片
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all"
          >
            <span>开始使用</span>
          </Link>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="pt-20 px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 页面标题 */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                3分钟了解面试闭环
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              从简历优化到面试复盘，CareerCurve 为你提供全流程智能化求职辅助
            </p>
          </motion.div>

          {/* 宣传片组件 */}
          <motion.div
            className={`relative mx-auto rounded-2xl overflow-hidden shadow-2xl ${
              isFullscreen ? "fixed inset-4 z-50" : "h-[700px]"
            }`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <PromoVideo
              onClose={isFullscreen ? () => setIsFullscreen(false) : undefined}
              autoPlay={true}
            />
          </motion.div>

          {/* 功能亮点 */}
          <motion.div
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {[
              {
                title: "简历优化",
                desc: "AI 解析简历，生成个性化能力画像",
                color: "purple",
              },
              {
                title: "模拟面试",
                desc: "基于 JD 和简历生成针对性题目",
                color: "pink",
              },
              {
                title: "小蜗日程",
                desc: "面试日期提醒，番茄钟备考",
                color: "blue",
              },
              {
                title: "面试复盘",
                desc: "录音转录 + AI 复盘建议",
                color: "green",
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                className={`p-6 rounded-2xl bg-${item.color}-500/10 border border-${item.color}-500/30 hover:bg-${item.color}-500/20 transition-all cursor-pointer`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
              >
                <h3 className={`text-lg font-semibold text-${item.color}-400 mb-2`}>
                  {item.title}
                </h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA 区域 */}
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg hover:shadow-xl hover:shadow-purple-500/30 transition-all"
            >
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                立即体验
              </motion.span>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.1 }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </motion.div>
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              免费使用，无需注册即可体验核心功能
            </p>
          </motion.div>
        </div>
      </main>

      {/* 底部装饰 */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-purple-900/20 to-transparent pointer-events-none" />
    </div>
  );
}
