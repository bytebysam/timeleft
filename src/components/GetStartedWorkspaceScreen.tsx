import React, { useState, useEffect, useRef } from "react";
import { Task } from "../types";
import { 
  Sparkles, Clock, Copy, Download, ArrowRight, ShieldCheck, 
  RefreshCw, FileText, Code, Smile, Brain, AlertTriangle, Send, CheckCircle,
  Play, Pause, RotateCcw, Coffee, Volume2, VolumeX, Lock, ShieldAlert
} from "lucide-react";

interface GetStartedWorkspaceScreenProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string | null) => void;
  onGenerateStarterDraft: (taskId: string) => Promise<void>;
  onExtendDraft: (taskId: string, instructions: string) => Promise<void>;
  isGeneratingDraft: boolean;
  isExtendingDraft: boolean;
  onToggleComplete: (taskId: string) => void;
  onUpdateTask: (task: Task) => void;
}

export default function GetStartedWorkspaceScreen({
  tasks,
  selectedTaskId,
  onSelectTask,
  onGenerateStarterDraft,
  onExtendDraft,
  isGeneratingDraft,
  isExtendingDraft,
  onToggleComplete,
  onUpdateTask,
}: GetStartedWorkspaceScreenProps) {
  const activeTask = tasks.find(t => t.id === selectedTaskId);
  
  const [instructions, setInstructions] = useState("");
  const [localDraft, setLocalDraft] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  // Real-time Countdown Timer State
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [isImminent, setIsImminent] = useState(false);

  // Sync draft from task when active task changes
  useEffect(() => {
    if (activeTask) {
      setLocalDraft(activeTask.starterDraft || "");
    } else {
      setLocalDraft("");
    }
    setInstructions("");
  }, [selectedTaskId, activeTask?.starterDraft]);

  // Real-time countdown timer updater
  useEffect(() => {
    if (!activeTask) return;

    const updateTimer = () => {
      const diff = new Date(activeTask.deadline).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeftStr("Deadline Passed!");
        setIsImminent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setIsImminent(hours < 2);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeftStr(`${days}d ${hours % 24}h ${mins}m`);
      } else {
        setTimeLeftStr(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeTask?.deadline, selectedTaskId]);

  // Pomodoro Timer States
  const [activeWidgetTab, setActiveWidgetTab] = useState<"pomodoro" | "deadline">("pomodoro");
  const [pomoMode, setPomoMode] = useState<"work" | "short" | "long">("work");
  const [pomoSecondsLeft, setPomoSecondsLeft] = useState(25 * 60);
  const [pomoIsRunning, setPomoIsRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [completedSessions, setCompletedSessions] = useState(0);

  // Sync / Reset Pomodoro when task changes
  useEffect(() => {
    setPomoIsRunning(false);
    setPomoMode("work");
    setPomoSecondsLeft(25 * 60);
  }, [selectedTaskId]);

  // Refs to avoid interval resets due to rapid parent state changes
  const activeTaskRef = useRef(activeTask);
  const onUpdateTaskRef = useRef(onUpdateTask);

  // Keep refs up-to-date on every render
  useEffect(() => {
    activeTaskRef.current = activeTask;
    onUpdateTaskRef.current = onUpdateTask;
  });

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);

  const playPomoChime = () => {
    if (!soundOn) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = audioContextRef.current || new AudioContextClass();
      if (!audioContextRef.current) audioContextRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();
      
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (ascending arpeggio!)
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        
        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.8);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 1.2);
      });
    } catch (e) {
      console.error("Pomo chime synthesizer failed", e);
    }
  };

  // Pomodoro Timer tick interval effect
  useEffect(() => {
    if (!pomoIsRunning) return;

    const interval = setInterval(() => {
      setPomoSecondsLeft((prev) => {
        if (prev <= 1) {
          // Timer finished!
          clearInterval(interval);
          playPomoChime();
          
          if (pomoMode === "work") {
            setCompletedSessions(c => c + 1);
            const nextMode = (completedSessions + 1) % 4 === 0 ? "long" : "short";
            setPomoMode(nextMode);
            return (nextMode === "long" ? 15 : 5) * 60;
          } else {
            setPomoMode("work");
            return 25 * 60;
          }
        }

        // Active work mode increments focusTimeSeconds in the task
        if (pomoMode === "work" && activeTaskRef.current) {
          onUpdateTaskRef.current({
            ...activeTaskRef.current,
            focusTimeSeconds: (activeTaskRef.current.focusTimeSeconds || 0) + 1
          });
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pomoIsRunning, pomoMode, completedSessions]);

  const handlePomoModeChange = (newMode: "work" | "short" | "long") => {
    setPomoIsRunning(false);
    setPomoMode(newMode);
    let dur = 25;
    if (newMode === "short") dur = 5;
    if (newMode === "long") dur = 15;
    setPomoSecondsLeft(dur * 60);
  };

  const handlePomoReset = () => {
    setPomoIsRunning(false);
    let dur = 25;
    if (pomoMode === "short") dur = 5;
    if (pomoMode === "long") dur = 15;
    setPomoSecondsLeft(dur * 60);
  };

  const formatPomoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFocusTime = (totalSeconds?: number) => {
    if (!totalSeconds || totalSeconds <= 0) return "0s";
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    let parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(" ");
  };

  // Copy to clipboard handler
  const handleCopy = async () => {
    if (!localDraft) return;
    try {
      await navigator.clipboard.writeText(localDraft);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  // Download draft file helper
  const handleDownload = () => {
    if (!localDraft || !activeTask) return;
    
    // Determine file extension based on task category
    let ext = ".txt";
    if (activeTask.category === "code" || activeTask.category === "coding") {
      ext = ".js"; // Default starter code extension
    } else if (activeTask.category === "essay") {
      ext = ".md"; // Essay formatting is rich markdown
    }

    const cleanTitle = activeTask.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const filename = `starter_${cleanTitle}${ext}`;
    
    const blob = new Blob([localDraft], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  // Submit extension prompt instructions to AI
  const handleExtendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructions.trim() || !selectedTaskId) return;
    
    onExtendDraft(selectedTaskId, instructions);
    setInstructions("");
  };

  // Recommended procrastination hack based on stress levels
  const getProcrastinationTip = (category: string, stress?: string) => {
    if (stress === "Melting Down") {
      return {
        title: "The 2-Minute Rule (Crisis Mode)",
        text: "Your nervous system is overwhelmed. Ignore the entire essay/code scope. Your only job for the next 2 minutes is to type one single word. That's it. Once you do that, the barrier is broken."
      };
    }
    if (category === "code" || category === "coding") {
      return {
        title: "The Skeleton Strategy",
        text: "Write the empty function headers and arguments first. Do not implement any logic yet. Seeing the structure removes 80% of starting friction."
      };
    }
    return {
      title: "The 'Messy First Draft' Consent",
      text: "Give yourself explicit permission to write absolute garbage right now. You can edit bad text, but you cannot edit blank pages. Just spill your thoughts."
    };
  };

  const pendingTasks = tasks.filter(t => !t.completed);

  // If no task selected, show pristine empty state selector
  if (!selectedTaskId) {
    return (
      <div id="workspace-empty-state" className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto h-full">
        <ShieldCheck className="w-12 h-12 text-emerald-400 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold tracking-tight text-[var(--theme-text-primary)] mb-2">
          Procrastination Shield Workspace
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          Procrastination occurs when a task feels too large or abstract for your executive functions. 
          Select a looming task below and let AI immediately generate 50% of the starting draft, outline, or code skeleton.
        </p>

        <div className="w-full space-y-3">
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase text-left mb-1">
            Choose a Looming Task to Shatter the Block
          </label>
          {pendingTasks.length === 0 ? (
            <div className="border border-dashed border-[var(--theme-border-subtle)] p-4 rounded-xl text-xs text-slate-500 bg-black/30">
              No tasks available. Add a task on Screen 1 first!
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className="w-full p-3.5 rounded-xl bg-[var(--theme-card)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent-2)] text-left flex items-center justify-between text-xs font-semibold text-[var(--theme-text-primary)] cursor-pointer transition-all hover:translate-x-1 task-fade-in"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {(task.category === "code" || task.category === "coding") ? <Code className="w-4 h-4 text-blue-400" /> : <FileText className="w-4 h-4 text-amber-400" />}
                    <span className="truncate">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded border border-[#1a1a1a] text-slate-400">
                      {task.category}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const activeTip = getProcrastinationTip(activeTask?.category || "generic", activeTask?.stressLevel);

  return (
    <div id="get-me-started-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch">
      
      {/* LEFT PANE: Crisis Control & Context (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-5 justify-between">
        
        {/* Countdown / Pomodoro Dual Timer Widget */}
        <div id="workspace-deadline-widget" className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl p-5 text-center shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-2 right-2 text-[8px] bg-black/60 border border-slate-800 px-2 py-0.5 rounded-full text-slate-500 font-mono">
            FOCUS COMPANION
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-black/60 p-1 rounded-xl border border-slate-800/60 w-full mb-4 mt-1">
            <button
              type="button"
              onClick={() => setActiveWidgetTab("pomodoro")}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all capitalize cursor-pointer flex items-center justify-center gap-1 ${
                activeWidgetTab === "pomodoro"
                  ? "bg-[var(--theme-accent-2)]/20 text-[var(--theme-text-primary)] border border-[var(--theme-accent-2)]/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Pomodoro</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveWidgetTab("deadline")}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all capitalize cursor-pointer flex items-center justify-center gap-1 ${
                activeWidgetTab === "deadline"
                  ? "bg-[var(--theme-accent-2)]/20 text-[var(--theme-text-primary)] border border-[var(--theme-accent-2)]/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Deadline</span>
            </button>
          </div>

          {activeWidgetTab === "pomodoro" ? (
            /* Pomodoro Focus Timer view */
            <div className="w-full flex flex-col items-center">
              {/* Mode Selector */}
              <div className="flex justify-center gap-1.5 mb-3.5 w-full">
                {(["work", "short", "long"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handlePomoModeChange(m)}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-md border transition-all capitalize cursor-pointer ${
                      pomoMode === m
                        ? m === "work"
                          ? "bg-rose-950/30 text-rose-400 border-rose-500/30 font-extrabold"
                          : m === "short"
                          ? "bg-purple-950/30 text-purple-400 border-purple-500/30 font-extrabold"
                          : "bg-slate-800 text-slate-200 border-slate-700 font-extrabold"
                        : "bg-black/40 text-slate-400 hover:text-slate-200 border-transparent"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Timer Dial Circle */}
              <div className="relative w-32 h-32 flex items-center justify-center mb-3.5">
                <svg className="w-full h-full transform -rotate-90 absolute top-0 left-0">
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    className="text-black/60"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    className={`transition-all duration-300 ${
                      pomoMode === "work"
                        ? "text-[var(--theme-accent-2)]"
                        : pomoMode === "short"
                        ? "text-purple-500"
                        : "text-slate-400"
                    }`}
                    strokeWidth="4.5"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - (pomoSecondsLeft / (pomoMode === "work" ? 25 : pomoMode === "short" ? 5 : 15) / 60))}`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                  />
                </svg>
                <div className="flex flex-col items-center justify-center z-10 text-center select-none">
                  <span className="text-2xl font-black font-mono tracking-wider text-[var(--theme-text-primary)]">
                    {formatPomoTime(pomoSecondsLeft)}
                  </span>
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                    {pomoMode === "work" ? "Focusing" : "Resting"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 mb-2">
                <button
                  type="button"
                  onClick={() => setSoundOn(!soundOn)}
                  title={soundOn ? "Mute notification" : "Unmute notification"}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    soundOn
                      ? "bg-[var(--theme-accent-2)]/10 border-[var(--theme-accent-2)]/30 text-rose-400"
                      : "bg-black border-slate-800 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPomoIsRunning(!pomoIsRunning)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-bold text-white transition-all flex items-center gap-1 cursor-pointer shadow-md ${
                    pomoMode === "work"
                      ? "bg-gradient-to-r from-[var(--theme-accent-2)] to-[var(--theme-accent-1)] hover:brightness-110"
                      : pomoMode === "short"
                      ? "bg-purple-600 hover:bg-purple-500"
                      : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  {pomoIsRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{pomoIsRunning ? "Pause" : "Start"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePomoReset}
                  title="Reset timer"
                  className="p-2 bg-black hover:bg-[#111] border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Statistics / Accumulated Focus Time */}
              {activeTask && (
                <div className="text-[9px] text-slate-400 font-mono mt-1 flex items-center justify-center gap-1 select-none">
                  <span className="text-rose-400 font-bold">{completedSessions} sessions</span>
                  <span>•</span>
                  <span>Spent: <strong className="text-slate-200">{formatFocusTime(activeTask.focusTimeSeconds)}</strong></span>
                </div>
              )}
            </div>
          ) : (
            /* Time Left Until Deadline view */
            <div className="w-full flex flex-col items-center">
              <Clock className={`w-8 h-8 mb-2 ${isImminent ? "text-rose-500 animate-pulse" : "text-amber-400"}`} />
              
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Time Left Until Deadline
              </span>
              
              <h2 className={`text-3xl font-mono font-bold tracking-tight my-1.5 ${isImminent ? "text-rose-500 text-glow" : "text-[var(--theme-text-primary)]"}`}>
                {timeLeftStr || "Calculating..."}
              </h2>

              <p className="text-[10px] text-slate-400 leading-normal max-w-xs">
                {isImminent 
                  ? "Deadline is critical. Take action. AI has structured the starter file below so you don't face a blank canvas."
                  : "Ample execution runway. Complete the draft step-by-step."}
              </p>
            </div>
          )}
        </div>

        {/* Task Details Card */}
        <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-2 mb-2">
              <span className="text-[9px] bg-black/60 border border-[#1a1a1a] px-2 py-0.5 rounded-full font-bold uppercase text-slate-400">
                {activeTask?.category}
              </span>
              <button
                onClick={() => onSelectTask(null)}
                className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Change Task
              </button>
            </div>
            
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)] leading-snug">
              {activeTask?.title}
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1 mb-3">
              {activeTask?.description || "No supplemental notes provided."}
            </p>

            <button
              type="button"
              onClick={() => {
                if (activeTask) onToggleComplete(activeTask.id);
              }}
              className="w-full py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-500/30 hover:border-emerald-500 text-emerald-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all mb-1"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
              Done! Mark Completed
            </button>
          </div>

          {/* AI Mindset tip */}
          <div className="mt-4 border-t border-[var(--theme-border-subtle)] pt-4">
            <h4 className="text-[10px] font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-emerald-400" />
              Mindset Tactic
            </h4>
            <p className="text-[11px] font-semibold text-slate-200 mt-1">{activeTip.title}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{activeTip.text}</p>
          </div>
        </div>

        {/* AI Instruct/Extend form */}
        {activeTask?.starterDraft && (
          <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl p-4">
            <h4 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Collaborative AI Extension
            </h4>
            
            <form onSubmit={handleExtendSubmit} className="space-y-2">
              <textarea
                id="extend-instructions"
                rows={2}
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="e.g. Expand introduction, write another function for logging, outline argument 3..."
                className="w-full text-xs px-3 py-2 rounded-xl bg-black border border-[var(--theme-border-subtle)] text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent-2)] transition-colors resize-none"
              />
              <button
                type="submit"
                disabled={isExtendingDraft || !instructions.trim()}
                className="w-full py-2 rounded-lg bg-[#1a1a1a] border border-[#222] text-[var(--theme-text-primary)] text-[10px] font-bold hover:bg-[#252525] active:brightness-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isExtendingDraft ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />
                    AI appending next section...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    Inject Expansion Into Editor
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* RIGHT PANE: The "50% Pre-Done" Editor Sandbox Canvas (8 cols) */}
      <div className="lg:col-span-8 flex flex-col bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl shadow-2xl relative overflow-hidden h-[540px]">
        
        {/* Editor Toolbar Header */}
        <div className="px-4 py-3 bg-black/60 border-b border-[var(--theme-border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <span className="text-[10px] font-mono text-slate-400 font-bold flex items-center gap-1">
              {(activeTask?.category === "code" || activeTask?.category === "coding") ? (
                <>
                  <Code className="w-3.5 h-3.5 text-blue-400" />
                  starter_skeleton.js (Pre-compiled Skeleton)
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  draft_essay_outline.md (Structured Markdown)
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!localDraft}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                copySuccess 
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800" 
                  : "bg-[#111] hover:bg-[#222] border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              <Copy className="w-3 h-3" />
              {copySuccess ? "Copied!" : "Copy"}
            </button>

            <button
              onClick={handleDownload}
              disabled={!localDraft}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                downloadSuccess 
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800" 
                  : "bg-[#111] hover:bg-[#222] border border-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              <Download className="w-3 h-3" />
              {downloadSuccess ? "Downloaded!" : "Download"}
            </button>

            <button
              onClick={() => {
                if (activeTask) onToggleComplete(activeTask.id);
              }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 hover:text-white cursor-pointer"
            >
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              Done
            </button>
          </div>
        </div>

        {/* Editor Workspace Content body */}
        <div className="flex-1 relative flex flex-col min-h-0 bg-black/40">
          {isGeneratingDraft ? (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-6 z-10 gap-3">
              <Sparkles className="w-8 h-8 text-amber-300 animate-spin" />
              <div>
                <p className="text-xs font-bold text-[var(--theme-text-primary)]">AI Writer Active</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                  Writing a 300-word academic intro, detailed topic arguments, and structural boilerplates to smash your starting block...
                </p>
              </div>
            </div>
          ) : !localDraft ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10 gap-4">
              <AlertTriangle className="w-8 h-8 text-amber-400/80" />
              <div>
                <p className="text-xs font-bold text-[var(--theme-text-primary)]">Sandbox Draft Empty</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-sm">
                  Let AI complete 50% of the initial work (the hardest part) instantly. No empty page panic.
                </p>
              </div>
              <button
                onClick={() => onGenerateStarterDraft(selectedTaskId)}
                disabled={isGeneratingDraft}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--theme-accent-2)] to-[var(--theme-accent-1)] hover:brightness-110 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Generate Starter Draft (50% Done)
              </button>
            </div>
          ) : null}

          <textarea
            value={localDraft}
            onChange={(e) => setLocalDraft(e.target.value)}
            className="w-full h-full p-4 font-mono text-[11px] bg-black/10 text-slate-100 border-none focus:outline-none focus:ring-0 resize-none overflow-y-auto leading-relaxed"
            placeholder="Type your own contributions directly into this editable sandbox..."
          />
        </div>

        {/* Editor Bottom Status Bar */}
        {localDraft && activeTask?.extensionPrompt && (
          <div className="px-4 py-2.5 bg-black/90 border-t border-[var(--theme-border-subtle)] flex items-center justify-between text-[10px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-amber-300" />
              <strong>AI Suggests:</strong> {activeTask.extensionPrompt}
            </span>
            <span className="text-slate-500 shrink-0 select-none">
              UTF-8 | Markdown Enabled
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
