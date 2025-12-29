import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ProcessedResponse } from '../types';

// Initialize the Gemini client
// API Key is injected via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelId = 'gemini-3-flash-preview';

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A catchy, professional title for the interview experience in Chinese. If original title is available in HTML, refine it.",
    },
    processedContent: {
      type: Type.STRING,
      description: "The rewritten interview experience in Simplified Chinese Markdown format. Use headers like ## 背景, ## 笔试, ## 技术面, ## 行为面. Remove personal info.",
    },
    company: {
      type: Type.STRING,
      description: "The name of the company. Keep English name if it's an MNC (e.g. Google), otherwise use Chinese.",
    },
    role: {
      type: Type.STRING,
      description: "The job role (e.g., 前端工程师, Product Manager).",
    },
    difficulty: {
      type: Type.INTEGER,
      description: "A rating from 1 (Easy) to 5 (Very Hard).",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 3-5 keywords in Chinese or English (e.g., '动态规划', 'System Design').",
    },
  },
  required: ["title", "processedContent", "company", "role", "difficulty", "tags"],
};

export const processInterviewContent = async (rawText: string): Promise<ProcessedResponse> => {
  try {
    const prompt = `
      你是一位专业的互联网求职面经主编。
      
      你的任务是将用户提供的原始内容（可能是纯文本，也可能是包含HTML标签的网页源码）进行“清洗”和“润色”，使其变成一篇结构清晰、干货满满的专业面经。
      
      **特别注意 - HTML处理规则**：
      1. 输入内容可能包含 HTML 标签（如 <div class="thread_subject">, <div class="article_body">）。
      2. **必须忽略** 具有 'jammer' 类的标签及其内容（例如 <font class="jammer">...</font>），这些是反爬虫噪音。
      3. **必须忽略** 广告代码、页面导航、无关的 CSS 样式和脚本。
      4. 优先从 class="thread_subject" 中提取标题，从 class="article_body" 中提取主要内容。
      
      **内容生成要求**：
      1. **语言**：**必须完全使用简体中文**输出。
      2. **匿名化**：移除具体的面试官姓名、确切的日期、楼主ID等个人隐私信息。
      3. **结构化**：使用 Markdown 格式。将内容按面试轮次分类，例如：## 笔试、## 一面（技术）、## 二面（主管）、## HR面。
      4. **语气**：专业、客观、乐于分享。
      5. **提取元数据**：准确识别公司名称（如 Meta, Google, 字节）、应聘职位，并根据内容评估难度（1-5分）。
      
      原始输入内容:
      """
      ${rawText}
      """
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "你是一个智能面经整理助手，擅长从杂乱的HTML或文本中提取核心面试信息，去除反爬虫噪音。",
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No response from AI");
    }

    const data = JSON.parse(jsonText) as ProcessedResponse;
    return data;

  } catch (error) {
    console.error("Gemini processing error:", error);
    throw error;
  }
};