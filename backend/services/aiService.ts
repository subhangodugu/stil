import { Groq } from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export interface DiagnosticData {
  chipId: string;
  totalChains: number;
  totalFFs: number;
  hasEDT: boolean;
  failingCount: number;
  totalFails: number;
  selectedChain: string;
  failingFFs: string[];
  rawStilSnippet?: string;
  rawLogSnippet?: string;
}

/**
 * Builds a structured, industrial-grade prompt for the AI model.
 */
function buildPrompt(data: DiagnosticData): string {
  return `
    You are an expert Semiconductor Diagnostic Engineer. 
    Analyze the following scan diagnostic data and extract the root cause.
    
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

    RAW STIL CONTEXT (Snippet):
    ${data.rawStilSnippet ? data.rawStilSnippet : "Not provided"}

    RAW FAILURE LOG (Snippet):
    ${data.rawLogSnippet ? data.rawLogSnippet : "Not provided"}
    
    TASK:
    1. Analyze the context and the failing nodes to identify the most probable ROOT CAUSE (Stuck-at-0, Stuck-at-1, Chain Break, or Intermittent).
    2. Extract the exact STIL vector or log evidence that points to this.
    3. Suggest physical failure sources (e.g., metal short, via open, defect).
    4. Provide diagnostic recommendations.

    You MUST return your response as a deeply structured JSON object. Use the following exact JSON format without markdown wrapping outside the JSON:
    {
      "summary": "High level brief explanation",
      "rootCause": "Identified fault and location",
      "confidence": 95,
      "stilEvidence": "Specific V { ... } vector or Log trace here",
      "recommendedAction": ["Action 1", "Action 2"]
    }
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
    const result = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_completion_tokens: 1024,
      response_format: { type: "json_object" }
    });
    return (result.choices[0]?.message?.content || "{}").trim();
  } catch (error) {
    console.error("[AI SERVICE ERROR]", error);
    throw new Error("Industrial AI Diagnostic Engine failed to respond.");
  }
}
