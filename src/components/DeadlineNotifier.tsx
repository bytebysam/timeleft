import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Task } from "../types";
import { 
  Bell, BellRing, BellOff, Clock, AlertTriangle, CheckSquare, 
  Sparkles, CheckCircle2, Volume2, VolumeX, ShieldAlert, ArrowRight
} from "lucide-react";

interface DeadlineNotifierProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
}

export default function DeadlineNotifier({ tasks, onToggleComplete }: DeadlineNotifierProps) {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "denied";
  });

  const [urgentTasks, setUrgentTasks] = useState<(Task & { minutesLeft: number })[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem("lastminute_sound_enabled") !== "false";
  });
  
  // Keep track of tasks we have already notified natively in this session to avoid spamming
  const notifiedTasksRef = useRef<Set<string>>(new Set());
  
  // Timer to drive the live clock countdowns (updates every second)
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save sound setting to localStorage
  useEffect(() => {
    localStorage.setItem("lastminute_sound_enabled", String(soundEnabled));
  }, [soundEnabled]);

  // Sync notification permission state
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check for tasks with deadlines within the next 60 minutes
  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date(currentTime);
      const urgentList: (Task & { minutesLeft: number })[] = [];

      tasks.forEach(task => {
        if (task.completed || !task.deadline) return;

        const deadlineDate = new Date(task.deadline);
        const diffMs = deadlineDate.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);

        // Within the next hour (0 to 60 minutes) or slightly overdue (up to 15 minutes)
        if (diffMins >= -15 && diffMins <= 60) {
          urgentList.push({
            ...task,
            minutesLeft: Math.ceil(diffMins)
          });

          // Trigger browser-native notification if it hasn't been triggered yet for this task
          if (!notifiedTasksRef.current.has(task.id)) {
            triggerNativeNotification(task, Math.ceil(diffMins));
            notifiedTasksRef.current.add(task.id);
          }
        }
      });

      // Sort urgent tasks by urgency (most urgent/overdue first)
      urgentList.sort((a, b) => a.minutesLeft - b.minutesLeft);
      setUrgentTasks(urgentList);
    };

    checkDeadlines();
  }, [tasks, currentTime]);

  // Handle requesting native browser notification permissions
  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("System notifications are not supported in this browser.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        // Play a test notification
        new Notification("🚨 Timeleft Alerts Enabled!", {
          body: "You will now receive high-priority native notifications when task deadlines are within 1 hour.",
          tag: "permission-test"
        });
        playNotificationSound(true);
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  // Play a beautiful, gentle browser synthesized sound
  const playNotificationSound = (force = false) => {
    if (!soundEnabled && !force) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      
      // Beautiful sci-fi chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5
      
      osc2.frequency.setValueAtTime(293.66, ctx.currentTime); // D4
      osc2.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.15); // D5

      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn("Audio Context sound failed to play: User interaction may be required.", e);
    }
  };

  // Trigger HTML5 web notification
  const triggerNativeNotification = (task: Task, minsLeft: number) => {
    if (permission === "granted") {
      try {
        const title = minsLeft <= 0 
          ? `🚨 Task Overdue: "${task.title}"!`
          : `⏳ Imminent Deadline: "${task.title}" in ${minsLeft}m!`;
        
        const notification = new Notification(title, {
          body: `${task.description || "No description provided."}\nAction required immediately to prevent DNA decay.`,
          requireInteraction: true,
          tag: `deadline-${task.id}`
        });

        notification.onclick = () => {
          window.focus();
        };

        playNotificationSound();
      } catch (err) {
        console.warn("Could not fire native notification (sandbox iframe restriction):", err);
      }
    } else {
      // Sound fallback even if permission isn't granted, to alert user
      playNotificationSound();
    }
  };

  const getUrgencyText = (mins: number) => {
    if (mins < 0) {
      return `Overdue by ${Math.abs(mins)} mins`;
    } else if (mins === 0) {
      return "Due right now!";
    } else if (mins === 1) {
      return "1 minute left!";
    } else {
      return `${mins} minutes left`;
    }
  };

  return (
    <div id="deadline-notifier-panel" className="w-full space-y-3">
      {/* Alert settings controller card */}
      <div className="bg-black/40 border border-[#1a1a1a] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg relative overflow-hidden">
        {/* Subtle horizontal gradient shine */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-500/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-3.5 z-10">
          <div className={`p-2.5 rounded-xl ${
            permission === "granted" 
              ? "bg-mystery-plum/10 text-mystery-plum border border-mystery-plum/30" 
              : "bg-burgundy-soft text-burgundy-elegant border border-burgundy-subtle/30"
          }`}>
            {permission === "granted" ? (
              <BellRing className="w-5 h-5 animate-pulse" />
            ) : (
              <BellOff className="w-5 h-5" />
            )}
          </div>
          <div className="text-left space-y-0.5">
            <h4 className="text-xs font-bold tracking-tight text-slate-200 font-cinzel">
              High-Urgency Alert Utility
            </h4>
            <p className="text-[10px] font-mono text-slate-500 max-w-sm">
              {permission === "granted" 
                ? "Active: Popups will trigger when tasks hit the 60-minute window."
                : "Inactive: Click 'Enable' to activate native system alerts."}
            </p>
          </div>
        </div>

        {/* Buttons / Controls */}
        <div className="flex items-center gap-2 z-10 w-full sm:w-auto justify-end">
          {/* Sound Synthesizer toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Disable Chime Synthesizer" : "Enable Chime Synthesizer"}
            className={`p-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              soundEnabled
                ? "bg-[#1a1a1a] border-[#1a1a1a] text-slate-300 hover:text-slate-200"
                : "bg-black border-[#1a1a1a] text-slate-500 hover:text-slate-400"
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-[10px] hidden md:inline">Chime On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] hidden md:inline">Muted</span>
              </>
            )}
          </button>

          {/* Browser permission button */}
          {permission !== "granted" ? (
            <button
              onClick={requestPermission}
              className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider bg-mystery-oxblood hover:bg-[#850e1a] text-slate-100 rounded-xl transition-all cursor-pointer shadow-md shadow-white/5 font-mono"
            >
              Enable Browser Alerts
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-[#1a1a1a] border border-[#1a1a1a] text-mystery-plum text-[10px] font-mono rounded-xl font-bold uppercase tracking-wider">
              Alerts Ready
            </div>
          )}
        </div>
      </div>

      {/* Urgent Tasks Imminent Warnings Banner */}
      <AnimatePresence>
        {urgentTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="bg-burgundy-soft border border-burgundy-subtle p-4 rounded-3xl space-y-3 shadow-xl shadow-burgundy-soft/5 relative overflow-hidden"
          >
            {/* Blinking outline glow */}
            <div className="absolute inset-0 border border-[#800020]/30 rounded-3xl animate-pulse pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#800020] animate-ping" />
                <span className="text-[10px] font-bold text-burgundy-elegant uppercase tracking-widest font-mono">
                  CRITICAL TIMELINE WARNING: IMMINENT DECAY ({urgentTasks.length} task{urgentTasks.length > 1 ? 's' : ''})
                </span>
              </div>
              <ShieldAlert className="w-4 h-4 text-burgundy-elegant animate-bounce" />
            </div>

            {/* Scrolling list of immediate danger zone tasks */}
            <div className="space-y-2">
              {urgentTasks.map(task => (
                <div 
                  key={task.id}
                  className="bg-black/60 border border-burgundy-subtle/30 rounded-xl p-3 flex items-center justify-between gap-3 text-left hover:border-burgundy-subtle transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => onToggleComplete(task.id)}
                      title="Instantly mark complete and stop countdown"
                      className="w-5 h-5 rounded-lg border border-burgundy-subtle/45 hover:border-burgundy-elegant hover:bg-[#800020]/20 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-burgundy-elegant/75 hover:text-burgundy-elegant" />
                    </button>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-100 truncate font-cormorant">
                        {task.title}
                      </h5>
                      <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-burgundy-elegant shrink-0" />
                        <span className="text-burgundy-elegant font-bold">
                          {getUrgencyText(task.minutesLeft)}
                        </span>
                        {task.category && (
                          <span className="text-slate-600 font-bold uppercase text-[8px] tracking-wider px-1.5 py-0.5 bg-slate-900/80 rounded border border-slate-800 ml-1.5 shrink-0">
                            {task.category}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold font-mono text-burgundy-elegant bg-[#800020]/20 border border-burgundy-subtle/40 px-2 py-1 rounded-lg">
                      {task.minutesLeft <= 0 ? "OVERDUE" : `${task.minutesLeft}m`}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[9px] text-slate-500 font-mono text-center pt-0.5">
              💡 Tip: Click the checkbox next to a task to archive it instantly and resolve the countdown.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
