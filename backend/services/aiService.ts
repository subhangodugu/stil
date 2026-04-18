import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export interface DiagnosticData {
  chipId: string;
  totalChains: number;
  totalFFs: number;
  hasEDT: boolean;
  failingCount: number;
  totalFails: number;
  selectedChain: string;
  failingFFs: string[];
}

/**
 * Builds a structured, industrial-grade prompt for the AI model.
 */
function buildPrompt(data: DiagnosticData): string {
  return `
    You are an expert Semiconductor Diagnostic Engineer. 
    Analyze the following scan diagnostic data and provide a professional, deterministic failure analysis report.
    
    CHIP ARCHITECTURE:
    - Chip Identifier: ${data.chipId}
    - Total Scan Chains: ${data.totalChains}
    - Total Flip-Flops: ${data.totalFFs}
    - Compression (EDT): ${data.hasEDT ? 'Active' : 'Bypassed'}
    
    FAILURE DATA:
    - Failing Flip-Flops Count: ${data.failingCount}
    - Total Mismatch Events: ${data.totalFails}
    - Focused Analysis Scope: ${data.selectedChain}
    - Critical Failing Nodes: ${data.failingFFs.join(', ')}
    
    TASK:
    1. Identify the most probable ROOT CAUSE (Stuck-at-0, Stuck-at-1, Chain Break, or Intermittent).
    2. Suggest physical failure sources (e.g., metal short, via open, or transistor leakage).
    3. Provide a Precision Confidence Score (0-100%).
    4. Give a definitive repair/debug recommendation for FA (Failure Analysis).
    
    Format the output as a clean, structured industrial report with professional EDA terminology.
  `;
}

/**
 * Normalizes the AI response for consistent UI rendering.
 */
function formatResponse(text: string): string {
  if (!text) return "Unable to generate diagnostic insight.";
  return text.trim();
}

/**
 * Primary server-side entry point for generating diagnostic insights.
 */
export async function generateAIInsight(data: DiagnosticData): Promise<string> {
  try {
    const prompt = buildPrompt(data);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return formatResponse(response.text());
  } catch (error) {
    console.error("[AI SERVICE ERROR]", error);
    throw new Error("Industrial AI Diagnostic Engine failed to respond.");
  }
}
