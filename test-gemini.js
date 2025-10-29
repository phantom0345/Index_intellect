const generativeAI = require("@google/generative-ai");

const genAI = new generativeAI.GoogleGenerativeAI("dummy-key");
console.log("✅ genAI created successfully:", !!genAI);
