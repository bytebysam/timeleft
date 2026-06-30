import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized GoogleGenAI client to prevent startup crashes if GEMINI_API_KEY is missing.
let aiClient: GoogleGenAI | null = null;
function getAi() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. App is running in simulated sandbox mode.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. API: Prioritize Tasks
app.post("/api/ai/prioritize", async (req, res) => {
  try {
    const { tasks, currentTime } = req.body;
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: "Missing tasks array" });
    }

    const ai = getAi();
    if (!ai) {
      // Sandbox fallback
      const simulatedPriorities = tasks.map((task, index) => {
        const timeDiff = new Date(task.deadline).getTime() - new Date(currentTime).getTime();
        const hoursLeft = Math.max(0, timeDiff / (1000 * 60 * 60));
        
        let score = 50;
        let reason = "This task was analyzed by your local sandbox engine. ";
        let danger = false;

        if (task.completed) {
          score = 5;
          reason += "Task is already complete! Good job keeping ahead.";
        } else {
          if (hoursLeft < 12) {
            score = 95;
            danger = true;
            reason += `CRITICAL: Extremely close deadline (${Math.round(hoursLeft)} hrs left). Take action now.`;
          } else if (hoursLeft < 24) {
            score = 85;
            danger = true;
            reason += `HIGH ALERT: Due within 24 hours. Difficulty is ${task.difficulty}/5. Block focus time soon.`;
          } else if (task.energy === 'high') {
            score = 75;
            reason += "Requires high energy. Tackle this during your peak alertness window.";
          } else {
            score = Math.max(30, Math.min(90, 80 - Math.round(hoursLeft / 2) + task.difficulty * 5));
            reason += "Adequate buffer available. Pace yourself and execute step-by-step.";
          }
        }

        return {
          id: task.id,
          priorityScore: score,
          priorityReason: reason,
          dangerZone: danger
        };
      });

      return res.json({ priorities: simulatedPriorities, sandbox: true });
    }

    const systemInstruction = `You are an expert AI productivity companion specializing in extreme time-management, cognitive load reduction, and ADHD-friendly task breakdown.
Analyze the user's task list and output a JSON list mapping each task ID to:
1. priorityScore (0 to 100): 100 being immediate high-impact high-urgency action, 0 being low urgency/completed.
2. priorityReason: A supportive, hyper-focused, witty explanation of WHY this priority is set, factoring in: deadline proximity, task dependencies, energy requirements, and difficulty.
3. dangerZone (boolean): Set to true if a task has an imminent deadline (e.g. less than 24 hours) and is uncompleted, or is heavily blocking others.

Make the reasons concise, action-oriented, and extremely motivating. DO NOT use dry corporate jargon. Keep completed tasks at a very low score.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Current Time: ${currentTime}\nTasks data:\n${JSON.stringify(tasks)}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["priorities"],
          properties: {
            priorities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "priorityScore", "priorityReason", "dangerZone"],
                properties: {
                  id: { type: Type.STRING },
                  priorityScore: { type: Type.INTEGER },
                  priorityReason: { type: Type.STRING },
                  dangerZone: { type: Type.BOOLEAN }
                }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json({ ...result, sandbox: false });
  } catch (error: any) {
    console.error("Prioritize API error:", error);
    res.status(500).json({ error: error.message || "Failed to prioritize tasks" });
  }
});

// 2. API: Generate Execution Recipe for a hard task
app.post("/api/ai/recipe", async (req, res) => {
  try {
    const { task } = req.body;
    if (!task) {
      return res.status(400).json({ error: "Missing task details" });
    }

    const ai = getAi();
    if (!ai) {
      // Sandbox fallback
      const totalMin = task.estimatedHours * 60 || 90;
      const stepDuration = Math.round(totalMin / 3);
      
      const simulatedRecipe = {
        taskId: task.id,
        taskTitle: task.title,
        steps: [
          {
            id: `${task.id}-step1`,
            stepNumber: 1,
            title: "Setup & Mindset Prep",
            detail: "Clear your desk of all clutter. Open only the tabs required for this task. Set a timer for 25 minutes.",
            durationMinutes: 15,
            completed: false
          },
          {
            id: `${task.id}-step2`,
            stepNumber: 2,
            title: "Core Execution Block",
            detail: `Draft the first main prototype or section. Focus on speed and completeness over perfection. Difficulty is ${task.difficulty}/5.`,
            durationMinutes: stepDuration,
            completed: false
          },
          {
            id: `${task.id}-step3`,
            stepNumber: 3,
            title: "Review & Refine",
            detail: "Take a 5-minute break, then do a pass to check for errors, format, and polish up the final details.",
            durationMinutes: Math.max(15, totalMin - stepDuration - 15),
            completed: false
          }
        ],
        resources: [
          "Google search for best practices on this topic",
          "Focus music playlist (Lofi / Synthwave)",
          "A timer or kitchen clock"
        ],
        recommendedMethod: task.difficulty >= 4 ? "Ultradian Rhythm (90 mins focus + 20 mins break)" : "Pomodoro Technique (25 mins focus + 5 mins break)",
        mindsetTip: "Perfection is the enemy of completed! Just write down a messy draft first, then edit. You have plenty of time if you start now."
      };
      return res.json({ recipe: simulatedRecipe, sandbox: true });
    }

    const systemInstruction = `You are an expert AI executive functioning coach.
Given a specific difficult or looming task, break it down into an "Autonomous Step-by-Step Execution Recipe".
Provide a list of 3 to 5 highly practical, sequential, bite-sized steps that remove cognitive friction and decision-paralysis.
Each step must have:
- title: Brief name
- detail: Specific, concrete instructions on HOW to do it
- durationMinutes: Estimated time
For the overall task, suggest:
- recommendedMethod: e.g. "Pomodoro", "Timeboxing", "Ultradian Rhythm", "5-Minute Rule"
- resources: List 2-3 specific free tools, types of search terms, or helpful items the user should assemble
- mindsetTip: A powerful, reassuring quote or mental trick to defeat procrastination for this specific type of task.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Break down this task:\n${JSON.stringify(task)}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["taskId", "taskTitle", "steps", "resources", "recommendedMethod", "mindsetTip"],
          properties: {
            taskId: { type: Type.STRING },
            taskTitle: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "stepNumber", "title", "detail", "durationMinutes", "completed"],
                properties: {
                  id: { type: Type.STRING },
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  detail: { type: Type.STRING },
                  durationMinutes: { type: Type.INTEGER },
                  completed: { type: Type.BOOLEAN }
                }
              }
            },
            resources: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recommendedMethod: { type: Type.STRING },
            mindsetTip: { type: Type.STRING }
          }
        }
      }
    });

    const recipe = JSON.parse(response.text || "{}");
    res.json({ recipe, sandbox: false });
  } catch (error: any) {
    console.error("Recipe API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate recipe" });
  }
});

// 3. API: Generate Calendar Schedule blocks
app.post("/api/ai/schedule", async (req, res) => {
  try {
    const { tasks, workHours, day } = req.body;
    
    const ai = getAi();
    if (!ai) {
      // Sandbox fallback
      const activeTasks = tasks.filter((t: any) => !t.completed).slice(0, 3);
      const times = ["09:00", "11:00", "14:00"];
      const endTimes = ["10:30", "12:30", "15:30"];
      
      const simulatedBlocks = activeTasks.map((task: any, index: number) => ({
        id: `block-${task.id}-${index}`,
        taskId: task.id,
        title: `AI Block: ${task.title}`,
        startTime: times[index] || "16:00",
        endTime: endTimes[index] || "17:00",
        day: day || "Monday",
        type: 'ai'
      }));

      return res.json({ blocks: simulatedBlocks, sandbox: true });
    }

    const systemInstruction = `You are an AI scheduler. Generate specific calendar time blocks to schedule the user's uncompleted tasks for the day (${day}).
The user preferred focus hours are: ${workHours || "09:00 to 18:00"}.
Place the most difficult or high-energy tasks in the morning when focus is highest.
Allocate reasonable block durations (e.g. 60 to 90 minutes). Ensure they do not overlap.
Return a list of blocks containing:
- id: a unique string
- taskId: matching the task's id
- title: e.g. "AI Block: [Task Name]"
- startTime: e.g. "09:30"
- endTime: e.g. "11:00"
- day: Must match the requested day (${day})
- type: "ai"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Day: ${day}\nWorking hours: ${workHours}\nUncompleted Tasks:\n${JSON.stringify(tasks.filter((t: any) => !t.completed))}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["blocks"],
          properties: {
            blocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "taskId", "title", "startTime", "endTime", "day", "type"],
                properties: {
                  id: { type: Type.STRING },
                  taskId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  startTime: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  day: { type: Type.STRING },
                  type: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json({ blocks: result.blocks, sandbox: false });
  } catch (error: any) {
    console.error("Scheduler API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate schedule blocks" });
  }
});

// 4. API: Assistant Chat (Coaches user and suggests actions)
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history, tasks, habits } = req.body;

    const ai = getAi();
    if (!ai) {
      // Sandbox fallback chat
      let fallbackText = "I'm in sandbox mode because no GEMINI_API_KEY was found, but I can still coach you! Let's stay focused. ";
      if (message.toLowerCase().includes("overwhelm") || message.toLowerCase().includes("stress") || message.toLowerCase().includes("hard")) {
        fallbackText += "It's completely normal to feel overwhelmed. When you have a lot of deadlines, your brain experiences decision fatigue. Here's a tip: pick just ONE task, ideally a low-energy one, and complete it in 5 minutes. This creates a dopamine loop that gets you going. What's one thing you can check off right now?";
      } else if (tasks && tasks.length > 0) {
        const next = tasks.find((t: any) => !t.completed);
        fallbackText += `Looking at your list, "${next ? next.title : tasks[0].title}" seems like a great candidate to tackle next. Would you like me to build a step-by-step Execution Recipe for it?`;
      } else {
        fallbackText += "Try adding a task first with a deadline, and I'll help you prioritize it instantly!";
      }
      return res.json({ text: fallbackText, sandbox: true });
    }

    const systemInstruction = `You are "Timeleft", a witty, extremely supportive, and highly practical productivity coach.
You specialize in helping students, founders, and busy people manage deadlines, beat procrastination, and break down executive function barriers.
Your tone is conversational, supportive, clear, and slightly energetic. Avoid generic AI corporate fluff.
You are given the user's current tasks and habits for context. Keep your response brief, highly actionable (markdown bullet points are perfect), and reference actual tasks or habits from the user's list when helpful to make the advice incredibly personalized.`;

    const chatHistory = history ? history.map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })) : [];

    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
      },
      history: chatHistory
    });

    const contextPrompt = `Context: Tasks list is: ${JSON.stringify(tasks)}. Habits tracking are: ${JSON.stringify(habits)}.
User message: ${message}`;

    const response = await chat.sendMessage({ message: contextPrompt });
    res.json({ text: response.text, sandbox: false });
  } catch (error: any) {
    console.error("Chat API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat response" });
  }
});

// 5. API: Audio Verbal Briefing Generator (TTS-ready script)
app.post("/api/ai/voice-briefing", async (req, res) => {
  try {
    const { tasks, habits, currentTime } = req.body;

    const ai = getAi();
    if (!ai) {
      // Sandbox fallback
      const active = tasks.filter((t: any) => !t.completed);
      const greeting = "Hello productivity champion! Welcome back to your dashboard. ";
      const activeText = active.length > 0 
        ? `You have ${active.length} active tasks waiting for you. Your highest urgency task is ${active[0].title}, which has been flagged for immediate execution.`
        : "Amazing news! You are completely caught up on your tasks today. Why not work on a healthy habit or take a well-deserved break?";
      
      return res.json({ 
        script: greeting + activeText + " Remember, you've got this. Let's take action one small block at a time!",
        sandbox: true 
      });
    }

    const systemInstruction = `You are a warm, radio-host style AI productivity anchor.
You are creating a short, verbal briefing script (suitable for text-to-speech) summarizing the user's day, deadlines, and accomplishments.
Start with an engaging, friendly check-in based on the current time.
Acknowledge any completed habits or high-focus task milestones today.
List the high-urgency "Critical Path" items due today or tomorrow. Tell the user exactly which task to touch first.
Keep the speech concise, highly encouraging, and natural-sounding. Write out words clearly (e.g. say "hours" instead of "hrs"). Do not use heavy formatting like markdown stars or hashtags, as it will be read out by TTS.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Current Time: ${currentTime}\nTasks: ${JSON.stringify(tasks)}\nHabits: ${JSON.stringify(habits)}`,
      config: {
        systemInstruction,
      }
    });

    res.json({ script: response.text, sandbox: false });
  } catch (error: any) {
    console.error("Voice briefing API error:", error);
    res.status(500).json({ script: "Error generating your daily briefing. Let's focus on ticking off your top priority task instead!", error: error.message });
  }
});

// 6. API: Syllabus/Screenshot task extraction
app.post("/api/ai/extract-syllabus", async (req, res) => {
  try {
    const { syllabusText, screenshotBase64, mimeType } = req.body;
    const ai = getAi();

    if (!ai) {
      // Sandbox fallback mode
      const tasks = [
        {
          id: "extracted-1",
          title: "Syllabus Project: Initial Setup & Outline",
          description: "Based on the uploaded materials: Research and outline core deliverables, compile references.",
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 2 days from now
          estimatedHours: 2,
          difficulty: 3,
          category: "essay",
          completed: false,
          subtasks: []
        },
        {
          id: "extracted-2",
          title: "Syllabus Assignment: Draft Draft Draft",
          description: "Create a complete starter draft. Aim for completion over perfect layout.",
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 5 days from now
          estimatedHours: 4,
          difficulty: 4,
          category: "essay",
          completed: false,
          subtasks: []
        }
      ];
      return res.json({ tasks, sandbox: true });
    }

    let contents: any[] = [];
    let prompt = "You are a strict, ultra-precise Multi-Modal Academic/Workforce Data Parser. Analyze the syllabus content, workspace instructions, or screenshot provided below, identify any looming assignments, tests, essays, reading, design, or code requirements, and return them as a structured array of tasks.\n";
    
    if (syllabusText) {
      prompt += `Text Context:\n${syllabusText}\n`;
    }

    if (screenshotBase64 && mimeType) {
      const cleanBase64 = screenshotBase64.replace(/^data:image\/\w+;base64,/, "");
      contents.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64
        }
      });
      prompt += "Extract the visual tasks, deadlines, and requirements visible in this screenshot.";
    }

    contents.push(prompt);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["tasks"],
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "title", "description", "deadline", "estimatedHours", "difficulty", "category"],
                properties: {
                  id: { type: Type.STRING, description: "Uniquely generated random string id" },
                  title: { type: Type.STRING, description: "Short, clean task title" },
                  description: { type: Type.STRING, description: "Details or syllabus instructions extracted" },
                  deadline: { type: Type.STRING, description: "Extracted YYYY-MM-DDTHH:mm date or offset estimate (e.g. 3 days from now if only a day is mentioned)" },
                  estimatedHours: { type: Type.NUMBER, description: "A realistic hourly estimate to complete (1 to 10)" },
                  difficulty: { type: Type.INTEGER, description: "Difficulty level from 1 (easy) to 5 (extremely taxing)" },
                  category: { type: Type.STRING, description: "Must be strictly one of: 'essay', 'coding', 'reading', 'design', or 'general'" }
                }
              }
            }
          }
        }
      }
    });

    const parsedResult = JSON.parse(response.text || "{}");
    const formattedTasks = (parsedResult.tasks || []).map((t: any) => ({
      ...t,
      id: t.id || `ext-${Math.random().toString(36).substr(2, 9)}`,
      completed: false,
      subtasks: []
    }));

    res.json({ tasks: formattedTasks, sandbox: false });
  } catch (error: any) {
    console.error("Syllabus extraction error:", error);
    res.status(500).json({ error: error.message || "Failed to extract syllabus data" });
  }
});

// 7. API: Stress-based 15-Minute Milestones
app.post("/api/ai/milestones", async (req, res) => {
  try {
    const { taskTitle, description, estimatedHours, stressLevel } = req.body;
    const ai = getAi();

    if (!ai) {
      // Sandbox fallback mode
      const isMelting = stressLevel === "Melting Down";
      const isAnxious = stressLevel === "Anxious";
      
      const milestones = [
        {
          id: "m-1",
          title: isMelting ? "Step 1: Just Sit Down & Open It" : "Step 1: Prepare Workspace & Plan",
          duration: "15 mins",
          instructions: isMelting 
            ? "Clear off physical desk. Open exactly 1 browser tab needed. Let yourself sit quietly for 2 minutes without working yet."
            : "Clear distractions, set a 15-minute timer, and write down 3 key sub-points you will work on.",
          reward: isMelting ? "Sip some cold water & take 3 deep, slow breaths" : "Quick hand stretch and standard break",
          completed: false
        },
        {
          id: "m-2",
          title: isMelting ? "Step 2: Write One Messy Sentence" : "Step 2: Generate Core Skeleton",
          duration: "15 mins",
          instructions: isMelting 
            ? "Type one extremely simple, bad sentence about the topic. Do not correct typos. The goal is just to have characters on the screen."
            : "Create the foundational outline or boilerplates. Write down rough sentences for the introductory part.",
          reward: isMelting ? "Double-tap your chest & say 'I am doing it!'" : "Mini dopamine rush: tick off this item!",
          completed: false
        },
        {
          id: "m-3",
          title: "Step 3: Keep the Momentum Going",
          duration: "15 mins",
          instructions: "Elaborate slightly on what you did in Step 2. Do not refine yet. Set a stopwatch and let ideas flow without judgment.",
          reward: "Have a bite of your favorite snack!",
          completed: false
        }
      ];
      return res.json({ milestones, sandbox: true });
    }

    const stressInstructions = stressLevel === "Melting Down" 
      ? "CRITICAL: The user is in an ADHD/executive function meltdown! Every milestone must be incredibly easy, comforting, extremely low friction, and feature warm, comforting instructions with cozy dopamine mini-rewards (e.g. stretching, water sips, kind self-talk). Avoid demanding tone."
      : stressLevel === "Anxious"
      ? "The user is highly anxious. Keep steps clear, provide step-by-step guidance that avoids decision paralysis, and offer supportive micro-rewards for completing each block."
      : "The user is feeling calm and focused. Provide high-intensity, structured milestones that maximize focus and momentum.";

    const systemInstruction = `You are an empathetic executive functioning coach specializing in ADHD and acute academic overwhelm.
Break down the given task into sequential, 15-minute high-fidelity milestones.
Each milestone MUST take exactly 15 minutes. Create a realistic progression of milestones.
Each milestone must have:
- id: random unique string
- title: concise, motivating name of the 15-minute block
- duration: always "15 mins"
- instructions: precise, action-oriented, comforting instructions on exactly WHAT to do during these 15 minutes to bypass procrastination.
- reward: a gentle mental or physical reward, dopamine boost, or self-care cue for completing this block.

Stress-level styling directive:
${stressInstructions}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Task to break down: "${taskTitle}"\nDescription: "${description || "None"}"\nEstimated hours: ${estimatedHours || 2}\nStress level: "${stressLevel}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["milestones"],
          properties: {
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "title", "duration", "instructions", "reward"],
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  instructions: { type: Type.STRING },
                  reward: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const milestones = (parsed.milestones || []).map((m: any) => ({ ...m, completed: false }));
    res.json({ milestones, sandbox: false });
  } catch (error: any) {
    console.error("Milestones API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate milestones" });
  }
});

// 8. API: Get Me Started (The 50% Completed Starter Draft)
app.post("/api/ai/starter-draft", async (req, res) => {
  try {
    const { taskTitle, description, category } = req.body;
    const ai = getAi();

    const isCode = category === "code" || category === "coding";

    if (!ai) {
      // Sandbox fallback
      let draftText = "";
      let extensionPrompt = "";

      if (isCode) {
        draftText = `// 50% COMPLETED STARTER CODE FOR: ${taskTitle}\n// File: starter_solution.js\n\n// TODO: Customize this core module skeleton to fit your exact specifications\n\nconst mainHandler = async (event, context) => {\n  console.log("Starting execution of ${taskTitle}...");\n  try {\n    // 1. Initialize environment setup\n    const config = initConfig();\n    \n    // 2. Main Logic Placeholder (Execute 50% starter flow)\n    const rawData = await fetchPayload(config.endpoint);\n    const processedResult = parseData(rawData);\n    \n    return {\n      statusCode: 200,\n      body: JSON.stringify({\n        message: "Starter solution successfully initialized!",\n        data: processedResult\n      })\n    };\n  } catch (error) {\n    console.error("Critical Failure:", error);\n    throw error;\n  }\n};\n\nfunction initConfig() {\n  return {\n    endpoint: "https://api.workspace.internal/v1",\n    timeout: 5000\n  };\n}\n\nfunction fetchPayload(url) {\n  // TODO: Implement actual axios/fetch payload retrieval\n  return { status: "success", items: [] };\n}\n\nfunction parseData(data) {\n  // Starter logic mapping\n  return data.items || [];\n}\n\nmodule.exports = { mainHandler };`;
        extensionPrompt = "Uncomment function fetchPayload and implement the real fetch URL, then test the return state.";
      } else {
        draftText = `# ${taskTitle} - Starter Draft & Thesis Outline\n\n## Introduction & Thesis Statement\nIn the realm of modern studies, addressing the complexities of "${taskTitle}" remains paramount. This analysis explores the core arguments surrounding "${description || "this task's core themes"}" by investigating structural variables, highlighting empirical examples, and contrasting traditional methodologies with contemporary frameworks.\n\n## Core Arguments Outline (50% Pre-Done)\n1. **Foundational Precedent**: The historical context and initial parameters governing the problem space.\n2. **The Modern Catalyst**: Why this issue is critically urgent to resolve today.\n3. **Practical Counter-Measures**: Key evidence, examples, or frameworks that address the thesis.\n\n## Discussion & Key Notes\n- Note A: Be sure to reference primary source materials here.\n- Note B: Focus on concrete, reproducible case studies.\n- Note C: Contrast this perspective with the dominant counter-narrative.`;
        extensionPrompt = "Expand on 'Modern Catalyst' with 3 specific sentences detailing your immediate primary source argument.";
      }

      return res.json({ draftText, isCode, extensionPrompt, sandbox: true });
    }

    const systemInstruction = isCode
      ? `You are an elite, highly practical senior staff engineer.
Generate a high-quality "50% pre-done" starter code snippet, utility file, or solution skeleton for the task: "${taskTitle}".
Provide real, valid code (e.g., JavaScript/TypeScript, Python, HTML/CSS) that compiles/runs, with clear comments, complete structure, main modules pre-built, and clean placeholders where the user can expand.
Do not return a simple hello world. Make it feel like someone already did 50% of the heavy lifting of writing files, structuring functions, and handling boilerplates.
Return a JSON object containing:
- draftText: The full code snippet (formatted beautifully with proper indentation and inline comments)
- extensionPrompt: A specific, clear instruction on what exact code block, function body, or parameter the user should fill in next to get the victory.`
      : `You are a brilliant academic writer and essay architect.
Generate a high-quality "50% pre-done" outline and initial written draft for: "${taskTitle}".
Provide a clear, formal title, a beautifully written 250-300 word introductory paragraph with an elegant, clear thesis statement, a detailed structural outline of the rest of the essay, and suggested talking points/evidence.
Make it feel like a professional assistant already did 50% of the cognitive lifting of researching and starting the file.
Return a JSON object containing:
- draftText: The markdown-formatted starter essay draft and detailed outline
- extensionPrompt: A specific, clear recommendation on exactly what sentence or evidence point the user should write next to keep their flow going.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Task Title: "${taskTitle}"\nTask Description: "${description || "None"}"\nCategory: "${category}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["draftText", "extensionPrompt"],
          properties: {
            draftText: { type: Type.STRING },
            extensionPrompt: { type: Type.STRING }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({
      draftText: parsed.draftText,
      isCode,
      extensionPrompt: parsed.extensionPrompt,
      sandbox: false
    });
  } catch (error: any) {
    console.error("Starter draft API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate starter draft" });
  }
});

// 9. API: Extend Draft (Collaborative AI Expand)
app.post("/api/ai/extend-draft", async (req, res) => {
  try {
    const { taskTitle, currentDraft, instructions, isCode } = req.body;
    const ai = getAi();

    if (!ai) {
      // Sandbox fallback
      const additional = isCode
        ? `\n\n// AI-Generated addition based on: "${instructions}"\nconst processWorkspaceExtension = (data) => {\n  console.log("Applying workspace extensions...");\n  return data.map(item => ({\n    ...item,\n    extended: true,\n    processedAt: new Date().toISOString()\n  }));\n};`
        : `\n\n### Extended Perspective (AI Expansion)\nFurthermore, when evaluating the parameters of "${instructions}", it becomes clear that secondary structures amplify the effect of our primary thesis. Specifically, integrating these factors allows for a broader, more robust synthesis, bridging the gap between historical constraints and contemporary opportunities.`;
      
      return res.json({ draftText: currentDraft + additional, sandbox: true });
    }

    const systemInstruction = isCode
      ? `You are an elite developer co-pilot.
Analyze the current starter code, then add, expand, or write the next logical block/functions matching the user's extension instructions: "${instructions}".
Return only the complete updated code file combining the original code with your smart, fully implemented additions. Keep it valid, clean, and highly professional.`
      : `You are an elite academic co-writer.
Analyze the current outline and essay draft, and write the next detailed paragraph or section that seamlessly expands upon it, fully incorporating the user's instruction: "${instructions}".
Maintain the exact same tone and high scholarly style. Return the full combined text (original + your smart addition).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Task: "${taskTitle}"\nCurrent Draft:\n${currentDraft}\nUser Extension Instructions: "${instructions}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["draftText"],
          properties: {
            draftText: { type: Type.STRING }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ draftText: parsed.draftText, sandbox: false });
  } catch (error: any) {
    console.error("Extend draft API error:", error);
    res.status(500).json({ error: error.message || "Failed to extend draft" });
  }
});

// Vite server setup for full-stack integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
