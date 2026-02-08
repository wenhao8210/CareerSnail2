"use client";
import { useState, useEffect, useRef } from "react";
import AnalyzingTips from "./components/AnalyzingTips";
import AnalysisPanel from "./components/AnalysisPanel";
import ButtonTreasure from "./components/ButtonTreasure";





function NeonSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (

    <div className="relative w-full max-w-md group mb-4">
      {/* 发光外框 */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-300"></div>

      {/* 主体框 */}
      <div className="relative flex items-center bg-black text-gray-300 rounded-lg border border-gray-700 px-3 py-2">
        {/* 搜索图标 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-400 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
          />
        </svg>

        <input
          type="text"
          placeholder="目标岗位（如：产品经理 / 建筑师）"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500"
        />

        {/* 滤镜图标 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-400 hover:text-purple-400 transition"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4h18M4 8h16M6 12h12M8 16h8M10 20h4"
          />
        </svg>
      </div>
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      const t = setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
      return () => {
        clearTimeout(t);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [menuOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (loading) {
      setSeconds(0);
      timer = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (!loading && seconds > 0) {
      clearInterval(timer!);
    }
    return () => clearInterval(timer!);
  }, [loading]);

  async function handleUpload() {
    if (!file) return alert("请先选择文件！");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target_role", targetRole);
      formData.append("jd", jdText);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // 🧱 错误检查
      if (!res.ok || data.error) {
        alert(data.error || "上传失败，请稍后再试。");
        setLoading(false);
        return;
      }

      // ✅ 保存 AI 分析 + 排名信息
      setResumeText(data.resumeText);
      setResult(
        JSON.stringify({
          ...JSON.parse(data.analysis),
          rankPercent: data.rankPercent,
          total: data.total,
        })
      );
    } catch (err) {
      console.error("❌ 上传出错:", err);
      alert("上传过程中出现错误，请检查网络或重试。");
    }

    setLoading(false);
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-950 to-black text-white overflow-hidden">
      {/* 顶部导航栏：左侧标题+金币 + 右侧菜单 */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 bg-black/40 backdrop-blur-sm border-b border-purple-500/20">
        <div className="flex flex-col gap-2 min-w-0 flex-shrink-0">
          <h1 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 whitespace-nowrap">
            🐌 SNAIL CAREER｜蜗牛简历
          </h1>
          <ButtonTreasure />
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="p-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-white/5 transition"
            aria-label="打开菜单"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 py-1 min-w-[140px] rounded-lg bg-gray-900/95 border border-gray-700 shadow-xl z-50">
              <a
                href="/"
                className="block px-4 py-2.5 text-sm text-purple-400 font-medium bg-purple-500/10 transition"
                onClick={() => setMenuOpen(false)}
              >
                简历优化
              </a>
              <a
                href="/mock-interview"
                className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 hover:text-purple-400 transition"
                onClick={() => setMenuOpen(false)}
              >
                模拟面试
              </a>
            </div>
          )}
        </div>
      </header>

      {/* 赛博网格背景 */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(100,0,255,0.05)_0%,transparent_70%)]"></div>
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      {/* ⚡️前景内容包裹层 */}
      <div className="relative z-10 flex flex-col items-center pt-40"></div>

      {/* 主标题（页面中部，下移避免被顶栏毛玻璃遮挡） */}
      <h2 className="text-3xl font-bold mt-8 mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-center">
        🐌 SNAIL CAREER｜蜗牛简历，一毫米也算前进
      </h2>

      {/* 副标题 */}
      <p className="text-center text-white text-lg mb-8">
        3分钟 快速评估：多久能收到面试邀约
      </p>
      <div className="h-60" /> {/* spacer: 底部与版权之间 40px */}



      {/* 文件上传 */}
      <div className="relative w-full max-w-md mx-auto mb-6 z-10">
        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />
        <label
          htmlFor="resume-upload"
          className="block cursor-pointer bg-black/70 border border-gray-700 rounded-lg p-3 text-center hover:border-purple-400 transition"
        >
          {file ? `📄 ${file.name}` : "点击选择简历文件 (.pdf / .docx)"}
        </label>
      </div>

      {/* JD 岗位描述（可选） */}
      <div className="w-full max-w-md mx-auto mb-4 z-10">
        <textarea
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="粘贴岗位描述 JD（可选，便于更精准匹配）"
          rows={4}
          className="w-full bg-black/70 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400/50 resize-y min-h-[80px]"
        />
      </div>

      {/* 发光输入框 */}
      <div className="w-full max-w-md mx-auto mb-2">
        <NeonSearchBar value={targetRole} onChange={setTargetRole} />
      </div>

      {/* 上传按钮 */}
      <div className="w-full max-w-md mx-auto">
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full mt-0 px-12 py-2.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-lg font-semibold hover:brightness-110 disabled:opacity-20"
        >

        {loading ? "🐌 蜗牛正在分析中..." : "立即测试！！！"}
        </button>
      </div>

      {/* 🐌 分析中状态（Tips 全屏遮罩） */}
      {loading && <AnalyzingTips seconds={seconds} />}

      {/* 📄 简历原文 */}
      {resumeText && !loading && (
        <div className="bg-black/60 border border-gray-700 rounded-xl p-4 max-w-3xl w-full mt-10 shadow-md">
          <h2 className="text-lg font-semibold mb-2 text-purple-300 flex items-center gap-1">
            📄 简历原文
          </h2>
          <pre className="whitespace-pre-wrap text-gray-300 text-sm max-h-72 overflow-y-auto">
            {resumeText}
          </pre>
        </div>
      )}

      {/* 📊 分析报告 */}
      {!loading && result && (
        <AnalysisPanel data={JSON.parse(result)} />
      )}
      <div className="h-60" /> {/* spacer: 底部与版权之间 40px */}

      {/* Footer */}
      <footer className="border-t border-purple-500/20 mt-20 py-10 bg-black/50 text-gray-400 text-sm">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Logo & 简介 */}
          <div>
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 mb-2">
              🐌 SNAIL CAREER
            </h2>
            <p className="text-gray-500 mb-3">蜗牛简历 | 一毫米也算前进。</p>
            <p className="text-xs text-gray-600">
              AI 简历分析与岗位匹配工具，帮助你了解求职进度与优化方向。
            </p>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Resources</h3>
            <ul className="space-y-2">
              <li><a href="https://uiverse.io" className="hover:text-purple-400 transition">UIverse.io</a></li>
              <li><a href="https://cssbuttons.io" className="hover:text-purple-400 transition">Cssbuttons.io</a></li>
              <li><a href="https://pixelrepo.com" className="hover:text-purple-400 transition">Pixelrepo.com</a></li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Information</h3>
            <ul className="space-y-2">
              <li><a href="mailto:walance821@163.com" className="hover:text-purple-400 transition">Give feedback</a></li>
              <li><a href="mailto:walance821@163.com" className="hover:text-purple-400 transition">Cooperation</a></li>
              <li><a href=" https://xhslink.com/m/8bOzZ9dlgop" target="_blank" className="hover:text-purple-400 transition">About me</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-purple-400 transition">Terms</a></li>
              <li><a href="#" className="hover:text-purple-400 transition">Privacy policy</a></li>
              <li><a href="#" className="hover:text-purple-400 transition">Disclaimer</a></li>
            </ul>
          </div>
        </div>

        {/* 底部版权 */}
        <div className="text-center text-gray-600 text-xs mt-10 border-t border-purple-500/10 pt-4">
          © 2025 SNAIL CAREER. All rights reserved. | Made with 💜 by Wenhao Wang
        </div>
      </footer>


    </main>
  );
}
