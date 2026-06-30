import React, { useState } from "react";
import { Habit } from "../types";
import { Flame, Check, Plus, Trash2, Trophy, Sparkles } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface HabitTrackerProps {
  habits: Habit[];
  onToggleHabit: (id: string) => void;
  onAddHabit: (title: string, category: string) => void;
  onRemoveHabit: (id: string) => void;
}

export default function HabitTracker({
  habits,
  onToggleHabit,
  onAddHabit,
  onRemoveHabit
}: HabitTrackerProps) {
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Productivity");

  const categories = ["Productivity", "Focus", "Mindset", "Health", "Routines"];

  const todayStr = new Date().toISOString().split("T")[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddHabit(newTitle.trim(), newCategory);
    setNewTitle("");
    setShowForm(false);
  };

  const getCompletedCountToday = () => {
    return habits.filter(h => h.completedDates.includes(todayStr)).length;
  };

  const overallMaxStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);

  // Generate dynamic 7-day consistency and streak progression based on actual completion dates
  const getWeeklyStreakData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      
      // Count completions on this day
      const completionsOnDay = habits.filter(h => h.completedDates.includes(dateStr)).length;
      
      // Format short day name
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      
      // Calculate active streaks up to this day
      let dayMaxStreak = 0;
      habits.forEach(h => {
        let tempStreak = 0;
        const checkDate = new Date(d);
        while (true) {
          const checkStr = checkDate.toISOString().split("T")[0];
          if (h.completedDates.includes(checkStr)) {
            tempStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
        if (tempStreak > dayMaxStreak) {
          dayMaxStreak = tempStreak;
        }
      });

      data.push({
        day: dayName,
        Completions: completionsOnDay,
        "Max Streak": dayMaxStreak,
        date: dateStr
      });
    }
    return data;
  };

  return (
    <div id="habit-tracker-container" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 shadow-xl flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-md font-bold text-slate-100 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            Habit Loop Builders
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Reinforce cognitive resilience. Complete habits daily to keep your focus momentum high.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-1.5 bg-[#1a1a1a] hover:bg-black/30 border border-[#1a1a1a] text-slate-300 rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Habit
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3.5 bg-black/40 p-3 rounded-xl border border-[#1a1a1a]/60">
        <div className="text-center space-y-0.5 border-r border-[#1a1a1a]">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Today's Progress</span>
          <span className="text-sm font-extrabold text-slate-200">
            {getCompletedCountToday()} / {habits.length} Done
          </span>
        </div>
        <div className="text-center space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Max Active Streak</span>
          <span className="text-sm font-extrabold text-amber-500 flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 fill-amber-500/10" />
            {overallMaxStreak} Days
          </span>
        </div>
      </div>

      {/* Weekly Streak Progression Line Chart */}
      {habits.length > 0 && (
        <div className="bg-black/40 p-3.5 rounded-xl border border-[#1e293b]/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block font-cormorant">
              7-Day Streak & Consistency Progression
            </span>
            <div className="flex items-center gap-3 text-[9px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-slate-200 inline-block" /> Max Streak
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 border-t border-dashed border-slate-500 inline-block" /> Completions
              </span>
            </div>
          </div>
          <div className="w-full h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getWeeklyStreakData()} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="2 2" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="day" 
                  stroke="#475569" 
                  tick={{ fontSize: 9, fill: '#475569' }} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#475569" 
                  tick={{ fontSize: 9, fill: '#475569' }} 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#000000',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    fontSize: '10px',
                    color: '#f1f5f9'
                  }}
                  itemStyle={{ color: '#cbd5e1' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey="Max Streak"
                  stroke="#cbd5e1"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#000000', stroke: '#cbd5e1', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#cbd5e1', stroke: '#ffffff', strokeWidth: 1 }}
                  animationDuration={400}
                />
                <Line
                  type="monotone"
                  dataKey="Completions"
                  stroke="#475569"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={{ r: 2, fill: '#000000', stroke: '#475569', strokeWidth: 1 }}
                  activeDot={{ r: 4, fill: '#cbd5e1' }}
                  animationDuration={400}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Custom Add Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-black p-4 rounded-xl border border-[#1a1a1a] space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-mystery-plum uppercase tracking-widest">Build Habit Loop</span>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              Cancel
            </button>
          </div>
          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Habit Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. 5-minute workspace declutter"
                className="w-full bg-black border border-[#1a1a1a] text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-mystery-plum"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Focus Type</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full bg-black border border-[#1a1a1a] text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-mystery-plum"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-mystery-plum hover:bg-[#3d0056] text-slate-100 text-xs font-semibold rounded-lg transition-colors"
          >
            Form Habit Loop
          </button>
        </form>
      )}

      {/* Habit List */}
      <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
        {habits.map(habit => {
          const isCompletedToday = habit.completedDates.includes(todayStr);
          return (
            <div
              key={habit.id}
              className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all group ${
                isCompletedToday
                  ? "bg-mystery-plum/15 border-mystery-plum/40 shadow-sm"
                  : "bg-black border border-[#1a1a1a]"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Completion Toggle button */}
                <button
                  type="button"
                  onClick={() => onToggleHabit(habit.id)}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                    isCompletedToday
                      ? "bg-mystery-plum border-mystery-plum text-slate-100"
                      : "border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#0a0a0a]"
                  }`}
                >
                  {isCompletedToday && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                <div className="space-y-0.5">
                  <span className={`text-xs font-bold block ${isCompletedToday ? "text-slate-400 line-through" : "text-slate-200"}`}>
                    {habit.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold bg-[#1a1a1a] text-slate-400 px-1.5 py-0.5 rounded leading-none uppercase tracking-wider">
                      {habit.category}
                    </span>
                    {habit.streak > 0 && (
                      <span className="text-[10px] text-amber-500 font-extrabold flex items-center gap-0.5">
                        <Flame className="w-3.5 h-3.5 fill-amber-500/10" />
                        {habit.streak} day streak
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Delete button on hover */}
              <button
                onClick={() => onRemoveHabit(habit.id)}
                className="text-slate-600 hover:text-rose-400 p-1 rounded hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                title="Remove habit"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {habits.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="w-6 h-6 text-slate-800 mx-auto mb-2" />
            <p className="text-xs text-slate-500 italic">No habit loops tracking currently.</p>
          </div>
        )}
      </div>
    </div>
  );
}
