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
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
};

const floatVariants: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-8, 8, -8],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const pulseVariants: Variants = {
  initial: { scale: 1, opacity: 0.8 },
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const glowVariants: Variants = {
  initial: { boxShadow: "0 0 20px rgba(168, 85, 247, 0.3)" },
  animate: {
    boxShadow: [
      "0 0 20px rgba(168, 85, 247, 0.3)",
      "0 0 40px rgba(168, 85, 247, 0.6)",
      "0 0 20px rgba(168, 85, 247, 0.3)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
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
}

export default function PromoVideo({ onClose, autoPlay = true }: PromoVideoProps) {
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
      // 循环播放
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

  // 自动播放逻辑
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
      case "intro":
        return 2500;
      case "upload":
        return 3000;
      case "questions":
        return 3500;
      case "analyzing":
        return 3500;
      case "profile":
        return 4000;
      case "share":
        return 3000;
      case "interview":
        return 3000;
      case "practice":
        return 3500;
      case "wrongbook":
        return 3000;
      case "agenda":
        return 3500;
      case "review":
        return 4000;
      default:
        return 3000;
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.9,
    }),
  };

  // 渲染各个步骤的内容
  const renderStepContent = () => {
    switch (currentStep) {
      case "intro":
        return <IntroStep />;
      case "upload":
        return <UploadStep />;
      case "questions":
        return <QuestionsStep />;
      case "analyzing":
        return <AnalyzingStep />;
      case "profile":
        return <ProfileStep />;
      case "share":
        return <ShareStep />;
      case "interview":
        return <InterviewStep />;
      case "practice":
        return <PracticeStep />;
      case "wrongbook":
        return <WrongbookStep />;
      case "agenda":
        return <AgendaStep />;
      case "review":
        return <ReviewStep />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 overflow-hidden rounded-2xl">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

        {/* 网格背景 */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(168, 85, 247, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(168, 85, 247, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* 主要内容区域 */}
      <div className="relative z-10 flex flex-col h-full">
        {/* 顶部控制栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              面试闭环
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              {isPlaying ? (
                <div className="w-5 h-5 flex items-center justify-center gap-1">
                  <div className="w-1.5 h-4 bg-purple-400 rounded-sm" />
                  <div className="w-1.5 h-4 bg-purple-400 rounded-sm" />
                </div>
              ) : (
                <Play className="w-5 h-5 text-purple-400" />
              )}
            </button>
            <button
              onClick={prevStep}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-purple-400 rotate-180" />
            </button>
            <button
              onClick={nextStep}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-purple-400" />
            </button>
            <button
              onClick={() => {
                setCurrentStep("intro");
                setIsPlaying(true);
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-purple-400" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="ml-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-gray-400 hover:text-white">&times;</span>
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
                scale: { duration: 0.2 },
              }}
              className="absolute inset-0 flex items-center justify-center p-8"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 底部进度指示器 */}
        <div className="px-6 py-4 border-t border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              {getStepLabel(currentStep)}
            </span>
            <span className="text-sm text-purple-400">
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
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index <= steps.indexOf(currentStep)
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 flex-1"
                    : "bg-white/10 w-4"
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

// 步骤组件 - 产品介绍
function IntroStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="text-center max-w-2xl"
    >
      <motion.div variants={itemVariants} className="mb-8">
        <div className="relative inline-block">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur-xl opacity-50"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="relative w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-16 h-16 text-white" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      <motion.h1
        variants={itemVariants}
        className="text-4xl md:text-5xl font-bold mb-6"
      >
        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          AI 驱动的面试闭环
        </span>
      </motion.h1>

      <motion.p
        variants={itemVariants}
        className="text-xl text-gray-300 mb-8"
      >
        从简历优化到面试复盘，全流程智能化辅助
      </motion.p>

      <motion.div
        variants={itemVariants}
        className="flex flex-wrap justify-center gap-4"
      >
        {[
          { icon: FileText, text: "智能简历分析" },
          { icon: Brain, text: "AI 能力画像" },
          { icon: MessageCircle, text: "模拟面试" },
          { icon: Calendar, text: "日程管理" },
        ].map((item, index) => (
          <motion.div
            key={index}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-500/20"
            whileHover={{ scale: 1.05, backgroundColor: "rgba(168, 85, 247, 0.1)" }}
          >
            <item.icon className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-300">{item.text}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 上传简历
function UploadStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">上传简历</h2>
        <p className="text-gray-400">支持 PDF、Word 格式，AI 自动解析</p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="relative p-8 rounded-2xl border-2 border-dashed border-purple-500/40 bg-purple-500/5"
        whileHover={{ borderColor: "rgba(168, 85, 247, 0.8)", scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {/* 发光效果 */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <div className="relative text-center">
          <motion.div
            className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
            animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Upload className="w-12 h-12 text-white" />
          </motion.div>

          <motion.div
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 text-white font-semibold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>点击或拖拽上传</span>
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.div>
          </motion.div>

          <p className="mt-4 text-sm text-gray-400">
            支持 .pdf, .doc, .docx 格式，最大 10MB
          </p>
        </div>
      </motion.div>

      {/* 文件示例动画 */}
      <motion.div
        className="mt-8 flex justify-center gap-4"
        variants={itemVariants}
      >
        {["简历.pdf", "作品集.pdf"].map((name, index) => (
          <motion.div
            key={name}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-purple-500/20"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.3 }}
            whileHover={{ scale: 1.05, y: -5 }}
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{name}</p>
              <p className="text-xs text-gray-400">已上传</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 智能问答
function QuestionsStep() {
  const questions = [
    "你最擅长的技术栈是什么？",
    "请描述一个你解决过的复杂问题",
    "为什么选择这个岗位方向？",
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">智能问答</h2>
        <p className="text-gray-400">AI 根据简历生成个性化问题</p>
      </motion.div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="p-4 rounded-xl bg-white/5 border border-purple-500/20"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.4 }}
          >
            <div className="flex items-start gap-3">
              <motion.div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ delay: index * 0.4 + 0.5, duration: 0.5 }}
              >
                <span className="text-sm font-bold text-white">{index + 1}</span>
              </motion.div>
              <div className="flex-1">
                <p className="text-white mb-2">{question}</p>
                <motion.div
                  className="h-2 rounded-full bg-gray-700 overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: index * 0.4 + 0.3, duration: 0.5 }}
                >
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ delay: index * 0.4 + 0.8, duration: 1.5 }}
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={itemVariants}
        className="mt-8 flex justify-center"
      >
        <motion.div
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-green-500/20 border border-green-500/40 text-green-400"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>回答完成，准备生成画像</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - AI分析中
function AnalyzingStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="text-center"
    >
      <motion.div variants={itemVariants} className="relative mb-8">
        {/* 外层光环 */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 blur-xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ width: 200, height: 200, margin: "auto" }}
        />

        {/* 旋转的光环 */}
        <motion.div
          className="relative w-48 h-48 mx-auto"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${angle}deg) translateY(-90px) translateX(-50%)`,
              }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, delay: i * 0.1, repeat: Infinity }}
            />
          ))}
        </motion.div>

        {/* 中心图标 */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Brain className="w-12 h-12 text-white" />
        </motion.div>
      </motion.div>

      <motion.h2
        variants={itemVariants}
        className="text-3xl font-bold text-white mb-4"
      >
        AI 分析中...
      </motion.h2>

      <motion.div
        variants={itemVariants}
        className="flex justify-center gap-2"
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

// 步骤组件 - 能力画像
function ProfileStep() {
  const skills = [
    { name: "教育背景", score: 85, color: "from-blue-500 to-cyan-500" },
    { name: "实习经历", score: 90, color: "from-purple-500 to-pink-500" },
    { name: "项目经验", score: 78, color: "from-pink-500 to-rose-500" },
    { name: "岗位匹配", score: 88, color: "from-amber-500 to-orange-500" },
    { name: "技能深度", score: 82, color: "from-green-500 to-emerald-500" },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-2xl"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">能力画像报告</h2>
        <p className="text-gray-400">基于简历和问答生成的个性化评估</p>
      </motion.div>

      {/* 雷达图模拟 */}
      <motion.div
        variants={itemVariants}
        className="relative mb-8 p-6 rounded-2xl bg-white/5 border border-purple-500/20"
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* 左侧 - 分数 */}
          <div className="flex-1 w-full">
            <div className="space-y-4">
              {skills.map((skill, index) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{skill.name}</span>
                    <motion.span
                      className="text-sm font-bold text-white"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.15 + 0.5 }}
                    >
                      {skill.score}分
                    </motion.span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-700 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${skill.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.score}%` }}
                      transition={{ delay: index * 0.15 + 0.3, duration: 0.8 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 右侧 - 总评 */}
          <motion.div
            className="relative w-40 h-40 flex-shrink-0"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 opacity-20 blur-xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-4 border-purple-500/50 flex flex-col items-center justify-center">
              <motion.span
                className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
              >
                8.4
              </motion.span>
              <span className="text-sm text-gray-400 mt-1">综合评分</span>
            </div>
          </motion.div>
        </div>

        {/* 标签 */}
        <motion.div
          className="mt-6 flex flex-wrap gap-2"
          variants={itemVariants}
        >
          {["AI产品潜力型", "大厂背景", "技术扎实"].map((tag, index) => (
            <motion.span
              key={tag}
              className="px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 + index * 0.1 }}
              whileHover={{ scale: 1.1 }}
            >
              {tag}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 分享卡片
function ShareStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">分享你的画像</h2>
        <p className="text-gray-400">生成精美分享卡片，展示你的竞争力</p>
      </motion.div>

      <div className="flex justify-center gap-8">
        {/* 卡片预览 */}
        <motion.div
          className="relative w-64 p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-purple-500/40 shadow-2xl"
          variants={itemVariants}
          initial={{ opacity: 0, y: 50, rotateY: -15 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          whileHover={{ scale: 1.05, rotateY: 5 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          {/* 卡片光效 */}
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          <div className="relative">
            {/* 顶部 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-purple-300">能力画像</span>
            </div>

            {/* 主内容 */}
            <div className="text-center mb-4">
              <motion.div
                className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                8.4
              </motion.div>
              <p className="text-sm text-gray-400">AI产品潜力型选手</p>
            </div>

            {/* 技能条 */}
            <div className="space-y-2 mb-4">
              {[
                { name: "匹配度", value: 88 },
                { name: "竞争力", value: 82 },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">{item.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-700 overflow-hidden">
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

            {/* 底部二维码区域 */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-500">CareerCurve</div>
              <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 分享按钮 */}
        <motion.div
          className="flex flex-col justify-center gap-4"
          variants={itemVariants}
        >
          {[
            { icon: Share2, text: "分享好友", color: "purple" },
            { icon: FileText, text: "导出 PDF", color: "pink" },
            { icon: Upload, text: "保存图片", color: "blue" },
          ].map((item, index) => (
            <motion.button
              key={item.text}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl bg-${item.color}-500/20 border border-${item.color}-500/40 text-${item.color}-300 hover:bg-${item.color}-500/30 transition-all`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.2 }}
              whileHover={{ scale: 1.05, x: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.text}</span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* 飞出的卡片动画 */}
      <motion.div
        className="absolute top-20 right-20 w-32 h-48 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 opacity-20 blur-sm"
        animate={{
          x: [0, 100, 200],
          y: [0, -50, -100],
          opacity: [0.2, 0.1, 0],
          scale: [1, 0.8, 0.6],
          rotate: [0, 15, 30],
        }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
      />
    </motion.div>
  );
}

// 步骤组件 - 模拟面试
function InterviewStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">模拟面试</h2>
        <p className="text-gray-400">基于画像和 JD 生成个性化面试题</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        {/* 左侧 - 面试场景 */}
        <motion.div
          className="col-span-2 md:col-span-1 p-6 rounded-2xl bg-white/5 border border-purple-500/20"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <MessageCircle className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <p className="font-semibold text-white">AI 面试官</p>
              <p className="text-xs text-gray-400">正在准备题目...</p>
            </div>
          </div>

          <motion.div
            className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-sm text-gray-300">
              &ldquo;请介绍一下你在字节跳动实习期间，如何优化推荐算法的那次经历...&rdquo;
            </p>
          </motion.div>
        </motion.div>

        {/* 右侧 - 卡片堆叠 */}
        <motion.div
          className="col-span-2 md:col-span-1 relative h-48"
          variants={itemVariants}
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="absolute w-full p-4 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-purple-500/30 shadow-lg"
              style={{
                top: index * 15,
                left: index * 10,
                zIndex: 3 - index,
              }}
              initial={{ opacity: 0, x: 50, rotate: 10 }}
              animate={{
                opacity: 1 - index * 0.2,
                x: 0,
                rotate: (3 - index) * 2,
                y: [0, -5, 0],
              }}
              transition={{
                opacity: { delay: index * 0.2 },
                x: { delay: index * 0.2, type: "spring" },
                y: { delay: 1 + index * 0.3, duration: 2, repeat: Infinity },
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">面试题 {index + 1}</span>
              </div>
              <div className="h-2 rounded bg-gray-600 w-3/4 mb-2" />
              <div className="h-2 rounded bg-gray-600 w-1/2" />
            </motion.div>
          ))}

          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Zap className="w-4 h-4" />
            <span>已生成 12 道题目</span>
          </motion.div>
        </motion.div>
      </div>

      {/* JD 输入区域 */}
      <motion.div
        variants={itemVariants}
        className="mt-6 p-4 rounded-xl bg-white/5 border border-dashed border-purple-500/40"
      >
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-300">粘贴 JD 生成针对性题目</span>
        </div>
        <div className="h-2 rounded bg-gray-700 w-full" />
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 刷题练习
function PracticeStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">刷题练习</h2>
        <p className="text-gray-400">卡片式学习，点击翻转查看答案</p>
      </motion.div>

      <div className="flex justify-center gap-6">
        {/* 题目卡片 */}
        <motion.div
          className="relative w-56 h-72 cursor-pointer"
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
        >
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 p-6 flex flex-col shadow-xl"
            style={{ backfaceVisibility: "hidden" }}
            animate={{ rotateY: [0, 10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-purple-300">产品经理</span>
              <motion.div
                className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                重点
              </motion.div>
            </div>

            <p className="flex-1 text-sm text-white leading-relaxed">
              如何评估一个新功能上线后的效果？请列出你关注的核心指标...
            </p>

            <motion.div
              className="flex items-center justify-center gap-2 text-purple-300 text-sm mt-4"
              animate={{ y: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span>点击翻转</span>
              <ChevronRight className="w-4 h-4 rotate-90" />
            </motion.div>
          </motion.div>

          {/* 背面预览 */}
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-600 to-green-800 p-6 flex flex-col shadow-xl"
            style={{ backfaceVisibility: "hidden", rotateY: 180 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
          >
            <p className="text-sm text-white">参考答案区域...</p>
          </motion.div>
        </motion.div>

        {/* 统计信息 */}
        <motion.div
          className="flex flex-col justify-center gap-4"
          variants={itemVariants}
        >
          {[
            { label: "今日刷题", value: "12", icon: BookOpen, color: "purple" },
            { label: "掌握度", value: "68%", icon: Trophy, color: "yellow" },
            { label: "错题数", value: "3", icon: Target, color: "red" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-purple-500/20"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.2 }}
              whileHover={{ scale: 1.05, x: 5 }}
            >
              <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
              </div>
              <div>
                <motion.p
                  className="text-xl font-bold text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.2 }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

// 步骤组件 - 错题本
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
      className="w-full max-w-lg"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">智能错题本</h2>
        <p className="text-gray-400">自动收录错题，针对性复习提升</p>
      </motion.div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {mistakes.map((item, index) => (
          <motion.div
            key={item.type}
            className={`p-4 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/30 text-center`}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.15, type: "spring" }}
            whileHover={{ scale: 1.05 }}
          >
            <motion.span
              className={`text-3xl font-bold text-${item.color}-400`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.15 + 0.3 }}
            >
              {item.count}
            </motion.span>
            <p className={`text-sm text-${item.color}-300 mt-1`}>{item.type}</p>
          </motion.div>
        ))}
      </div>

      {/* 错题列表示例 */}
      <motion.div
        className="space-y-3"
        variants={itemVariants}
      >
        {[
          "如何设计一个高并发的推荐系统架构？",
          "解释一下 RPC 和 HTTP 的区别和应用场景",
        ].map((question, index) => (
          <motion.div
            key={index}
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-purple-500/20 hover:bg-purple-500/10 transition-all"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.2 }}
            whileHover={{ x: 5 }}
          >
            <motion.div
              className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: index * 0.5 }}
            >
              <span className="text-xs text-red-400">!</span>
            </motion.div>
            <p className="flex-1 text-sm text-gray-300 truncate">{question}</p>
            <motion.button
              className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs hover:bg-purple-500/30 transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              复习
            </motion.button>
          </motion.div>
        ))}
      </motion.div>

      {/* AI 提示 */}
      <motion.div
        variants={itemVariants}
        className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Brain className="w-6 h-6 text-purple-400" />
          </motion.div>
          <div>
            <p className="text-sm font-medium text-white">AI 诊断</p>
            <p className="text-xs text-gray-400">
              你在系统设计类题目上需要加强，建议针对性练习
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 小蜗日程
function AgendaStep() {
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  const dates = Array.from({ length: 35 }, (_, i) => i - 2);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg"
    >
      <motion.div variants={itemVariants} className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">小蜗日程</h2>
        <p className="text-gray-400">面试日期自动标绿，备考有条不紊</p>
      </motion.div>

      <motion.div
        className="p-6 rounded-2xl bg-white/5 border border-purple-500/20"
        variants={itemVariants}
      >
        {/* 日历头部 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">2026年 3月</h3>
          <div className="flex items-center gap-2">
            <motion.div
              className="w-3 h-3 rounded-full bg-green-500"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs text-gray-400">面试日</span>
          </div>
        </div>

        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {days.map((day) => (
            <div key={day} className="text-center text-xs text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1">
          {dates.map((date, index) => {
            const isInterviewDay = [15, 18, 22].includes(date);
            const isToday = date === 14;

            return (
              <motion.div
                key={index}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm relative ${
                  date > 0 && date <= 31
                    ? isInterviewDay
                      ? "bg-green-500 text-white font-semibold"
                      : isToday
                        ? "bg-purple-500 text-white"
                        : "bg-white/5 text-gray-300 hover:bg-white/10"
                    : ""
                }`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                whileHover={date > 0 && date <= 31 ? { scale: 1.1 } : {}}
              >
                {date > 0 && date <= 31 ? date : ""}
                {isInterviewDay && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400"
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
        className="mt-4 space-y-2"
      >
        {[
          { date: "3月15日", company: "字节跳动", time: "14:00" },
          { date: "3月18日", company: "阿里巴巴", time: "10:00" },
        ].map((interview, index) => (
          <motion.div
            key={index}
            className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 + index * 0.2 }}
            whileHover={{ x: 5 }}
          >
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {interview.company} 面试
              </p>
              <p className="text-xs text-gray-400">
                {interview.date} {interview.time}
              </p>
            </div>
            <motion.div
              className="px-2 py-1 rounded bg-green-500 text-white text-xs"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              明天
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* 番茄钟 */}
      <motion.div
        variants={itemVariants}
        className="mt-4 flex items-center justify-center gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30"
      >
        <motion.div
          className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          <Clock className="w-6 h-6 text-white" />
        </motion.div>
        <div>
          <p className="text-sm font-medium text-white">专注模式</p>
          <p className="text-xs text-gray-400">25分钟高效备考</p>
        </div>
        <motion.div
          className="text-2xl font-bold text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          25:00
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// 步骤组件 - 面试复盘
function ReviewStep() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">面试复盘</h2>
        <p className="text-gray-400">记录面试表现，持续迭代优化</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        {/* 左侧 - 录音和笔记 */}
        <motion.div
          className="space-y-4"
          variants={itemVariants}
        >
          {/* 录音卡片 */}
          <motion.div
            className="p-4 rounded-xl bg-white/5 border border-purple-500/20"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="w-3 h-3 rounded-full bg-red-500" />
              </motion.div>
              <span className="text-sm font-medium text-white">面试录音</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-8 flex items-end gap-0.5">
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-sm bg-red-500/50"
                    style={{ height: `${Math.random() * 100}%` }}
                    animate={{ height: [`${Math.random() * 100}%`, `${Math.random() * 100}%`] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">12:34</span>
            </div>
          </motion.div>

          {/* 笔记卡片 */}
          <motion.div
            className="p-4 rounded-xl bg-white/5 border border-purple-500/20"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <PenTool className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-white">面试笔记</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 rounded bg-gray-700 w-full" />
              <div className="h-2 rounded bg-gray-700 w-4/5" />
              <div className="h-2 rounded bg-gray-700 w-3/5" />
            </div>
          </motion.div>
        </motion.div>

        {/* 右侧 - 检查清单 */}
        <motion.div
          className="p-4 rounded-xl bg-white/5 border border-purple-500/20"
          variants={itemVariants}
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-white">面试清单</span>
          </div>

          <div className="space-y-3">
            {[
              "确保过一遍常见问题",
              "热身运动",
              "确保打开面试笔记",
              "确保录音",
              "进入会议",
              "准备好 gemini",
            ].map((item, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.15 }}
              >
                <motion.div
                  className={`w-4 h-4 rounded border ${
                    index < 4
                      ? "bg-green-500 border-green-500"
                      : "border-gray-500"
                  } flex items-center justify-center`}
                  initial={index < 4 ? { scale: [0, 1.2, 1] } : {}}
                  animate={index < 4 ? { scale: 1 } : {}}
                  transition={{ delay: 0.5 + index * 0.15 }}
                >
                  {index < 4 && <CheckCircle2 className="w-3 h-3 text-white" />}
                </motion.div>
                <span
                  className={`text-xs ${
                    index < 4 ? "text-gray-400 line-through" : "text-gray-300"
                  }`}
                >
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
        className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30"
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
              本次面试整体表现良好，技术问题回答准确。建议加强项目表述的量化指标，
              下次可以准备更多业务场景案例。
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
