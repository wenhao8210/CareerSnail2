"use client";
import { useState, useEffect } from "react";
import AnalyzingTips from "./components/AnalyzingTips";
import AnalysisPanel from "./components/AnalysisPanel";



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
  const [result, setResult] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);

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
      {/* === 顶部右上角按钮 === */}
      <button
        onClick={() =>
          alert("🚧 新功能开发中：简历填写插件与面试题库即将上线！")
        }
        className="absolute top-6 right-6 px-4 py-2 bg-black/40 border border-gray-700 rounded-xl text-sm text-gray-300 hover:text-purple-300 hover:border-purple-400 transition backdrop-blur-sm"
      >
        ✨ 敬请期待：简历填写插件 | 面试题库
      </button>
      {/* 赛博网格背景 */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(100,0,255,0.05)_0%,transparent_70%)]"></div>
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      {/* ⚡️前景内容包裹层 */}
      <div className="relative z-10 flex flex-col items-center"></div>

      {/* 顶部品牌标题 */}
      <h1 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-center">
        🐌 SNAIL CAREER｜蜗牛简历，一毫米也算前进
      </h1>


      {/* 功能引导区 */}
      <div className="text-center mb-10">
        <h2 className="text-xl font-semibold mb-2 text-white">
          3分钟 快速评估：多久能收到面试邀约
        </h2>
      </div>
      <div className="h-60" /> {/* spacer: 底部与版权之间 40px */}

     

      {/* 文件上传 */}
      <div className="relative w-full max-w-sm mx-auto mb-6 z-10">
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
       {/* 发光输入框 */}
      <div className="w-full max-w-sm mx-auto mb-2">
        <NeonSearchBar value={targetRole} onChange={setTargetRole} />
      </div>

      {/* 上传按钮 */}
      <button
        onClick={handleUpload}
        disabled={loading}
        className="mt-0 px-12 py-2.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-lg font-semibold hover:brightness-110 disabled:opacity-20"
      >

        {loading ? "🐌 蜗牛正在分析中..." : "立即测试！！！"}
      </button>

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
