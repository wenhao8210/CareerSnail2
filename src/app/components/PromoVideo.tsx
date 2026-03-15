"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Upload,
  FileText,
  Sparkles,
  Share2,
  MessageCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Target,
  Brain,
  Trophy,
  Clock,
  PenTool,
  Zap,
  ChevronRight,
  Play,
  RotateCcw,
} from "lucide-react";

// 动画变体配置
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 14,
    },
  },
};

// 步骤类型定义
type Step =
  | "intro"
  | "upload"
  | "questions"
  | "analyzing"
  | "profile"
  | "share"
  | "interview"
  | "practice"
  | "wrongbook"
  | "agenda"
  | "review";

interface PromoVideoProps {
  onClose?: () => void;
  autoPlay?: boolean;
  vertical?: boolean;
}

export default function PromoVideo({ onClose, autoPlay = true, vertical = true }: PromoVideoProps) {
  const [currentStep, setCurrentStep] = useState<Step>("intro");
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [direction, setDirection] = useState(1);

  const steps: Step[] = [
    "intro",
    "upload",
    "questions",
    "analyzing",
    "profile",
    "share",
    "interview",
    "practice",
    "wrongbook",
    "agenda",
    "review",
  ];

  const nextStep = useCallback(() => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setDirection(1);
      setCurrentStep(steps[currentIndex + 1]);
    } else {
      setDirection(1);
      setCurrentStep("intro");
    }
  }, [currentStep, steps]);

  const prevStep = useCallback(() => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep, steps]);

  useEffect(() => {
    if (!isPlaying) return;

    const timers: NodeJS.Timeout[] = [];

    const scheduleNext = () => {
      const timer = setTimeout(() => {
        nextStep();
      }, getStepDuration(currentStep));
      timers.push(timer);
    };

    scheduleNext();

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [currentStep, isPlaying, nextStep]);

  const getStepDuration = (step: Step): number => {
    switch (step) {
      case "intro": return 2500;
      case "upload": return 2800;
      case "questions": return 3200;
      case "analyzing": return 3200;
      case "profile": return 3600;
      case "share": return 2800;
      case "interview": return 2800;
      case "practice": return 3200;
      case "wrongbook": return 2800;
      case "agenda": return 3200;
      case "review": return 3600;
      default: return 2800;
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 200 : -200,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -200 : 200,
      opacity: 0,
      scale: 0.95,
    }),
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "intro": return <IntroStep />;
      case "upload": return <UploadStep />;
      case "questions": return <QuestionsStep />;
      case "analyzing": return <AnalyzingStep />;
      case "profile": return <ProfileStep />;
      case "share": return <ShareStep />;
      case "interview": return <InterviewStep />;
      case "practice": return <PracticeStep />;
      case "wrongbook": return <WrongbookStep />;
      case "agenda": return <AgendaStep />;
      case "review": return <ReviewStep />;
      default: return null;
    }
  };

  return (
    <div 
      className="relative bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 overflow-hidden"
      style={{ 
        width: vertical ? "390px" : "100%", 
        height: vertical ? "692px" : "100%",
        minHeight: vertical ? "692px" : "600px"
      }}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-pink-500/15 rounded-full blur-3xl" />
        
        {/* 网格背景 */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `
              linear-gradient(rgba(168, 85, 247, 0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(168, 85, 247, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* 主要内容区域 */}
      <div className="relative z-10 flex flex-col h-full">
        {/* 顶部控制栏 - 竖版简化 */}
        <div className={`flex items-center justify-between px-4 py-3 border-b border-purple-500/20 ${vertical ? 'bg-black/30' : 'bg-black/40'}`}>
          <div className="flex items-center gap-2">
            <motion.div
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
            <span className="text-base font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              面试闭环
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              {isPlaying ? (
                <div className="w-4 h-4 flex items-center justify-center gap-0.5">
                  <div className="w-1 h-3 bg-purple-400 rounded-sm" />
                  <div className="w-1 h-3 bg-purple-400 rounded-sm" />
                </div>
              ) : (
                <Play className="w-4 h-4 text-purple-400" />
              )}
            </button>
            <button
              onClick={() => {
                setCurrentStep("intro");
                setIsPlaying(true);
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-purple-400" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-gray-400 hover:text-white text-lg">&times;</span>
              </button>
            )}
          </div>
        </div>

        {/* 步骤内容 */}
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute inset-0 flex items-center justify-center p-4"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 底部进度指示器 */}
        <div className="px-4 py-3 border-t border-purple-500/20 bg-black/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">
              {getStepLabel(currentStep)}
            </span>
            <span className="text-xs text-purple-400">
              {steps.indexOf(currentStep) + 1} / {steps.length}
            </span>
          </div>
          <div className="flex gap-1">
            {steps.map((step, index) => (
              <button
                key={step}
                onClick={() => {
                  setDirection(index > steps.indexOf(currentStep) ? 1 : -1);
                  setCurrentStep(step);
                }}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index <= steps.indexOf(currentStep)
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 flex-1"
                    : "bg-white/10 w-3"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 步骤标签
function getStepLabel(step: Step): string {
  const labels: Record<Step, string> = {
    intro: "产品介绍",
    upload: "上传简历",
    questions: "智能问答",
    analyzing: "AI分析中",
    profile: "能力画像",
    share: "分享卡片",
    interview: "模拟面试",
    practice: "刷题练习",
    wrongbook: "错题本",
    agenda: "小蜗日程",
    review: "面试复盘",
  };
  return labels[step];
}

// 步骤组件 - 产品介绍 (竖版优化)
function IntroStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="text-center w-full"
    >
      <motion.div variants={itemVariants} className="mb-6">
        <div className="relative inline-block">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="relative w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-12 h-12 text-white" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      <motion.h1
        variants={itemVariants}
        className="text-3xl font-bold mb-4 leading-tight"
      >
        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          AI驱动的<br />面试闭环
        </span>
      </motion.h1>

      <motion.p
        variants={itemVariants}
        className="text-base text-gray-300 mb-6 px-2"
      >
        从简历优化到面试复盘<br />全流程智能化辅助
      </motion.p>

      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-2 px-4"
      >
        {[
          { icon: FileText, text: "智能简历分析" },
          { icon: Brain, text: "AI 能力画像" },
          { icon: MessageCircle, text: "模拟面试" },
          { icon: Calendar, text: "日程管理" },
        ].map((item, index) => (
          <motion.div
            key={index}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-purple-500/20"
            whileHover={{ scale: 1.02, backgroundColor: "rgba(168, 85, 247, 0.1)"}
          }
          >
            <item.icon className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">{item.text}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 上传简历 (竖版优化)
function UploadStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full px-2"
    >
      <motion.div variants={itemVariants} className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">上传简历</h2>
        <p className="text-sm text-gray-400">支持 PDF、Word 格式</p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="relative p-6 rounded-2xl border-2 border-dashed border-purple-500/40 bg-purple-500/5"
        whileHover={{ borderColor: "rgba(168, 85, 247, 0.8)", scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <div className="relative text-center">
          <motion.div
            className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
            animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Upload className="w-10 h-10 text-white" />
          </motion.div>

          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white font-semibold text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>点击上传</span>
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="mt-5 flex flex-col gap-2 px-2"
        variants={itemVariants}
      >
        {["简历.pdf", "作品集.pdf"].map((name, index) => (
          <motion.div
            key={name}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-purple-500/20"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{name}</p>
              <p className="text-xs text-gray-400">已上传</p>
            </div>
            <motion.div
              className="ml-auto w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 智能问答 (竖版优化)
function QuestionsStep() {
  const questions = [
    "你最擅长的技术栈是什么？",
    "描述一个你解决过的复杂问题",
    "为什么选择这个岗位？",
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full px-2"
    >
      <motion.div variants={itemVariants} className="text-center mb-5">
        <h2 className="text-2xl font-bold text-white mb-2">智能问答</h2>
        <p className="text-sm text-gray-400">AI 生成个性化问题</p>
      </motion.div>

      <div className="space-y-3">
        {questions.map((question, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="p-3.5 rounded-xl bg-white/5 border border-purple-500/20"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.35 }}
          >
            <div className="flex items-start gap-3">
              <motion.div
                className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ delay: index * 0.35 + 0.5, duration: 0.5 }}
              >
                <span className="text-xs font-bold text-white">{index + 1}</span>
              </motion.div>
              <div className="flex-1">
                <p className="text-sm text-white mb-2 leading-relaxed">{question}</p>
                <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ delay: index * 0.35 + 0.8, duration: 1.2 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={itemVariants}
        className="mt-5 flex justify-center"
      >
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-sm"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>回答完成</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - AI分析中 (竖版优化)
function AnalyzingStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="text-center w-full"
    >
      <motion.div variants={itemVariants} className="relative mb-6">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 blur-xl opacity-40"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <motion.div
          className="relative w-32 h-32 mx-auto"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${angle}deg) translateY(-60px) translateX(-50%)`,
              }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, delay: i * 0.1, repeat: Infinity }}
            />
          ))}
        </motion.div>

        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Brain className="w-8 h-8 text-white" />
        </motion.div>
      </motion.div>

      <motion.h2
        variants={itemVariants}
        className="text-2xl font-bold text-white mb-4"
      >
        AI 分析中...
      </motion.h2>

      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-2 px-6"
      >
        {["解析经历", "匹配岗位", "生成画像"].map((text, index) => (
          <motion.div
            key={text}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/40"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.5 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-purple-400"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 0.5, delay: index * 0.5 }}
            />
            <span className="text-sm text-purple-300">{text}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 能力画像 (竖版优化)
function ProfileStep() {
  const skills = [
    { name: "教育", score: 85, color: "from-blue-500 to-cyan-500" },
    { name: "实习", score: 90, color: "from-purple-500 to-pink-500" },
    { name: "项目", score: 78, color: "from-pink-500 to-rose-500" },
    { name: "匹配", score: 88, color: "from-amber-500 to-orange-500" },
    { name: "技能", score: 82, color: "from-green-500 to-emerald-500" },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full px-2"
    >
      <motion.div variants={itemVariants} className="text-center mb-4">
        <h2 className="text-xl font-bold text-white mb-1">能力画像报告</h2>
        <p className="text-xs text-gray-400">个性化评估</p>
      </motion.div>

      <div className="flex gap-4 mb-4">
        {/* 左侧 - 分数 */}
        <div className="flex-1 space-y-2.5">
          {skills.map((skill, index) => (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-gray-300">{skill.name}</span>
                <motion.span
                  className="text-xs font-bold text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.4 }}
                >
                  {skill.score}分
                </motion.span>
              </div>
              <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${skill.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${skill.score}%` }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.6 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* 右侧 - 总评 */}
        <motion.div
          className="relative w-24 h-24 flex-shrink-0"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-20 blur-xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-4 border-purple-500/50 flex flex-col items-center justify-center">
            <motion.span
              className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
            >
              8.4
            </motion.span>
            <span className="text-xs text-gray-400">综合</span>
          </div>
        </motion.div>
      </div>

      {/* 标签 */}
      <motion.div
        className="flex flex-wrap gap-2 justify-center"
        variants={itemVariants}
      >
        {["AI产品潜力型", "大厂背景", "技术扎实"].map((tag, index) => (
          <motion.span
            key={tag}
            className="px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 + index * 0.1 }}
            whileHover={{ scale: 1.1 }}
          >
            {tag}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 分享卡片 (竖版优化)
function ShareStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full px-4"
    >
      <motion.div variants={itemVariants} className="text-center mb-5">
        <h2 className="text-xl font-bold text-white mb-1">分享画像</h2>
        <p className="text-xs text-gray-400">精美卡片一键分享</p>
      </motion.div>

      <div className="flex justify-center mb-5">
        {/* 卡片预览 */}
        <motion.div
          className="relative w-44 p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-purple-500/40 shadow-2xl"
          variants={itemVariants}
          initial={{ opacity: 0, y: 30, rotateY: -15 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          whileHover={{ scale: 1.03, rotateY: 3 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-purple-300">能力画像</span>
            </div>

            <div className="text-center mb-3">
              <motion.div
                className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                8.4
              </motion.div>
              <p className="text-xs text-gray-400">AI产品潜力型</p>
            </div>

            <div className="space-y-1.5 mb-3">
              {[
                { name: "匹配度", value: 88 },
                { name: "竞争力", value: 82 },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-10">{item.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
              <div className="text-xs text-gray-500">CareerCurve</div>
              <Share2 className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* 分享按钮 */}
      <motion.div
        variants={itemVariants}
        className="flex justify-center gap-3"
      >
        {[
          { icon: Share2, text: "分享", color: "purple" },
          { icon: FileText, text: "PDF", color: "pink" },
        ].map((item, index) => (
          <motion.button
            key={item.text}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-${item.color}-500/20 border border-${item.color}-500/40 text-${item.color}-300 text-sm`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.text}</span>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 模拟面试 (竖版优化)
function InterviewStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full px-3"
    >
      <motion.div variants={itemVariants} className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white mb-1">模拟面试</h2>
        <p className="text-xs text-gray-400">AI 生成针对性题目</p>
      </motion.div>

      <motion.div
        className="p-4 rounded-xl bg-white/5 border border-purple-500/20 mb-4"
        variants={itemVariants}
      >
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <p className="text-sm font-semibold text-white">AI 面试官</p>
            <p className="text-xs text-gray-400">准备题目...</p>
          </div>
        </div>

        <motion.div
          className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-xs text-gray-300 leading-relaxed">
            &ldquo;请介绍你在字节跳动实习期间，如何优化推荐算法的经历...&rdquo;
          </p>
        </motion.div>
      </motion.div>

      {/* 卡片堆叠 */}
      <motion.div
        className="relative h-28 mb-4"
        variants={itemVariants}
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="absolute w-full p-3 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-purple-500/30 shadow-lg"
            style={{
              top: index * 10,
              left: index * 8,
              zIndex: 3 - index,
            }}
            initial={{ opacity: 0, x: 40, rotate: 10 }}
            animate={{
              opacity: 1 - index * 0.25,
              x: 0,
              rotate: (3 - index) * 2,
              y: [0, -3, 0],
            }}
            transition={{
              opacity: { delay: index * 0.2 },
              x: { delay: index * 0.2, type: "spring" },
              y: { delay: 1 + index * 0.3, duration: 2, repeat: Infinity },
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-gray-400">题目 {index + 1}</span>
            </div>
            <div className="h-1.5 rounded bg-gray-600 w-3/4 mb-1" />
            <div className="h-1.5 rounded bg-gray-600 w-1/2" />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-sm">
          <Zap className="w-4 h-4" />
          <span>已生成 12 道题目</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 刷题练习 (竖版优化)
function PracticeStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full px-3"
    >
      <motion.div variants={itemVariants} className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white mb-1">刷题练习</h2>
        <p className="text-xs text-gray-400">卡片式学习，点击查看答案</p>
      </motion.div>

      <div className="flex justify-center mb-5">
        {/* 题目卡片 */}
        <motion.div
          className="relative w-48 h-56 cursor-pointer"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
        >
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 p-5 flex flex-col shadow-xl"
            style={{ backfaceVisibility: "hidden" }}
            animate={{ rotateY: [0, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-purple-300">产品经理</span>
              <motion.div
                className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                重点
              </motion.div>
            </div>

            <p className="flex-1 text-sm text-white leading-relaxed">
              如何评估一个新功能上线后的效果？请列出核心指标...
            </p>

            <motion.div
              className="flex items-center justify-center gap-1 text-purple-300 text-xs mt-3"
              animate={{ y: [0, 2, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span>点击翻转</span>
              <ChevronRight className="w-3 h-3 rotate-90" />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* 统计信息 */}
      <motion.div
        className="flex justify-center gap-3"
        variants={itemVariants}
      >
        {[
          { label: "今日", value: "12", icon: BookOpen, color: "purple" },
          { label: "掌握", value: "68%", icon: Trophy, color: "yellow" },
          { label: "错题", value: "3", icon: Target, color: "red" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-purple-500/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.15 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className={`w-8 h-8 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center mb-1`}>
              <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
            </div>
            <motion.p
              className="text-lg font-bold text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.15 }}
            >
              {stat.value}
            </motion.p>
            <p className="text-xs text-gray-400">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 错题本 (竖版优化)
function WrongbookStep() {
  const mistakes = [
    { type: "不会", count: 3, color: "red" },
    { type: "模糊", count: 5, color: "yellow" },
    { type: "已掌握", count: 12, color: "green" },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full px-3"
    >
      <motion.div variants={itemVariants} className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white mb-1">智能错题本</h2>
        <p className="text-xs text-gray-400">自动收录，针对性复习</p>
      </motion.div>

      {/* 统计卡片 */}
      <div className="flex gap-2 mb-4">
        {mistakes.map((item, index) => (
          <motion.div
            key={item.type}
            className={`flex-1 p-3 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/30 text-center`}
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.1, type: "spring" }}
            whileHover={{ scale: 1.05 }}
          >
            <motion.span
              className={`text-2xl font-bold text-${item.color}-400`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 + 0.2 }}
            >
              {item.count}
            </motion.span>
            <p className={`text-xs text-${item.color}-300 mt-0.5`}>{item.type}</p>
          </motion.div>
        ))}
      </div>

      {/* 错题列表示例 */}
      <motion.div
        className="space-y-2 mb-4"
        variants={itemVariants}
      >
        {[
          "如何设计一个高并发的推荐系统架构？",
          "解释 RPC 和 HTTP 的区别和应用场景",
        ].map((question, index) => (
          <motion.div
            key={index}
            className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-purple-500/20"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.15 }}
            whileHover={{ x: 3 }}
          >
            <motion.div
              className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
            >
              <span className="text-xs text-red-400">!</span>
            </motion.div>
            <p className="flex-1 text-xs text-gray-300 truncate">{question}</p>
            <span className="text-xs text-purple-300">复习</span>
          </motion.div>
        ))}
      </motion.div>

      {/* AI 提示 */}
      <motion.div
        variants={itemVariants}
        className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Brain className="w-5 h-5 text-purple-400" />
          </motion.div>
          <div>
            <p className="text-xs font-medium text-white">AI 诊断</p>
            <p className="text-xs text-gray-400">
              建议加强系统设计类题目练习
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 小蜗日程 (竖版优化)
function AgendaStep() {
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  const weekDates = [9, 10, 11, 12, 13, 14, 15];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full px-3"
    >
      <motion.div variants={itemVariants} className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white mb-1">小蜗日程</h2>
        <p className="text-xs text-gray-400">面试日期智能提醒</p>
      </motion.div>

      <motion.div
        className="p-4 rounded-xl bg-white/5 border border-purple-500/20 mb-4"
        variants={itemVariants}
      >
        {/* 日历头部 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">2026年 3月</h3>
          <div className="flex items-center gap-1">
            <motion.div
              className="w-2 h-2 rounded-full bg-green-500"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs text-gray-400">面试</span>
          </div>
        </div>

        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {days.map((day) => (
            <div key={day} className="text-center text-xs text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格 - 只显示一周 */}
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date, index) => {
            const isInterviewDay = date === 15;
            const isToday = date === 14;

            return (
              <motion.div
                key={date}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm relative ${
                  isInterviewDay
                    ? "bg-green-500 text-white font-semibold"
                    : isToday
                      ? "bg-purple-500 text-white"
                      : "bg-white/5 text-gray-300"
                }`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.1 }}
              >
                {date}
                {isInterviewDay && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 面试提醒 */}
      <motion.div
        variants={itemVariants}
        className="space-y-2 mb-4"
      >
        <motion.div
          className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ x: 3 }}
        >
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">字节跳动 面试</p>
            <p className="text-xs text-gray-400">明天 14:00</p>
          </div>
          <motion.div
            className="px-2 py-0.5 rounded bg-green-500 text-white text-xs"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            明天
          </motion.div>
        </motion.div>
      </motion.div>

      {/* 番茄钟 */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30"
      >
        <motion.div
          className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          <Clock className="w-5 h-5 text-white" />
        </motion.div>
        <div>
          <p className="text-sm font-medium text-white">专注模式</p>
          <p className="text-xs text-gray-400">25分钟备考</p>
        </div>
        <motion.div
          className="text-xl font-bold text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          25:00
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 面试复盘 (竖版优化)
function ReviewStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full px-3"
    >
      <motion.div variants={itemVariants} className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white mb-1">面试复盘</h2>
        <p className="text-xs text-gray-400">记录表现，持续迭代</p>
      </motion.div>

      {/* 录音和清单并排 */}
      <div className="flex gap-3 mb-4">
        {/* 录音卡片 */}
        <motion.div
          className="flex-1 p-3 rounded-xl bg-white/5 border border-purple-500/20"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <div className="w-2 h-2 rounded-full bg-red-500" />
            </motion.div>
            <span className="text-xs font-medium text-white">录音</span>
          </div>
          <div className="flex items-center gap-1 h-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-sm bg-red-500/50"
                style={{ height: `${20 + Math.random() * 60}%` }}
                animate={{ height: [`${20 + Math.random() * 60}%`, `${20 + Math.random() * 60}%`] }}
                transition={{ duration: 0.4, repeat: Infinity }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 mt-1 block">12:34</span>
        </motion.div>

        {/* 清单卡片 */}
        <motion.div
          className="flex-1 p-3 rounded-xl bg-white/5 border border-purple-500/20"
          variants={itemVariants}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-white">清单</span>
          </div>
          <div className="space-y-1">
            {[
              "过常见问题",
              "打开笔记",
              "开始录音",
            ].map((item, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-1.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <motion.div
                  className={`w-3 h-3 rounded border ${index < 2 ? "bg-green-500 border-green-500" : "border-gray-500"} flex items-center justify-center`}
                  initial={index < 2 ? { scale: [0, 1.2, 1] } : {}}
                  animate={index < 2 ? { scale: 1 } : {}}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  {index < 2 && <CheckCircle2 className="w-2 h-2 text-white" />}
                </motion.div>
                <span className={`text-xs ${index < 2 ? "text-gray-400 line-through" : "text-gray-300"}`}>
                  {item}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* AI 复盘建议 */}
      <motion.div
        variants={itemVariants}
        className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30"
      >
        <div className="flex items-start gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <p className="text-sm font-medium text-white mb-1">AI 复盘建议</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              技术问题回答准确，建议加强项目表述的量化指标...
            </p>
          </div>
        </div>
      </motion.div>

      {/* 底部标签 */}
      <motion.div
        variants={itemVariants}
        className="mt-4 flex justify-center"
      >
        <motion.div
          className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-sm text-purple-300"
          whileHover={{ scale: 1.05 }}
        >
          🎉 面试闭环，助你拿Offer！
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
