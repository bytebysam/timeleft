import React, { useState, useEffect } from "react";
import { Task, Milestone } from "./types";
import { loadTasks, saveTasks } from "./utils/localStorage";
import ActiveInboxScreen from "./components/ActiveInboxScreen";
import GetStartedWorkspaceScreen from "./components/GetStartedWorkspaceScreen";
import { Sparkles, Palette, Clock, Type, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ThemeConfig {
  id: string;
  name: string;
  isDark: boolean;
  previewBg: string;
  previewAccent: string;
}

const TUMBLR_THEMES: ThemeConfig[] = [
  { id: "gothic-velvet", name: "Gothic Velvet", isDark: true, previewBg: "#0B0C10", previewAccent: "#660B14" },
  { id: "true-blue", name: "True Blue", isDark: true, previewBg: "#001b35", previewAccent: "#529ecc" },
  { id: "cybernetic", name: "Cybernetic", isDark: true, previewBg: "#000000", previewAccent: "#00ff00" },
  { id: "pumpkin-spice", name: "Pumpkin Spice", isDark: true, previewBg: "#1d0f04", previewAccent: "#e0601a" },
  { id: "canary", name: "Canary", isDark: true, previewBg: "#0d0d0c", previewAccent: "#ffd300" },
  { id: "cherry-soda", name: "Cherry Soda", isDark: true, previewBg: "#1a000d", previewAccent: "#ff007f" },
  { id: "vintage-paper", name: "Vintage Paper", isDark: false, previewBg: "#f5ebe0", previewAccent: "#8c5c50" },
];

const FONT_OPTIONS = [
  { id: "font-sans", name: "Modern Sans" },
  { id: "font-space", name: "Space Mono" },
  { id: "font-dmsans", name: "Geometric" },
  { id: "font-syne", name: "Cyber Bold" },
  { id: "font-cinzel", name: "Gothic Serif" },
  { id: "font-cormorant", name: "Fine Literary" }
];

const CARD_STYLE_OPTIONS = [
  { id: "style-vintage", name: "Double Vintage Line" },
  { id: "style-glass", name: "Frosted Glass Glow" },
  { id: "style-minimal", name: "Sleek Flat Minimal" }
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<'inbox' | 'workspace'>("inbox");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null); // For Screen 1 expanded task card
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  // Theme states
  const [selectedTheme, setSelectedTheme] = useState<string>(() => {
    return localStorage.getItem("lastminute_theme_scheme") || "gothic-velvet";
  });

  // Customization: Font & Card Styles
  const [selectedFont, setSelectedFont] = useState<string>(() => {
    return localStorage.getItem("lastminute_font") || "font-dmsans";
  });

  const [selectedCardStyle, setSelectedCardStyle] = useState<string>(() => {
    return localStorage.getItem("lastminute_card_style") || "style-vintage";
  });

  // Load state on mount
  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  // Sync tasks to state and storage
  const updateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    saveTasks(newTasks);
  };

  // Theme Switcher effect
  useEffect(() => {
    const themeConfig = TUMBLR_THEMES.find(t => t.id === selectedTheme) || TUMBLR_THEMES[0];
    localStorage.setItem("lastminute_theme_scheme", selectedTheme);
    localStorage.setItem("lastminute_theme", themeConfig.isDark ? "dark" : "light");
    
    TUMBLR_THEMES.forEach(t => {
      document.documentElement.classList.remove(`theme-${t.id}`);
    });
    document.documentElement.classList.add(`theme-${selectedTheme}`);
    
    if (themeConfig.isDark) {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, [selectedTheme]);

  // Font Selection effect
  useEffect(() => {
    localStorage.setItem("lastminute_font", selectedFont);
  }, [selectedFont]);

  // Card Style effect
  useEffect(() => {
    localStorage.setItem("lastminute_card_style", selectedCardStyle);
    document.documentElement.classList.remove("style-vintage", "style-glass", "style-minimal");
    document.documentElement.classList.add(selectedCardStyle);
  }, [selectedCardStyle]);

  // Loading States for API requests
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isExtendingDraft, setIsExtendingDraft] = useState(false);

  // API Call helper
  const handleAddTask = async (taskInput: any) => {
    setIsPrioritizing(true);
    try {
      // 1. Send context (text or screenshot) to syllabus parser endpoint
      const res = await fetch("/api/ai/extract-syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabusText: taskInput.syllabusText,
          screenshotBase64: taskInput.screenshotBase64,
          mimeType: taskInput.mimeType
        })
      });

      const data = await res.json();
      
      let newTasksToAdd: Task[] = [];
      
      if (data.tasks && data.tasks.length > 0) {
        // AI Extracted assignments
        newTasksToAdd = data.tasks.map((t: any) => ({
          ...t,
          stressLevel: taskInput.stressLevel || "Anxious",
          category: taskInput.category || t.category || "essay",
          completed: false,
          progress: 0,
          subtasks: []
        }));
      } else {
        // Manual input fallback
        const manualTask: Task = {
          id: `task-${Date.now()}`,
          title: taskInput.title,
          description: taskInput.description,
          deadline: taskInput.deadline,
          category: taskInput.category,
          estimatedHours: taskInput.estimatedHours,
          energy: taskInput.energy,
          difficulty: taskInput.difficulty,
          progress: 0,
          completed: false,
          dependencies: [],
          stressLevel: taskInput.stressLevel,
          subtasks: []
        };
        newTasksToAdd = [manualTask];
      }

      // 2. Fetch milestones for each new task
      const tasksWithMilestones = await Promise.all(
        newTasksToAdd.map(async (task) => {
          try {
            const msRes = await fetch("/api/ai/milestones", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                taskTitle: task.title,
                description: task.description,
                estimatedHours: task.estimatedHours,
                stressLevel: task.stressLevel
              })
            });
            const msData = await msRes.json();
            return {
              ...task,
              milestones: msData.milestones || []
            };
          } catch (err) {
            console.error("Failed to generate milestones:", err);
            return task;
          }
        })
      );

      const updatedList = [...tasks, ...tasksWithMilestones];
      updateTasks(updatedList);
      
      // Expand the first newly created task
      if (tasksWithMilestones.length > 0) {
        setActiveTaskId(tasksWithMilestones[0].id);
      }
    } catch (err) {
      console.error("Failed to add task with prioritization:", err);
    } finally {
      setIsPrioritizing(false);
    }
  };

  const handleToggleComplete = (taskId: string) => {
    // When a task is marked completed, immediately remove/delete it from the list
    const updated = tasks.filter(t => t.id !== taskId);
    updateTasks(updated);
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
    if (activeTaskId === taskId) {
      setActiveTaskId(null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    updateTasks(tasks.filter(t => t.id !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
    if (activeTaskId === taskId) {
      setActiveTaskId(null);
    }
  };

  const handleUpdateTask = (updatedTask: Task) => {
    const updated = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    updateTasks(updated);
  };

  const handleToggleMilestone = (taskId: string, milestoneId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const updatedMilestones = t.milestones?.map(m => 
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        ) || [];
        
        const completedCount = updatedMilestones.filter(m => m.completed).length;
        const totalCount = updatedMilestones.length;
        const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return {
          ...t,
          milestones: updatedMilestones,
          progress,
          completed: progress === 100
        };
      }
      return t;
    });

    // Filter out completed tasks so they are immediately removed when all milestones are done
    const filtered = updated.filter(t => !t.completed);
    updateTasks(filtered);

    const completedTasks = updated.filter(t => t.completed);
    completedTasks.forEach(t => {
      if (selectedTaskId === t.id) {
        setSelectedTaskId(null);
      }
      if (activeTaskId === t.id) {
        setActiveTaskId(null);
      }
    });
  };

  const handleGenerateMilestones = async (taskId: string, stressLevel: 'Calm' | 'Anxious' | 'Melting Down') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const msRes = await fetch("/api/ai/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          description: task.description,
          estimatedHours: task.estimatedHours,
          stressLevel
        })
      });
      const msData = await msRes.json();
      
      const updated = tasks.map(t => t.id === taskId ? {
        ...t,
        stressLevel,
        milestones: msData.milestones || [],
        progress: 0,
        completed: false
      } : t);
      updateTasks(updated);
    } catch (err) {
      console.error("Error regenerating milestones:", err);
    }
  };

  const handleTriggerGetStarted = async (task: Task) => {
    setSelectedTaskId(task.id);
    setActiveScreen("workspace");

    // Automatically trigger starter draft in the background if it doesn't already exist!
    if (!task.starterDraft) {
      await handleGenerateStarterDraft(task.id);
    }
  };

  const handleGenerateStarterDraft = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setIsGeneratingDraft(true);
    try {
      const draftRes = await fetch("/api/ai/starter-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          description: task.description,
          category: task.category
        })
      });
      const draftData = await draftRes.json();
      
      const updated = tasks.map(t => t.id === taskId ? {
        ...t,
        starterDraft: draftData.draftText,
        extensionPrompt: draftData.extensionPrompt
      } : t);
      updateTasks(updated);
    } catch (err) {
      console.error("Error generating starter draft:", err);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleExtendDraft = async (taskId: string, instructions: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.starterDraft) return;

    setIsExtendingDraft(true);
    try {
      const extendRes = await fetch("/api/ai/extend-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          currentDraft: task.starterDraft,
          instructions,
          isCode: task.category === "code"
        })
      });
      const extendData = await extendRes.json();

      const updated = tasks.map(t => t.id === taskId ? {
        ...t,
        starterDraft: extendData.draftText
      } : t);
      updateTasks(updated);
    } catch (err) {
      console.error("Error extending draft:", err);
    } finally {
      setIsExtendingDraft(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text-primary)] ${selectedFont} transition-colors duration-300 flex flex-col`}>
      {/* GLOBAL BRAND HEADER */}
      <header className="relative px-4 py-5 md:px-6 bg-black/40 border-b border-[var(--theme-border-subtle)] flex flex-col items-center justify-center gap-4 shrink-0">
        {/* Vibe2Ship 2026 Badge */}
        <div className="absolute top-4 right-4 md:right-6 flex items-center gap-1.5 bg-gradient-to-r from-[var(--theme-accent-2)]/10 to-[var(--theme-accent-1)]/10 border border-[var(--theme-accent-2)]/20 px-2.5 py-0.5 rounded-full shadow-sm select-none">
          <span className="w-1 h-1 rounded-full bg-[var(--theme-accent-2)] animate-pulse" />
          <span className="text-[8px] font-mono font-bold tracking-wider uppercase text-[var(--theme-accent-2)]">
            Vibe2Ship 2026
          </span>
        </div>

        <div className="flex flex-col items-center gap-2.5 text-center">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--theme-card)] border border-[var(--theme-border-subtle)] shadow-sm shrink-0">
            <Clock className="w-5 h-5 text-[var(--theme-accent-2)] z-10" />
            <Sparkles className="absolute top-1.5 right-1.5 w-2 h-2 text-amber-300 z-10" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-[var(--theme-text-primary)] flex items-center justify-center gap-1.5 leading-none">
              <span className="text-[var(--theme-accent-2)] font-black">Timeleft</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-mono tracking-wide uppercase mt-1">
              AI-powered deadline companion
            </p>
          </div>
        </div>

        {/* Global tab switcher and theme changer */}
        <div className="flex items-center gap-3 w-full justify-center flex-wrap">
          {/* Navigation Control Panel */}
          <div className="flex bg-black p-1 rounded-xl border border-[#1a1a1a] text-xs">
            <button
              onClick={() => setActiveScreen("inbox")}
              className={`px-4 py-2 font-bold rounded-lg transition-all cursor-pointer ${
                activeScreen === "inbox"
                  ? "bg-[#1a1a1a] text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Priority Inbox
            </button>
            <button
              onClick={() => setActiveScreen("workspace")}
              className={`px-4 py-2 font-bold rounded-lg transition-all cursor-pointer ${
                activeScreen === "workspace"
                  ? "bg-[#1a1a1a] text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Get Me Started
            </button>
          </div>

          {/* Tumblr Theme Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsThemeOpen(!isThemeOpen);
              }}
              className="flex items-center justify-between bg-black/60 hover:bg-black/90 border border-[#1a1a1a] text-slate-300 rounded-xl px-3.5 py-2 gap-2 text-[11px] font-bold transition-all cursor-pointer shadow-md select-none w-44"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {TUMBLR_THEMES.find(t => t.id === selectedTheme)?.name || "Theme"}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isThemeOpen ? "rotate-180" : ""}`} />
            </button>

            {isThemeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsThemeOpen(false)} />
                <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-48 rounded-xl bg-black border border-[#1a1a1a] shadow-xl z-50 overflow-hidden divide-y divide-[#121212] animate-in fade-in slide-in-from-top-1 duration-150">
                  {TUMBLR_THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTheme(t.id);
                        setIsThemeOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                        selectedTheme === t.id
                          ? "bg-[var(--theme-accent-2)]/20 text-[var(--theme-text-primary)] font-bold"
                          : "text-slate-300 hover:bg-[#111111]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-white/10 shrink-0 flex items-center justify-center overflow-hidden"
                          style={{ background: t.previewBg }}
                        >
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ background: t.previewAccent }}
                          />
                        </span>
                        <span>{t.name}</span>
                      </div>
                      {selectedTheme === t.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent-2)] animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN SCREEN GRID WRAPPER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          {activeScreen === "inbox" ? (
            <motion.div
              key="inbox"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full"
            >
              <ActiveInboxScreen
                tasks={tasks}
                onAddTask={handleAddTask}
                onToggleComplete={handleToggleComplete}
                onDeleteTask={handleDeleteTask}
                onToggleMilestone={handleToggleMilestone}
                onGenerateMilestones={handleGenerateMilestones}
                onTriggerGetStarted={handleTriggerGetStarted}
                isPrioritizing={isPrioritizing}
                activeTaskId={activeTaskId}
                setActiveTaskId={setActiveTaskId}
              />
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full"
            >
              <GetStartedWorkspaceScreen
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={setSelectedTaskId}
                onGenerateStarterDraft={handleGenerateStarterDraft}
                onExtendDraft={handleExtendDraft}
                isGeneratingDraft={isGeneratingDraft}
                isExtendingDraft={isExtendingDraft}
                onToggleComplete={handleToggleComplete}
                onUpdateTask={handleUpdateTask}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
