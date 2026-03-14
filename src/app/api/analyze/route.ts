export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import mammoth from "mammoth";
import PDFParser from "pdf2json";
import { createClient } from "@supabase/supabase-js";
import { addRecord, calculateRank } from "@/utils/recordStore";

// === 全局错误捕获 ===
process.on("uncaughtException", (err) => {
  console.error("💥 未捕获异常:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("💥 未处理的 Promise 拒绝:", reason);
});

console.log("🐌 [SERVER INIT] Runtime:", process.env.NODE_ENV);
console.log("🐌 [SERVER INIT] Has OPENAI key:", !!process.env.OPENAI_API_KEY);
console.log("🐌 [SERVER INIT] Has SUPABASE URL:", !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL));
console.log("🐌 [SERVER INIT] Has SUPABASE ROLE:", !!process.env.SUPABASE_SERVICE_ROLE);

// ✅ 延迟初始化 Supabase 客户端
let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !key) {
      console.warn("⚠️ [Supabase] 环境变量未配置，文件上传功能将被禁用");
      return null;
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

async function extractTextFromUploadedFile(
  file: File,
  fileBuffer: Buffer,
  options: { allowPlainText?: boolean } = {}
) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".pdf")) {
    const pdfParser = new PDFParser();

    return await new Promise<string>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData: any) =>
        reject(errData?.parserError || errData)
      );

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          const allText = pdfData.Pages.map((page: any) =>
            page.Texts.map((t: any) => {
              try {
                return decodeURIComponent(t.R.map((r: any) => r.T).join(""));
              } catch {
                return "";
              }
            }).join(" ")
          ).join("\n");

          resolve(allText);
        } catch (e) {
          console.error("❌ PDF 文本解码失败:", e);
          reject(new Error("PDF 文件包含异常字符，无法完整解析。"));
        }
      });

      pdfParser.parseBuffer(fileBuffer);
    });
  }

  if (fileName.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
    return value;
  }

  if (options.allowPlainText && (fileName.endsWith(".txt") || fileName.endsWith(".md"))) {
    return fileBuffer.toString("utf-8");
  }

  throw new Error(
    options.allowPlainText
      ? "暂不支持此文件类型，请上传 PDF、Word、TXT 或 MD 文件"
      : "暂不支持此文件类型，请上传 PDF 或 Word 文件"
  );
}

function formatQuestionAnswersForPrompt(raw: string) {
  try {
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === "object" && Array.isArray(parsed.questions)) {
      const questions = parsed.questions.filter(
        (item: any) => item && typeof item === "object" && item.answer
      );
      const groups: Array<{ key: "base" | "role" | "followup"; title: string }> = [
        { key: "base", title: "基础题" },
        { key: "role", title: "岗位题" },
        { key: "followup", title: "追问题" },
      ];

      const sections = groups
        .map((group) => {
          const items = questions.filter((item: any) => item.stage === group.key);
          if (items.length === 0) return "";
          return `【${group.title}】\n${items
            .map((item: any) => `- ${item.question || item.id}: ${item.answer}`)
            .join("\n")}`;
        })
        .filter(Boolean)
        .join("\n\n");

      return {
        answersSection: sections || "无补充回答",
        structured: parsed as {
          roleKey?: string;
          targetRole?: string;
          hasPortfolio?: string;
          portfolioLink?: string;
          questions?: Array<{ id: string; stage: string; question: string; answer: string }>;
          rawAnswers?: Record<string, string>;
        },
      };
    }

    if (parsed && typeof parsed === "object") {
      return {
        answersSection: Object.entries(parsed)
          .map(([key, value]) => `- ${key}: ${String(value)}`)
          .join("\n") || "无补充回答",
        structured: null,
      };
    }
  } catch {}

  return {
    answersSection: "无补充回答",
    structured: null,
  };
}

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file = data.get("file") as File;
    const target_role = data.get("target_role") || "未指定岗位";
    const jd = (data.get("jd") as string) || "";
    const mode = (data.get("mode") as string) || "legacy";
    const questionAnswers = (data.get("question_answers") as string) || "{}";
    const model = (data.get("model") as string) || "gpt-5";
    const hasPortfolio = (data.get("has_portfolio") as string) || "no";
    const portfolioLink = (data.get("portfolio_link") as string) || "";
    const portfolioFile = data.get("portfolio_file");

    if (!file) {
      return NextResponse.json({ error: "未收到文件" }, { status: 400 });
    }

    // ✅ 1️⃣ 读取文件内容（只读取一次）
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    // ✅ 2️⃣ 上传文件到 Supabase Storage（如果配置了）
    const supabase = getSupabaseClient();
    let fileUrl = "";

    if (supabase) {
      const cleanName = file.name.replace(/[^\w.-]/g, "_");
      const fileName = `${Date.now()}_${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, fileBuffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.warn("⚠️ 文件上传失败:", uploadError);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from("uploads")
          .getPublicUrl(fileName);
        fileUrl = publicUrlData.publicUrl;
        console.log("✅ 上传成功:", fileUrl);
      }
    } else {
      console.log("📄 跳过文件上传（Supabase 未配置）");
    }

    // ✅ 3️⃣ 提取简历文本内容
    let text = "";
    try {
      text = await extractTextFromUploadedFile(file, fileBuffer);
    } catch (err: any) {
      console.error("❌ 简历文件解析失败:", err);
      return NextResponse.json(
        { error: err.message || "暂不支持此文件类型，请上传 PDF 或 Word 文件" },
        { status: 400 }
      );
    }

    // ✅ 如果文本为空
    if (!text.trim()) {
      return NextResponse.json(
        { error: "未能从文件中提取有效文本，请检查文件内容" },
        { status: 400 }
      );
    }


    // ✅ 限制长度防止 tokens 爆掉
    text = text.slice(0, 5000);

    let portfolioText = "";
    if (portfolioFile instanceof File) {
      try {
        const portfolioArrayBuffer = await portfolioFile.arrayBuffer();
        const portfolioBuffer = Buffer.from(portfolioArrayBuffer);
        portfolioText = await extractTextFromUploadedFile(portfolioFile, portfolioBuffer, {
          allowPlainText: true,
        });
        portfolioText = portfolioText.slice(0, 3000);
      } catch (err: any) {
        console.error("❌ 作品集文件解析失败:", err);
        return NextResponse.json(
          { error: err.message || "作品集文件解析失败，请改用 PDF、Word、TXT 或 MD" },
          { status: 400 }
        );
      }
    }

    const jdSection = jd.trim()
      ? `
---

📋 **【岗位描述 JD】（供参考，请结合 JD 要求评估简历匹配度）**
${jd.trim().slice(0, 3000)}
`
      : "";

    // 根据模式选择不同的提示模板
    let prompt: string;
    
    if (mode === "talent_profile") {
      // 能力画像模式 - 动态问题结构
      const { answersSection } = formatQuestionAnswersForPrompt(questionAnswers);
      const portfolioSection = hasPortfolio === "yes" || portfolioLink.trim() || portfolioText.trim()
        ? `
---

🗂️ **【作品集信息】**
- 是否有作品集：${hasPortfolio === "yes" ? "有" : "无"}
${portfolioLink.trim() ? `- 作品集链接：${portfolioLink.trim()}` : "- 作品集链接：未提供"}
${portfolioText.trim() ? `- 作品集文本摘录：\n${portfolioText}` : "- 作品集文件文本：未提供"}
`
        : "";
      
      prompt = `
你是一位非常苛刻的一线招聘经理，不做鼓励式表达，不粉饰差距，也不会为了“好听”而夸大候选人。
请根据候选人的【简历文本】和【补充问答】，生成一份「个人能力画像与经历深度解析报告」。
如果简历质量较差、成果弱、经历与岗位错配明显，请直接写出来；宁可偏严，也不要说漂亮话。
目标岗位方向：「${target_role}」

---

📋 **【简历文本】**
${text}

---

💬 **【补充问答】**
${answersSection || "无补充回答"}

${portfolioSection}

---

🎯 **五维筛选打分规则（满分5分，宁严勿松）**

请严格按以下标准打分，并结合【补充问答】中的内容综合判断。补充问答只能作为辅助判断，不能覆盖简历里客观缺失的硬伤。
其中：
- 基础题：看通用硬实力、结果意识、岗位动机
- 岗位题：看该岗位的真实对口度和思考方式
- 追问题：看回答是否具体、自洽、有证据，能否拉开区分度
- 作品集：只能作为辅助证据；如果作品集很弱、很空或和岗位无关，不仅不能加分，还应暴露短板

如果用户在题目中回答空泛、只有形容词、没有数字、没有个人贡献、没有方法或与岗位无关，应重点压低 projectDescription、achievements、jobMatch。

**1. 学历门槛（1–5 分，对应 education）**
- Top2（清北）≈ 4.5–5；985 强校 ≈ 4–4.5；其他 985 ≈ 3.5–4；211 ≈ 3–3.5；普通一本 ≈ 2–2.5；二本及以下 ≈ 1–2。
- 有研究生学历叠加：985 研 ≈ +0.5；QS100 海外硕 ≈ +0.4；211 研 ≈ +0.3。
- 专业与岗位对口可酌情 +0.2。

**2. 相关经历（1–5 分，对应 experience）**
- 只看与目标岗位垂直相关的实习、工作或高质量项目。泛泛经历、校园活动、非相关兼职不要高估。
- 1分：只有 1 段弱相关经历；2分：2 段普通相关经历；3分：3 段相关经历或 2 段较强相关；4分：3 段以上且含头部平台/明确职责；5分：多段强相关经历且有明确成果证明。

**3. 项目表达（1–5 分，对应 projectDescription）**
- 评估是否体现 STAR 法则，以及是否能说清楚问题、动作、结果和个人贡献。
- 1–2分：只堆职责、概念空泛、看不出个人贡献；3分：能看懂做了什么，但结构一般；4分：大多数经历说明白了问题与动作；5分：表达清楚、重点准确、结果与方法论都成立。

**4. 结果证明（1–5 分，对应 achievements）**
- 有可验证量化结果、上线结果、业务影响、奖项/论文/专利等硬证明得分高。
- 只有“参与过”“负责过”“协助过”这类描述，没有结果闭环，分数应明显压低。

**5. 岗位对口（1–5 分，对应 jobMatch）**
- 综合以上维度与岗位契合度，严格拉开区分度，不给同情分。
- 如果目标岗位和简历主线明显错位，例如专业、经历、项目都不对口，最高不超过 2.5 分。

---

🧾 **输出格式（仅返回以下 JSON，不要其他内容）**

{
  "oneSentencePosition": "string - 一句话定位，允许直接写出短板或错配，例如“学历普通、相关经历偏弱的转岗尝试者”",
  "summary": "string - 总评 120-200 字，先写匹配结论和核心短板，再补充少量可成立的亮点；如果错配明显，要直接点明",
  "hexagonScores": {
    "education": number (1-5, 学历门槛),
    "experience": number (1-5, 相关经历),
    "projectDescription": number (1-5, 项目表达),
    "achievements": number (1-5, 结果证明),
    "jobMatch": number (1-5, 岗位对口)
  },
  "topHighlight": {
    "title": "string - 最高光经历标题；如果没有明显高光，可写“仅有基础经历”",
    "content": "string - 压缩成一段，只保留最能站得住的一点，60字以内"
  },
  "topRisk": {
    "issue": "string - 唯一最值得关注的潜在风险",
    "impact": "string - 对求职的影响，30字以内"
  },
  "talentTags": {
    "direction": "string - 目标岗位方向",
    "archetype": "string - 人物原型: 错配型/待打磨型/执行型/表达型/研究型/综合型 之一",
    "riskLevel": "low|medium|high"
  },
  "overallMatch": number (1-10, 综合匹配度，用于排名，严格反映真实录用概率；如严重错配，可显著低于五维平均*2)
}

---

⚠️ **重要**
1. 只输出 JSON，不要 markdown 代码块包裹
2. topHighlight 只总结一点，压缩出最高光
3. topRisk 只说一点，不要改进建议
4. 五维分数满分5分，严格按规则打分
5. 结合补充问答中用户的回答来丰富判断，但不要因为回答积极就抬高硬实力分数
6. 如果整体一般或偏差，请明确写弱，不要使用“潜力很大”“商业化敏感度强”这类无证据夸奖
7. 如果基础题、岗位题、追问题之间前后矛盾，或回答明显空泛，请把这视为风险信号
`;
    } else {
      // 传统模式 - 原有格式
      prompt = `
你是一位在外企或大型互联网公司任职的招聘经理，习惯从竞争力、逻辑性与结果导向角度**严格、挑剔**地评估候选人，**不给同情分、不粉饰差距**。
请你以**专业、挑剔、不粉饰的口吻**，根据以下【中文简历文本】对应聘岗位「${target_role}」进行分析与打分。综合匹配度要**拉开区分度**：除非候选人达到「清北复交 + 多年国奖 + 专业对口 + 3 段垂直实习」的顶尖配置，否则综合分不得超过 7.6。${jdSection}

---

🎯 **各维度评分规则（必须严格按下列标准打分，浮点数 1 位小数）：**

**1. 教育背景（1–5 分）**
- 仅看本科时：Top2（清北）≈ 4.5–5；985 强校（华五、中坚九校等）≈ 4–4.5；其他 985 ≈ 3.5–4；211 强校 ≈ 3–3.5；普通 211 ≈ 2.5–3；普通一本 ≈ 2–2.5；二本及以下 ≈ 1–2。
- 有研究生学历时，在本科基础上叠加：985 研 ≈ +0.5；QS100 海外硕 ≈ +0.4–0.5；211 研 ≈ +0.3；普通本科/双非研 ≈ +0.1–0.2。本硕结合取「本科档 + 研究生加成」后的综合档位，不超过 5。
- 专业与岗位对口可酌情 +0.2；跨专业但有相关项目/实习可维持或略减。

**2. 实习与项目经验（1–5 分）**
- 只看**与目标岗位垂直相关的实习/项目**（同行业、同职能或强相关）。
- 1 分：有至少 1 段相关实习或 1 个相关项目经历。
- 2 分：2 段垂直实习或 2 个垂直项目。
- 3 分：3 段及以上垂直实习/项目，或 2 段实习 + 1 个高质量项目。
- 4 分：3 段以上垂直实习且含大厂/知名公司，或项目有明确成果与影响力。
- 5 分：3 段以上大厂/头部公司垂直实习，或 2 段以上 + 有可验证的突出成果（如上线、获奖、核心负责）。

**3. 项目描述（1–5 分）**
- 评估项目/实习描述是否体现 **STAR 法则**（Situation 背景 / Task 任务 / Action 行动 / Result 结果），以及是否体现**解决问题能力**和**是否形成 SOP/方法论**。
- 1–2 分：只堆砌职责、无背景与结果；或大量罗列数量（如「写了 N 个 PRD」「完成 M 次需求评审」）而无问题定义、解决过程与业务影响。
- 3 分：有部分 STAR 结构，能看出做了什么、结果如何，但问题与难点、个人贡献不够清晰。
- 4 分：多数经历符合 STAR，能看出解决的问题、采取的行动和可量化的结果；有简单的方法论或沉淀。
- 5 分：结构清晰、问题明确、行动具体、结果可验证；能看出形成 SOP、方法论或可复用的解决问题能力；无单纯堆数据。

**4. 成就与量化指标（1–5 分）**
- 沿用通用标准：有可验证的量化结果（如提升 X%、节省 Y 人天、负责 Z 用户）得分更高；仅有定性描述或模糊表述得分较低。

**5. 荣誉与闪光点（1–5 分）**
- 学校荣誉：奖学金（国奖/一等/二等）、竞赛获奖（ACM、数模、学科竞赛等）、优秀毕业生、荣誉学位等，按层级与数量加分。
- 特别擅长的技能：如某技术栈/领域有证书、开源贡献、论文、专利、明显超出常人的成果，可加分。
- 1 分：几乎无荣誉、无突出技能描述。2–3 分：少量奖学金或一般荣誉。4 分：多项荣誉或 1–2 项突出技能/成果。5 分：荣誉丰富且层级高，或技能/成果显著且与岗位相关。

---

**综合匹配度（1–10 分）**：**必须拉开区分度、宁严勿松，不要给同情分。** 综合以上维度与岗位契合度，贴近真实录用概率。
- **9.0–10.0 分**：**仅限「顶尖配置」**——本科清北复交级别 + 多年国奖/顶级荣誉 + 专业对口 + 3 段及以上垂直对口实习；四项条件均满足方可进入此档，否则一律不得高于 7.6。
- **7.6 分及以下**：其余所有候选人**一律不超过 7.6 分**，用分数体现与岗位的客观差距：
  - 6.5–7.6：各维度优秀但未达顶尖（如非清北复交、或荣誉/实习未全齐）。
  - 5.0–6.4：有潜力但简历仍有明显短板。
  - 3.0–4.9：存在较大差距，需重点优化。
  - 1.0–2.9：与岗位要求差距很大。

---

🧾 **输出格式要求：**

请严格返回如下 JSON 格式（中文，字段名与顺序不可变），所有分数为浮点数（float）：

{
  "教育背景": number (float, 1–5),
  "实习与项目经验": number (float, 1–5),
  "项目描述": number (float, 1–5),
  "成就与量化指标": number (float, 1–5),
  "荣誉与闪光点": number (float, 1–5),
  "综合匹配度": number (float, 1–10),
  "简历总结": "string（简洁、专业、具建设性批评，可指出改进方向）"
}

---

【中文简历文本】
${text}
`;
    }



    // ✅ 调用 AI 分析（根据模型选择不同提供商）
    console.log(`🟢 [Step 10] 开始调用 AI API，模型: ${model}`);

    let result: string;

    if (model.startsWith("Qwen/") || model.includes("siliconflow")) {
      // 使用硅基流动 (SiliconFlow)
      result = await callSiliconFlow(model, prompt);
    } else {
      // 使用 OpenAI
      result = await callOpenAI(model, prompt);
    }

    console.log("🟢 [Step 11] AI 分析完成, 输出长度:", result.length);

    // === 解析评分（能力画像模式与传统模式格式不同）===
    let score = 0;
    try {
      const rawJson = mode === "talent_profile" ? extractJsonFromText(result) || result : result;
      const parsed = JSON.parse(rawJson);
      score = mode === "talent_profile"
        ? (parsed.overallMatch ?? (parsed.hexagonScores?.jobMatch ? parsed.hexagonScores.jobMatch * 2 : 0) ?? parsed.legacyScores?.overallMatch ?? 0)
        : (parsed.综合匹配度 ?? 0);
    } catch (e) {
      console.error("⚠️ [Step 12] JSON 解析失败，AI 输出非标准格式:", e);
    }
    console.log("🟢 [Step 13] 提取匹配度分数:", score);

    // === 写入数据库并计算排名 ===
    let rankPercent = 50;
    let total = 1;

    try {
      await addRecord(target_role as string, score);
      console.log("🟢 [Step 14] addRecord 写入成功");

      const rankData = await calculateRank(score);
      rankPercent = rankData.rankPercent;
      total = rankData.total;
      console.log("🟢 [Step 15] calculateRank 计算成功:", { rankPercent, total });
    } catch (dbErr) {
      console.error("⚠️ [DB WARNING] Supabase 操作失败（非致命）:", dbErr);
      // 使用默认值继续，不中断流程
    }

    // 能力画像模式：从 LLM 输出中提取 JSON（可能被 ```json ... ``` 包裹）
    let analysisOutput = result;
    if (mode === "talent_profile") {
      const extracted = extractJsonFromText(result);
      if (extracted) analysisOutput = extracted;
    }

    return NextResponse.json({
      analysis: analysisOutput,
      resumeText: text,
      rankPercent,
      total,
      fileUrl,
    });
  } catch (err: any) {
    console.error("❌ [SERVER ERROR] 捕获异常:", err);
    return NextResponse.json(
      { error: err.message || "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 从 LLM 输出中提取 JSON（可能被 ```json ... ``` 包裹）
function extractJsonFromText(text: string): string | null {
  const trimmed = text.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlock) {
    return jsonBlock[1].trim();
  }
  // 尝试直接解析
  const braceStart = trimmed.indexOf("{");
  if (braceStart >= 0) {
    let depth = 0;
    let end = -1;
    for (let i = braceStart; i < trimmed.length; i++) {
      if (trimmed[i] === "{") depth++;
      if (trimmed[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end >= 0) return trimmed.slice(braceStart, end + 1);
  }
  return null;
}

// 调用 OpenAI API
async function callOpenAI(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 未配置");
  }

  const client = new OpenAI({ apiKey });

  const completion = await client.responses.create({
    model: model || "gpt-5",
    input: prompt,
  });

  return completion.output_text || "AI 未返回结果";
}

// 调用 SiliconFlow API
async function callSiliconFlow(model: string, prompt: string): Promise<string> {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) {
    throw new Error("SILICONFLOW_API_KEY 未配置");
  }

  const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SiliconFlow API 错误: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "AI 未返回结果";
}
