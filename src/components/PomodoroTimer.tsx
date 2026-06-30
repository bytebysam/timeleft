import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, RotateCcw, SkipForward, Settings, Volume2, VolumeX, 
  Flame, Coffee, Brain, Sparkles, CheckCircle2, ChevronRight, Sliders
} from "lucide-react";

interface PomodoroTimerProps {
  secondsLeft: number;
  setSecondsLeft: React.Dispatch<React.SetStateAction<number>>;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  mode: "work" | "short" | "long";
  setMode: (mode: "work" | "short" | "long") => void;
  workDuration: number;
  setWorkDuration: (minutes: number) => void;
  shortDuration: number;
  setShortDuration: (minutes: number) => void;
  longDuration: number;
  setLongDuration: (minutes: number) => void;
  completedCount: number;
  setCompletedCount: React.Dispatch<React.SetStateAction<number>>;
}

export default function PomodoroTimer({
  secondsLeft,
  setSecondsLeft,
  isRunning,
  setIsRunning,
  mode,
  setMode,
  workDuration,
  setWorkDuration,
  shortDuration,
  setShortDuration,
  longDuration,
  setLongDuration,
  completedCount,
  setCompletedCount
}: PomodoroTimerProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  
  // Custom audio elements using Web Audio API to avoid external source failures
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const noiseGainRef = useRef<GainNode | null>(null);

  // Initialize Audio Context on demand
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Play synthetic focus success chime
  const playBellChime = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // We synthesize a lovely chime using 3 harmonic sine waves
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.value = freq;
        
        // Stagger the harmonics slightly
        const startTime = now + (index * 0.08);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 1.5);
      });
    } catch (err) {
      console.error("Synthesizer chime failed", err);
    }
  };

  // Generate Brownian Focus noise (sounds like deep, relaxing rain)
  const toggleAmbientNoise = () => {
    const ctx = getAudioContext();

    if (isAmbientPlaying) {
      stopAmbientNoise();
      return;
    }

    try {
      // 2 seconds buffer
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      // Brownian / Brown Noise math: random walks to generate deep rumble (rain-like)
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Gain compensation
      }

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime); // Soft, gentle background volume

      // Lowpass filter to make it exceptionally cozy and eliminate any remaining hiss
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start(0);

      noiseSourceRef.current = source;
      noiseGainRef.current = gainNode;
      setIsAmbientPlaying(true);
    } catch (e) {
      console.error("Failed to play synthesized focus sound", e);
    }
  };

  const stopAmbientNoise = () => {
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop();
      } catch (e) {}
      noiseSourceRef.current = null;
    }
    setIsAmbientPlaying(false);
  };

  // Cleanup synthesizer audio on unmount
  useEffect(() => {
    return () => {
      if (noiseSourceRef.current) {
        try {
          noiseSourceRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Sync mode switch
  const handleModeChange = (newMode: "work" | "short" | "long") => {
    setIsRunning(false);
    setMode(newMode);
    
    let duration = workDuration;
    if (newMode === "short") duration = shortDuration;
    if (newMode === "long") duration = longDuration;
    
    setSecondsLeft(duration * 60);
  };

  // Reset current cycle
  const handleReset = () => {
    setIsRunning(false);
    let duration = workDuration;
    if (mode === "short") duration = shortDuration;
    if (mode === "long") duration = longDuration;
    setSecondsLeft(duration * 60);
  };

  // Skip cycle manually
  const handleSkip = () => {
    setIsRunning(false);
    playBellChime();
    if (mode === "work") {
      setCompletedCount(c => c + 1);
      // Auto toggle to short break or long break based on rounds
      const nextMode = (completedCount + 1) % 4 === 0 ? "long" : "short";
      handleModeChange(nextMode);
    } else {
      handleModeChange("work");
    }
  };

  // Format time (MM:SS)
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate current progress percent
  const totalSecondsForMode = () => {
    if (mode === "work") return workDuration * 60;
    if (mode === "short") return shortDuration * 60;
    return longDuration * 60;
  };
  const totalForMode = totalSecondsForMode();
  const progressPercent = totalForMode > 0 ? ((totalForMode - secondsLeft) / totalForMode) * 100 : 0;

  // Active color schemes
  const getThemeColors = () => {
    if (mode === "work") {
      return {
        text: "text-mystery-oxblood",
        border: "border-mystery-oxblood/30",
        bgLight: "bg-mystery-oxblood/10",
        badge: "bg-mystery-oxblood/10 text-mystery-oxblood border-mystery-oxblood/20",
        button: "bg-mystery-oxblood hover:bg-[#850e1a] text-white shadow-[#660B14]/10"
      };
    } else if (mode === "short") {
      return {
        text: "text-mystery-plum",
        border: "border-mystery-plum/30",
        bgLight: "bg-mystery-plum/10",
        badge: "bg-mystery-plum/10 text-mystery-plum border-mystery-plum/20",
        button: "bg-mystery-plum hover:bg-[#3d0056] text-white shadow-[#2C003E]/10"
      };
    } else {
      return {
        text: "text-mystery-steel",
        border: "border-mystery-steel/30",
        bgLight: "bg-mystery-steel/10",
        badge: "bg-mystery-steel/10 text-mystery-steel border-mystery-steel/20",
        button: "bg-mystery-steel hover:bg-white text-black shadow-white/5"
      };
    }
  };

  const colors = getThemeColors();

  return (
    <div id="pomodoro-timer-card" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 shadow-xl flex flex-col gap-5 h-full justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${colors.bgLight} ${colors.text}`}>
            {mode === "work" ? <Brain className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-md font-bold text-slate-100 flex items-center gap-1">
              Deep Focus
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold font-mono uppercase tracking-wider">
              {mode === "work" ? "Session Phase" : "Recovery Cycle"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Ambient Sound Toggle */}
          <button
            onClick={toggleAmbientNoise}
            title={isAmbientPlaying ? "Mute Brownian Rain" : "Play Brownian Focus Rain"}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isAmbientPlaying 
                ? "bg-mystery-oxblood/20 border-mystery-oxblood/50 text-mystery-oxblood shadow shadow-mystery-oxblood/10" 
                : "bg-black border-[#1a1a1a] text-slate-400 hover:text-slate-200"
            }`}
          >
            {isAmbientPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Configure intervals"
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showSettings 
                ? "bg-[#1a1a1a] border-mystery-plum/40 text-mystery-plum" 
                : "bg-black border-[#1a1a1a] text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSettings ? (
        /* Duration Config Section */
        <div className="flex-1 bg-black/40 border border-[#1a1a1a] p-4 rounded-xl flex flex-col gap-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-mystery-plum uppercase tracking-widest flex items-center gap-1">
              Configure Durations
            </span>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-bold uppercase cursor-pointer"
            >
              Close Settings
            </button>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                <span>Focus Work Duration</span>
                <span className="text-mystery-oxblood font-bold">{workDuration} min</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={workDuration}
                onChange={e => {
                  const val = Number(e.target.value);
                  setWorkDuration(val);
                  if (mode === "work") setSecondsLeft(val * 60);
                }}
                className="w-full accent-[#660B14] h-1.5 bg-black rounded-lg cursor-pointer border border-[#1a1a1a]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                <span>Short Break Duration</span>
                <span className="text-mystery-plum font-bold">{shortDuration} min</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={shortDuration}
                onChange={e => {
                  const val = Number(e.target.value);
                  setShortDuration(val);
                  if (mode === "short") setSecondsLeft(val * 60);
                }}
                className="w-full accent-[#2C003E] h-1.5 bg-black rounded-lg cursor-pointer border border-[#1a1a1a]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                <span>Long Break Duration</span>
                <span className="text-mystery-steel font-bold">{longDuration} min</span>
              </div>
              <input
                type="range"
                min="5"
                max="45"
                step="5"
                value={longDuration}
                onChange={e => {
                  const val = Number(e.target.value);
                  setLongDuration(val);
                  if (mode === "long") setSecondsLeft(val * 60);
                }}
                className="w-full accent-[#A0A0A0] h-1.5 bg-black rounded-lg cursor-pointer border border-[#1a1a1a]"
              />
            </div>
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed font-medium">
            Changes will update the countdown timer immediately for non-active sessions.
          </div>
        </div>
      ) : (
        /* Interactive Timer Face */
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          {/* Phase Switch Tabs */}
          <div className="flex bg-black p-1 border border-[#1a1a1a] rounded-xl w-full max-w-[280px] mb-6">
            {(["work", "short", "long"] as const).map(m => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all capitalize cursor-pointer ${
                  mode === m
                    ? m === "work"
                      ? "bg-mystery-oxblood/20 text-mystery-oxblood border border-mystery-oxblood/30 font-extrabold"
                      : m === "short"
                      ? "bg-mystery-plum/20 text-mystery-plum border border-mystery-plum/30 font-extrabold"
                      : "bg-mystery-steel/20 text-mystery-steel border border-mystery-steel/30 font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "work" ? "Work" : m === "short" ? "Short" : "Long"}
              </button>
            ))}
          </div>

          {/* Dial Graphic */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Background SVG Circle */}
            <svg className="w-full h-full transform -rotate-90 absolute top-0 left-0">
              <circle
                cx="80"
                cy="80"
                r="70"
                className="text-black"
                strokeWidth="6"
                stroke="currentColor"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                className={`transition-all duration-300 ${
                  mode === "work"
                    ? "text-mystery-oxblood"
                    : mode === "short"
                    ? "text-mystery-plum"
                    : "text-mystery-steel"
                }`}
                strokeWidth="6.5"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - progressPercent / 100)}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
              />
            </svg>

            {/* Time Countdown Overlay */}
            <div className="flex flex-col items-center justify-center z-10 text-center select-none">
              <span className={`text-3xl font-extrabold font-mono tracking-wider ${colors.text}`}>
                {formatTime(secondsLeft)}
              </span>
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mt-1">
                {mode === "work" ? "Focusing" : "Resting"}
              </span>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-4 mt-6">
            {/* Reset */}
            <button
              onClick={handleReset}
              title="Reset current timer"
              className="p-3 bg-black hover:bg-[#1a1a1a] border border-[#1a1a1a] text-slate-400 hover:text-slate-200 rounded-xl transition-all cursor-pointer hover:border-[#2a2a2a]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`p-4 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 ${colors.button}`}
            >
              {isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Skip */}
            <button
              onClick={handleSkip}
              title="Skip this session"
              className="p-3 bg-black hover:bg-[#1a1a1a] border border-[#1a1a1a] text-slate-400 hover:text-slate-200 rounded-xl transition-all cursor-pointer hover:border-[#2a2a2a]"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Counter Footer */}
      <div className="border-t border-[#1a1a1a] pt-3.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Daily Streak Loops
          </span>
        </div>
        <div className="flex items-center gap-1 bg-black px-2.5 py-1 rounded-xl border border-[#1a1a1a]">
          <CheckCircle2 className="w-3.5 h-3.5 text-mystery-plum" />
          <span className="text-xs font-mono font-bold text-slate-200">{completedCount} Completed</span>
        </div>
      </div>
    </div>
  );
}
