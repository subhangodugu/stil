import { Groq } from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

async function testApiKey() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("❌ GROQ_API_KEY is missing in .env");
    return;
  }
  
  const groq = new Groq({ apiKey });
  try {
    console.log("📡 Testing Groq API Key...");
    const result = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Say 'STIL AI Connected'" }],
      model: "llama-3.3-70b-versatile",
    });
    console.log("✅ API Success:", result.choices[0]?.message?.content);
  } catch (error: any) {
    console.error("❌ API Test Failed:", error.message);
  }
}

testApiKey();
