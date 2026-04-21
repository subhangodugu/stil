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
  // Advanced Diagnostic Signatures
  patternSynchronicity?: number; // 0.0 - 1.0 (fails on same pattern across chains)
  clusterDensity?: number;       // 0.0 - 1.0 (fails concentrated in bit range)
  commonClockDomain?: string;    // If multiple failing FFs share a domain
  failedChainIndices?: number[]; // To infer physical adjacency
  rawStilSnippet?: string;
  rawLogSnippet?: string;
}

/**
 * Builds a structured, industrial-grade prompt for the AI model.
 */
function buildPrompt(data: DiagnosticData): string {
  return `
    You are an expert Silicon Forensic & Scan Diagnostic Engineer. 
    Analyze the following diagnostic signatures to identify the specific defect type.
    
    CHIP ARCHITECTURE:
    - Unit ID: ${data.chipId}
    - Scan Configuration: ${data.totalChains} chains, ${data.totalFFs} FFs
    - Compression (EDT): ${data.hasEDT ? 'Enabled' : 'Disabled'}
    - Focus Domain: ${data.commonClockDomain || "Mixed/Unknown"}
    
    FORENSIC SIGNATURES:
    - Failing Node Cluster: ${data.selectedChain} [${data.failingFFs.join(', ')}]
    - Pattern Synchronicity: ${data.patternSynchronicity ? (data.patternSynchronicity * 100).toFixed(1) : "0"}% (High indicates Bridge or Power Droop)
    - Cluster Density: ${data.clusterDensity ? (data.clusterDensity * 100).toFixed(1) : "0"}% (High indicates Spot Defect)
    - Affected Neighbors: ${data.failedChainIndices ? `Chains near indices [${data.failedChainIndices.join(', ')}]` : "Unknown"}
    - Total Mismatch Events: ${data.totalFails}

    DEFECT TAXONOMY GUIDELINES:
    1. STUCK-AT: Constant mismatch (0 or 1) on a single node across many patterns.
    2. BRIDGE FAULT: Synchronous failures across physically adjacent chains/bits.
    3. CHAIN BREAK: Continuous failures on all bits downstream/upstream of a 특정 FF.
    4. HOLD-TIME / SETUP: Intermittent or pattern-specific failures, often frequency dependent.
    5. SECONDARY PROPAGATION: Failures that are collateral damage from a root cause elsewhere.

    RAW DATA CONTEXT:
    STIL Snippet: ${data.rawStilSnippet || "N/A"}
    LOG Snippet: ${data.rawLogSnippet || "N/A"}
    
    TASK:
    1. Diagnose the precise DEFECT TYPE (Bridge, Stuck-at, Break, etc.).
    2. Identify the ROOT CAUSE location (Chain & FF).
    3. Calculate a CONFIDENCE SCORE (0-100%).
    4. Provide a Failure Analysis (FA) checklist for physical verification.

    OUTPUT FORMAT (Strict JSON):
    {
      "summary": "High-level summary of findings",
      "defectType": "STUCK_AT | BRIDGE | CHAIN_BREAK | TIMING | UNKNOWN",
      "rootCause": "Chain X, Bit Y",
      "confidence": 95,
      "stilEvidence": "Reference to specific vector or log line",
      "faChecklist": ["Step 1: Check Metal 2 for shorts", "Step 2: ..."]
    }
  `;
}

/**
 * Builds a prompt for the STIL Auditor Agent to analyze structural metadata.
 */
function buildSTILAuditPrompt(snippet: string): string {
  return `
    You are an expert STIL (Standard Test Interface Language) Auditor.
    Analyze the provided raw STIL snippet and provide a technical audit.
    
    STIL CONTENT:
    ${snippet}
    
    TASK:
    1. Identify the Test Type (FullScan, BoundaryScan, etc.)
    2. Extract Scan Chain configuration (Count, typical length).
    3. Detect if Compression (EDT) or Test Compression is active.
    4. Summarize the Macro or Procedure logic used for shifting and capture.
    5. Flag any non-standard syntax or architectural complexities.

    You MUST return a JSON object with this exact structure:
    {
      "architecture": "High-level summary (e.g. 64 chains, EDT active)",
      "testType": "The detected test mode",
      "compression": "Details on decompressor/compactor if found",
      "procedureAnalysis": "Explanation of Load/Unload/Capture logic",
      "complianceFlags": ["Flag 1", "Flag 2"]
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
 * Helper to get an initialized Groq instance
 */
function getGroqClient(apiKey?: string) {
  if (apiKey) return new Groq({ apiKey });
  return groq;
}

/**
 * Primary server-side entry point for generating diagnostic insights.
 */
export async function generateAIInsight(data: DiagnosticData, apiKey?: string, model?: string): Promise<string> {
  try {
    const prompt = buildPrompt(data);
    const client = getGroqClient(apiKey);
    const result = await client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: model || "llama-3.3-70b-versatile",
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

/**
 * STIL Auditor Agent: Performs structural analysis on raw STIL headers.
 */
export async function auditSTILFile(snippet: string, apiKey?: string, model?: string): Promise<string> {
  try {
    const client = getGroqClient(apiKey);
    const result = await client.chat.completions.create({
      messages: [{ role: "user", content: buildSTILAuditPrompt(snippet) }],
      model: model || "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    return (result.choices[0]?.message?.content || "{}").trim();
  } catch (error) {
    console.error("[STIL AUDITOR ERROR]", error);
    return JSON.stringify({ architecture: "Unknown", error: "AI Audit service unavailable" });
  }
}
