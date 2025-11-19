// test-gemini.js
import * as generativeAI from "@google/generative-ai";

const genAI = new generativeAI.GoogleGenerativeAI("dummy-key");
console.log("✅ genAI created successfully:", !!genAI);
