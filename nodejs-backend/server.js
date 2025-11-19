import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import * as generativeAI from "@google/generative-ai";

dotenv.config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log('GEMINI_API_KEY:', GEMINI_API_KEY ? 'Loaded' : 'Not Loaded');
const app = express();
const port = process.env.PORT || 3001;
// Place this near the top, after dotenv.config()


app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const SYSTEM_PROMPT = 'You are the "Study Plan Strategist," an expert curriculum designer and technical mentor.';

app.post('/generate-plan', async (req, res) => {
  try {
    const { index, goal } = req.body;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }
    const genAI = new generativeAI.GoogleGenerativeAI(GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite",
      systemInstruction: SYSTEM_PROMPT 
    });

    const userPrompt = 'Book Index/Table of Contents:\n' + index + '\n\nUser\'s Learning Goal:\n' + (goal || 'No specific goal provided. Use the default B.Tech student strategy.');

    console.log('User Prompt:', userPrompt);

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const plan = response.text();

    res.json({ plan });

  } catch (error) {
    console.error('Error in generate-plan function:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
