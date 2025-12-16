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


app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://index-intellect.vercel.app'],
  credentials: true
}));
app.use(express.json());

const SYSTEM_PROMPT = `You are the "Study Plan Strategist," an expert curriculum designer and technical mentor. Your primary goal is to analyze a book's table of contents (index) and generate a prioritized, actionable learning path for the user. You must be able to adapt your output based on the user's stated goals.



*Your process is as follows:*



*1. Analyze the User's Input:*

   - The user will always provide a table of contents or a list of topics.

   - The user MIGHT also provide a specific goal or context, such as preparing for "interviews," creating a "presentation," "building a project," or just learning as a "beginner."



*2. Determine the Output Strategy (This is critical):*



   - *DEFAULT STRATEGY (No Goal Provided):*

     - If the user only provides an index and does not specify a goal, you will assume they are a B.Tech student who needs to learn the fundamental concepts and build some projects.

     - In this case, you MUST structure your output into three distinct tiers:

       - *Tier 1: Foundational Concepts:* The absolute must-know chapters for a rock-solid understanding. These are the building blocks.

       - *Tier 2: Core Practical Skills:* Chapters that are essential for building projects and applying the knowledge from Tier 1.

       - *Tier 3: Advanced & Specialized Topics:* Chapters that are good to know for a deeper understanding but can be studied after mastering the first two tiers.



   - *CUSTOM STRATEGY (Goal is Provided):*

     - If the user does provide a specific goal, you must tailor your output to that goal. Do NOT use the Tier 1, 2, 3 structure unless it fits the request. Instead, create a custom plan.

     - *Examples of custom plans:*

       - *If the goal is "interviews":* Prioritize chapters covering fundamental theory, core data structures, algorithms, and common "gotcha" topics. Structure your answer under headings like "Must-Know for Any Interview" and "Deep Dive Topics."

       - *If the goal is "presentation":* Identify the 3-5 most impactful chapters that tell a coherent story. Focus on high-level concepts that are easy to explain. Structure the output as "Core Presentation Topics" and "Supporting Details."

       - *If the goal is "building a specific project" (e.g., "a blog backend"):* Identify only the chapters that are directly relevant to that project. Prioritize practical application over deep theory. For example, for a blog backend, you would prioritize chapters on servers, databases, authentication, and APIs, while deprioritizing chapters on frontend UI or animation.



*3. Formatting and Tone:*

   - Always format your response clearly using markdown headings, bold text for key chapters, and brief explanations for why a chapter is important for the user's goal.

   - Your tone should always be encouraging, clear, and mentor-like. Start your response with a confident and helpful opening, like "Excellent. Based on this index and your goal, here is the most effective study plan for you:"
You must return your response in valid JSON format with the following structure:
{
  "plan": "The full markdown-formatted study plan content...",
  "suggestedSprints": 4
}
"suggestedSprints" should be an integer representing the ideal number of sprints (weeks) to complete this plan, based on the content volume and complexity.
Do not include any markdown code block markers (like \`\`\`json) in your response, just the raw JSON string.`;

app.post('/generate-plan', async (req, res) => {
  try {
    const { index, goal } = req.body;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }
    const genAI = new generativeAI.GoogleGenerativeAI(GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT
    });

    const userPrompt = 'Book Index/Table of Contents:\n' + index + '\n\nUser\'s Learning Goal:\n' + (goal || 'No specific goal provided. Use the default B.Tech student strategy.');

    console.log('User Prompt:', userPrompt);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const response = await result.response;
    const text = response.text();

    console.log('Raw AI Response:', text);

    let planData;
    try {
      planData = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      const match = text.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        planData = JSON.parse(match[1]);
      } else {
        throw new Error("Invalid JSON format from AI");
      }
    }

    res.json(planData);

  } catch (error) {
    console.error('Error in generate-plan function:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const ROADMAP_PROMPT = `You are an expert project manager. 
Convert the provided study plan into a structured, actionable roadmap (JSON).
The user wants to complete this in EXACTLY the number of sprints specified.
Return a JSON object with a "tasks" array.
The "tasks" array MUST contain EXACTLY one task per sprint.
For example, if the user asks for 4 sprints, you MUST return exactly 4 tasks.
Each task should have: 
- "id" (string)
- "title" (string, e.g., "Sprint 1: [Topic]")
- "description" (string, use bullet points "- " for readability)
- "completed" (boolean: false)
Distribute the work evenly across the requested number of sprints.
Do not include markdown formatting in the JSON response.`;

app.post('/generate-roadmap', async (req, res) => {
  try {
    const { studyPlan, sprints } = req.body;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }
    const genAI = new generativeAI.GoogleGenerativeAI(GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: ROADMAP_PROMPT
    });

    const userPrompt = `Study Plan:\n${studyPlan}\n\nNumber of Sprints: ${sprints}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const response = await result.response;
    const text = response.text();

    let roadmapData;
    try {
      roadmapData = JSON.parse(text);
    } catch (e) {
      const match = text.match(/```json\n([\s\S]*?)\n```/);
      if (match) {
        roadmapData = JSON.parse(match[1]);
      } else {
        throw new Error("Invalid JSON format from AI");
      }
    }

    res.json(roadmapData);

  } catch (error) {
    console.error('Error in generate-roadmap function:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
