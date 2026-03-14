"use client";

import React, { useState, useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 10_000;
const REFETCH_DELAY_AFTER_TRACK_MS = 600;

/** 从当前显示值滚动到目标值的数字动画 */
function useRollingNumber(target: number, durationMs = 800) {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef<number>();

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (target === displayRef.current) return;
    const start = displayRef.current;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      const easeOut = 1 - (1 - t) * (1 - t);
      const value = Math.round(start + (target - start) * easeOut);
      setDisplay(value);
      displayRef.current = value;
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return display;
}

export default function TodayLoginCount() {
  const [count, setCount] = useState(0);
  const display = useRollingNumber(count);

  useEffect(() => {
    const fetchCount = () => {
      fetch("/api/analytics/today-count")
        .then((r) => r.json())
        .then((data) => {
          const n = typeof data?.count === "number" ? data.count : 0;
          setCount((prev) => (n !== prev ? n : prev));
        })
        .catch(() => {});
    };
    fetchCount();
    const t = setInterval(fetchCount, POLL_INTERVAL_MS);
    const onFocus = () => fetchCount();
    const onTracked = () => {
      setTimeout(fetchCount, REFETCH_DELAY_AFTER_TRACK_MS);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchCount();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("snail-analytics-tracked", onTracked);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("snail-analytics-tracked", onTracked);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div className="inline-flex items-baseline gap-1.5 text-slate-300">
      <span className="text-sm whitespace-nowrap">今日已点击</span>
      <span className="font-black tabular-nums text-lg min-w-[2ch] text-center text-purple-300" aria-live="polite">
        {display}
      </span>
      <span className="text-sm">次</span>
    </div>
  );
}
