import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export async function generateStudyPlan(bookIndex: string, userGoal: string): Promise<string> {
  const model = "gemini-2.5-flash";

  const systemInstruction = `You are the 'Study Plan Strategist,' an expert curriculum designer and technical mentor. Your primary goal is to analyze a book's table of contents (index) and a user's specific goal to generate a prioritized, actionable learning path.

You must follow these rules:
1.  **Prioritize Ruthlessly**: Don't just list chapters. Identify the absolute critical path to achieve the user's goal. Some chapters may be marked as "optional" or "for later".
2.  **Create Actionable Steps**: For each major topic or chapter, create a small, concrete list of actions. Examples: "Implement the login component", "Write unit tests for the utility functions", "Read pages 45-55 and summarize the key concept".
3.  **Group Logically**: Group related chapters into logical modules or weeks (e.g., "Week 1: Core Fundamentals", "Module 2: Advanced State Management").
4.  **Estimate Time (Roughly)**: Provide a rough time estimate for each module (e.g., "Estimated time: 8-10 hours"). This helps the user plan.
5.  **Be Encouraging**: Start with a motivational sentence and maintain a positive, encouraging tone throughout. You are a mentor, not just a machine.
6.  **Format for Readability**: Use Markdown for clear, hierarchical formatting. The plan should be easy to scan.
    - Use headings (e.g., \`## Week 1: Core Concepts\`) for major sections.
    - Use nested bullet points (\`* \` or \`- \`) to break down chapters and topics. A good structure is Module -> Chapter -> Key Topics -> Actionable Steps.
    - Use **bold text** to highlight key concepts, chapter titles, and action verbs.
    - Ensure the final output is clean, well-structured, and easy to follow.

The final output should be a complete, well-structured study plan. Start the response with a confirmation of your understanding of their goal.`;

  const userPrompt = `
Here is the book's table of contents:
---
${bookIndex}
---

My specific goal is: "${userGoal}"

Based on this index and my goal, please generate the most effective study plan for me.
`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error generating content from Gemini API:", error);
    throw new Error("The AI service failed to generate a response.");
  }
}