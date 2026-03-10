"use client";
import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useAuth";
import "./ButtonTreasure.scss";

const COIN_STORAGE_KEY = "snail_career_coin_count";
const DAILY_CLICKS_KEY = "snail_career_coin_daily";

const DAILY_CLICK_LIMIT = 30;

function getStoredCoinCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = localStorage.getItem(COIN_STORAGE_KEY);
    return v ? Math.max(0, parseInt(v, 10)) : 0;
  } catch {
    return 0;
  }
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getTodayClicks(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(DAILY_CLICKS_KEY);
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw);
    return date === getTodayStr() ? Math.max(0, parseInt(count, 10)) : 0;
  } catch {
    return 0;
  }
}

function setTodayClicks(count: number): void {
  try {
    localStorage.setItem(DAILY_CLICKS_KEY, JSON.stringify({ date: getTodayStr(), count }));
  } catch {}
}

export default function ButtonTreasure() {
  const [coins, setCoins] = useState<{ id: number }[]>([]);
  const [totalCoins, setTotalCoins] = useState(0);
  const [todayClicksState, setTodayClicksState] = useState(0);
  const [easterEggCount, setEasterEggCount] = useState(0);
  const { user } = useUser();

  useEffect(() => {
    setTotalCoins(getStoredCoinCount());
    setTodayClicksState(getTodayClicks());
  }, []);

  // 登录后拉取云端金币；若云端为空且本地有则上传
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/sync/coins");
        if (cancelled) return;
        const j = await r.json();
        if (!r.ok) return;
        const cloudCount = typeof j.coinCount === "number" ? j.coinCount : 0;
        const cloudDate = j.dailyDate ?? null;
        const cloudDaily = typeof j.dailyCount === "number" ? j.dailyCount : 0;
        const todayStr = getTodayStr();
        if (cloudCount > 0 || cloudDate || cloudDaily > 0) {
          setTotalCoins(cloudCount);
          try { localStorage.setItem(COIN_STORAGE_KEY, String(cloudCount)); } catch {}
          const dailyCount = cloudDate === todayStr ? cloudDaily : 0;
          setTodayClicksState(dailyCount);
          setTodayClicks(dailyCount);
        } else {
          const localTotal = getStoredCoinCount();
          const localDaily = getTodayClicks();
          const localDate = getTodayStr();
          if (localTotal > 0 || localDaily > 0) {
            await fetch("/api/sync/coins", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ coinCount: localTotal, dailyDate: localDate, dailyCount: localDaily }),
            });
          }
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // 登录后金币/每日点击变更时防抖上传
  useEffect(() => {
    if (!user?.id) return;
    const t = setTimeout(() => {
      fetch("/api/sync/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coinCount: totalCoins,
          dailyDate: getTodayStr(),
          dailyCount: todayClicksState,
        }),
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(t);
  }, [user?.id, totalCoins, todayClicksState]);

  const handleClick = () => {
    const current = getTodayClicks();
    if (current >= DAILY_CLICK_LIMIT) {
      alert(`🪙 今日金币已领完（${DAILY_CLICK_LIMIT} 次/天），明天再来吧～`);
      return;
    }

    const id = Date.now();
    setCoins((prev) => [...prev, { id }]);
    setTimeout(() => {
      setCoins((prev) => prev.filter((c) => c.id !== id));
    }, 1200);

    const newTotal = totalCoins + 1;
    setTotalCoins(newTotal);
    try {
      localStorage.setItem(COIN_STORAGE_KEY, String(newTotal));
    } catch {}

    const newClicks = current + 1;
    setTodayClicks(newClicks);
    setTodayClicksState(newClicks);

    const newEaster = easterEggCount + 1;
    setEasterEggCount(newEaster);
    if (newEaster >= 10) {
      alert("🎉 恭喜你发现彩蛋！简历填写插件与面试题库即将上线！");
      setEasterEggCount(0);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="button" onClick={handleClick}>
        <button />
        <span />
        <span />
        <span />
        <span />
        {coins.map((coin) => (
          <div key={coin.id} className="coin-down" />
        ))}
      </div>
      <span className="text-sm text-gray-400 whitespace-nowrap" title={`今日已点 ${todayClicksState}/${DAILY_CLICK_LIMIT} 次`}>
        🪙 金币：<span className="text-yellow-400 font-semibold">{totalCoins}</span>
        <span className="text-gray-500 text-xs ml-0.5">({todayClicksState}/{DAILY_CLICK_LIMIT})</span>
      </span>
    </div>
  );
}
