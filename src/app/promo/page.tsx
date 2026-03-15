"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import PromoVideo from "../components/PromoVideo";
import { ArrowLeft, Sparkles, Smartphone, Monitor, Play, Download, Share2 } from "lucide-react";
import Link from "next/link";

export default function PromoPage() {
  const [isVertical, setIsVertical] = useState(true);
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
            <span className="text-sm text-gray-300 hidden sm:inline">返回</span>
          </Link>
          <div className="flex items-center gap-2">
            <motion.div
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
            <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent hidden sm:inline">
              CareerCurve 宣传片
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 横竖版切换 */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-purple-500/20">
            <button
              onClick={() => setIsVertical(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                isVertical 
                  ? "bg-purple-500 text-white" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">竖版</span>
            </button>
            <button
              onClick={() => setIsVertical(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                !isVertical 
                  ? "bg-purple-500 text-white" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">横版</span>
            </button>
          </div>

          <Link
            href="/"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all"
          >
            <span>开始使用</span>
          </Link>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="pt-24 px-4 sm:px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* 页面标题 */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                {isVertical ? "竖版宣传片" : "横版宣传片"}
              </span>
            </h1>
            <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
              {isVertical 
                ? "9:16 竖版比例，完美适配抖音/小红书等短视频平台" 
                : "16:9 横版比例，适合网页展示和横屏播放"}
            </p>
          </motion.div>

          {/* 宣传片组件 */}
          <motion.div
            className={`relative mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20 ${
              isFullscreen ? "fixed inset-4 z-50" : ""
            }`}
            style={{
              width: isVertical ? "390px" : "100%",
              maxWidth: isVertical ? "390px" : "900px",
              height: isVertical ? "692px" : isFullscreen ? "auto" : "600px"
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <PromoVideo
              onClose={isFullscreen ? () => setIsFullscreen(false) : undefined}
              autoPlay={true}
              vertical={isVertical}
            />
          </motion.div>

          {/* 操作按钮 */}
          <motion.div
            className="mt-6 flex justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-purple-500/30 text-gray-300 text-sm transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Play className="w-4 h-4" />
              <span>{isFullscreen ? "退出全屏" : "全屏播放"}</span>
            </motion.button>
            <motion.button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-sm transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download className="w-4 h-4" />
              <span>下载视频</span>
            </motion.button>
            <motion.button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-sm transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share2 className="w-4 h-4" />
              <span>分享</span>
            </motion.button>
          </motion.div>

          {/* 使用提示 */}
          <motion.div
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {[
              {
                title: "录屏制作",
                desc: "使用 OBS 或系统录屏工具录制宣传片",
                color: "purple",
              },
              {
                title: "导出高清",
                desc: "支持 1080P 高清输出，适合各平台上传",
                color: "pink",
              },
              {
                title: "自动循环",
                desc: "播放完成后自动回到开头，适合展厅展示",
                color: "blue",
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                className={`p-5 rounded-2xl bg-${item.color}-500/10 border border-${item.color}-500/30 hover:bg-${item.color}-500/20 transition-all`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.02, y: -3 }}
              >
                <h3 className={`text-base font-semibold text-${item.color}-400 mb-2`}>
                  {item.title}
                </h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* 功能亮点 */}
          <motion.div
            className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {[
              { title: "简历优化", desc: "AI 解析+能力画像", color: "purple" },
              { title: "模拟面试", desc: "JD 针对性出题", color: "pink" },
              { title: "小蜗日程", desc: "面试提醒+番茄钟", color: "blue" },
              { title: "面试复盘", desc: "录音+AI 建议", color: "green" },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                className={`p-4 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/30`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.03 }}
              >
                <h3 className={`text-sm font-semibold text-${item.color}-400 mb-1`}>
                  {item.title}
                </h3>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA 区域 */}
          <motion.div
            className="mt-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
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
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </motion.div>
            </Link>
            <p className="mt-3 text-sm text-gray-500">
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
