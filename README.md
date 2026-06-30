

 Timeleft — The Cognitive Momentum Engine


Vibe2Ship Hackathon 2026 | CodingNinjas × Google for Developers
Problem Statement: The Last-Minute Life Saver




🔗 Live Demo

https://ais-pre-ehjyjdauydc7ujjkzwhrdi-1074889626847.asia-southeast1.run.app/

Deployed on Google Cloud Run via Google AI Studio.


💡 What is Timeleft?

Most productivity apps assume you already have the motivation to start. Timeleft assumes you don't — and helps you anyway.

Procrastination isn't laziness. It's driven by three real psychological blockers:


High starting friction — complex tasks trigger avoidance
Weak connection to your future self — "tomorrow" doesn't feel real
Energy mismatch — doing hard creative work when your brain is fried


Timeleft is an AI-powered workspace built to directly attack these three blockers, not just remind you of deadlines.


✨ Key Features

🧬 Task DNA Analyzer

Every task gets scored by Gemini on complexity (1–5), energy type needed (Creative / Analytical / Administrative / Physical), and the biologically optimal time of day to tackle it.

🧠 Stress-Aware Milestone Breakdown

Tell the app how you're feeling — Calm / Anxious / Melt Down — and Gemini adapts how it slices your task. Overwhelmed users get tiny, gentle 15-minute steps. Confident users get direct, efficient instructions.

✍️ Anti-Starting-Friction Starter Drafts

Gemini writes a partial first draft for any writing or coding task — turning a blank-page creation problem into a lower-friction editing problem.

🎙️ Voice & Syllabus Capture

Dictate tasks by voice or upload a photo of a syllabus. Gemini extracts structured tasks and deadlines automatically.

📅 DNA-Matched Weekly Scheduler

A drag-and-drop calendar that highlights the scientifically optimal time window for each task based on its DNA profile.

⏱️ Focus Timer with Ambient Soundscapes

A built-in Pomodoro timer with Web Audio API-generated binaural beats and white noise — no external audio files, all synthesized in-browser.

📅 Google Calendar Sync

One click adds any task deadline straight to Google Calendar.


🛠 Tech Stack

TechnologyPurposeGemini 1.5 / 2.0 FlashSyllabus parsing, milestone breakdown, DNA scoring, future self letters, starter draftsGoogle Gen AI SDK (@google/genai)Secure server-side Gemini calls with structured JSON schema outputsGoogle AI StudioPrompt prototyping and full-stack developmentGoogle Cloud RunProduction deployment, autoscaling, secure secretsGoogle CalendarOne-click deadline syncReact 18 + TypeScriptFrontend frameworkViteBuild toolingTailwind CSSStylingFramer MotionAnimationRechartsProgress and streak visualizationsWeb Audio APIIn-browser ambient focus soundsExpress.jsBackend server


🚀 Run Locally

Prerequisites


Node.js 18+
A Gemini API key from aistudio.google.com/apikey


Steps

bashgit clone https://github.com/bytebysam/timeleft
cd timeleft
npm install
cp .env.example .env
# Add your GEMINI_API_KEY to .env
npm run dev


📁 Project Structure

timeleft/
├── src/
│   ├── components/
│   │   ├── ActiveInboxScreen.tsx        # Priority inbox & task cards
│   │   ├── GetStartedWorkspaceScreen.tsx # AI workspace
│   │   ├── TaskFormDialog.tsx           # Add/edit tasks
│   │   ├── TaskDashboard.tsx            # Task grid & stats
│   │   ├── TaskPlannerRecipe.tsx        # Execution recipes
│   │   ├── WeeklyCalendar.tsx           # DNA-matched scheduling
│   │   ├── HabitTracker.tsx             # Habit streaks
│   │   ├── DeadlineCountdown.tsx        # Live countdown
│   │   └── PomodoroTimer.tsx            # Focus timer + soundscapes
│   ├── utils/
│   ├── App.tsx                          # Root component
│   ├── types.ts                         # TypeScript interfaces
│   └── main.tsx                         # Entry point
├── server.ts                            # Express + Gemini Gen AI SDK backend
├── package.json
├── vite.config.ts
└── tsconfig.json


📊 Evaluation Criteria Coverage

CriterionHow Timeleft deliversProblem Solving & ImpactTargets the actual psychological roots of procrastination, not just symptomsAgentic DepthMultiple autonomous Gemini agents: prioritizer, DNA analyzer, milestone generator, draft writer, future self letter writerInnovation & CreativityFuture Self Letters and Task DNA profiling are genuinely novel — not found in mainstream productivity appsUsage of Google TechnologiesGemini 1.5/2.0 Flash, Google Gen AI SDK, Google AI Studio, Google Cloud Run, Google CalendarProduct Experience & DesignSmooth Framer Motion animations, ambient focus audio, polished dark UITechnical ImplementationSecure server-side Gemini calls via official SDK, structured JSON schema outputs, full TypeScript type safetyCompleteness & UsabilityFully functional, deployed live on Google Cloud Run


 Built By

Samriddhi Rout
B.Tech CSE, JUIT Himachal Pradesh
GitHub: @bytebysam


Built with 💜 for Vibe2Ship Hackathon 2026 — CodingNinjas × Google for Developers
