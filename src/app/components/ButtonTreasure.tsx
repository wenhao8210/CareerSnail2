"use client";
import { useState } from "react";
import "./ButtonTreasure.scss";

export default function ButtonTreasure() {
  const [coins, setCoins] = useState<{ id: number }[]>([]);
  const [clickCount, setClickCount] = useState(0);

  const handleClick = () => {
    const id = Date.now();
    setCoins((prev) => [...prev, { id }]);
    setTimeout(() => {
      setCoins((prev) => prev.filter((c) => c.id !== id));
    }, 1200);

    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount === 10) {
      alert("🎉 恭喜你发现彩蛋！简历填写插件与面试题库即将上线！");
      setClickCount(0);
    }
  };

  return (
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
  );
}
