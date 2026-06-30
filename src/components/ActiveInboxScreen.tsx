import React, { useState, useRef } from "react";
import { Task, Milestone } from "../types";
import { 
  Plus, Calendar, AlertCircle, FileText, Image, 
  ChevronDown, ChevronUp, CheckCircle, Circle, ArrowRight, Sparkles, Upload, Flame, Trash2, RefreshCw,
  Mic, MicOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ActiveInboxScreenProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, "id" | "progress" | "completed" | "subtasks"> & { screenshotBase64?: string, mimeType?: string, syllabusText?: string }) => void;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleMilestone: (taskId: string, milestoneId: string) => void;
  onGenerateMilestones: (taskId: string, stressLevel: 'Calm' | 'Anxious' | 'Melting Down') => Promise<void>;
  onTriggerGetStarted: (task: Task) => void;
  isPrioritizing: boolean;
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
}

export default function ActiveInboxScreen({
  tasks,
  onAddTask,
  onToggleComplete,
  onDeleteTask,
  onToggleMilestone,
  onGenerateMilestones,
  onTriggerGetStarted,
  isPrioritizing,
  activeTaskId,
  setActiveTaskId,
}: ActiveInboxScreenProps) {
  // Task input state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState<string>("essay");
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [stressLevel, setStressLevel] = useState<'Calm' | 'Anxious' | 'Melting Down'>("Anxious");
  
  // File upload state
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [fileMime, setFileMime] = useState<string>("");
  const [syllabusText, setSyllabusText] = useState("");
  const [inputMode, setInputMode] = useState<"manual" | "syllabus" | "voice">("manual");
  const showDirectInput = inputMode === "manual";
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  // Initialize SpeechRecognition on mount
  React.useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const currentText = finalTranscript || interimTranscript;
        setVoiceTranscript(currentText);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === "not-allowed") {
          setVoiceError("Microphone permission denied. Enable microphone access in browser settings.");
        } else {
          setVoiceError(`Error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognitionInstance(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionInstance) {
      setVoiceError("Speech recognition is not supported in this browser. Please use Chrome, Safari or Edge.");
      return;
    }

    if (isListening) {
      recognitionInstance.stop();
    } else {
      setVoiceTranscript("");
      setVoiceError(null);
      try {
        recognitionInstance.start();
      } catch (err) {
        console.error("Failed to start recognition", err);
      }
    }
  };

  const handleFocusAddTask = () => {
    setInputMode("manual");
    setTimeout(() => {
      const input = document.getElementById("task-title-input");
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const handleVoiceSubmit = () => {
    if (!voiceTranscript.trim()) return;

    // Stop listening if running
    if (isListening && recognitionInstance) {
      recognitionInstance.stop();
    }

    // Auto-parse on client-side to supply smart fallbacks
    const clientParsed = parseTranscriptClientSide(voiceTranscript);

    onAddTask({
      title: clientParsed.title,
      description: clientParsed.description,
      deadline: clientParsed.deadline,
      category: clientParsed.category,
      estimatedHours: clientParsed.estimatedHours,
      energy: clientParsed.stressLevel === "Calm" ? "high" : clientParsed.stressLevel === "Anxious" ? "medium" : "low",
      difficulty: clientParsed.stressLevel === "Calm" ? 2 : clientParsed.stressLevel === "Anxious" ? 3 : 5,
      dependencies: [],
      stressLevel: clientParsed.stressLevel,
      syllabusText: voiceTranscript // Send raw transcript as syllabus text so backend can parse it using Gemini
    });

    // Clear transcript
    setVoiceTranscript("");
  };

  const parseTranscriptClientSide = (text: string) => {
    const cleanText = text.toLowerCase();
    
    // Extract category
    let cat = "general";
    if (cleanText.includes("write") || cleanText.includes("essay") || cleanText.includes("paper") || cleanText.includes("report") || cleanText.includes("english")) {
      cat = "essay";
    } else if (cleanText.includes("code") || cleanText.includes("program") || cleanText.includes("build") || cleanText.includes("api") || cleanText.includes("bug") || cleanText.includes("developer") || cleanText.includes("website") || cleanText.includes("fix")) {
      cat = "coding";
    } else if (cleanText.includes("read") || cleanText.includes("research") || cleanText.includes("study") || cleanText.includes("learn") || cleanText.includes("book") || cleanText.includes("chapter")) {
      cat = "reading";
    } else if (cleanText.includes("design") || cleanText.includes("ui") || cleanText.includes("ux") || cleanText.includes("style") || cleanText.includes("logo") || cleanText.includes("wireframe") || cleanText.includes("figma")) {
      cat = "design";
    }

    // Extract hours
    let hours = 2;
    const hourMatch = cleanText.match(/(\d+)\s*(hour|hr|hrs)/);
    if (hourMatch) {
      hours = parseInt(hourMatch[1]) || 2;
    }

    // Extract stress / difficulty
    let stress: "Calm" | "Anxious" | "Melting Down" = "Anxious";
    if (cleanText.includes("calm") || cleanText.includes("easy") || cleanText.includes("low stress") || cleanText.includes("relax")) {
      stress = "Calm";
    } else if (cleanText.includes("melt") || cleanText.includes("critical") || cleanText.includes("hard") || cleanText.includes("high stress") || cleanText.includes("deadline") || cleanText.includes("urgent")) {
      stress = "Melting Down";
    }

    // Extract title
    let derivedTitle = text.trim();
    if (derivedTitle.length > 50) {
      derivedTitle = derivedTitle.substring(0, 47) + "...";
    }
    if (!derivedTitle) {
      derivedTitle = "Voice Dictated Task";
    }

    // Extract deadline helper (e.g. tomorrow, Friday)
    let derivedDeadline = "";
    const today = new Date();
    if (cleanText.includes("tomorrow")) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0); // Default to 6 PM
      derivedDeadline = tomorrow.toISOString().slice(0, 16);
    } else if (cleanText.includes("friday")) {
      const target = new Date(today);
      const currentDay = today.getDay();
      const distance = (5 - currentDay + 7) % 7 || 7; // distance to next Friday
      target.setDate(today.getDate() + distance);
      target.setHours(18, 0, 0, 0);
      derivedDeadline = target.toISOString().slice(0, 16);
    } else if (cleanText.includes("monday")) {
      const target = new Date(today);
      const currentDay = today.getDay();
      const distance = (1 - currentDay + 7) % 7 || 7; // distance to next Monday
      target.setDate(today.getDate() + distance);
      target.setHours(18, 0, 0, 0);
      derivedDeadline = target.toISOString().slice(0, 16);
    } else {
      // Default to 2 days from now
      const future = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
      derivedDeadline = future.toISOString().slice(0, 16);
    }

    return {
      title: derivedTitle,
      description: `Dictated: "${text}"`,
      category: cat,
      estimatedHours: hours,
      stressLevel: stress,
      deadline: derivedDeadline
    };
  };
  const [isUploading, setIsUploading] = useState(false);
  const [regeneratingTaskId, setRegeneratingTaskId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setUploadedFile(file);
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFileBase64(reader.result as string);
      setFileMime(file.type);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title && !fileBase64 && !syllabusText) return;

    onAddTask({
      title: title || "Syllabus Extracted Assignment",
      description: description || "Extracted from materials",
      deadline: deadline || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      category,
      estimatedHours,
      energy: stressLevel === "Calm" ? "high" : stressLevel === "Anxious" ? "medium" : "low",
      difficulty: stressLevel === "Calm" ? 2 : stressLevel === "Anxious" ? 3 : 5,
      dependencies: [],
      stressLevel,
      screenshotBase64: fileBase64 || undefined,
      mimeType: fileMime || undefined,
      syllabusText: syllabusText || undefined
    });

    // Reset fields
    setTitle("");
    setDescription("");
    setDeadline("");
    setUploadedFile(null);
    setFileBase64("");
    setFileMime("");
    setSyllabusText("");
  };

  // Helper to format remaining time
  const getRemainingTime = (deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - Date.now();
    if (diff < 0) return { text: "Overdue", danger: true };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return { text: `${days}d ${hours % 24}h remaining`, danger: false };
    }
    if (hours < 2) {
      return { text: `${hours}h ${mins}m remaining - Imminent!`, danger: true };
    }
    return { text: `${hours}h ${mins}m remaining`, danger: hours < 12 };
  };

  // Stress-based visual colors
  const getStressBadgeColor = (stress: string) => {
    switch (stress) {
      case "Calm": return "bg-emerald-950/40 text-emerald-400 border border-emerald-800/50";
      case "Anxious": return "bg-amber-950/40 text-amber-400 border border-amber-800/50";
      case "Melting Down": return "bg-rose-950/40 text-rose-400 border border-rose-800/50 pulse-glow";
      default: return "bg-slate-900 text-slate-400";
    }
  };

  const sortedTasks = tasks.filter(t => !t.completed).sort((a, b) => {
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return (
    <div id="active-inbox-screen" className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      {/* Column 1: Priority Parser & Input (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-bold tracking-tight text-[var(--theme-text-primary)]">
              Add Task
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input switcher tabs to keep uncluttered */}
            <div className="flex bg-black p-0.5 rounded-lg border border-[#1a1a1a] mb-2 text-xs">
              <button
                type="button"
                onClick={() => setInputMode("manual")}
                className={`flex-1 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  inputMode === "manual" ? "bg-[#1a1a1a] text-[var(--theme-text-primary)] border border-slate-800" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                📝 Task Info
              </button>
              <button
                type="button"
                onClick={() => setInputMode("syllabus")}
                className={`flex-1 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  inputMode === "syllabus" ? "bg-[#1a1a1a] text-[var(--theme-text-primary)] border border-slate-800" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                📁 Syllabus Upload
              </button>
              <button
                type="button"
                onClick={() => setInputMode("voice")}
                className={`flex-1 py-1.5 rounded-md font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  inputMode === "voice" ? "bg-amber-950/40 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-amber-400"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {isListening && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isListening ? "bg-rose-500" : "bg-amber-400"}`}></span>
                </span>
                Voice Capture
              </button>
            </div>

            {inputMode === "manual" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    Task Title
                  </label>
                  <input
                    id="task-title-input"
                    type="text"
                    required={inputMode === "manual"}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Write history intro, Fix search API bug"
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-black/60 border border-[var(--theme-border-subtle)] text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent-2)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    Details (Optional)
                  </label>
                  <textarea
                    id="task-desc-input"
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Add specific details or instructions..."
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-black/60 border border-[var(--theme-border-subtle)] text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent-2)] transition-colors resize-none"
                  />
                </div>
              </div>
            )}

            {inputMode === "syllabus" && (
              <div className="space-y-3">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    dragActive 
                      ? "border-[var(--theme-accent-2)] bg-[var(--theme-panel-bg)]" 
                      : "border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] bg-black/30"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <p className="text-[11px] text-slate-300 font-medium">
                      {uploadedFile ? uploadedFile.name : "Drag & drop screenshot or syllabus image here"}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      Supports png, jpeg, webp up to 5MB
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    Or paste syllabus / text context
                  </label>
                  <textarea
                    id="task-syllabus-text"
                    rows={3}
                    value={syllabusText}
                    onChange={e => setSyllabusText(e.target.value)}
                    placeholder="Paste rubric details, course timelines, or screenshot transcription..."
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-black/60 border border-[var(--theme-border-subtle)] text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent-2)] transition-colors resize-none"
                  />
                </div>
              </div>
            )}

            {inputMode === "voice" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-5 bg-black/40 border border-[var(--theme-border-subtle)] rounded-2xl relative overflow-hidden">
                  {isListening && (
                    <div className="absolute inset-0 bg-rose-500/5 animate-pulse pointer-events-none" />
                  )}

                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg relative ${
                      isListening
                        ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-600/20"
                        : "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25 hover:scale-105"
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-6 h-6 animate-pulse" />
                    ) : (
                      <Mic className="w-6 h-6" />
                    )}

                    {isListening && (
                      <span className="absolute -inset-1.5 rounded-full border border-rose-500/40 animate-ping" />
                    )}
                  </button>

                  <span className={`text-[11px] font-bold uppercase mt-3.5 tracking-wider transition-colors ${
                    isListening ? "text-rose-400 animate-pulse" : "text-slate-400"
                  }`}>
                    {isListening ? "Listening... Speak now" : "Tap microphone to record"}
                  </span>
                  
                  <p className="text-[9px] text-slate-500 mt-1 max-w-[220px] text-center leading-normal">
                    Dictate your task title, deadline, stress level, or estimated hours naturally!
                  </p>
                </div>

                {/* Voice Transcript Window */}
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                    Live Dictation Transcript
                  </label>
                  <div className="w-full min-h-[85px] text-xs px-3.5 py-3 rounded-xl bg-black/60 border border-[var(--theme-border-subtle)] text-[var(--theme-text-primary)] flex flex-col justify-between">
                    <p className={`italic leading-relaxed ${voiceTranscript ? "text-slate-200" : "text-slate-500"}`}>
                      {voiceTranscript || '"Write a history essay due tomorrow, low stress" or "Fix search API backend bug, takes about 4 hours, highly critical"'}
                    </p>
                    
                    {voiceTranscript && (
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => setVoiceTranscript("")}
                          className="text-[10px] font-semibold text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                        >
                          Clear Transcript
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Microphone Error Indicator */}
                {voiceError && (
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-300 text-[10px] flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400 mt-0.5" />
                    <span>{voiceError}</span>
                  </div>
                )}

                {/* Smart Client Parser Live Preview */}
                {voiceTranscript.trim() && (
                  <div className="p-3 rounded-xl bg-amber-950/15 border border-amber-500/20 text-slate-300 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
                      <span>Live AI Parser Extraction</span>
                    </div>
                    
                    {(() => {
                      const preview = parseTranscriptClientSide(voiceTranscript);
                      return (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono leading-normal">
                          <div className="text-slate-400 truncate">Title: <span className="text-white">{preview.title}</span></div>
                          <div className="text-slate-400">Category: <span className="text-white uppercase">{preview.category}</span></div>
                          <div className="text-slate-400">Duration: <span className="text-white">{preview.estimatedHours} hrs</span></div>
                          <div className="text-slate-400">Stress: <span className="text-white uppercase">{preview.stressLevel}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Dedicated Voice Submit Button */}
                <button
                  type="button"
                  onClick={handleVoiceSubmit}
                  disabled={isPrioritizing || isUploading || !voiceTranscript.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-bold hover:brightness-110 active:brightness-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPrioritizing ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      Analyzing & Prioritizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Parse & Prioritize Task
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Render Category/Deadline/Stress selections for manual & syllabus modes */}
            {inputMode !== "voice" && (
              <>
                {/* Common fields (deadline, category, stress) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                      Task Category
                    </label>
                    <select
                      id="task-category-select"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl bg-black/60 border border-[var(--theme-border-subtle)] text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent-2)] transition-colors"
                    >
                      <option value="essay">📝 Essay / Writing</option>
                      <option value="coding">💻 Coding / Engineering</option>
                      <option value="reading">📖 Reading / Research</option>
                      <option value="design">🎨 Design / Interface</option>
                      <option value="general">⚡ General Tasks</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                      Looming Deadline
                    </label>
                    <input
                      id="task-deadline-input"
                      type="date"
                      required={inputMode === "manual"}
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl bg-black/60 border border-[var(--theme-border-subtle)] text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent-2)] transition-colors"
                    />
                  </div>
                </div>

                {/* Cognitive Overwhelm / Stress Meter */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Current Brain Stress Level
                    </label>
                    <span className="text-[10px] text-amber-400 font-bold uppercase">{stressLevel}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Calm', 'Anxious', 'Melting Down'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setStressLevel(level)}
                        className={`py-2 px-1 text-[9px] sm:text-[10px] font-bold rounded-xl border transition-all cursor-pointer text-center ${
                          stressLevel === level
                            ? level === "Calm"
                              ? "bg-emerald-950/50 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20"
                              : level === "Anxious"
                              ? "bg-amber-950/50 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20"
                              : "bg-rose-950/50 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/20 animate-pulse"
                            : "bg-black/40 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {level === "Calm" ? "🟢 Calm" : level === "Anxious" ? "🟡 Anxious" : "🔥 Melt Down"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isPrioritizing || isUploading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--theme-accent-2)] to-[var(--theme-accent-1)] text-[var(--theme-text-primary)] text-xs font-bold hover:brightness-110 active:brightness-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPrioritizing ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                      Adding Task...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Task
                    </>
                  )}
                </button>
              </>
            )}
          </form>
        </div>

        {/* Informational tip of the screen */}
        <div className="bg-black/50 border border-slate-800/80 p-4 rounded-xl text-[11px] text-slate-300 leading-relaxed shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-100 font-bold mb-1">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Why this works</span>
          </div>
          Procrastination is an emotional block, not a laziness issue. Timeleft doesn't just show deadlines; it uses AI to slice huge daunting tasks into **tiny 15-minute milestones** that bypass the brain's alarm center.
        </div>
      </div>

      {/* Column 2: The Active Inbox & Milestones list (7 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold tracking-tight text-[var(--theme-text-secondary)] flex items-center gap-2">
            <span>The Active Inbox</span>
            <span className="text-xs bg-black/60 px-2 py-0.5 rounded-full border border-[#1a1a1a] text-slate-400">
              {tasks.filter(t => !t.completed).length} pending
            </span>
          </h3>
        </div>

        <div className="space-y-3">
          {sortedTasks.length === 0 ? (
            <div className="border border-dashed border-[var(--theme-border-subtle)] rounded-2xl p-10 md:p-14 text-center flex flex-col items-center justify-center gap-6 bg-black/30 backdrop-blur-sm relative overflow-hidden py-14">
              {/* Star Logo Large (48px) with purple glow */}
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-purple-950/20 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.25)]">
                <Sparkles className="w-12 h-12 text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.7)] animate-pulse" />
              </div>

              {/* Text Content */}
              <div className="space-y-2 max-w-sm">
                <h3 className="text-xl font-bold tracking-tight text-[var(--theme-text-primary)]">
                  What's due soon?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Add your first task and let AI break it down for you
                </p>
              </div>

              {/* Prominent "+ Add Task" button in red-to-purple brand gradient */}
              <button
                onClick={handleFocusAddTask}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--theme-accent-2)] to-[var(--theme-accent-1)] text-[var(--theme-text-primary)] text-xs font-bold hover:brightness-115 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(168,85,247,0.45)] active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.25)] flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            </div>
          ) : (
            sortedTasks.map((task) => {
              const remaining = getRemainingTime(task.deadline);
              const isExpanded = activeTaskId === task.id;
              
              return (
                <div
                  key={task.id}
                  id={`task-card-${task.id}`}
                  className={`bg-[var(--theme-card)] border rounded-2xl transition-all overflow-hidden task-fade-in ${
                    isExpanded 
                      ? "border-[var(--theme-accent-2)] ring-1 ring-[var(--theme-accent-2)]/30" 
                      : task.completed
                      ? "border-emerald-950/30 opacity-60 hover:opacity-100"
                      : remaining.danger 
                      ? "border-rose-900/50 hover:border-rose-700/80" 
                      : "border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)]"
                  }`}
                >
                  {/* Task Header info row */}
                  <div 
                    onClick={() => setActiveTaskId(isExpanded ? null : task.id)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(task.id);
                        }}
                        className="text-slate-500 hover:text-emerald-400 transition-colors focus:outline-none cursor-pointer"
                      >
                        {task.completed ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-xs font-bold truncate ${
                            task.completed ? "line-through text-slate-500" : "text-[var(--theme-text-primary)]"
                          }`}>
                            {task.title}
                          </h4>
                          {task.stressLevel && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${getStressBadgeColor(task.stressLevel)}`}>
                              {task.stressLevel}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {task.description || "No description provided."}
                        </p>
                      </div>
                    </div>

                    {/* Deadline remaining and expand arrow */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className={`text-[10px] font-bold ${remaining.danger ? "text-rose-400" : "text-slate-400"}`}>
                          {remaining.text}
                        </span>
                        {task.progress > 0 && (
                          <div className="w-16 bg-black rounded-full h-1 mt-1 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <button className="text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded 15-Minute Milestones View */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-[var(--theme-border-subtle)] bg-black/30"
                      >
                        <div className="p-4 space-y-4">
                          {/* Core CTA: Beat procrastination (Get Me Started Workspace) */}
                          {!task.completed && (
                            <div className="bg-gradient-to-r from-amber-950/20 to-[var(--theme-accent-1)]/10 border border-[var(--theme-accent-2)]/30 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                              <div>
                                <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                  Procrastination Block Smashed
                                </h5>
                                <p className="text-[10px] text-slate-300 mt-0.5 leading-normal">
                                  Activate the workspace to find 50% of the draft, outline, or core boilerplate generated for you.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => onTriggerGetStarted(task)}
                                className="px-3.5 py-1.5 rounded-lg bg-[var(--theme-accent-2)] hover:bg-rose-700 font-bold text-[10px] text-white flex items-center gap-1 cursor-pointer shadow transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                              >
                                Get Me Started 50%
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* 15-Minute Milestones Heading */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                              <Flame className="w-3.5 h-3.5 text-orange-400" />
                              15-Minute Micro-Milestones
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Progress: {Math.round(task.progress)}%
                            </span>
                          </div>

                          {/* Milestones checklist */}
                          {!task.milestones || task.milestones.length === 0 ? (
                            <div className="text-center py-5">
                              <p className="text-[11px] text-slate-400">No milestones generated yet for this stress profile.</p>
                              <button
                                type="button"
                                disabled={regeneratingTaskId === task.id}
                                onClick={async () => {
                                  setRegeneratingTaskId(task.id);
                                  try {
                                    await onGenerateMilestones(task.id, task.stressLevel || "Anxious");
                                  } finally {
                                    setRegeneratingTaskId(null);
                                  }
                                }}
                                className="mt-2 text-[10px] px-3.5 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-slate-300 hover:text-white cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 mx-auto transition-colors"
                              >
                                {regeneratingTaskId === task.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                    Generating Milestones...
                                  </>
                                ) : (
                                  "Generate ADHD Milestones"
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {task.milestones.map((milestone) => (
                                <div
                                  key={milestone.id}
                                  className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                                    milestone.completed
                                      ? "bg-black/60 border-emerald-950/20 text-slate-500"
                                      : "bg-black/40 border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] text-[var(--theme-text-primary)]"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => onToggleMilestone(task.id, milestone.id)}
                                    className="mt-0.5 focus:outline-none cursor-pointer text-slate-500 hover:text-emerald-400 transition-colors"
                                  >
                                    {milestone.completed ? (
                                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                                    )}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-center flex-wrap gap-1">
                                      <span className={`text-[11px] font-bold ${milestone.completed ? "line-through text-slate-500" : ""}`}>
                                        {milestone.title}
                                      </span>
                                      <span className="text-[9px] bg-black/60 text-amber-400 border border-[#1a1a1a] px-1.5 py-0.2 rounded-full shrink-0">
                                        {milestone.duration}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                                      {milestone.instructions}
                                    </p>
                                    {milestone.reward && !milestone.completed && (
                                      <div className="text-[9px] text-emerald-400 mt-1 bg-emerald-950/20 border border-emerald-900/40 rounded px-1.5 py-0.5 w-max">
                                        🎁 Micro-Reward: {milestone.reward}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Delete option */}
                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => onDeleteTask(task.id)}
                              className="text-slate-500 hover:text-rose-500 transition-colors text-[10px] flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete Task
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
