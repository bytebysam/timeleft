import React, { useState, useEffect, useRef } from "react";
import { Task, ExecutionRecipe, RecipeStep } from "../types";
import { Sparkles, Play, Pause, RotateCcw, AlertCircle, BookOpen, BrainCircuit, CheckCircle2, CheckSquare, Square } from "lucide-react";

interface TaskPlannerRecipeProps {
  task: Task;
  recipe: ExecutionRecipe | null;
  onGenerate: (taskId: string) => Promise<void>;
  onStepToggle: (taskId: string, stepId: string, completed: boolean) => void;
  isLoading: boolean;
}

export default function TaskPlannerRecipe({
  task,
  recipe,
  onGenerate,
  onStepToggle,
  isLoading
}: TaskPlannerRecipeProps) {
  // Timer States
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [totalTimerDuration, setTotalTimerDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize active step on recipe load
  useEffect(() => {
    if (recipe && recipe.steps.length > 0) {
      // Pick first uncompleted step
      const firstUncompleted = recipe.steps.find(s => !s.completed) || recipe.steps[0];
      setActiveStepId(firstUncompleted.id);
      setSecondsLeft(firstUncompleted.durationMinutes * 60);
      setTotalTimerDuration(firstUncompleted.durationMinutes * 60);
      setTimerRunning(false);
    }
  }, [recipe]);

  // Timer interval handling
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerRunning(false);
            // Alert user (simulated)
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = "sine";
              osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
              gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.3);
            } catch (e) {
              console.log("Audio feedback not supported or allowed by policy.");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const selectStepForTimer = (step: RecipeStep) => {
    setActiveStepId(step.id);
    setSecondsLeft(step.durationMinutes * 60);
    setTotalTimerDuration(step.durationMinutes * 60);
    setTimerRunning(false);
  };

  const togglePlay = () => {
    setTimerRunning(!timerRunning);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    const activeStep = recipe?.steps.find(s => s.id === activeStepId);
    if (activeStep) {
      setSecondsLeft(activeStep.durationMinutes * 60);
      setTotalTimerDuration(activeStep.durationMinutes * 60);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const activeStep = recipe?.steps.find(s => s.id === activeStepId);
  const progressPercent = totalTimerDuration > 0 ? ((totalTimerDuration - secondsLeft) / totalTimerDuration) * 100 : 0;

  return (
    <div id="recipe-planner-container" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 shadow-xl flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-md font-bold text-slate-100 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Autonomous Execution Recipe
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            AI-generated tactical roadmap for: <span className="text-slate-300 font-medium">"{task.title}"</span>
          </p>
        </div>
        {!recipe && !isLoading && (
          <button
            onClick={() => onGenerate(task.id)}
            className="px-3.5 py-1.5 bg-mystery-plum hover:bg-[#3d0056] border border-mystery-plum/30 text-slate-100 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Deconstruct Procrastination
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-mystery-plum/20 border-t-mystery-plum animate-spin"></div>
            <Sparkles className="w-5 h-5 text-amber-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-slate-200">Deconstructing Cognitive Friction...</p>
            <p className="text-xs text-slate-400 max-w-[280px]">
              Our executive coach is breaking down your task, analyzing optimal working intervals, and structuring mental shortcuts.
            </p>
          </div>
        </div>
      )}

      {!recipe && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[#1a1a1a] rounded-xl p-6">
          <BrainCircuit className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-xs font-semibold text-slate-400">No active recipes generated</p>
          <p className="text-[11px] text-slate-500 max-w-[260px] mt-1 mb-4">
            Paralyzed by how to start? Let the AI companion dismantle this task into a non-intimidating, step-by-step gameplan.
          </p>
          <button
            onClick={() => onGenerate(task.id)}
            className="px-4 py-2 bg-mystery-plum/20 border border-mystery-plum/40 text-mystery-plum text-xs font-semibold rounded-xl hover:bg-mystery-plum/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Build Step-by-Step Recipe
          </button>
        </div>
      )}

      {recipe && !isLoading && (
        <div className="flex-1 flex flex-col md:grid md:grid-cols-5 gap-5 overflow-y-auto max-h-[500px] md:max-h-[none] pr-1">
          {/* Left Column: Steps list (3/5ths) */}
          <div className="md:col-span-3 space-y-3.5">
            <div className="bg-black/40 border border-[#1a1a1a]/80 p-3 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-mystery-plum shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-mystery-plum uppercase tracking-widest block">Recommended Framework</span>
                  {recipe.aiModelUsed && (
                    recipe.aiModelUsed.toLowerCase().includes("pro") ? (
                      <span className="text-amber-400 bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded-md text-[8px] font-semibold tracking-wide select-none font-mono">
                        ✦ Pro
                      </span>
                    ) : (
                      <span className="text-mystery-plum bg-mystery-plum/15 border border-mystery-plum/35 px-1.5 py-0.5 rounded-md text-[8px] font-semibold tracking-wide select-none font-mono">
                        ⚡ Flash
                      </span>
                    )
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-200">{recipe.recommendedMethod}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Target Action Roadmap</span>
              {recipe.steps.map((step) => {
                const isActive = activeStepId === step.id;
                return (
                  <div
                    key={step.id}
                    onClick={() => selectStepForTimer(step)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 group relative ${
                      step.completed
                        ? "bg-black/30 border-[#1a1a1a] opacity-60 hover:opacity-90"
                        : isActive
                        ? "bg-mystery-plum/10 border-mystery-plum shadow-lg shadow-mystery-plum/5"
                        : "bg-black border border-[#1a1a1a]/80 hover:border-[#2a2a2a]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStepToggle(task.id, step.id, !step.completed);
                      }}
                      className="text-slate-400 hover:text-slate-200 transition-colors shrink-0 mt-0.5"
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-mystery-plum" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded border border-[#1a1a1a] group-hover:border-mystery-plum flex items-center justify-center text-mystery-plum text-[10px] font-bold">
                          {step.stepNumber}
                        </div>
                      )}
                    </button>
                    <div className="space-y-1 pr-12 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold leading-none ${step.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
                          {step.title}
                        </span>
                        <span className="text-[9px] font-semibold bg-[#1a1a1a] text-slate-400 px-1.5 py-0.5 rounded leading-none">
                          {step.durationMinutes} min
                        </span>
                      </div>
                      <p className={`text-[11px] leading-relaxed ${step.completed ? "text-slate-500 line-through" : "text-slate-400"}`}>
                        {step.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Focus Timer & Tips (2/5ths) */}
          <div className="md:col-span-2 flex flex-col gap-4">
            {/* Active Task Focus Timer */}
            <div className="bg-black border border-[#1a1a1a] p-4 rounded-xl flex flex-col items-center text-center gap-3 shadow-inner">
              <span className="text-[10px] font-bold text-mystery-oxblood uppercase tracking-widest">Active Focus Session</span>
              
              {activeStep ? (
                <div className="w-full space-y-2">
                  <p className="text-xs font-semibold text-slate-300 truncate max-w-full px-2" title={activeStep.title}>
                    Step {activeStep.stepNumber}: {activeStep.title}
                  </p>
                  
                  {/* Big Countdown */}
                  <div className="text-3xl font-extrabold font-mono text-slate-100 tracking-wider my-1">
                    {formatTime(secondsLeft)}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-black rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-mystery-oxblood h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <button
                      onClick={resetTimer}
                      className="p-2 bg-black hover:bg-[#1a1a1a] border border-[#1a1a1a] text-slate-400 hover:text-slate-200 rounded-xl transition-colors"
                      title="Reset step timer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        timerRunning
                          ? "bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300"
                          : "bg-mystery-oxblood hover:bg-[#850e1a] text-slate-100"
                      }`}
                    >
                      {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      {timerRunning ? "Pause" : "Start Focus"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-4">Select a step to start focus interval</p>
              )}
            </div>

            {/* Procrastination Defense Tip */}
            <div className="bg-black border border-[#1a1a1a] p-4 rounded-xl flex flex-col gap-2">
              <span className="text-[10px] font-bold text-mystery-plum uppercase tracking-widest flex items-center gap-1">
                <BrainCircuit className="w-3 h-3 text-amber-400" />
                Procrastination Shield
              </span>
              <p className="text-[11px] leading-relaxed text-slate-300 italic">
                "{recipe.mindsetTip}"
              </p>
            </div>

            {/* Smart Resources Checklist */}
            <div className="bg-black border border-[#1a1a1a] p-4 rounded-xl flex flex-col gap-2 flex-1">
              <span className="text-[10px] font-bold text-mystery-plum uppercase tracking-widest flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-mystery-plum" />
                Supportive Resources
              </span>
              <ul className="space-y-1.5">
                {recipe.resources.map((res, i) => (
                  <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                    <span className="text-mystery-plum font-bold select-none">•</span>
                    <span>{res}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
