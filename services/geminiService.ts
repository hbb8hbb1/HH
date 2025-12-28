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
      description: "A catchy, professional title for the interview experience in Chinese.",
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
      
      你的任务是将用户提供的原始面试记录（可能包含口语、错别字、或者杂乱的论坛复制内容）进行“清洗”和“润色”，使其变成一篇结构清晰、干货满满的专业面经，供其他求职者参考。
      
      要求：
      1. **语言**：**必须完全使用简体中文**输出。
      2. **匿名化**：移除具体的面试官姓名、确切的日期（如“张三”、“2023年10月5日”），保留大概时间段（如“10月初”）。
      3. **结构化**：使用 Markdown 格式。将内容按面试轮次分类，例如：## 笔试、## 一面（技术）、## 二面（主管）、## HR面。
      4. **语气**：专业、客观、乐于分享。
      5. **提取元数据**：准确识别公司名称、应聘职位，并根据内容评估难度（1-5分）。
      
      原始文本内容:
      "${rawText}"
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "你是一个智能面经整理助手，专门负责将零散信息转化为高质量的中文求职社区内容。",
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