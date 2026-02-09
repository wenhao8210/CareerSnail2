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
console.log("🐌 [SERVER INIT] Has SUPABASE URL:", !!process.env.SUPABASE_URL);
console.log("🐌 [SERVER INIT] Has SUPABASE ROLE:", !!process.env.SUPABASE_SERVICE_ROLE);



// ✅ 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file = data.get("file") as File;
    const target_role = data.get("target_role") || "未指定岗位";
    const jd = (data.get("jd") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "未收到文件" }, { status: 400 });
    }

    // ✅ 1️⃣ 上传文件到 Supabase Storage
    const cleanName = file.name.replace(/[^\w.-]/g, "_");
    const fileName = `${Date.now()}_${cleanName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    const fileUrl = publicUrlData.publicUrl;

    console.log("✅ 上传成功:", fileUrl);

    // ✅ 提取文本内容
    let text = "";

    if (file.name.endsWith(".pdf")) {
      const pdfParser = new PDFParser();

      text = await new Promise<string>((resolve, reject) => {
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
                  return ""; // 忽略解码错误的片段
                }
              }).join(" ")
            ).join("\n");

            resolve(allText);
          } catch (e) {
            console.error("❌ PDF 文本解码失败:", e);
            reject(new Error("PDF 文件包含异常字符，无法完整解析。"));
          }
        });

        pdfParser.parseBuffer(buffer);
      });
    }

    // ✅ 新增：Word (.docx) 文件解析
    else if (file.name.toLowerCase().endsWith(".docx")) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        // ✅ 关键修复：转换成 Node.js Buffer
        const buffer = Buffer.from(arrayBuffer);
        const { value } = await mammoth.extractRawText({ buffer });
        text = value;
        console.log("✅ Word 文件解析成功, 字符数:", text.length);
      } catch (err) {
        console.error("❌ Word 文件解析失败:", err);
        return NextResponse.json(
          { error: "无法读取 Word 文件，请重新保存为 .docx 格式后再上传" },
          { status: 400 }
        );
      }
    }



    // ✅ 其他类型提示
    else {
      return NextResponse.json(
        { error: "暂不支持此文件类型，请上传 PDF 或 Word 文件" },
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

    // ✅ 调用 OpenAI 分析
    // ✅ 调用 OpenAI 分析（增强版，兼容所有运行环境）
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env["OPENAI_API_KEY"],
    });

    const jdSection = jd.trim()
      ? `
---

📋 **【岗位描述 JD】（供参考，请结合 JD 要求评估简历匹配度）**
${jd.trim().slice(0, 3000)}
`
      : "";

    const prompt = `
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



    console.log("🟢 [Step 10] 开始调用 OpenAI API");

    const completion = await client.responses.create({
      model: "gpt-5",
      input: prompt,
    });

    const result = completion.output_text || "AI 未返回结果";
    console.log("🟢 [Step 11] AI 分析完成, 输出长度:", result.length);

    // === 解析评分 ===
    let score = 0;
    try {
      score = JSON.parse(result)["综合匹配度"];
    } catch (e) {
      console.error("⚠️ [Step 12] JSON 解析失败，AI 输出非标准格式:", e);
    }
    console.log("🟢 [Step 13] 提取匹配度分数:", score);

    // === 写入数据库并计算排名 ===
    try {
      await addRecord(target_role as string, score);
      console.log("🟢 [Step 14] addRecord 写入成功");

      const { rankPercent, total } = await calculateRank(score);
      console.log("🟢 [Step 15] calculateRank 计算成功:", { rankPercent, total });

      return NextResponse.json({
        analysis: result,
        resumeText: text,
        rankPercent,
        total,
        fileUrl,
      });
    } catch (dbErr) {
      console.error("❌ [DB ERROR] Supabase 写入或查询失败:", dbErr);
      return NextResponse.json(
        { error: "Supabase 写入失败，请检查数据库连接" },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("❌ [SERVER ERROR] 捕获异常:", err);
    return NextResponse.json(
      { error: err.message || "服务器内部错误" },
      { status: 500 }
    );
  }
}
