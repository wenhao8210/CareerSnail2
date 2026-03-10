"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        setMessage({ type: "err", text: "登录服务未配置，请在环境中设置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY" });
        return;
      }
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMessage({ type: "err", text: error.message });
          return;
        }
        router.push("/");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setMessage({ type: "err", text: error.message });
          return;
        }
        setMessage({
          type: "ok",
          text: "注册成功。若已开启邮箱验证，请先查收邮件确认后再登录。",
        });
        setPassword("");
      }
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : "登录服务未配置或出错",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(100,0,255,0.05)_0%,transparent_70%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-purple-500/20 bg-black/60 p-6 shadow-xl shadow-purple-500/10">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-center mb-6">
          🐌 SNAIL CAREER
        </h1>
        <p className="text-gray-400 text-sm text-center mb-6">
          {mode === "login" ? "登录以继续" : "注册新账号"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full bg-black/60 text-gray-100 px-4 py-2.5 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full bg-black/60 text-gray-100 px-4 py-2.5 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400/50"
            />
          </div>
          {message && (
            <p
              className={`text-sm ${
                message.type === "err" ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-medium bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white hover:brightness-110 transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "请稍候…" : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "login" ? "signup" : "login"));
            setMessage(null);
          }}
          className="w-full mt-4 text-sm text-gray-400 hover:text-purple-400 transition"
        >
          {mode === "login" ? "还没有账号？去注册" : "已有账号？去登录"}
        </button>
      </div>
    </div>
  );
}
