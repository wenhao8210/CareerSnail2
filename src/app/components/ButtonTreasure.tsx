"use client";
import { useState, useEffect } from "react";
import "./ButtonTreasure.scss";

const COIN_STORAGE_KEY = "snail_career_coin_count";

function getStoredCoinCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = localStorage.getItem(COIN_STORAGE_KEY);
    return v ? Math.max(0, parseInt(v, 10)) : 0;
  } catch {
    return 0;
  }
}

export default function ButtonTreasure() {
  const [coins, setCoins] = useState<{ id: number }[]>([]);
  const [totalCoins, setTotalCoins] = useState(0);
  const [easterEggCount, setEasterEggCount] = useState(0);

  useEffect(() => {
    setTotalCoins(getStoredCoinCount());
  }, []);

  const handleClick = () => {
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
      <span className="text-sm text-gray-400 whitespace-nowrap">
        🪙 金币：<span className="text-yellow-400 font-semibold">{totalCoins}</span>
      </span>
    </div>
  );
}
