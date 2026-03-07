"use client";

import React, { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "snail_island_save";
const ADMIN_PASSWORD = "8023";

const GRID_SIZE = 24;
const TILE_SIZE = 26;
const CANVAS_SIZE = GRID_SIZE * TILE_SIZE;

const COLORS: Record<string, string> = {
  water: "#86B9DA",
  sand: "#F3E5AB",
  grass: "#95C95D",
  grassSide: "#6A994E",
  dirt: "#7B5E4A",
  road: "#64748B",
  house1: "#B68D68",
  roof1: "#7B3F00",
  chimney: "#5D4037",
  house2: "#F8FAFC",
  roof2: "#1E293B",
  accent2: "#38BDF8",
  house3: "#FDFCF0",
  roof3: "#475569",
  gold: "#FACC15",
  window: "#FEF3C7",
  shadow: "rgba(0,0,0,0.15)",
  gridLine: "rgba(255,255,255,0.2)",
};

type CellType = "water" | "sand" | "grass" | "road";
type BuildingType = "house-1" | "house-2" | "house-3" | "tree" | "pinkTree" | null;
interface Cell {
  type: CellType;
  building: BuildingType;
}

export interface MapConfig {
  islandRadius: number;
  sandRing: number;
  noise: number;
}

const DEFAULT_MAP_CONFIG: MapConfig = {
  islandRadius: 0.35,
  sandRing: 0.42,
  noise: 2.5,
};

function generateIsland(config: MapConfig): Cell[][] {
  const { islandRadius, sandRing, noise } = config;
  const newGrid: Cell[][] = [];
  const centerX = GRID_SIZE / 2;
  const centerY = GRID_SIZE / 2;
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const n = Math.random() * noise - noise / 2;
      let type: CellType = "water";
      if (dist < GRID_SIZE * islandRadius + n) type = "grass";
      else if (dist < GRID_SIZE * sandRing + n) type = "sand";
      row.push({ type, building: null });
    }
    newGrid.push(row);
  }
  return newGrid;
}

function Tab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all tracking-wider ${
        active
          ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30 ring-1 ring-purple-400/50"
          : "text-gray-400 hover:text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function Tool({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center p-3 rounded-xl transition-all group border ${
        active
          ? "bg-purple-500/20 ring-2 ring-purple-400/60 scale-105 border-purple-400/40"
          : "border-white/10 bg-white/5 opacity-70 hover:opacity-100 hover:bg-white/10"
      }`}
    >
      <div
        className="w-8 h-8 rounded-lg mb-2 shadow-inner border border-white/20 transition-transform group-hover:rotate-3"
        style={{ backgroundColor: color }}
      />
      <span
        className={`text-[9px] font-bold uppercase tracking-tighter ${
          active ? "text-purple-300" : "text-gray-400"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function loadSaved(): { grid: Cell[][]; mapConfig: MapConfig } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { grid: Cell[][]; mapConfig: MapConfig };
    if (!Array.isArray(data.grid) || !data.mapConfig) return null;
    return {
      grid: data.grid,
      mapConfig: {
        islandRadius: Number(data.mapConfig.islandRadius) || DEFAULT_MAP_CONFIG.islandRadius,
        sandRing: Number(data.mapConfig.sandRing) ?? DEFAULT_MAP_CONFIG.sandRing,
        noise: Number(data.mapConfig.noise) ?? DEFAULT_MAP_CONFIG.noise,
      },
    };
  } catch {
    return null;
  }
}

function saveToStorage(grid: Cell[][], mapConfig: MapConfig) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ grid, mapConfig })
    );
  } catch {}
}

export default function SnailIslandPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeCategory, setActiveCategory] = useState<"house" | "nature" | "terrain" | "none">("house");
  const [selectedTool, setSelectedTool] = useState<string>("house-1");
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [mapConfig, setMapConfig] = useState<MapConfig>(DEFAULT_MAP_CONFIG);
  const [hydrated, setHydrated] = useState(false);

  const [savePasswordModalOpen, setSavePasswordModalOpen] = useState(false);
  const [savePasswordInput, setSavePasswordInput] = useState("");
  const [savePasswordError, setSavePasswordError] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      setGrid(saved.grid);
      setMapConfig(saved.mapConfig);
    } else {
      setGrid(generateIsland(DEFAULT_MAP_CONFIG));
    }
    setHydrated(true);
  }, []);

  const drawCottage = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    ctx.fillStyle = COLORS.chimney;
    ctx.fillRect(px + TILE_SIZE - 8, py + 6, 4, 6);
    ctx.fillStyle = COLORS.house1;
    ctx.fillRect(px + 4, py + 12, TILE_SIZE - 8, 10);
    ctx.fillStyle = COLORS.roof1;
    ctx.beginPath();
    ctx.moveTo(px + 2, py + 12);
    ctx.lineTo(px + TILE_SIZE / 2, py + 4);
    ctx.lineTo(px + TILE_SIZE - 2, py + 12);
    ctx.fill();
    ctx.fillStyle = COLORS.window;
    ctx.fillRect(px + 6, py + 15, 4, 4);
    ctx.fillStyle = "#4B3621";
    ctx.fillRect(px + TILE_SIZE - 10, py + 16, 4, 6);
  };

  const drawVilla = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(px + 4, py + 14, TILE_SIZE - 4, 8);
    ctx.fillStyle = COLORS.house2;
    ctx.fillRect(px + 4, py + 6, TILE_SIZE - 10, 16);
    ctx.fillRect(px + TILE_SIZE - 8, py + 12, 4, 10);
    ctx.fillStyle = COLORS.roof2;
    ctx.fillRect(px + 2, py + 5, TILE_SIZE - 8, 3);
    ctx.fillStyle = COLORS.accent2;
    ctx.fillRect(px + 6, py + 9, 6, 8);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(px + 7, py + 10, 2, 6);
  };

  const drawManor = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    ctx.fillStyle = COLORS.house3;
    ctx.fillRect(px + 3, py + 4, TILE_SIZE - 6, 18);
    ctx.fillRect(px + 1, py + 10, 4, 12);
    ctx.fillRect(px + TILE_SIZE - 5, py + 10, 4, 12);
    ctx.fillStyle = COLORS.roof3;
    ctx.beginPath();
    ctx.moveTo(px + 2, py + 4);
    ctx.lineTo(px + TILE_SIZE / 2, py - 4);
    ctx.lineTo(px + TILE_SIZE - 2, py + 4);
    ctx.fill();
    ctx.fillRect(px, py + 9, 6, 2);
    ctx.fillRect(px + TILE_SIZE - 6, py + 9, 6, 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(px + TILE_SIZE / 2 - 1, py - 6, 2, 4);
    ctx.fillRect(px + TILE_SIZE / 2 - 2, py + 12, 4, 1);
    ctx.fillStyle = COLORS.accent2;
    ctx.fillRect(px + 8, py + 7, 3, 3);
    ctx.fillRect(px + TILE_SIZE - 11, py + 7, 3, 3);
  };

  const drawFancyTree = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    leafColor: string
  ) => {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    ctx.fillStyle = "#4A3728";
    ctx.fillRect(px + TILE_SIZE / 2 - 1, py + TILE_SIZE - 8, 2, 6);
    ctx.fillStyle = leafColor;
    ctx.beginPath();
    ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.arc(px + TILE_SIZE / 2 - 3, py + TILE_SIZE / 2 - 3, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = grid[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        ctx.fillStyle = COLORS[cell.type] ?? COLORS.grass;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        if (
          cell.type === "grass" &&
          y + 1 < GRID_SIZE &&
          grid[y + 1][x].type !== "grass"
        ) {
          ctx.fillStyle = COLORS.grassSide;
          ctx.fillRect(px, py + TILE_SIZE - 4, TILE_SIZE, 4);
        }

        ctx.strokeStyle = COLORS.gridLine;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);

        if (cell.building === "house-1") drawCottage(ctx, x, y);
        else if (cell.building === "house-2") drawVilla(ctx, x, y);
        else if (cell.building === "house-3") drawManor(ctx, x, y);
        else if (cell.building === "tree")
          drawFancyTree(ctx, x, y, COLORS.grassSide);
        else if (cell.building === "pinkTree")
          drawFancyTree(ctx, x, y, "#F472B6");
      }
    }
  }, [grid]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      const newGrid = grid.map((row) => row.map((c) => ({ ...c })));
      const cell = { ...newGrid[y][x] };
      if (selectedTool === "eraser") {
        cell.building = null;
      } else if (["road", "grass", "sand", "water"].includes(selectedTool)) {
        cell.type = selectedTool as CellType;
        cell.building = null;
      } else {
        cell.building = selectedTool as BuildingType;
      }
      newGrid[y][x] = cell;
      setGrid(newGrid);
    }
  };

  const handleSaveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "snail-island.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleSaveWithPassword = () => {
    if (savePasswordInput.trim() === ADMIN_PASSWORD) {
      saveToStorage(grid, mapConfig);
      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 2000);
      setSavePasswordModalOpen(false);
      setSavePasswordInput("");
      setSavePasswordError(false);
    } else {
      setSavePasswordError(true);
      setSavePasswordInput("");
    }
  };

  const handleRegenerateIsland = () => {
    setGrid(generateIsland(mapConfig));
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col relative overflow-hidden">
      {/* Hackathon 风格背景 */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08)_0%,transparent_60%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-black/50 backdrop-blur-sm border-b border-purple-500/30">
        <h1 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 whitespace-nowrap">
          🐌 SNAIL CAREER｜蜗牛岛
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveImage}
            className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl transition shadow-lg shadow-purple-500/20"
          >
            导出图片
          </button>
          <a
            href="/"
            className="text-sm font-medium text-gray-400 hover:text-purple-400 transition"
          >
            返回
          </a>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center p-4 pt-6 pb-8">
        <div className="w-full max-w-2xl rounded-2xl border border-purple-500/30 bg-black/60 backdrop-blur-sm shadow-2xl shadow-purple-500/10 p-5 sm:p-6">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 tracking-tight">
                像素城市
              </h2>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">
                点击格子建造 · 一毫米也算前进
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5 p-2 rounded-xl bg-white/5 border border-white/10">
            <Tab
              active={activeCategory === "house"}
              onClick={() => {
                setActiveCategory("house");
                setSelectedTool("house-1");
              }}
              label="建筑"
            />
            <Tab
              active={activeCategory === "nature"}
              onClick={() => {
                setActiveCategory("nature");
                setSelectedTool("tree");
              }}
              label="自然"
            />
            <Tab
              active={activeCategory === "terrain"}
              onClick={() => {
                setActiveCategory("terrain");
                setSelectedTool("road");
              }}
              label="地形"
            />
            <div className="flex-1 min-w-[2rem]" />
            <Tab
              active={selectedTool === "eraser"}
              onClick={() => {
                setSelectedTool("eraser");
                setActiveCategory("none");
              }}
              label="🧹"
            />
          </div>

          <div className="flex flex-wrap gap-3 sm:gap-4 mb-5 min-h-[88px] items-center justify-center rounded-xl bg-white/5 border border-white/10 p-4">
            {activeCategory === "house" && (
              <>
                <Tool
                  active={selectedTool === "house-1"}
                  onClick={() => setSelectedTool("house-1")}
                  label="木屋"
                  color={COLORS.house1}
                />
                <Tool
                  active={selectedTool === "house-2"}
                  onClick={() => setSelectedTool("house-2")}
                  label="现代"
                  color={COLORS.house2}
                />
                <Tool
                  active={selectedTool === "house-3"}
                  onClick={() => setSelectedTool("house-3")}
                  label="庄园"
                  color={COLORS.house3}
                />
              </>
            )}
            {activeCategory === "nature" && (
              <>
                <Tool
                  active={selectedTool === "tree"}
                  onClick={() => setSelectedTool("tree")}
                  label="橡树"
                  color={COLORS.grassSide}
                />
                <Tool
                  active={selectedTool === "pinkTree"}
                  onClick={() => setSelectedTool("pinkTree")}
                  label="樱花"
                  color="#F472B6"
                />
              </>
            )}
            {activeCategory === "terrain" && (
              <>
                <Tool
                  active={selectedTool === "road"}
                  onClick={() => setSelectedTool("road")}
                  label="道路"
                  color={COLORS.road}
                />
                <Tool
                  active={selectedTool === "water"}
                  onClick={() => setSelectedTool("water")}
                  label="水面"
                  color={COLORS.water}
                />
                <Tool
                  active={selectedTool === "grass"}
                  onClick={() => setSelectedTool("grass")}
                  label="草地"
                  color={COLORS.grass}
                />
                <Tool
                  active={selectedTool === "sand"}
                  onClick={() => setSelectedTool("sand")}
                  label="沙滩"
                  color={COLORS.sand}
                />
              </>
            )}
            {activeCategory === "none" && (
              <p className="text-gray-500 text-xs font-medium italic">
                选择工具后点击画布格子
              </p>
            )}
          </div>

          {/* 地图特性：所有人可见；保存到本地需输入密码 */}
          <div className="mb-5 p-4 rounded-xl border border-purple-500/30 bg-white/5">
            <h3 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
              ⚙ 地图特性
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">岛屿半径</label>
                <input
                  type="range"
                  min="0.2"
                  max="0.5"
                  step="0.01"
                  value={mapConfig.islandRadius}
                  onChange={(e) =>
                    setMapConfig((c) => ({ ...c, islandRadius: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-purple-500"
                />
                <span className="text-xs text-gray-500">{(mapConfig.islandRadius * 100).toFixed(0)}%</span>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">沙滩环宽</label>
                <input
                  type="range"
                  min="0.32"
                  max="0.55"
                  step="0.01"
                  value={mapConfig.sandRing}
                  onChange={(e) =>
                    setMapConfig((c) => ({ ...c, sandRing: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-purple-500"
                />
                <span className="text-xs text-gray-500">{(mapConfig.sandRing * 100).toFixed(0)}%</span>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">边缘噪声</label>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={mapConfig.noise}
                  onChange={(e) =>
                    setMapConfig((c) => ({ ...c, noise: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-purple-500"
                />
                <span className="text-xs text-gray-500">{mapConfig.noise.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRegenerateIsland}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/20 text-gray-200 transition"
              >
                重新生成岛屿
              </button>
              <button
                type="button"
                onClick={() => {
                  setSavePasswordError(false);
                  setSavePasswordInput("");
                  setSavePasswordModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition"
              >
                {saveFeedback ? "已保存" : "保存到本地"}
              </button>
            </div>
          </div>

          <div className="flex justify-center rounded-xl overflow-hidden border-2 border-purple-500/30 bg-[#0f0f12] p-3 sm:p-4">
            <div className="rounded-lg overflow-hidden border border-white/10 shadow-2xl">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                onClick={handleCanvasClick}
                className="cursor-pointer block"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 保存时密码验证弹层 */}
      {savePasswordModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSavePasswordModalOpen(false);
            setSavePasswordInput("");
            setSavePasswordError(false);
          }}
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-purple-500/40 bg-gray-900/95 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-purple-300 mb-3">保存到本地</p>
            <p className="text-xs text-gray-400 mb-3">输入密码以保存当前地图进度</p>
            <input
              type="password"
              inputMode="numeric"
              value={savePasswordInput}
              onChange={(e) => {
                setSavePasswordInput(e.target.value);
                setSavePasswordError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveWithPassword();
                if (e.key === "Escape") {
                  setSavePasswordModalOpen(false);
                  setSavePasswordInput("");
                  setSavePasswordError(false);
                }
              }}
              placeholder="密码"
              className={`w-full rounded-lg px-3 py-2.5 text-white bg-white/10 border placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-purple-500/50 mb-2 ${
                savePasswordError ? "border-red-500/60" : "border-white/20"
              }`}
            />
            {savePasswordError && (
              <p className="text-xs text-red-400 mb-3">密码错误</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setSavePasswordModalOpen(false);
                  setSavePasswordInput("");
                  setSavePasswordError(false);
                }}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:bg-white/10"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveWithPassword}
                className="px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-purple-600 hover:bg-purple-500"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
