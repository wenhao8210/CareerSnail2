"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  Book,
  Brain,
  RefreshCw,
  Check,
  X,
  Plus,
  Trash2,
  Edit2,
  Save,
  Sparkles,
  Heart,
  ArrowLeft,
  Minimize2,
  Maximize2,
  Search,
  CloudUpload,
  CloudDownload,
} from "lucide-react";
import ButtonTreasure from "@/app/components/ButtonTreasure";
import FeedbackDialog from "@/app/components/FeedbackDialog";
import { useUser } from "@/hooks/useAuth";
import { track } from "@/lib/analytics";
import { QUESTION_BANK, AI_PM_QUESTION_BANK } from "@/lib/mock-interview/questionBank";
import { generatePrompt, RESUME_CONTENT } from "@/lib/mock-interview/prompts";
import "./mock-interview.css";

const STORAGE_KEYS = {
  projects: "ai_flashcards_projects",
  customAnswers: "ai_flashcards_custom_answers",
  questionNotes: "ai_flashcards_question_notes",
  mistakes: "ai_flashcards_mistakes",
  totalLikes: "ai_flashcards_total_likes",
  tutorialDone: "snail_mock_interview_tutorial_done",
};

const TUTORIAL_STEPS: { title: string; body: string }[] = [
  {
    title: "Step 1 · 面试题与答案",
    body: "点击面试题卡片，翻转即可查看答案。题库可根据简历内容生成，先翻转看答案熟悉节奏。",
  },
  {
    title: "Step 2 · 错题本",
    body: "点击「模糊/不会」的题目会进入错题本，方便后续复盘和学习。",
  },
  {
    title: "Step 3 · 创建题库",
    body: "点击下方「创建题库」，根据自己的岗位、JD 和简历创建专属题库，生成约需等待 2 分钟。",
  },
  {
    title: "Step 4 · 切换与生成新题",
    body: "在下方可切换不同题库；点击「生成新题」可为当前题库追加新题目。",
  },
];

const MODEL = "deepseek-ai/DeepSeek-V3";

/** 将文本中与 query 匹配的部分用 <mark> 高亮（不区分大小写，保留原文） */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-amber-500/60 text-amber-100 rounded px-0.5 font-medium">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function safeLocalStorage() {
  return {
    getItem: (key: string) => {
      try {
        if (typeof window === "undefined") return null;
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(key, value);
      } catch {}
    },
  };
}

interface QuestionItem {
  id: string | number;
  category: string;
  question: string;
  answer: string;
}

interface Project {
  id: string;
  name: string;
  jd: string;
  resume: string;
  questions: QuestionItem[];
  createdAt: string;
  isDefault?: boolean;
}

const defaultProject: Project = {
  id: "default_ai_pm",
  name: "AI产品经理通用题库",
  jd: "AI产品经理（通用要求）：\n- 负责AI产品的规划、设计和迭代\n- 深入理解AI技术能力边界，能够将技术能力转化为产品价值\n- 具备数据分析和用户研究能力\n- 能够跨团队协作，推动产品落地\n- 关注用户体验和商业价值平衡",
  resume: RESUME_CONTENT,
  questions: AI_PM_QUESTION_BANK.map((q, idx) => ({
    id: q.id || `ai_pm_q_${idx}`,
    category: q.category || "通用",
    question: q.question,
    answer: q.answer,
  })),
  createdAt: new Date().toISOString(),
  isDefault: true,
};

async function generateQuestionsWithAI(
  resumeContent: string,
  jdContent: string
): Promise<QuestionItem[]> {
  const prompt = generatePrompt(resumeContent, jdContent);
  const res = await fetch("/api/siliconflow/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user" as const, content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败");
  const content = data.choices?.[0]?.message?.content?.trim() || "";
  let jsonStr = content;
  const m = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (m) jsonStr = m[1];
  const parsed = JSON.parse(jsonStr);
  if (!parsed.questions || !Array.isArray(parsed.questions))
    throw new Error("返回格式错误");
  return parsed.questions.map((q: { question: string; answer: string; category?: string }, idx: number) => ({
    id: `q_${Date.now()}_${idx}`,
    category: q.category || "通用",
    question: q.question,
    answer: q.answer,
  }));
}

export default function MockInterviewPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingMinimized, setIsGeneratingMinimized] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(300);
  const [likeCount, setLikeCount] = useState(0);
  const [totalLikeCount, setTotalLikeCount] = useState(0);
  const likeCountRef = useRef(0);
  const [projectName, setProjectName] = useState("");
  const [jdContent, setJdContent] = useState("");
  const [resumeContent, setResumeContent] = useState("");
  const [currentQuestions, setCurrentQuestions] = useState<QuestionItem[]>(() => AI_PM_QUESTION_BANK.map((q, i) => ({ ...q, id: q.id || `q_${i}` })));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mistakes, setMistakes] = useState<Record<string, (QuestionItem & { timestamp?: Date })[]>>({});
  const [view, setView] = useState<"card" | "create" | "mistakes" | "generate" | "search">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [questionNotes, setQuestionNotes] = useState<Record<string, string>>({});
  const [noteDraft, setNoteDraft] = useState("");
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editQuestionValue, setEditQuestionValue] = useState("");
  const [editingMistakeId, setEditingMistakeId] = useState<string | number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showFinishPopup, setShowFinishPopup] = useState(false);
  const [addQuestionCategory, setAddQuestionCategory] = useState("");
  const [addQuestionQuestion, setAddQuestionQuestion] = useState("");
  const [addQuestionAnswer, setAddQuestionAnswer] = useState("");
  const [tutorialStep, setTutorialStep] = useState(1);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialTipPos, setTutorialTipPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevProjectIdRef = useRef<string | null>(null);
  /** 从搜索结果跳转时带上目标题库内的题目索引，避免被 effect 重置为 0 */
  const searchResultIndexRef = useRef<{ projectId: string; index: number } | null>(null);
  const tutorialCardRef = useRef<HTMLDivElement>(null);
  const tutorialActionsRef = useRef<HTMLDivElement>(null);
  const tutorialCreateRef = useRef<HTMLButtonElement>(null);
  const tutorialProjectRowRef = useRef<HTMLDivElement>(null);
  const tutorialTipRef = useRef<HTMLDivElement>(null);
  const [syncLoading, setSyncLoading] = useState<"up" | "down" | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const { user } = useUser();
  const storage = safeLocalStorage();

  useEffect(() => {
    const done = storage.getItem(STORAGE_KEYS.tutorialDone);
    if (done !== "1") setShowTutorial(true);
  }, []);

  const closeTutorial = () => {
    setShowTutorial(false);
    storage.setItem(STORAGE_KEYS.tutorialDone, "1");
  };

  const handleTutorialNext = () => {
    if (tutorialStep >= TUTORIAL_STEPS.length) {
      closeTutorial();
      return;
    }
    setTutorialStep((s) => s + 1);
  };

  useLayoutEffect(() => {
    if (!showTutorial || view !== "card") return;
    const refs = [tutorialCardRef, tutorialActionsRef, tutorialCreateRef, tutorialProjectRowRef];
    const target = refs[tutorialStep - 1]?.current;
    const tip = tutorialTipRef.current;
    if (!target || !tip) {
      setTutorialTipPos(null);
      return;
    }
    const targetRect = target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const gap = 12;
    const top = targetRect.top - tipRect.height - gap;
    const left = targetRect.left + targetRect.width / 2 - tipRect.width / 2;
    setTutorialTipPos({
      top: Math.max(8, top),
      left: Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8)),
    });
  }, [showTutorial, view, tutorialStep]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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
    const saved = storage.getItem(STORAGE_KEYS.projects);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Project[];
        const hasDefault = parsed.some((p) => p.id === defaultProject.id);
        setProjects(hasDefault ? parsed : [defaultProject, ...parsed]);
        if (parsed.length > 0 && !currentProjectId) setCurrentProjectId(parsed[0].id);
      } catch {
        setProjects([defaultProject]);
        setCurrentProjectId(defaultProject.id);
      }
    } else {
      setProjects([defaultProject]);
      setCurrentProjectId(defaultProject.id);
    }
    const ca = storage.getItem(STORAGE_KEYS.customAnswers);
    if (ca) try { setCustomAnswers(JSON.parse(ca)); } catch {}
    const qn = storage.getItem(STORAGE_KEYS.questionNotes);
    if (qn) try { setQuestionNotes(JSON.parse(qn)); } catch {}
    const sm = storage.getItem(STORAGE_KEYS.mistakes);
    if (sm) try { setMistakes(JSON.parse(sm)); } catch {}
    const tl = storage.getItem(STORAGE_KEYS.totalLikes);
    if (tl) setTotalLikeCount(parseInt(tl, 10) || 0);
  }, []);

  useEffect(() => {
    storage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
  }, [projects]);
  useEffect(() => {
    storage.setItem(STORAGE_KEYS.customAnswers, JSON.stringify(customAnswers));
  }, [customAnswers]);
  useEffect(() => {
    storage.setItem(STORAGE_KEYS.questionNotes, JSON.stringify(questionNotes));
  }, [questionNotes]);

  const currentQId = currentQuestions[currentIndex]?.id;
  useEffect(() => {
    if (currentQId != null) setNoteDraft(questionNotes[String(currentQId)] ?? "");
  }, [currentQId, questionNotes]);

  useEffect(() => {
    storage.setItem(STORAGE_KEYS.mistakes, JSON.stringify(mistakes));
  }, [mistakes]);
  useEffect(() => {
    storage.setItem(STORAGE_KEYS.totalLikes, String(totalLikeCount));
  }, [totalLikeCount]);

  // 登录后拉取云端模拟面试扩展（自定义答案/笔记/错题/点赞）；若云端为空且本地有则上传
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/sync/flashcard-meta");
        if (cancelled) return;
        const j = await r.json();
        if (!r.ok) return;
        const hasCloud = (j.customAnswers && Object.keys(j.customAnswers).length > 0) ||
          (j.questionNotes && Object.keys(j.questionNotes).length > 0) ||
          (j.mistakes && Object.keys(j.mistakes).length > 0) ||
          (typeof j.totalLikes === "number" && j.totalLikes > 0);
        if (hasCloud) {
          if (j.customAnswers && typeof j.customAnswers === "object") {
            setCustomAnswers(j.customAnswers);
            storage.setItem(STORAGE_KEYS.customAnswers, JSON.stringify(j.customAnswers));
          }
          if (j.questionNotes && typeof j.questionNotes === "object") {
            setQuestionNotes(j.questionNotes);
            storage.setItem(STORAGE_KEYS.questionNotes, JSON.stringify(j.questionNotes));
          }
          if (j.mistakes && typeof j.mistakes === "object") {
            setMistakes(j.mistakes);
            storage.setItem(STORAGE_KEYS.mistakes, JSON.stringify(j.mistakes));
          }
          if (typeof j.totalLikes === "number") {
            setTotalLikeCount(j.totalLikes);
            storage.setItem(STORAGE_KEYS.totalLikes, String(j.totalLikes));
          }
        } else {
          const ca = storage.getItem(STORAGE_KEYS.customAnswers);
          const qn = storage.getItem(STORAGE_KEYS.questionNotes);
          const sm = storage.getItem(STORAGE_KEYS.mistakes);
          const tl = storage.getItem(STORAGE_KEYS.totalLikes);
          const hasLocal = (ca && ca !== "{}") || (qn && qn !== "{}") || (sm && sm !== "{}") || (tl && parseInt(tl, 10) > 0);
          if (hasLocal) {
            await fetch("/api/sync/flashcard-meta", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customAnswers: ca ? JSON.parse(ca) : {},
                questionNotes: qn ? JSON.parse(qn) : {},
                mistakes: sm ? JSON.parse(sm) : {},
                totalLikes: tl ? parseInt(tl, 10) || 0 : 0,
              }),
            });
          }
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // 登录后扩展数据变更时防抖上传
  useEffect(() => {
    if (!user?.id) return;
    const t = setTimeout(() => {
      fetch("/api/sync/flashcard-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customAnswers,
          questionNotes,
          mistakes,
          totalLikes: totalLikeCount,
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [user?.id, customAnswers, questionNotes, mistakes, totalLikeCount]);

  useEffect(() => {
    if (currentProjectId) {
      const p = projects.find((x) => x.id === currentProjectId);
      if (p?.questions?.length) {
        setCurrentQuestions(p.questions);
        const fromSearch = searchResultIndexRef.current && searchResultIndexRef.current.projectId === currentProjectId;
        if (fromSearch) {
          setCurrentIndex(searchResultIndexRef.current!.index);
          searchResultIndexRef.current = null;
        } else {
          const isProjectSwitch = prevProjectIdRef.current !== currentProjectId;
          if (isProjectSwitch) {
            prevProjectIdRef.current = currentProjectId;
            setCurrentIndex(0);
          }
        }
      }
    }
  }, [currentProjectId, projects]);

  const getDisplayAnswer = (questionId: string | number, defaultAnswer: string) =>
    customAnswers[String(questionId)] ?? defaultAnswer;
  const getCurrentProjectMistakes = () =>
    mistakes[currentProjectId || "default"] || [];
  const currentQ = currentQuestions[currentIndex];
  const currentMistakes = getCurrentProjectMistakes();
  const progress = currentQuestions.length ? ((currentIndex + 1) / currentQuestions.length) * 100 : 0;
  const getCurrentProjectName = () => {
    if (currentProjectId === "default") return "默认题库";
    const p = projects.find((x) => x.id === currentProjectId);
    return p?.name ?? "未知项目";
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !jdContent.trim() || !resumeContent.trim()) {
      alert("请填写完整信息：项目名称、JD 和简历内容");
      return;
    }
    setIsGenerating(true);
    setIsGeneratingMinimized(false);
    setGenerationProgress(10);
    setEstimatedTimeRemaining(300);
    setLikeCount(0);
    likeCountRef.current = 0;
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const acc = Math.min(likeCountRef.current * 2, 240);
      const p = Math.min(10 + ((elapsed / 1000 + acc) / 300) * 80, 90);
      setGenerationProgress(p);
      setEstimatedTimeRemaining(Math.max(0, Math.ceil(300 - elapsed / 1000 - acc)));
    }, 500);

    try {
      const questions = await generateQuestionsWithAI(resumeContent, jdContent);
      const mapped: QuestionItem[] = questions.map((q, idx) => ({
        id: `q_${Date.now()}_${idx}`,
        category: q.category || "通用",
        question: q.question,
        answer: q.answer,
      }));
      const newProject: Project = {
        id: `project_${Date.now()}`,
        name: projectName,
        jd: jdContent,
        resume: resumeContent,
        questions: mapped,
        createdAt: new Date().toISOString(),
      };
      setProjects((prev) => [...prev, newProject]);
      setCurrentProjectId(newProject.id);
      setCurrentQuestions(newProject.questions.slice(0, 10));
      setCurrentIndex(0);
      setMistakes((prev) => ({ ...prev, [newProject.id]: [] }));
      setView("card");
      setProjectName("");
      setJdContent("");
      setResumeContent("");
      setGenerationProgress(100);
      setEstimatedTimeRemaining(0);
      track("mock_interview_deck_created", { question_count: questions.length });
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        alert("✅ 题库创建成功！已生成 " + questions.length + " 道题目");
      }, 800);
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setGenerationProgress(0);
      alert("❌ 创建题库失败\n\n" + (err instanceof Error ? err.message : "未知错误"));
    } finally {
      clearInterval(progressInterval);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    if (!confirm("确定要删除这个项目吗？")) return;
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setMistakes((prev) => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
    if (currentProjectId === projectId && projects.length > 1) {
      const rest = projects.filter((p) => p.id !== projectId);
      setCurrentProjectId(rest[0].id);
    } else if (projects.length <= 1) {
      setProjects([defaultProject]);
      setCurrentProjectId(defaultProject.id);
    }
  };

  const getAnonymousId = (): string => {
    const key = "snail_sync_anonymous_id";
    try {
      let id = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (!id) {
        id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        window.localStorage.setItem(key, id);
      }
      return id;
    } catch {
      return `anon_${Date.now()}`;
    }
  };

  const handleSyncToCloud = async () => {
    setSyncMessage(null);
    setSyncLoading("up");
    try {
      const res = await fetch("/api/mock-interview/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects, anonymousId: getAnonymousId() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage(data?.error ?? "同步失败");
        return;
      }
      setSyncMessage(`已同步 ${data?.count ?? projects.length} 个题库到云端`);
      setTimeout(() => setSyncMessage(null), 3000);
    } catch {
      setSyncMessage("网络错误，请稍后再试");
    } finally {
      setSyncLoading(null);
    }
  };

  const handleRestoreFromCloud = async () => {
    setSyncMessage(null);
    setSyncLoading("down");
    try {
      const anonymousId = getAnonymousId();
      const res = await fetch(`/api/mock-interview/sync?anonymousId=${encodeURIComponent(anonymousId)}`);
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage(data?.error ?? "拉取失败");
        return;
      }
      const list = Array.isArray(data?.projects) ? data.projects : [];
      if (list.length === 0) {
        setSyncMessage("云端暂无题库");
        setTimeout(() => setSyncMessage(null), 3000);
        return;
      }
      setProjects(list);
      if (!currentProjectId || !list.some((p: { id: string }) => p.id === currentProjectId)) {
        setCurrentProjectId(list[0].id);
      }
      setSyncMessage(`已从云端恢复 ${list.length} 个题库`);
      setTimeout(() => setSyncMessage(null), 3000);
    } catch {
      setSyncMessage("网络错误，请稍后再试");
    } finally {
      setSyncLoading(null);
    }
  };

  const handleFlip = (e: React.MouseEvent) => {
    if (isEditingCard || isEditingQuestion || (e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("textarea")) return;
    const flippingToAnswer = !isFlipped;
    if (flippingToAnswer) {
      track("mock_interview_card_flip", {
        project_id: currentProjectId ?? "",
        question_index: currentIndex,
      });
    }
    setIsFlipped((f) => !f);
  };

  const handleNext = (status: string) => {
    if (status === "wrong" && currentQ) {
      const list = getCurrentProjectMistakes();
      if (!list.find((m) => m.id === currentQ.id)) {
        setMistakes((prev) => ({
          ...prev,
          [currentProjectId || "default"]: [...list, { ...currentQ, timestamp: new Date() }],
        }));
      }
    }
    setIsFlipped(false);
    setIsEditingCard(false);
    setTimeout(() => {
      if (currentIndex < currentQuestions.length - 1) setCurrentIndex((i) => i + 1);
      else setShowFinishPopup(true);
    }, 200);
  };

  const removeMistake = (id: string | number) => {
    const list = getCurrentProjectMistakes().filter((m) => m.id !== id);
    setMistakes((prev) => ({ ...prev, [currentProjectId || "default"]: list }));
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isGenerating) {
      likeCountRef.current += 1;
      setLikeCount(likeCountRef.current);
      setTotalLikeCount((c) => c + 1);
    }
  };

  const handleAddQuestion = () => {
    const category = addQuestionCategory.trim() || "通用";
    const question = addQuestionQuestion.trim();
    const answer = addQuestionAnswer.trim();
    if (!question) {
      alert("请至少填写题目内容");
      return;
    }
    const newQ: QuestionItem = {
      id: `manual_${Date.now()}`,
      category,
      question,
      answer: answer || "（暂无参考答案，可翻转后自行填写）",
    };
    setProjects((prev) =>
      prev.map((p) =>
        p.id === currentProjectId
          ? { ...p, questions: [...(p.questions || []), newQ] }
          : p
      )
    );
    setCurrentQuestions((prev) => [...prev, newQ]);
    setCurrentIndex(currentQuestions.length);
    setShowAddQuestionModal(false);
    setAddQuestionCategory("");
    setAddQuestionQuestion("");
    setAddQuestionAnswer("");
    setIsFlipped(false);
  };

  const handleGenerateMore = async () => {
    const p = projects.find((x) => x.id === currentProjectId);
    if (!p?.jd?.trim() || !p?.resume?.trim()) {
      alert("当前项目缺少 JD 或简历内容，无法生成新题目。请先创建新题库。");
      return;
    }
    setIsGenerating(true);
    setIsGeneratingMinimized(false);
    setGenerationProgress(10);
    setEstimatedTimeRemaining(300);
    setLikeCount(0);
    likeCountRef.current = 0;
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const acc = Math.min(likeCountRef.current * 2, 240);
      setGenerationProgress(Math.min(90, 10 + ((elapsed / 1000 + acc) / 300) * 80));
      setEstimatedTimeRemaining(Math.max(0, Math.ceil(300 - elapsed / 1000 - acc)));
    }, 500);
    try {
      const questions = await generateQuestionsWithAI(p.resume, p.jd);
      const mapped: QuestionItem[] = questions.map((q, idx) => ({
        id: `q_${Date.now()}_${idx}`,
        category: q.category || "通用",
        question: q.question,
        answer: q.answer,
      }));
      const prevLen = p.questions?.length ?? 0;
      setProjects((prev) =>
        prev.map((proj) =>
          proj.id === currentProjectId
            ? { ...proj, questions: [...(proj.questions || []), ...mapped] }
            : proj
        )
      );
      setCurrentIndex(prevLen);
      setIsFlipped(false);
      setGenerationProgress(100);
      setEstimatedTimeRemaining(0);
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        alert("✅ 已生成 " + questions.length + " 道新题目！");
      }, 800);
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setGenerationProgress(0);
      alert("❌ 生成失败：" + (err instanceof Error ? err.message : "未知错误"));
    }
  };

  if (!currentQ) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-slate-100 flex flex-col relative">
      {/* 赛博网格背景（与简历优化页一致） */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(100,0,255,0.05)_0%,transparent_70%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      {/* 顶部导航栏：与简历优化页一致，左侧标题+金币，右侧 创建题库/错题本 + 菜单 */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 bg-black/40 backdrop-blur-sm border-b border-purple-500/20">
        <div className="flex flex-col gap-2 min-w-0 flex-shrink-0">
          <h1 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 whitespace-nowrap">
            🐌 SNAIL CAREER｜蜗牛面试
          </h1>
          <ButtonTreasure />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full border font-medium text-sm transition ${menuOpen ? "border-purple-400 bg-purple-500/20 text-purple-300" : "border-purple-400/50 text-purple-300/90 hover:border-purple-400 hover:bg-purple-500/10"}`}
              aria-label="打开菜单"
            >
              <span className="hidden sm:inline">模拟面试</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 py-1.5 min-w-[160px] rounded-xl bg-black/95 border-2 border-purple-400/50 shadow-xl shadow-purple-500/20 z-50">
                <a
                  href="/"
                  className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-purple-400 transition rounded-t-xl"
                  onClick={() => setMenuOpen(false)}
                >
                  简历优化
                </a>
                <a
                  href="/mock-interview"
                  className="block px-4 py-3 text-sm font-medium text-purple-400 bg-purple-500/15 hover:bg-purple-500/25 transition"
                  onClick={() => setMenuOpen(false)}
                >
                  模拟面试
                </a>
                <a
                  href="/agenda"
                  className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-purple-400 transition"
                  onClick={() => setMenuOpen(false)}
                >
                  小蜗日程
                </a>
                <a
                  href="/interview-notes"
                  className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-purple-400 transition"
                  onClick={() => setMenuOpen(false)}
                >
                  面试复盘
                </a>
                <a
                  href="/snail-island"
                  className="block px-4 py-3 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-purple-400 transition rounded-b-xl"
                  onClick={() => setMenuOpen(false)}
                >
                  蜗牛岛
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 首次使用教程：提示框在对应按键上方，无定位时用底部居中兜底 */}
      {showTutorial && (view === "card" || view === "create") && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <div
            ref={tutorialTipRef}
            className="pointer-events-auto w-full max-w-md bg-black/95 border border-purple-500/50 rounded-xl shadow-2xl shadow-purple-500/20 p-5 absolute mx-4"
            style={
              tutorialTipPos
                ? { top: tutorialTipPos.top, left: tutorialTipPos.left }
                : { bottom: 24, left: "50%", transform: "translateX(-50%)" }
            }
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">
                {TUTORIAL_STEPS[tutorialStep - 1].title}
              </span>
              <span className="text-xs text-gray-500">
                {tutorialStep}/{TUTORIAL_STEPS.length}
              </span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              {TUTORIAL_STEPS[tutorialStep - 1].body}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeTutorial}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition"
              >
                跳过
              </button>
              <button
                type="button"
                onClick={handleTutorialNext}
                className="px-4 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white hover:brightness-110 transition"
              >
                {tutorialStep >= TUTORIAL_STEPS.length ? "知道了" : "下一步"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View stack：刷题卡片 | 创建题库 | 错题本 | 生成新题（放在题库选择上方） */}
      <div className="relative z-10 px-4 py-2 border-b border-purple-500/20 bg-black/30 flex items-center gap-2 flex-wrap pt-40">
        <button
          onClick={() => setView("card")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${view === "card" ? "bg-purple-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
        >
          刷题卡片
        </button>
        <button
          ref={tutorialCreateRef}
          onClick={() => setView("create")}
          className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1 transition ${view === "create" ? "bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
        >
          <Sparkles className="w-4 h-4" /> 创建题库
        </button>
        <div className="relative inline-block">
          {currentMistakes.length > 0 && view !== "mistakes" && (
            <span className="absolute -top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-black/40" aria-label="有错题" />
          )}
          <button
            onClick={() => setView("mistakes")}
            className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition ${view === "mistakes" ? "bg-rose-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
          >
            <Book className="w-4 h-4" /> 错题本 ({currentMistakes.length})
          </button>
        </div>
        <button
          onClick={() => setView("search")}
          className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition ${view === "search" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
        >
          <Search className="w-4 h-4" /> 搜索
        </button>
        <button
          onClick={() => setView("generate")}
          disabled={isGenerating}
          className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-70 disabled:cursor-not-allowed ${view === "generate" ? "bg-emerald-600 text-white" : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"}`}
          title="AI 生成新10道题"
        >
          {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          生成新题
        </button>
      </div>

      <div ref={tutorialProjectRowRef} className="relative z-10 px-4 py-2 border-b border-purple-500/20 bg-black/30 flex items-center gap-2">
        <select
          value={currentProjectId || ""}
          onChange={(e) => setCurrentProjectId(e.target.value)}
          className="flex-1 bg-black/60 text-gray-100 px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400/50 text-sm"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={() => currentProjectId && handleDeleteProject(currentProjectId)}
          className="p-1.5 text-gray-400 hover:text-rose-500 transition"
          title="删除当前项目"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleSyncToCloud}
          disabled={syncLoading !== null}
          className="p-1.5 text-gray-400 hover:text-emerald-400 transition disabled:opacity-50"
          title="将当前本地题库同步到云端"
        >
          {syncLoading === "up" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={handleRestoreFromCloud}
          disabled={syncLoading !== null}
          className="p-1.5 text-gray-400 hover:text-sky-400 transition disabled:opacity-50"
          title="从云端恢复题库到本地"
        >
          {syncLoading === "down" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
        </button>
      </div>
      {syncMessage && (
        <p className="text-xs text-center py-1 text-purple-300 px-2">
          {syncMessage}
        </p>
      )}

      {showFinishPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/80 rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 w-full max-w-sm p-6 text-center">
            <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 mb-2">🎉 已经刷完</p>
            <p className="text-sm text-gray-400 mb-6">本组题目已全部完成，可以查看错题本或重新刷题。</p>
            <button
              onClick={() => { setShowFinishPopup(false); setCurrentIndex(0); }}
              className="w-full py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white hover:brightness-110 transition"
            >
              回到首页
            </button>
          </div>
        </div>
      )}

      {showAddQuestionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/80 rounded-2xl border border-purple-500/20 shadow-2xl shadow-purple-500/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-purple-500/20 flex justify-between items-center">
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" /> 手动添加题目
              </h2>
              <button onClick={() => setShowAddQuestionModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-purple-400 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">分类（选填）</label>
                <input
                  type="text"
                  value={addQuestionCategory}
                  onChange={(e) => setAddQuestionCategory(e.target.value)}
                  placeholder="例如：简历深挖、策略优化"
                  className="w-full bg-black/60 text-gray-100 px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">题目 *</label>
                <textarea
                  value={addQuestionQuestion}
                  onChange={(e) => setAddQuestionQuestion(e.target.value)}
                  placeholder="输入面试题目..."
                  rows={4}
                  className="w-full bg-black/60 text-gray-100 px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">参考答案（选填）</label>
                <textarea
                  value={addQuestionAnswer}
                  onChange={(e) => setAddQuestionAnswer(e.target.value)}
                  placeholder="输入参考答案或思路，可留空后翻转再填"
                  rows={6}
                  className="w-full bg-black/60 text-gray-100 px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400/50 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAddQuestionModal(false)} className="flex-1 px-4 py-2 bg-black/60 hover:bg-gray-800 text-gray-200 rounded-lg border border-gray-700 hover:border-gray-600 transition">
                  取消
                </button>
                <button
                  onClick={handleAddQuestion}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg flex items-center justify-center gap-2 font-semibold transition"
                >
                  <Plus className="w-4 h-4" /> 添加到当前题库
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isGenerating && (
        <>
          {isGeneratingMinimized ? (
            <div className="fixed bottom-6 right-6 z-[60]">
              <div className="bg-black/90 rounded-xl border border-purple-500/30 shadow-2xl p-4 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-sm font-medium text-gray-200">生成中...</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGeneratingMinimized(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-purple-400 transition"
                    title="展开"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden mb-2">
                  <div
                    className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {Math.floor(estimatedTimeRemaining / 60)}分{estimatedTimeRemaining % 60}秒
                  {likeCount > 0 && ` · ${likeCount}👍`}
                </p>
              </div>
            </div>
          ) : (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-black/80 rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 p-8 max-w-lg w-full relative">
                <button
                  type="button"
                  onClick={() => setIsGeneratingMinimized(true)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-purple-400 transition"
                  title="最小化到后台"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center space-y-6">
                  <RefreshCw className="w-16 h-16 text-purple-400 animate-spin" />
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">正在生成题库</h3>
                  <p className="text-gray-400 text-sm">预计剩余：{Math.floor(estimatedTimeRemaining / 60)}分{estimatedTimeRemaining % 60}秒</p>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 h-full rounded-full transition-all" style={{ width: `${generationProgress}%` }} />
                  </div>
                  <div className="w-full border-t border-slate-700 pt-6">
                    <p className="text-slate-300 text-sm mb-2">💡 点击点赞可以加速生成（彩蛋）</p>
                    <button onClick={handleLikeClick} className="like-btn">
                      <div className="leftContainer">
                        <Heart className="w-4 h-4 text-white fill-white" />
                        <span className="like">点赞</span>
                      </div>
                      <div className="likeCount"><span>{likeCount}</span></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <main className="relative z-10 max-w-md mx-auto p-4 flex-1 flex flex-col justify-center w-full">
        {view === "card" ? (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                <span>{getCurrentProjectName()}</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{currentIndex + 1} / {currentQuestions.length}</span>
                  <button
                    onClick={() => setShowAddQuestionModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition"
                    title="在题库中手动添加一道题"
                  >
                    <Plus className="w-3.5 h-3.5" /> 手动加题
                  </button>
                </div>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div
              ref={tutorialCardRef}
              className="relative aspect-[3/4] w-full mb-8 cursor-pointer group"
              onClick={handleFlip}
              style={{ perspective: "1000px" }}
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-blue-500/30 rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-300" />
              <div
                className="relative w-full h-full transition-transform duration-500"
                style={{
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                <div
                  className="absolute inset-0 bg-black/70 rounded-2xl p-8 border border-gray-700 flex flex-col justify-between shadow-lg group-hover:border-purple-400/50 transition"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div>
                    <span className="inline-block px-3 py-1 bg-purple-500/10 text-purple-300 rounded-full text-xs font-bold mb-4 border border-purple-500/20">
                      {currentQ.category}
                    </span>
                    <div className="flex items-start justify-between gap-2">
                      {!isEditingQuestion ? (
                        <h2 className="text-2xl font-bold leading-relaxed text-gray-100 flex-1 pr-10">{currentQ.question}</h2>
                      ) : (
                        <textarea
                          className="flex-1 w-full min-h-[120px] bg-black/50 text-gray-100 p-3 rounded-lg border border-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none text-lg font-bold leading-relaxed"
                          value={editQuestionValue}
                          onChange={(e) => setEditQuestionValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      {!isEditingQuestion ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditQuestionValue(currentQ.question);
                            setIsEditingQuestion(true);
                          }}
                          className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-purple-400 transition shrink-0"
                          title="编辑题目"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      ) : (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditingQuestion(false);
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-400"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const trimmed = editQuestionValue.trim();
                              if (trimmed) {
                                setProjects((prev) =>
                                  prev.map((p) =>
                                    p.id !== currentProjectId
                                      ? p
                                      : { ...p, questions: p.questions.map((q) => (q.id !== currentQ.id ? q : { ...q, question: trimmed })) }
                                  )
                                );
                              }
                              setIsEditingQuestion(false);
                            }}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300"
                          >
                            <Save className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-center text-gray-500 text-sm">点击翻转查看答案</p>
                </div>

                <div
                  className="absolute inset-0 bg-black/70 rounded-2xl p-8 border border-purple-500/30 flex flex-col shadow-lg shadow-purple-500/10"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-purple-300">参考思路</span>
                    {!isEditingCard ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditValue(getDisplayAnswer(currentQ.id, currentQ.answer));
                          setIsEditingCard(true);
                        }}
                        className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-purple-400 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setIsEditingCard(false); }} className="p-1 text-gray-400 hover:text-rose-400"><X className="w-5 h-5" /></button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomAnswers((prev) => ({ ...prev, [String(currentQ.id)]: editValue }));
                            setIsEditingCard(false);
                          }}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {isEditingCard ? (
                      <textarea
                        className="w-full h-full bg-black/50 text-gray-100 p-3 rounded-lg border border-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none text-base"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="text-base leading-7 text-gray-300 whitespace-pre-line">
                        {getDisplayAnswer(currentQ.id, currentQ.answer)}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-700/80 pt-3 mt-3 flex-shrink-0">
                    <label className="block text-xs font-bold text-amber-400/90 mb-1.5">我的理解 / 笔记</label>
                    <textarea
                      placeholder="记录自己的理解或补充..."
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-full min-h-[72px] bg-black/50 text-gray-200 text-sm p-3 rounded-lg border border-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none placeholder:text-gray-500"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuestionNotes((prev) => ({ ...prev, [String(currentQ.id)]: noteDraft }));
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white transition"
                      >
                        {(questionNotes[String(currentQ.id)] ?? "").trim() ? "更新" : "提交"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!isEditingCard && !isEditingQuestion && (
              <>
                <div ref={tutorialActionsRef} className="grid grid-cols-2 gap-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNext("wrong"); }}
                    className="group flex flex-col items-center justify-center p-4 rounded-xl bg-black/60 hover:bg-rose-900/20 border border-gray-700 hover:border-rose-500/50 transition"
                  >
                    <X className="w-6 h-6 text-rose-500 mb-1" />
                    <span className="text-sm font-medium text-gray-400 group-hover:text-rose-400 transition">模糊 / 不会</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNext("correct"); }}
                    className="group flex flex-col items-center justify-center p-4 rounded-xl bg-black/60 hover:bg-emerald-900/20 border border-gray-700 hover:border-emerald-500/50 transition"
                  >
                    <Check className="w-6 h-6 text-emerald-500 mb-1" />
                    <span className="text-sm font-medium text-gray-400 group-hover:text-emerald-400 transition">掌握了</span>
                  </button>
                </div>
              </>
            )}
          </>
        ) : view === "create" ? (
          <div className="w-full max-w-2xl mx-auto py-6 space-y-4">
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" /> 创建新题库
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">项目名称 *</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="例如：百度AI产品经理面试"
                className="w-full bg-black/60 text-gray-100 px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">JD（职位描述） *</label>
              <textarea
                value={jdContent}
                onChange={(e) => setJdContent(e.target.value)}
                placeholder="请输入职位描述..."
                rows={6}
                className="w-full bg-black/60 text-gray-100 px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400/50 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">我的简历内容 *</label>
              <textarea
                value={resumeContent}
                onChange={(e) => setResumeContent(e.target.value)}
                placeholder="请输入你的简历内容..."
                rows={8}
                className="w-full bg-black/60 text-gray-100 px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400/50 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setView("card")} className="flex-1 px-4 py-2 bg-black/60 hover:bg-gray-800 text-gray-200 rounded-lg border border-gray-700 hover:border-gray-600 transition">
                取消
              </button>
              <button
                onClick={handleCreateProject}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white rounded-lg flex items-center justify-center gap-2 font-semibold hover:brightness-110 transition"
              >
                <Sparkles className="w-4 h-4" /> 生成题库
              </button>
            </div>
          </div>
        ) : view === "generate" ? (
          <div className="w-full max-w-md mx-auto py-8 flex flex-col items-center text-center">
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" /> 生成新题
            </h2>
            <p className="text-gray-400 text-sm mb-6">基于当前题库的 JD 与简历，由 AI 为当前项目追加约 10 道新题。</p>
            <button
              onClick={handleGenerateMore}
              disabled={isGenerating}
              className="px-6 py-3 rounded-full text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              为当前题库 AI 生成新 10 道题
            </button>
          </div>
        ) : view === "search" ? (
          <div className="w-full max-w-md mx-auto py-6 flex flex-col flex-1 min-h-0">
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-400" /> 搜索题目
            </h2>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="按题目、分类或答案搜索全部题库..."
              className="w-full bg-black/60 text-gray-100 px-4 py-3 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400/50 placeholder:text-gray-500 mb-4"
            />
            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
              {(() => {
                const q = searchQuery.trim().toLowerCase();
                type ItemWithSource = QuestionItem & { _projectId: string; _projectName: string; _indexInProject: number };
                const allWithSource: ItemWithSource[] = projects.flatMap((p) =>
                  (p.questions || []).map((item, index) => ({
                    ...item,
                    _projectId: p.id,
                    _projectName: p.name,
                    _indexInProject: index,
                  }))
                );
                const list = q
                  ? allWithSource.filter(
                      (item) =>
                        item.question.toLowerCase().includes(q) ||
                        (item.category || "").toLowerCase().includes(q) ||
                        (item.answer || "").toLowerCase().includes(q)
                    )
                  : allWithSource;
                if (list.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-500">
                      {searchQuery.trim() ? "没有匹配的题目，试试其他关键词" : "输入关键词搜索全部题库中的题目"}
                    </div>
                  );
                }
                return list.map((item) => {
                  const answerText = getDisplayAnswer(item.id, item.answer);
                  const matchInAnswer = q && answerText.toLowerCase().includes(q);
                  const answerSnippet = matchInAnswer && answerText
                    ? (answerText.length > 120 ? answerText.slice(0, 120).replace(/\s+/g, " ") + "…" : answerText.replace(/\s+/g, " "))
                    : "";
                  return (
                    <button
                      key={`${item._projectId}-${item.id}`}
                      type="button"
                      onClick={() => {
                        searchResultIndexRef.current = { projectId: item._projectId, index: item._indexInProject };
                        setCurrentProjectId(item._projectId);
                        setView("card");
                        setIsFlipped(false);
                      }}
                      className="w-full text-left bg-black/60 hover:bg-black/80 p-4 rounded-xl border border-gray-700 hover:border-indigo-500/50 transition"
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="inline-block px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs font-bold">
                          {q && (item.category || "").toLowerCase().includes(q)
                            ? highlightMatch(item.category || "通用", q)
                            : (item.category || "通用")}
                        </span>
                        <span className="text-xs text-gray-500" title={item._projectName}>
                          {item._projectName}
                        </span>
                      </div>
                      <p className="text-gray-200 font-medium line-clamp-2">
                        {q ? highlightMatch(item.question, q) : item.question}
                      </p>
                      {matchInAnswer && answerSnippet && (
                        <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                          答案片段：{highlightMatch(answerSnippet, q)}
                        </p>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">
                <Book className="text-rose-500" /> {getCurrentProjectName()} - 需重点复盘 ({currentMistakes.length})
              </h2>
            </div>
            {currentMistakes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <Brain className="w-16 h-16 mb-4 text-purple-400/50" />
                <p>目前没有错题。</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 pb-20">
                {currentMistakes.map((m, idx) => (
                  <div key={`${m.id}-${idx}`} className="bg-black/60 p-5 rounded-xl border border-gray-700 hover:border-purple-500/30 relative transition shadow-lg">
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={() => removeMistake(m.id)} className="text-gray-500 hover:text-rose-500 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xs text-purple-300 font-bold border border-purple-500/20 px-2 py-0.5 rounded mb-2 inline-block">{m.category}</span>
                    <h3 className="font-bold text-gray-200 mb-2 pr-12">{m.question}</h3>
                    <div className="h-px bg-purple-500/20 my-3" />
                    <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{getDisplayAnswer(m.id, m.answer)}</p>
                    {questionNotes[String(m.id)]?.trim() && (
                      <>
                        <div className="h-px bg-amber-500/20 my-3" />
                        <p className="text-xs font-bold text-amber-400/90 mb-1">我的笔记</p>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{questionNotes[String(m.id)].trim()}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <div className="h-24" />
      {/* Footer：与简历优化页一致 */}
      <footer className="relative z-10 border-t border-purple-500/20 mt-20 py-10 bg-black/50 text-gray-400 text-sm">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 mb-2">
              🐌 SNAIL CAREER
            </h2>
            <p className="text-gray-500 mb-3">蜗牛简历 | 一毫米也算前进。</p>
            <p className="text-xs text-gray-600">
              AI 简历分析与岗位匹配工具，帮助你了解求职进度与优化方向。
            </p>
          </div>
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Resources</h3>
            <ul className="space-y-2">
              <li><a href="https://uiverse.io" className="hover:text-purple-400 transition">UIverse.io</a></li>
              <li><a href="https://cssbuttons.io" className="hover:text-purple-400 transition">Cssbuttons.io</a></li>
              <li><a href="https://pixelrepo.com" className="hover:text-purple-400 transition">Pixelrepo.com</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Information</h3>
            <ul className="space-y-2">
              <li><FeedbackDialog /></li>
              <li><FeedbackDialog kind="cooperation" /></li>
              <li><a href="https://xhslink.com/m/8bOzZ9dlgop" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition">About me</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-purple-400 transition">Terms</a></li>
              <li><a href="#" className="hover:text-purple-400 transition">Privacy policy</a></li>
              <li><a href="#" className="hover:text-purple-400 transition">Disclaimer</a></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-gray-600 text-xs mt-10 border-t border-purple-500/10 pt-4">
          © 2025 SNAIL CAREER. All rights reserved. | Made with 💜 by Wenhao Wang
        </div>
      </footer>
    </div>
  );
}
