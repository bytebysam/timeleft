import React, { useState } from "react";
import { Task, TimeBlock } from "../types";
import { Calendar, Sparkles, Plus, Trash2, Check, X, Clock, Dna } from "lucide-react";

interface WeeklyCalendarProps {
  tasks: Task[];
  blocks: TimeBlock[];
  onAddBlock: (block: Omit<TimeBlock, "id">) => void;
  onRemoveBlock: (id: string) => void;
  onGenerateAiBlocks: (day: string) => Promise<TimeBlock[]>;
  onCommitAiBlocks: (newBlocks: TimeBlock[]) => void;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function WeeklyCalendar({
  tasks,
  blocks,
  onAddBlock,
  onRemoveBlock,
  onGenerateAiBlocks,
  onCommitAiBlocks
}: WeeklyCalendarProps) {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [aiPreviewBlocks, setAiPreviewBlocks] = useState<TimeBlock[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Custom manual block fields
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newTaskId, setNewTaskId] = useState("");

  const handleCreateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle && !newTaskId) return;

    let title = newTitle;
    if (newTaskId) {
      const match = tasks.find(t => t.id === newTaskId);
      if (match) title = `Focus: ${match.title}`;
    }

    onAddBlock({
      taskId: newTaskId || undefined,
      title,
      startTime: newStart,
      endTime: newEnd,
      day: selectedDay,
      type: "manual"
    });

    // Reset fields
    setNewTitle("");
    setNewTaskId("");
    setShowAddForm(false);
  };

  const handleTriggerAiSchedule = async () => {
    setIsAiLoading(true);
    setAiPreviewBlocks([]);
    try {
      const result = await onGenerateAiBlocks(selectedDay);
      setAiPreviewBlocks(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptAiBlocks = () => {
    onCommitAiBlocks(aiPreviewBlocks);
    setAiPreviewBlocks([]);
  };

  const handleRejectAiBlocks = () => {
    setAiPreviewBlocks([]);
  };

  // Combine permanent blocks and transient AI preview blocks for visualization
  const getDayBlocks = (day: string) => {
    const permanent = blocks.filter(b => b.day === day);
    const previews = aiPreviewBlocks.filter(b => b.day === day);
    
    // Sort chronologically by start time
    return [...permanent, ...previews].sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const uncompletedTasks = tasks.filter(t => !t.completed);

  return (
    <div id="weekly-calendar-container" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 shadow-xl flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-md font-bold text-slate-100 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Tactical Week Blocking
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Map out visual work segments manually, or trigger the AI block planner to match energy cycles.
          </p>
        </div>

        {/* AI Action Buttons */}
        <div className="flex items-center gap-2">
          {aiPreviewBlocks.length > 0 ? (
            <div className="flex items-center gap-1.5 bg-indigo-950/30 border border-indigo-500/30 p-1 rounded-xl">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider px-2">Accept AI Plan?</span>
              <button
                onClick={handleAcceptAiBlocks}
                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-100 rounded-lg transition-colors shadow"
                title="Save AI blocks to calendar"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRejectAiBlocks}
                className="p-1.5 bg-[#1a1a1a] hover:bg-black/30 text-slate-400 hover:text-slate-200 rounded-lg transition-colors border border-[#1a1a1a]"
                title="Discard AI blocks"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleTriggerAiSchedule}
              disabled={isAiLoading || uncompletedTasks.length === 0}
              className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-slate-100 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow transition-all hover:shadow-indigo-500/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              {isAiLoading ? "Analyzing Cognitive Cycles..." : `AI Block for ${selectedDay}`}
            </button>
          )}
        </div>
      </div>

      {/* Days Tabs Selection */}
      <div className="flex items-center gap-1 bg-black p-1 border border-[#1a1a1a] rounded-xl overflow-x-auto whitespace-nowrap scrollbar-none">
        {DAYS_OF_WEEK.map(day => {
          const count = blocks.filter(b => b.day === day).length;
          const previewCount = aiPreviewBlocks.filter(b => b.day === day).length;
          return (
            <button
              key={day}
              onClick={() => {
                setSelectedDay(day);
                // Reset AI preview if switching day to keep UI focused
                setAiPreviewBlocks([]);
              }}
              className={`flex-1 text-center py-2 px-3.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                selectedDay === day
                  ? "bg-[#1a1a1a] text-indigo-400 border border-[#2a2a2a]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {day.slice(0, 3)}
              {(count > 0 || previewCount > 0) && (
                <span className={`w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center ${
                  previewCount > 0 ? "bg-indigo-600 text-slate-100 animate-bounce" : "bg-[#1a1a1a] text-slate-300"
                }`}>
                  {count + previewCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid: Calendar visual list + manual add form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Scheduled Blocks (2 cols on large) */}
        <div className="lg:col-span-2 space-y-3">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
            Focus Segments for {selectedDay}
          </span>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {getDayBlocks(selectedDay).map(block => {
              const isAi = block.type === "ai";
              return (
                <div
                  key={block.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all relative overflow-hidden group ${
                    isAi
                      ? "bg-gradient-to-r from-indigo-950/20 to-violet-950/20 border-indigo-500 shadow-lg shadow-indigo-500/10"
                      : "bg-black border border-[#1a1a1a]"
                  }`}
                >
                  {isAi && (
                    <div className="absolute top-0 right-0 bg-indigo-500 text-slate-100 text-[8px] font-extrabold px-1.5 py-0.5 rounded-bl tracking-widest uppercase flex items-center gap-0.5">
                      <Sparkles className="w-2 h-2 animate-pulse" />
                      AI Plan
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isAi ? "bg-indigo-900/40 text-indigo-300" : "bg-black text-slate-400"}`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-200 block">{block.title}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium font-mono">
                        {block.startTime} — {block.endTime}
                      </span>
                    </div>
                  </div>

                  {!isAi && (
                    <button
                      onClick={() => onRemoveBlock(block.id)}
                      className="text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {getDayBlocks(selectedDay).length === 0 && (
              <div className="text-center py-10 border border-dashed border-[#1a1a1a] rounded-xl">
                <Clock className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500 italic">No scheduled focus blocks for this day.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-[11px] text-indigo-400 font-medium hover:underline mt-1"
                >
                  Create focus segment
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar form to Quick Block (1 col) */}
        <div className="bg-black/40 border border-[#1a1a1a] p-4 rounded-xl">
          {!showAddForm ? (
            <div className="flex flex-col items-center justify-center text-center py-6 h-full">
              <Plus className="w-6 h-6 text-slate-500 mb-2" />
              <p className="text-xs font-semibold text-slate-400">Lock focus hours</p>
              <p className="text-[10px] text-slate-500 max-w-[200px] mt-0.5 mb-3">
                Manually coordinate task preparation times into specific hours.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3.5 py-1.5 bg-[#1a1a1a] hover:bg-black/30 border border-[#1a1a1a] text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Focus Block
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateBlock} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Add Focus Block</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-200 text-[10px]"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Link to Task</label>
                <select
                  value={newTaskId}
                  onChange={e => {
                    setNewTaskId(e.target.value);
                    if (e.target.value) {
                      const match = tasks.find(t => t.id === e.target.value);
                      if (match) setNewTitle(`Focus: ${match.title}`);
                    }
                  }}
                  className="w-full bg-black border border-[#1a1a1a] text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Generic Focus Slot --</option>
                  {uncompletedTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                {(() => {
                  const selectedTaskForDna = tasks.find(t => t.id === newTaskId);
                  if (selectedTaskForDna && selectedTaskForDna.dna) {
                    return (
                      <div className="bg-violet-950/20 border border-violet-800/40 p-2.5 rounded-xl text-xs space-y-1 mt-2 animate-fadeIn">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                          <Dna className="w-3 h-3 text-violet-400 animate-pulse" />
                          <span>🧬 DNA Optimal Suggestions</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Best segment: <strong className="text-violet-300">{selectedTaskForDna.dna.bestTimeOfDay}</strong> ({selectedTaskForDna.dna.energyType})
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const blockTimes = {
                              "Morning": { start: "09:00", end: "11:00" },
                              "Afternoon": { start: "14:00", end: "16:00" },
                              "Evening": { start: "19:30", end: "21:30" }
                            };
                            const suggest = blockTimes[selectedTaskForDna.dna!.bestTimeOfDay] || { start: "09:00", end: "11:00" };
                            setNewStart(suggest.start);
                            setNewEnd(suggest.end);
                          }}
                          className="w-full text-center mt-1 py-1 text-[10px] bg-violet-900/30 hover:bg-violet-900/55 text-violet-200 hover:text-violet-100 font-bold rounded border border-violet-800/50 transition-all cursor-pointer"
                        >
                          Apply {selectedTaskForDna.dna.bestTimeOfDay === "Morning" ? "09:00 - 11:00" : selectedTaskForDna.dna.bestTimeOfDay === "Afternoon" ? "14:00 - 16:00" : "19:30 - 21:30"} Block
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {!newTaskId && (
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Custom Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Email cleaning, gym, read"
                    className="w-full bg-black border border-[#1a1a1a] text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Starts At</label>
                  <input
                    type="time"
                    required
                    value={newStart}
                    onChange={e => setNewStart(e.target.value)}
                    className="w-full bg-black border border-[#1a1a1a] text-slate-200 text-xs rounded-lg p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Ends At</label>
                  <input
                    type="time"
                    required
                    value={newEnd}
                    onChange={e => setNewEnd(e.target.value)}
                    className="w-full bg-black border border-[#1a1a1a] text-slate-200 text-xs rounded-lg p-2 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs font-semibold rounded-lg transition-colors"
              >
                Schedule Block
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
