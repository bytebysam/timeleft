import React, { useState } from "react";
import { motion } from "motion/react";
import { Task } from "../types";
import { 
  Sparkles, Plus, AlertTriangle, Calendar, Flame, CheckCircle, 
  Clock, Search, ArrowUpAZ, BrainCircuit, Trash2, Edit2, CheckCircle2,
  CalendarPlus, ExternalLink, CheckSquare, Square, Dna, Mail, AlertOctagon
} from "lucide-react";

interface TaskDashboardProps {
  tasks: Task[];
  onAddTaskClick: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onTriggerPrioritize: () => Promise<void>;
  onSelectTaskForRecipe: (task: Task) => void;
  isPrioritizing: boolean;
  activeRecipeTaskId?: string | null;
  onTriggerAnalyzeDna: (task: Task) => void;
  onOpenFutureSelfModal: (task: Task) => void;
  procrastinationScore: number;
  onTriggerProcrastinationSimulate: () => void;
}

export default function TaskDashboard({
  tasks,
  onAddTaskClick,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onToggleSubtask,
  onTriggerPrioritize,
  onSelectTaskForRecipe,
  isPrioritizing,
  activeRecipeTaskId,
  onTriggerAnalyzeDna,
  onOpenFutureSelfModal,
  procrastinationScore,
  onTriggerProcrastinationSimulate
}: TaskDashboardProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"deadline" | "ai_priority" | "difficulty">("deadline");

  // UX Celebration/Reward states
  const [completedTaskEffects, setCompletedTaskEffects] = useState<Record<string, boolean>>({});
  const [particles, setParticles] = useState<{ id: number; taskId: string; x: number; y: number; size: number; color: string; angle: number; speed: number; delay: number }[]>([]);

  const handleToggleComplete = (task: Task) => {
    if (!task.completed) {
      // Trigger card-wide metallic glow pulse
      setCompletedTaskEffects(prev => ({ ...prev, [task.id]: true }));
      setTimeout(() => {
        setCompletedTaskEffects(prev => ({ ...prev, [task.id]: false }));
      }, 1000);

      // Generate glittering silver/mercury confetti particles centered near the checkbox
      const silverColors = ["#ffffff", "#e2e8f0", "#cbd5e1", "#94a3b8", "#f8fafc", "#f1f5f9"];
      const newParticles = Array.from({ length: 18 }).map((_, i) => {
        const angle = (Math.random() * 360 * Math.PI) / 180;
        const color = silverColors[Math.floor(Math.random() * silverColors.length)];
        return {
          id: Date.now() + i + Math.random(),
          taskId: task.id,
          x: 10,
          y: 10,
          size: 3 + Math.random() * 5,
          color,
          angle,
          speed: 1.5 + Math.random() * 3,
          delay: Math.random() * 0.1
        };
      });

      setParticles(prev => [...prev, ...newParticles]);

      // Automatic cleanup
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.taskId !== task.id));
      }, 1500);
    }

    onToggleComplete(task.id);
  };

  const getGoogleCalendarUrl = (task: Task) => {
    const title = encodeURIComponent(task.title);
    const desc = encodeURIComponent(task.description || "Timeleft Priority Task");
    
    const deadlineDate = new Date(task.deadline);
    const startDate = new Date(deadlineDate.getTime() - 60 * 60 * 1000);
    const endDate = deadlineDate;

    const formatGCalDate = (d: Date) => {
      try {
        return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      } catch (e) {
        return "20261231T235959Z";
      }
    };

    const dates = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${desc}`;
  };

  const handleAddToGoogleTasks = (title: string) => {
    try {
      navigator.clipboard.writeText(title);
      alert(`Copied "${title}" to clipboard! Opening Google Tasks...`);
    } catch (e) {
      // Fallback
    }
    window.open("https://tasks.google.com", "_blank");
  };

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const activeTasks = totalTasks - completedTasks;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const now = new Date();
  const criticalTasksCount = tasks.filter(t => {
    if (t.completed) return false;
    const hrsLeft = (new Date(t.deadline).getTime() - now.getTime()) / (1000 * 60 * 60);
    return hrsLeft > 0 && hrsLeft < 24;
  }).length;

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "deadline") {
      // Completed tasks go to the bottom
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (sortBy === "ai_priority") {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const scoreA = a.priorityScore || 0;
      const scoreB = b.priorityScore || 0;
      return scoreB - scoreA; // highest priority first
    }
    if (sortBy === "difficulty") {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return b.difficulty - a.difficulty; // hardest first
    }
    return 0;
  });

  const uniqueCategories = Array.from(new Set(tasks.map(t => t.category)));

  const getDeadlineBadge = (deadlineStr: string, completed: boolean) => {
    if (completed) {
      return <span className="text-[10px] font-bold bg-mystery-steel/10 text-mystery-steel border border-mystery-steel/30 px-2 py-0.5 rounded-lg flex items-center gap-1">✅ Done</span>;
    }

    const timeDiff = new Date(deadlineStr).getTime() - now.getTime();
    const hoursLeft = timeDiff / (1000 * 60 * 60);
    const minsLeft = Math.round(timeDiff / (1000 * 60));

    if (minsLeft >= -15 && minsLeft <= 60) {
      const displayMins = minsLeft <= 0 ? "Overdue" : `${minsLeft}m left`;
      return (
        <span className="text-[10px] font-extrabold bg-burgundy-soft text-burgundy-elegant border border-burgundy-subtle px-2 py-0.5 rounded-lg flex items-center gap-1.5 animate-pulse shadow-[0_0_12px_rgba(128,0,32,0.3)] font-mono">
          🔥 IMMINENT: {displayMins}
        </span>
      );
    }

    if (hoursLeft < 0) {
      return <span className="text-[10px] font-bold bg-rose-950/40 text-rose-400 border border-rose-900 px-2 py-0.5 rounded-lg flex items-center gap-1">⚠️ Overdue</span>;
    }
    if (hoursLeft < 12) {
      return <span className="text-[10px] font-extrabold bg-rose-950/60 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 animate-pulse">🚨 Due in {Math.round(hoursLeft)} hrs</span>;
    }
    if (hoursLeft < 24) {
      return <span className="text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-900 px-2 py-0.5 rounded-lg flex items-center gap-1">⏰ Due in {Math.round(hoursLeft)} hrs</span>;
    }
    
    const daysLeft = Math.round(hoursLeft / 24);
    return <span className="text-[10px] font-medium bg-black border border-[#1a1a1a] text-slate-400 px-2 py-0.5 rounded-lg flex items-center gap-1">📅 Due in {daysLeft} d</span>;
  };

  const getDifficultyStars = (difficulty: number) => {
    return (
      <div className="flex gap-0.5" title={`Difficulty: ${difficulty}/5`}>
        {[...Array(5)].map((_, i) => (
          <span 
            key={i} 
            className={`w-1.5 h-1.5 rounded-full ${
              i < difficulty ? "bg-mystery-plum" : "bg-[#1a1a1a]"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* 1. Bento Grid Statistics Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Progress Card */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 rounded-2xl flex items-center justify-between gap-3 shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Completed Ratio</span>
            <span className="text-xl font-extrabold text-slate-100">{progressPercent}%</span>
            <span className="text-[10px] text-slate-400 block">{completedTasks} of {totalTasks} finished</span>
          </div>
          <div className="w-12 h-12 relative flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path className="text-black" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-mystery-plum transition-all duration-500" strokeDasharray={`${progressPercent}, 100`} strokeWidth="3.2" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <CheckCircle className="w-4 h-4 text-mystery-plum absolute m-auto" />
          </div>
        </div>

        {/* Active Tasks */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 rounded-2xl flex items-center justify-between gap-3 shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Urgent Load</span>
            <span className="text-xl font-extrabold text-slate-100">{activeTasks} Active</span>
            <span className="text-[10px] text-slate-400 block">Uncompleted queue</span>
          </div>
          <div className="p-3 bg-mystery-plum/10 text-mystery-plum rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Critical path alarm */}
        <div className={`border p-4 rounded-2xl flex items-center justify-between gap-3 shadow-md transition-colors ${
          criticalTasksCount > 0 
            ? "bg-rose-950/10 border-rose-900/30 text-rose-300" 
            : "bg-[#0a0a0a] border border-[#1a1a1a] text-slate-400"
        }`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Crisis Alert</span>
            <span className={`text-xl font-extrabold ${criticalTasksCount > 0 ? "text-rose-400" : "text-slate-100"}`}>
              {criticalTasksCount} High Alert
            </span>
            <span className="text-[10px] text-slate-400 block">Due in under 24 hrs</span>
          </div>
          <div className={`p-3 rounded-xl ${criticalTasksCount > 0 ? "bg-rose-900/20 text-rose-400 animate-pulse" : "bg-black text-slate-500"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Procrastination Card */}
        <div className={`p-4 rounded-2xl flex flex-col justify-between border shadow-md transition-all ${
          procrastinationScore > 60
            ? "bg-burgundy-soft border-burgundy-subtle text-burgundy-elegant"
            : procrastinationScore > 30
            ? "bg-amber-950/10 border-amber-500/30 text-amber-300"
            : "bg-[#0a0a0a] border border-[#1a1a1a] text-slate-100"
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Delay Coefficient</span>
              <span className={`text-xl font-extrabold ${
                procrastinationScore > 60 ? "text-burgundy-elegant animate-pulse" : procrastinationScore > 30 ? "text-amber-400" : "text-mystery-steel"
              }`}>{procrastinationScore}% DNA Decay</span>
            </div>
            <div className={`p-2.5 rounded-xl ${
              procrastinationScore > 60 ? "bg-burgundy-soft text-burgundy-elegant" : procrastinationScore > 30 ? "bg-amber-900/20 text-amber-400" : "bg-mystery-steel/10 text-mystery-steel"
            }`}>
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[9px] text-slate-500 font-mono">
              {procrastinationScore > 60 ? "Critical Trap Risk" : procrastinationScore > 30 ? "Unstable Inaction" : "Loop execution clean"}
            </span>
            <button
              onClick={onTriggerProcrastinationSimulate}
              className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-black hover:bg-[#1a1a1a] border border-[#1a1a1a] text-mystery-plum hover:text-mystery-bone transition-all cursor-pointer"
              title="Manually simulate 30 minutes of inactivity to trigger AI Intervention"
            >
              Test Trap
            </button>
          </div>
        </div>

        {/* Action Button Card */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 rounded-2xl flex flex-col justify-between shadow-md group hover:border-[#2a2a2a] transition-colors">
          <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Add Workspace Target</span>
          <button
            onClick={onAddTaskClick}
            className="w-full mt-2 py-2 bg-mystery-oxblood hover:bg-[#850e1a] text-slate-100 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </button>
        </div>
      </div>

      {/* 2. Controls Toolbar & AI Prioritizer */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        {/* Filters/Search left side */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks by keyword..."
              className="w-full bg-black border border-[#1a1a1a] text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-mystery-plum transition-colors"
            />
          </div>

          {/* Category Filter dropdown */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-black border border-[#1a1a1a] text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-mystery-plum"
          >
            <option value="All">All Categories</option>
            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          {/* Sort By selector */}
          <div className="flex items-center gap-1.5 bg-black px-2.5 py-1 rounded-xl border border-[#1a1a1a]">
            <ArrowUpAZ className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="deadline">Sort: Deadline</option>
              <option value="ai_priority">Sort: AI Priority</option>
              <option value="difficulty">Sort: Difficulty</option>
            </select>
          </div>
        </div>

        {/* AI Prioritizer trigger right side */}
        <button
          onClick={onTriggerPrioritize}
          disabled={isPrioritizing || tasks.length === 0}
          className="px-4 py-2.5 bg-mystery-plum hover:bg-[#3d0056] disabled:opacity-40 text-slate-100 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow transition-all hover:shadow-mystery-plum/10 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          {isPrioritizing ? "Consulting AI Coach..." : "Run AI Prioritizer"}
        </button>
      </div>

      {/* 3. Task List View */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {sortedTasks.map(task => {
          const isActiveRecipe = activeRecipeTaskId === task.id;
          const isAnimatingGlow = completedTaskEffects[task.id];
          const isImminent = !task.completed && task.deadline && (() => {
            const timeDiff = new Date(task.deadline).getTime() - now.getTime();
            const minsLeft = Math.round(timeDiff / (1000 * 60));
            return minsLeft >= -15 && minsLeft <= 60;
          })();
          return (
            <div
              key={task.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 relative group ${
                isAnimatingGlow
                  ? "border-slate-100 shadow-[0_0_25px_rgba(255,255,255,0.25)] bg-[#1e293b]/40 scale-[1.01]"
                  : task.completed
                  ? "bg-black/20 border-[#1a1a1a] opacity-60 hover:opacity-100"
                  : isImminent
                  ? "border-burgundy-subtle bg-burgundy-soft/10 shadow-[0_0_15px_rgba(128,0,32,0.15)] animate-pulse"
                  : task.dangerZone
                  ? "bg-gradient-to-r from-rose-950/10 to-black border-rose-500/40 shadow shadow-rose-500/5"
                  : isActiveRecipe
                  ? "bg-mystery-plum/5 border-mystery-plum/30 shadow shadow-mystery-plum/5"
                  : "bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#2a2a2a]"
              }`}
            >
              {/* Task Details Info (Left) */}
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                {/* Completion Checkbox with reward animations */}
                <div className="relative shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    className={`w-5 h-5 rounded-lg border shrink-0 mt-1 flex items-center justify-center transition-all cursor-pointer ${
                      task.completed
                        ? "bg-mystery-plum border-mystery-plum text-slate-100"
                        : "border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-black"
                    }`}
                  >
                    {task.completed && <CheckCircle2 className="w-4 h-4 text-slate-100" />}
                  </button>

                  {/* Ripple Glow Wave */}
                  {isAnimatingGlow && (
                    <div className="absolute inset-0 -m-1 rounded-xl bg-white/30 animate-ping pointer-events-none" />
                  )}

                  {/* Sparkly silver confetti particles */}
                  {particles
                    .filter(p => p.taskId === task.id)
                    .map(p => (
                      <motion.div
                        key={p.id}
                        initial={{ x: 10, y: 10, opacity: 1, scale: 1 }}
                        animate={{
                          x: 10 + Math.cos(p.angle) * (25 + Math.random() * 35),
                          y: 10 + Math.sin(p.angle) * (25 + Math.random() * 35) - 20, // drift up
                          opacity: 0,
                          scale: 0.1
                        }}
                        transition={{
                          duration: 1.1,
                          ease: "easeOut",
                          delay: p.delay
                        }}
                        className="absolute pointer-events-none rounded-full"
                        style={{
                          width: p.size,
                          height: p.size,
                          backgroundColor: p.color,
                          boxShadow: `0 0 6px ${p.color}`,
                          zIndex: 30
                        }}
                      />
                    ))}
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-sm font-bold truncate max-w-md ${task.completed ? "line-through text-slate-500" : "text-slate-100"}`}>
                      {task.title}
                    </h4>
                    {getDeadlineBadge(task.deadline, task.completed)}
                    
                    {/* Priority Score tag */}
                    {task.priorityScore !== undefined && !task.completed && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                          task.dangerZone 
                            ? "bg-rose-500 text-slate-100 animate-pulse" 
                            : task.priorityScore > 70 
                            ? "bg-amber-600/20 border border-amber-500/40 text-amber-300"
                            : "bg-[#1a1a1a] text-slate-300"
                        }`}>
                          AI Score: {task.priorityScore}
                        </span>
                        {task.aiModelUsed && (
                          task.aiModelUsed.toLowerCase().includes("pro") ? (
                            <span className="text-amber-400 bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded-md text-[8px] font-semibold tracking-wide select-none font-mono">
                              ✦ Pro
                            </span>
                          ) : (
                            <span className="text-violet-400 bg-violet-950/40 border border-violet-900/40 px-1.5 py-0.5 rounded-md text-[8px] font-semibold tracking-wide select-none font-mono">
                              ⚡ Flash
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {task.description && (
                    <p className={`text-xs leading-relaxed max-w-xl truncate ${task.completed ? "text-slate-500 line-through" : "text-slate-400"}`}>
                      {task.description}
                    </p>
                  )}

                  {/* Badges bar */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[10px] font-semibold bg-black border border-[#1a1a1a] text-slate-400 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {task.category}
                    </span>
                    <span className="text-[10px] font-semibold bg-black border border-[#1a1a1a] text-slate-400 px-2 py-0.5 rounded-md flex items-center gap-1">
                      Difficulty: {getDifficultyStars(task.difficulty)}
                    </span>
                    <span className="text-[10px] font-semibold bg-black border border-[#1a1a1a] text-slate-400 px-2 py-0.5 rounded-md capitalize">
                      Energy: {task.energy}
                    </span>
                    {task.estimatedHours && (
                      <span className="text-[10px] text-slate-500 font-mono">Est: {task.estimatedHours}h</span>
                    )}

                    {/* Subtasks completion summary */}
                    {task.subtasks.length > 0 && (
                      <span className="text-[10px] font-semibold bg-black border border-[#1a1a1a] text-mystery-plum px-2 py-0.5 rounded-md">
                        Subtasks: {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                      </span>
                    )}
                  </div>

                  {/* AI Explanation bubble */}
                  {task.priorityReason && !task.completed && (
                    <div className="bg-black/50 p-2.5 rounded-xl border border-[#1a1a1a] mt-2 text-[10px] leading-relaxed text-slate-400 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-1 flex-wrap gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-300">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          <span>AI COACH INSIGHT</span>
                        </div>
                        {task.aiModelUsed && (
                          task.aiModelUsed.toLowerCase().includes("pro") ? (
                            <span className="text-amber-400 bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded-md text-[8px] font-semibold tracking-wide select-none font-mono">
                              ✦ Pro
                            </span>
                          ) : (
                            <span className="text-violet-400 bg-violet-950/40 border border-violet-900/40 px-1.5 py-0.5 rounded-md text-[8px] font-semibold tracking-wide select-none font-mono">
                              ⚡ Flash
                            </span>
                          )
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        {task.priorityReason}
                      </p>
                    </div>
                  )}

                  {/* Interactive Subtasks Section with progress bar */}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="mt-3.5 space-y-2 border-t border-[#1a1a1a] pt-3 max-w-xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subtask Checkpoints</span>
                        {/* Subtask progress bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-mystery-plum font-bold">
                            {Math.round((task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100)}%
                          </span>
                          <div className="w-20 bg-black h-1.5 rounded-full overflow-hidden border border-[#1a1a1a]">
                            <div 
                              className="bg-mystery-plum h-full transition-all duration-300"
                              style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {task.subtasks.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between bg-black/40 border border-[#1a1a1a]/60 p-2 rounded-xl hover:border-[#2a2a2a] transition-all">
                            <label className="flex items-center gap-2 min-w-0 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={sub.completed}
                                onChange={() => onToggleSubtask(task.id, sub.id)}
                                className="w-3.5 h-3.5 rounded bg-black border border-[#1a1a1a] text-mystery-plum focus:ring-0 cursor-pointer"
                              />
                              <span className={`truncate text-xs ${sub.completed ? "line-through text-slate-500 font-normal" : "text-slate-300 font-semibold"}`}>
                                {sub.title}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAddToGoogleTasks(sub.title)}
                              className="text-[9px] font-bold text-slate-400 bg-black hover:bg-[#1a1a1a] hover:text-slate-200 px-2 py-0.5 rounded border border-[#1a1a1a] transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                              title="Copy title & open Google Tasks"
                            >
                              Add to Google Tasks
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Task DNA Segment */}
                  {task.dna ? (
                    <div className="mt-3.5 bg-black/70 border border-[#1a1a1a] hover:border-mystery-plum/40 p-3 rounded-xl transition-all duration-300 max-w-xl group/dna cursor-help">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-mystery-plum uppercase tracking-wider">
                          <Dna className="w-3.5 h-3.5 text-mystery-plum animate-pulse" />
                          <span>Task DNA Profile</span>
                        </div>
                        <span className="text-[8px] text-slate-500 font-mono group-hover/dna:text-mystery-plum transition-colors uppercase">Hover to Decode Helix</span>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                        <div className="bg-black/60 p-2 rounded-lg border border-[#1a1a1a]/80">
                          <span className="text-slate-500 block uppercase font-mono text-[8px] mb-0.5">Complexity</span>
                          <span className="font-extrabold text-slate-200">{task.dna.complexity}/5</span>
                        </div>
                        <div className="bg-black/60 p-2 rounded-lg border border-[#1a1a1a]/80">
                          <span className="text-slate-500 block uppercase font-mono text-[8px] mb-0.5">Energy Type</span>
                          <span className="font-extrabold text-slate-200">{task.dna.energyType}</span>
                        </div>
                        <div className="bg-black/60 p-2 rounded-lg border border-[#1a1a1a]/80">
                          <span className="text-slate-500 block uppercase font-mono text-[8px] mb-0.5">Best Block</span>
                          <span className="font-extrabold text-slate-200">{task.dna.bestTimeOfDay}</span>
                        </div>
                        <div className="bg-black/60 p-2 rounded-lg border border-[#1a1a1a]/80">
                          <span className="text-slate-500 block uppercase font-mono text-[8px] mb-0.5">Risk Factor</span>
                          <span className={`font-extrabold ${
                            task.dna.riskLevel === 'Critical' ? 'text-rose-400' :
                            task.dna.riskLevel === 'High' ? 'text-orange-400' :
                            task.dna.riskLevel === 'Medium' ? 'text-amber-400' : 'text-mystery-steel'
                          }`}>{task.dna.riskLevel}</span>
                        </div>
                      </div>
 
                      {/* Expanded detail shown on hover */}
                      <div className="max-h-0 opacity-0 overflow-hidden group-hover/dna:max-h-40 group-hover/dna:opacity-100 group-hover/dna:mt-2.5 transition-all duration-500 border-t border-dashed border-[#1a1a1a] pt-2 text-[11px] text-slate-400 space-y-1.5">
                        <div className="flex justify-between items-center">
                           <span className="font-mono text-slate-500">Historical Similarity:</span>
                          <span className="font-bold text-slate-300">{task.dna.similarCompletedBefore ? "MATCHED (Highly Familiar)" : "NEW GENE (First Occurrence)"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-slate-500">Suggested Action:</span>
                          <span className="text-mystery-steel font-semibold">Allocate to {task.dna.bestTimeOfDay} calendar block</span>
                        </div>
                        <div className="flex justify-center pt-1 font-mono text-[9px] text-mystery-plum/40 select-none tracking-widest overflow-hidden">
                          {task.dna.similarCompletedBefore 
                            ? "A-T--G-C--T-A--C-G--A-T" 
                            : "C-G--T-A--A-T--C-G--G-C"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2.5">
                      <button
                        onClick={() => onTriggerAnalyzeDna(task)}
                        className="text-[10px] font-bold text-mystery-plum bg-mystery-plum/10 hover:bg-mystery-plum/20 border border-mystery-plum/30 px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Dna className="w-3.5 h-3.5 animate-pulse" />
                        <span>Analyze Task DNA & Future Letter</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Area (Right) */}
              <div className="flex items-center gap-2 md:self-center self-end shrink-0 pl-9 md:pl-0">
                {/* AI Plan Recipe Trigger */}
                {!task.completed && (
                  <button
                    onClick={() => onSelectTaskForRecipe(task)}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
                      isActiveRecipe
                        ? "bg-mystery-plum text-slate-100"
                        : "bg-[#1a1a1a] hover:bg-black/30 border border-[#1a1a1a] text-slate-300"
                    }`}
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    {isActiveRecipe ? "Active Recipe" : "Create Recipe"}
                  </button>
                )}

                {/* Future Self Letter Button */}
                {task.deadline && (
                  <button
                    onClick={() => onOpenFutureSelfModal(task)}
                    className={`p-2 border rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                      task.futureSelfLetters
                        ? "bg-mystery-plum/10 border-mystery-plum/30 text-mystery-plum hover:bg-mystery-plum/20"
                        : "bg-black hover:bg-[#1a1a1a] border-[#1a1a1a] text-slate-500 hover:text-slate-300"
                    }`}
                    title="A Message From Your Future Self"
                  >
                    <Mail className="w-3.5 h-3.5 animate-pulse" />
                  </button>
                )}

                {/* Sync to Calendar Button */}
                {task.deadline && !task.completed && (
                  <a
                    href={getGoogleCalendarUrl(task)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-black hover:bg-[#1a1a1a] border border-[#1a1a1a] text-mystery-plum hover:text-[#520272] rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                    title="Sync this task deadline to Google Calendar"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                  </a>
                )}

                {/* Edit Button */}
                <button
                  onClick={() => onEditTask(task)}
                  className="p-2 bg-black hover:bg-[#1a1a1a] border border-[#1a1a1a] text-slate-400 hover:text-slate-200 rounded-xl transition-colors"
                  title="Modify task"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-2 bg-black hover:bg-rose-950/20 border border-[#1a1a1a] text-slate-500 hover:text-rose-400 rounded-xl transition-colors"
                  title="Remove task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {sortedTasks.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-[#1a1a1a] rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">Your prioritized workspace is clear!</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              No tasks match your filter/search criteria. Tap "Add Task" to launch a new objective.
            </p>
            <button
              onClick={onAddTaskClick}
              className="px-4 py-2 bg-mystery-oxblood hover:bg-[#850e1a] text-slate-100 text-xs font-bold rounded-xl cursor-pointer"
            >
              Add Your First Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
