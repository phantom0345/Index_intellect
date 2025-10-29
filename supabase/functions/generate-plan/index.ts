import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// --- CORS Headers (No changes) ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// --- System Prompt (No changes) ---
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
    - Your tone should always be encouraging, clear, and mentor-like. Start your response with a confident and helpful opening, like "Excellent. Based on this index and your goal, here is the most effective study plan for you:"`;

// --- Deno Server ---
Deno.serve(async (req: Request) => {
  // Handle OPTIONS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { index, goal } = await req.json(); // goal can be empty or null

    // CHANGED: Only 'index' is strictly required.
    if (!index) {
      return new Response(
        JSON.stringify({ error: "Missing required field: index" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // CHANGED: Handle the optional 'goal' field correctly.
    const userPrompt = `Book Index/Table of Contents:
${index}

User's Learning Goal:
${goal || "No specific goal provided. Use the default B.Tech student strategy."}

Please generate a comprehensive, prioritized study plan based on this information.`;

    // CHANGED: Updated model to 'gemini-1.5-flash-latest' to fix 404 error
  // ...existing code...
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GEMINI_API_KEY}`,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: userPrompt }],
            },
          ],
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate study plan from AI", details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let geminiData: any;
    try {
      geminiData = await geminiResponse.json();
    } catch (e) {
      const txt = await geminiResponse.text().catch(() => "");
      console.error("Failed to parse Gemini response JSON:", String(e), txt);
      return new Response(
        JSON.stringify({ error: "Invalid JSON from Gemini", details: txt || String(e) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Robust extraction of text from known possible shapes
    let plan = "No study plan could be generated.";
    try {
      const hasCandidates = Array.isArray(geminiData?.candidates) && geminiData.candidates.length > 0;
      if (hasCandidates) {
        const cand = geminiData.candidates[0];
        plan =
          cand?.content?.parts?.[0]?.text ||
          cand?.content?.text ||
          cand?.text ||
          cand?.output ||
          JSON.stringify(cand);
      } else if (Array.isArray(geminiData.output) && geminiData.output.length > 0) {
        const out = geminiData.output[0];
        plan =
          out?.content?.text ||
          out?.content?.[0]?.text ||
          out?.text ||
          JSON.stringify(out);
      } else if (typeof geminiData.outputText === "string" && geminiData.outputText.length) {
        plan = geminiData.outputText;
      } else if (typeof geminiData.text === "string") {
        plan = geminiData.text;
      } else {
        plan = JSON.stringify(geminiData);
      }
    } catch (e) {
      console.error("Error extracting plan from Gemini data:", String(e), geminiData);
    }

    return new Response(
      JSON.stringify({ plan }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
// ...existing code...

   
  } catch (error) {
    console.error("Error in generate-plan function:", String(error));
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
