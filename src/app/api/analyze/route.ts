export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import mammoth from "mammoth";
import PDFParser from "pdf2json";
import { createClient } from "@supabase/supabase-js";
import { addRecord, calculateRank } from "@/utils/recordStore";

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

    const prompt = `
   你是一位在外企或大型互联网公司任职的招聘经理，习惯从竞争力、逻辑性与结果导向角度严格评估候选人。
请你以**专业、挑剔、不粉饰的口吻**，根据以下【中文简历文本】对应聘岗位「${target_role}」进行分析与打分。

---

🎯 **评分要求：**

请为每个维度打出 **浮点数分值**（保留 1 位小数，例如 3.7、4.5、8.2），并保持专业一致性。
打分逻辑请参考以下标准：

1 分：明显缺乏相关能力或经验  
2 分：略有相关经历但欠系统性  
3 分：达到行业平均水平  
4 分：具有明显优势或亮点  
5 分：属于顶尖水平、可直接胜任岗位  

综合匹配度以 1–10 评估，应更贴近真实招聘场景下的录用概率，例如：
- 3.0–5.0：较低录用可能  
- 5.1–7.5：具潜力但存在差距  
- 7.6–9.0：岗位高度契合  
- 9.1–10.0：可直接录用  

---

🧾 **输出格式要求：**

请严格返回如下 JSON 格式（中文，字段名与顺序不可变），并确保所有分数为浮点数（float）：

{
  "教育背景": number (float, 1–5),
  "实习与项目经验": number (float, 1–5),
  "技能与工具掌握": number (float, 1–5),
  "表达与逻辑清晰度": number (float, 1–5),
  "成就与量化指标": number (float, 1–5),
  "综合匹配度": number (float, 1–10),
  "简历总结": "string（请保持简洁、专业、具建设性批评，例如指出改进方向）"
}

---

【中文简历文本】
${text}
`;



    const completion = await client.responses.create({
      model: "gpt-5",
      input: prompt,
    });

    const result = completion.output_text || "AI 未返回结果";
    // ✅ 解析 AI 输出中的综合匹配度
    const score = JSON.parse(result)["综合匹配度"];

    // ✅ 写入日志
    addRecord(target_role as string, score);

    // ✅ 计算全局排名
    const { rankPercent, total } = calculateRank(score);

    return NextResponse.json({
      analysis: result,
      resumeText: text,
      rankPercent,
      total,
      fileUrl,
    });
  } catch (err: any) {
    console.error("❌ 服务器错误:", err);
    return NextResponse.json(
      { error: err.message || "服务器内部错误" },
      { status: 500 }
    );
  }
}
