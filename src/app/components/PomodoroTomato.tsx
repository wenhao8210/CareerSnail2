"use client";

import React, { useState, useEffect, useRef } from "react";
import { RotateCcw, Zap, Maximize2, Minimize2 } from "lucide-react";

const SketchFilters = () => (
  <svg style={{ position: "absolute", width: 0, height: 0 }}>
    <filter id="handDrawn" x="-50%" y="-50%" width="200%" height="200%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={4} result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale={5} />
    </filter>
  </svg>
);

type TomatoSize = "small" | "medium" | "large";

const SketchedTomato = ({
  size = "medium",
  rotation = 0,
  opacity = 1,
}: {
  size?: TomatoSize;
  rotation?: number;
  opacity?: number;
}) => {
  const configs: Record<TomatoSize, { scale: number; path: string }> = {
    small: { scale: 0.85, path: "M15,40 C10,25 35,15 65,20 C85,25 90,50 70,70 C50,85 10,75 15,50 C18,45 20,45 15,40" },
    medium: { scale: 1.0, path: "M35,15 C15,10 5,40 20,75 C35,105 85,95 90,65 C95,35 70,5 45,10 C40,12 38,13 35,15" },
    large: { scale: 1.2, path: "M25,20 C5,25 5,75 30,90 C55,105 95,95 100,60 C105,25 80,5 45,10 C35,12 30,15 25,20" },
  };
  const config = configs[size];

  return (
    <g transform={`translate(120, 120) rotate(${rotation}) scale(${config.scale}) translate(-50, -50)`}>
      <path d={config.path} fill="#E31E24" style={{ opacity }} />
      <path d={config.path} fill="none" stroke="#B91C1C" strokeWidth={1.5} strokeDasharray="2 6" style={{ opacity }} />
      <path d={config.path} fill="none" stroke="#000" strokeWidth={3.5} strokeLinecap="round" filter="url(#handDrawn)" style={{ opacity }} />
      <path d="M50,25 L58,5 M50,25 L38,12 M50,25 L70,18 M50,25 L45,30" stroke="#166534" strokeWidth={5} strokeLinecap="round" style={{ opacity }} />
    </g>
  );
};

const SketchedHorse = ({
  isActive,
  isLooking,
  showFeedback,
}: {
  isActive: boolean;
  isLooking: boolean;
  showFeedback: boolean;
}) => {
  const eyesOpen = isActive || isLooking;

  return (
    <div className="absolute right-[2%] top-[8%] w-[280px] h-[400px] pointer-events-none z-30 overflow-visible text-slate-900">
      {showFeedback && (
        <div
          className="absolute top-8 -left-12 bg-white border-4 border-black px-6 py-3 rounded-[24px] font-black text-2xl italic shadow-[6px_6px_0px_#000] animate-bounce z-50"
          style={{ filter: "url(#handDrawn)" }}
        >
          Good Job!
          <div className="absolute -bottom-4 right-8 w-6 h-6 bg-white border-r-4 border-b-4 border-black rotate-45" />
        </div>
      )}

      <svg viewBox="0 0 350 500" className="w-full h-full overflow-visible">
        <g filter="url(#handDrawn)">
          <path d="M265,150 L300,120 L285,160 L320,150 L295,210 L330,200 L300,260 L335,270 L295,330 L310,340 L280,380 Z" fill="#333" stroke="#000" strokeWidth={3} strokeLinejoin="round" />
          <path d="M310,500 L310,220 Q290,160 270,140 C240,110 230,120 225,135 Q215,200 230,350 Q240,430 280,500" fill="#FDB863" stroke="#000" strokeWidth={4} strokeLinecap="round" />
          <path d="M210,75 C170,55 135,75 120,105 L100,275 C95,305 110,345 160,355 C210,365 235,325 240,295 L245,145 C250,105 230,85 210,75" fill="#FDB863" stroke="#000" strokeWidth={4} />
          <path d="M225,85 L255,10 L265,95 Z" fill="#FDB863" stroke="#000" strokeWidth={4} />
          <path d="M185,75 L165,5 L145,105 Z" fill="#FDB863" stroke="#000" strokeWidth={4} />
          {eyesOpen ? (
            <>
              <g className={isActive ? "animate-blink-1min" : ""}>
                <circle cx="140" cy="155" r="32" fill="#FFF" stroke="#000" strokeWidth={3} />
                <circle cx="150" cy="160" r="10" fill="#000" />
                <circle cx="210" cy="145" r="30" fill="#FFF" stroke="#000" strokeWidth={3} />
                <circle cx="215" cy="150" r="9" fill="#000" />
              </g>
              {isActive && (
                <g className="animate-blink-lid-1min opacity-0">
                  <path d="M115,160 Q140,145 165,160" fill="none" stroke="#000" strokeWidth={5} strokeLinecap="round" />
                  <path d="M185,150 Q210,135 235,150" fill="none" stroke="#000" strokeWidth={5} strokeLinecap="round" />
                </g>
              )}
            </>
          ) : (
            <g>
              <path d="M115,160 Q140,150 165,160" fill="none" stroke="#000" strokeWidth={4} strokeLinecap="round" />
              <path d="M185,150 Q210,140 235,150" fill="none" stroke="#000" strokeWidth={4} strokeLinecap="round" />
            </g>
          )}
          <path d="M105,285 Q95,315 120,345 Q150,370 190,355 Q220,340 215,305 Q210,265 160,275 Q110,285 105,285" fill="#F48FB1" stroke="#000" strokeWidth={3} />
          <circle cx="130" cy="330" r="6" fill="#000" />
          <circle cx="170" cy="325" r="6" fill="#000" />
          <path d="M130,355 Q170,370 220,335" fill="none" stroke="#000" strokeWidth={3} strokeLinecap="round" />
          <path d="M210,75 L225,35 M190,65 L180,25" fill="none" stroke="#000" strokeWidth={3} />
          <g
            className={`transition-all duration-700 ease-out ${showFeedback ? "translate-x-0 rotate-0 opacity-100" : "translate-x-64 rotate-12 opacity-0"}`}
            style={{ transformOrigin: "bottom right" }}
          >
            <path d="M110,480 Q90,380 50,330" fill="#FDB863" stroke="#000" strokeWidth={5} />
            <path d="M50,330 Q30,310 50,290 Q70,270 90,290 L100,310" fill="#FDB863" stroke="#000" strokeWidth={3} />
            <path d="M50,290 Q40,250 60,240 Q80,230 75,270" fill="#FDB863" stroke="#000" strokeWidth={3} />
            <path d="M65,295 L85,295 M68,310 L88,310" fill="none" stroke="#000" strokeWidth={2} />
          </g>
        </g>
      </svg>
    </div>
  );
};

type TrayItem = { size: TomatoSize; x: number; y: number; rotation: number; dropId: number };
type GroundItem = { id: string; size: TomatoSize; x: number; y: number; rotation: number };
type DragItem = (TrayItem | GroundItem) & { x: number; y: number; isFromTray: boolean; tilt: number };

const weights: Record<TomatoSize, number> = { small: 7, medium: 12, large: 20 };
const radii: Record<TomatoSize, number> = { small: 28, medium: 34, large: 40 };

/** 生成简单混响用 impulse response（指数衰减） */
function createReverbIR(ctx: AudioContext, durationSec: number, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const v = Math.exp(-t * decay) * (Math.random() * 2 - 1) * 0.5;
    L[i] = v;
    R[i] = v * 0.7;
  }
  L[0] = R[0] = 0.3;
  return buffer;
}

/** 番茄完成时播放带混响、延音、和弦的结束旋律 */
function playTomatoCompleteSound(): void {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const noteDuration = 0.5;
    const gap = 0.08;
    const gainLevel = 0.11;
    const release = 0.45;
    const rootNotes = [523.25, 659.25, 783.99, 1046.5, 783.99];
    const chordRatios = [1, 5 / 4, 3 / 2];

    const reverbBuffer = createReverbIR(ctx, 0.7, 8);
    const convolver = ctx.createConvolver();
    convolver.buffer = reverbBuffer;
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.45;
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.65;

    let time = 0;
    rootNotes.forEach((rootFreq) => {
      chordRatios.forEach((ratio) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(dryGain);
        gain.connect(convolver);
        osc.frequency.value = rootFreq * ratio;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(gainLevel, time + 0.03);
        gain.gain.setValueAtTime(gainLevel, time + noteDuration - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + noteDuration + release);
        osc.start(time);
        osc.stop(time + noteDuration + release);
      });
      time += noteDuration + gap;
    });

    dryGain.connect(ctx.destination);
    convolver.connect(reverbGain);
    reverbGain.connect(ctx.destination);
  } catch {}
}

/** TTS 播报 "Good job" */
function speakGoodJob(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    const u = new SpeechSynthesisUtterance("Good job");
    u.lang = "en-US";
    u.rate = 0.9;
    u.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

export default function PomodoroTomato({ currentTaskName }: { currentTaskName?: string }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFastSpeed, setIsFastSpeed] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLooking, setIsLooking] = useState(false);
  const [trayItems, setTrayItems] = useState<TrayItem[]>([]);
  const [groundTomatoes, setGroundTomatoes] = useState<GroundItem[]>([]);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [compression, setCompression] = useState(0);
  const trayRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevWeightRef = useRef(0);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalWeightInTray = trayItems.reduce((acc, item) => acc + weights[item.size], 0);

  const fillGroundPool = () => {
    const sizes: TomatoSize[] = ["small", "medium", "large"];
    const count = 25;
    const pool: GroundItem[] = [];
    for (let i = 0; i < count; i++) {
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      pool.push({
        id: `ground-${Date.now()}-${i}`,
        size,
        x: 5 + Math.random() * 90,
        y: 10 + Math.random() * 75,
        rotation: Math.random() * 360,
      });
    }
    setGroundTomatoes(pool);
  };

  useEffect(() => {
    fillGroundPool();
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!bgMusicRef.current) bgMusicRef.current = new Audio("/TomatoSound.m4a");
    const el = bgMusicRef.current;
    if (isActive) {
      el.currentTime = 0;
      el.loop = true;
      el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
    }
    return () => {
      el.pause();
    };
  }, [isActive]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  useEffect(() => {
    if (!isActive) {
      const diff = totalWeightInTray - prevWeightRef.current;
      if (diff !== 0) {
        setTimeLeft((prev) => Math.max(0, prev + diff * 60));
        prevWeightRef.current = totalWeightInTray;
      }
    }
  }, [totalWeightInTray, isActive]);

  const getItemOpacity = (index: number) => {
    if (!isActive || index < trayItems.length - 1) return 1;
    const weightBelow = trayItems.slice(0, -1).reduce((acc, item) => acc + weights[item.size], 0) * 60;
    const currentItemDuration = weights[trayItems[index].size] * 60;
    const currentProgress = (timeLeft - weightBelow) / currentItemDuration;
    return Math.max(0, Math.min(1, currentProgress));
  };

  useEffect(() => {
    if (isActive && trayItems.length > 0) {
      const beforeLastWeight = trayItems.slice(0, -1).reduce((acc, item) => acc + weights[item.size], 0);
      if (timeLeft <= beforeLastWeight * 60) {
        prevWeightRef.current = beforeLastWeight;
        setTrayItems((prev) => {
          if (prev.length > 0) {
            setShowFeedback(true);
            setTimeout(() => setShowFeedback(false), 15000);
            playTomatoCompleteSound();
            speakGoodJob();
          }
          return prev.slice(0, -1);
        });
      }
    }
  }, [timeLeft, isActive]);

  const calculateRestingPosition = (newX: number, items: TrayItem[], currentDrag: DragItem) => {
    const rNew = radii[currentDrag.size];
    let finalY = 115 - rNew;
    items.forEach((item) => {
      const rItem = radii[item.size];
      const dx = Math.abs(item.x - newX);
      const combinedRadius = rNew + rItem;
      if (dx < combinedRadius) {
        const dy = Math.sqrt(Math.pow(combinedRadius, 2) - Math.pow(dx, 2));
        const potentialY = item.y - dy;
        if (potentialY < finalY) finalY = potentialY;
      }
    });
    return finalY;
  };

  const applyPressure = () => {
    setCompression(15);
    setTimeout(() => setCompression(0), 150);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        const speed = isFastSpeed ? 30 : 1;
        setTimeLeft((prev) => Math.max(0, prev - speed));
      }, 1000);
    } else if (timeLeft <= 0 && isActive) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 3000);
      setIsActive(false);
      playTomatoCompleteSound();
      speakGoodJob();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, isFastSpeed]);

  const startDrag = (item: TrayItem | GroundItem, isFromTray: boolean, e: React.MouseEvent | React.TouchEvent) => {
    if (isActive) return;
    e.preventDefault();
    e.stopPropagation();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragItem({ ...item, x: clientX, y: clientY, isFromTray, tilt: 0 });
    if (isFromTray && "dropId" in item) {
      setTrayItems((prev) => prev.filter((t) => t.dropId !== item.dropId));
    } else if ("id" in item) {
      setGroundTomatoes((prev) => prev.filter((t) => t.id !== item.id));
    }
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragItem) return;
      const clientX = "touches" in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      const dx = clientX - (dragItem.x ?? 0);
      setDragItem((prev) => (prev ? { ...prev, x: clientX, y: clientY, tilt: Math.max(-20, Math.min(20, dx * 0.5)) } : null));
    };

    const handleEnd = () => {
      if (!dragItem || !trayRef.current || !groundRef.current) {
        setDragItem(null);
        return;
      }
      const trayRect = trayRef.current.getBoundingClientRect();
      if (dragItem.x > trayRect.left && dragItem.x < trayRect.right && dragItem.y > trayRect.top - 150 && dragItem.y < trayRect.bottom) {
        const relativeX = Math.max(80, Math.min(trayRect.width - 80, dragItem.x - trayRect.left));
        const finalY = calculateRestingPosition(relativeX, trayItems, dragItem);
        setTrayItems((prev) => [...prev, { ...dragItem, x: relativeX, y: finalY, dropId: Date.now() }]);
        applyPressure();
        setIsLooking(true);
        setTimeout(() => setIsLooking(false), 2000);
      } else {
        const groundRect = groundRef.current.getBoundingClientRect();
        const relX = ((dragItem.x - groundRect.left) / groundRect.width) * 100;
        const relY = ((dragItem.y - groundRect.top) / groundRect.height) * 100;
        setGroundTomatoes((prev) => [
          ...prev,
          { ...dragItem, id: `ground-${Date.now()}`, x: Math.max(5, Math.min(95, relX)), y: Math.max(10, Math.min(85, relY)) },
        ]);
      }
      setDragItem(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [dragItem, trayItems]);

  const resetTimer = () => {
    setIsActive(false);
    setIsFastSpeed(false);
    setTimeLeft(0);
    setTrayItems([]);
    prevWeightRef.current = 0;
    setShowFeedback(false);
    setIsLooking(false);
    fillGroundPool();
  };

  const rotationAngle = (timeLeft / 7200) * 360;

  return (
    <div
      ref={containerRef}
      className={`min-h-[520px] bg-[#FDFCF0] flex flex-col items-start justify-start p-4 overflow-hidden relative font-sans select-none rounded-b-2xl border border-t-0 border-white/10 ${isFullscreen ? "min-h-screen rounded-none border-0" : ""}`}
    >
      <SketchFilters />

      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 z-[60] p-2 rounded-xl bg-white/80 hover:bg-white border-2 border-slate-300 text-slate-700 shadow-md transition"
        aria-label={isFullscreen ? "退出全屏" : "全屏"}
      >
        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>

      {currentTaskName && (
        <div className="w-full text-center py-1.5 px-2 rounded-lg bg-white/60 text-slate-800 text-sm font-bold truncate mb-2">
          当前任务：{currentTaskName}
        </div>
      )}

      <div className="mt-2 ml-[4%] text-left z-10 pointer-events-none">
        <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic opacity-70">Tomato Scale</h2>
        <div className="h-1 w-24 bg-red-600 rounded-full mt-1" />
      </div>

      <div
        className={`relative mt-6 mb-2 ml-[2%] transition-transform duration-200 z-20 flex flex-col items-center ${isShaking ? "animate-bounce" : ""}`}
        style={{ transform: `translateY(${compression}px)` }}
      >
        <div
          ref={trayRef}
          className="relative w-[380px] h-22 border-b-[12px] border-black border-x-[6px] rounded-b-[200px] bg-white/40 flex items-end justify-center overflow-visible shadow-inner"
          style={{ filter: "url(#handDrawn)" }}
        >
          <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-auto">
            {trayItems.map((t, i) => (
              <g
                key={t.dropId}
                onMouseDown={(e) => startDrag(t, true, e)}
                onTouchStart={(e) => startDrag(t, true, e)}
                className="cursor-grab active:cursor-grabbing pointer-events-auto"
                transform={`translate(${t.x - 120}, ${t.y - 120})`}
              >
                <SketchedTomato size={t.size} rotation={t.rotation} opacity={getItemOpacity(i)} />
              </g>
            ))}
          </svg>
          <div className="mb-3 text-xs font-black text-slate-400 italic tracking-[0.2em] uppercase pointer-events-none">Tomato Tray</div>
        </div>

        <div className="mx-auto w-10 h-2 bg-black" />

        <div className="relative w-[280px] h-[280px] bg-white rounded-full border-[10px] border-black shadow-2xl flex items-center justify-center" style={{ filter: "url(#handDrawn)" }}>
          <div className="w-[230px] h-[230px] rounded-full border-2 border-slate-100 relative text-slate-900">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="absolute w-2 h-6 bg-black origin-bottom" style={{ transform: `rotate(${i * 30}deg) translateY(-105px)`, bottom: "50%", left: "50%" }} />
            ))}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-14 text-5xl font-black tracking-tighter">
              {Math.floor(timeLeft / 60).toString().padStart(2, "0")}:{(timeLeft % 60).toString().padStart(2, "0")}
            </div>
            <div
              className="absolute w-3 h-24 bg-red-600 rounded-full bottom-1/2 left-1/2 origin-bottom transition-transform duration-1000"
              style={{ transform: `translateX(-50%) rotate(${rotationAngle}deg)` }}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-10 bg-red-600" style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black rounded-full border-4 border-white shadow-lg" />
          </div>
        </div>

        <div className="mt-6 flex gap-4 z-20">
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            disabled={timeLeft === 0}
            className={`px-8 py-2.5 rounded-[20px] font-black text-base border-[4px] border-black transition-all ${timeLeft === 0 ? "bg-slate-100 text-slate-300 border-slate-200" : "bg-[#FFEB3B] shadow-[6px_6px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"}`}
          >
            {isActive ? "暂停" : "开始"}
          </button>
          <button
            type="button"
            onClick={() => setIsFastSpeed(!isFastSpeed)}
            className={`p-2.5 rounded-[20px] border-[4px] border-black transition-all shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${isFastSpeed ? "bg-orange-500 text-white animate-pulse" : "bg-white text-slate-800"}`}
          >
            <Zap size={22} fill={isFastSpeed ? "white" : "none"} />
          </button>
          <button type="button" onClick={resetTimer} className="p-2.5 bg-white border-[4px] border-black rounded-[20px] shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
            <RotateCcw size={22} />
          </button>
        </div>
      </div>

      <SketchedHorse isActive={isActive} isLooking={isLooking} showFeedback={showFeedback} />

      <div ref={groundRef} className="absolute bottom-0 left-0 w-full h-44 overflow-hidden border-t-2 border-slate-200">
        <div
          className="absolute inset-0 z-0 opacity-80"
          style={{
            backgroundColor: "#FDFCF0",
            backgroundImage: "linear-gradient(90deg, #98C27E 50%, transparent 50%), linear-gradient(#98C27E 50%, transparent 50%)",
            backgroundSize: "80px 80px",
            backgroundBlendMode: "multiply",
            filter: "url(#handDrawn) contrast(1.1) brightness(1.05)",
          }}
        />
        <div className="relative w-full h-full p-3 z-10">
          <div className="text-[10px] font-black text-white bg-green-800/40 inline-block px-3 py-1 rounded-full backdrop-blur-sm mb-2 tracking-widest uppercase">
            Fresh Picked ({groundTomatoes.length})
          </div>
          <div className="relative w-full h-full">
            {groundTomatoes.map((tomato) => (
              <div
                key={tomato.id}
                onMouseDown={(e) => startDrag(tomato, false, e)}
                onTouchStart={(e) => startDrag(tomato, false, e)}
                className="absolute cursor-grab active:cursor-grabbing hover:scale-110 transition-all duration-300 drop-shadow-lg"
                style={{ left: `${tomato.x}%`, top: `${tomato.y}%`, transform: "translate(-50%, -50%)" }}
              >
                <svg viewBox="0 0 240 240" className={tomato.size === "small" ? "w-20 h-20" : tomato.size === "medium" ? "w-28 h-28" : "w-32 h-32"}>
                  <SketchedTomato size={tomato.size} rotation={tomato.rotation} />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dragItem && (
        <div className="fixed pointer-events-none z-[999]" style={{ left: dragItem.x, top: dragItem.y, transform: `translate(-50%, -50%) rotate(${dragItem.tilt}deg)` }}>
          <svg viewBox="0 0 240 240" className={dragItem.size === "small" ? "w-24 h-24" : dragItem.size === "medium" ? "w-32 h-32" : "w-40 h-40"}>
            <SketchedTomato size={dragItem.size} rotation={dragItem.rotation} />
          </svg>
        </div>
      )}

      <style>{`
        @keyframes blink-1min {
          0%, 98.3%, 100% { opacity: 1; }
          99.1% { opacity: 0; }
        }
        @keyframes blink-lid-1min {
          0%, 98.3%, 100% { opacity: 0; }
          99.1% { opacity: 1; }
        }
        .animate-blink-1min { animation: blink-1min 60s infinite; }
        .animate-blink-lid-1min { animation: blink-lid-1min 60s infinite; opacity: 1 !important; }
      `}</style>
    </div>
  );
}
