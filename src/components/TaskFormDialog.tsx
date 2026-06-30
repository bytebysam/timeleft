import React, { useState, useEffect } from "react";
import { Task, SubTask } from "../types";
import { Plus, X, ListPlus } from "lucide-react";

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  existingTask?: Task | null;
  allTasks: Task[];
}

export default function TaskFormDialog({
  isOpen,
  onClose,
  onSave,
  existingTask,
  allTasks
}: TaskFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [energy, setEnergy] = useState<'low' | 'medium' | 'high'>("medium");
  const [difficulty, setDifficulty] = useState<number>(3);
  const [category, setCategory] = useState("Work");
  const [estimatedHours, setEstimatedHours] = useState<number>(1);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const categories = ["Work", "Academics", "Finance", "Life", "Personal", "Health"];

  useEffect(() => {
    if (existingTask) {
      setTitle(existingTask.title);
      setDescription(existingTask.description);
      setDeadline(existingTask.deadline ? existingTask.deadline.slice(0, 10) : "");
      setEnergy(existingTask.energy);
      setDifficulty(existingTask.difficulty);
      setCategory(existingTask.category);
      setEstimatedHours(existingTask.estimatedHours);
      setDependencies(existingTask.dependencies || []);
      setSubtasks(existingTask.subtasks || []);
    } else {
      // Set default deadline to today + 24 hours
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 24);
      tomorrow.setMinutes(0);
      const tzOffset = tomorrow.getTimezoneOffset() * 60000;
      const localIsoDate = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 10);
      
      setTitle("");
      setDescription("");
      setDeadline(localIsoDate);
      setEnergy("medium");
      setDifficulty(3);
      setCategory("Work");
      setEstimatedHours(1);
      setDependencies([]);
      setSubtasks([]);
    }
  }, [existingTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData: Task = {
      id: existingTask?.id || `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      deadline,
      energy,
      difficulty,
      category,
      estimatedHours: Number(estimatedHours) || 1,
      progress: existingTask?.progress || 0,
      completed: existingTask?.completed || false,
      dependencies,
      subtasks,
      priorityScore: existingTask?.priorityScore,
      priorityReason: existingTask?.priorityReason,
      dangerZone: existingTask?.dangerZone
    };

    onSave(taskData);
    onClose();
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: SubTask = {
      id: `sub-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
      estimatedMinutes: 20
    };
    setSubtasks([...subtasks, newSub]);
    setNewSubtaskTitle("");
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(sub => sub.id !== id));
  };

  const toggleDependency = (id: string) => {
    if (dependencies.includes(id)) {
      setDependencies(dependencies.filter(depId => depId !== id));
    } else {
      setDependencies([...dependencies, id]);
    }
  };

  // Prevent task from depending on itself
  const validDependencyTasks = allTasks.filter(t => t.id !== existingTask?.id);

  return (
    <div id="task-form-overlay" className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div id="task-form-card" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-indigo-400" />
            {existingTask ? "Modify Priority Task" : "Launch New Priority Task"}
          </h2>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 hover:bg-[#1a1a1a] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          {/* Title & Description */}
          <div className="space-y-4">
            <div>
              <label htmlFor="task-title" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Task Title *</label>
              <input
                id="task-title"
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Finish Pitch Deck Slides"
                className="w-full bg-black border border-[#1a1a1a] text-slate-100 rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="task-description" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description & Context</label>
              <textarea
                id="task-description"
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add helpful details or context to feed the AI Planner..."
                className="w-full bg-black border border-[#1a1a1a] text-slate-100 rounded-xl px-4 py-2 focus:border-indigo-500 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-deadline" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Deadline Date *</label>
              <input
                id="task-deadline"
                type="date"
                required
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full bg-black border border-[#1a1a1a] text-slate-100 rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="task-category" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
              <div className="flex gap-2">
                <select
                  id="task-category"
                  value={categories.includes(category) ? category : "Custom"}
                  onChange={e => {
                    if (e.target.value !== "Custom") setCategory(e.target.value);
                  }}
                  className="bg-black border border-[#1a1a1a] text-slate-100 rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:outline-none transition-colors flex-1"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="Custom">Custom...</option>
                </select>
                {!categories.includes(category) && (
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="Category Name"
                    className="bg-black border border-[#1a1a1a] text-slate-100 rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:outline-none transition-colors flex-1"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Interactive Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#1a1a1a] pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Cognitive Energy Level</label>
              <div className="flex bg-black p-1 border border-[#1a1a1a] rounded-xl">
                {(['low', 'medium', 'high'] as const).map(lev => (
                  <button
                    key={lev}
                    type="button"
                    onClick={() => setEnergy(lev)}
                    className={`flex-1 text-center capitalize py-1.5 text-xs font-medium rounded-lg transition-all ${
                      energy === lev
                        ? "bg-indigo-600 text-slate-100 shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {lev}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Difficulty: {difficulty}/5</label>
              <div className="flex items-center gap-2 py-1">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={difficulty}
                  onChange={e => setDifficulty(Number(e.target.value))}
                  className="w-full accent-indigo-500 h-2 bg-black rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label htmlFor="task-est" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Estimated Hours</label>
              <input
                id="task-est"
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                value={estimatedHours}
                onChange={e => setEstimatedHours(Number(e.target.value))}
                className="w-full bg-black border border-[#1a1a1a] text-slate-100 rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Subtasks builder */}
          <div className="border-t border-[#1a1a1a] pt-4">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subtasks breakdown</span>
            <div className="space-y-2 mb-3 max-h-[140px] overflow-y-auto pr-1">
              {subtasks.map((sub, index) => (
                <div key={sub.id} className="flex items-center justify-between bg-black px-3 py-2 rounded-xl border border-[#1a1a1a]">
                  <span className="text-xs text-slate-200 font-medium">
                    {index + 1}. {sub.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(sub.id)}
                    className="text-rose-400 hover:text-rose-300 p-0.5 hover:bg-rose-950/20 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {subtasks.length === 0 && (
                <p className="text-xs text-slate-500 italic">No custom subtasks added yet. (AI can generate a plan for you later!)</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                placeholder="Add subtask title..."
                className="flex-1 bg-black border border-[#1a1a1a] text-slate-200 text-xs rounded-xl px-3 py-2 focus:border-indigo-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="bg-[#1a1a1a] hover:bg-black/30 border border-[#1a1a1a] text-slate-200 text-xs px-3 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Block dependencies */}
          {validDependencyTasks.length > 0 && (
            <div className="border-t border-[#1a1a1a] pt-4">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Blocking Dependencies</span>
              <p className="text-[11px] text-slate-500 mb-2">Select any tasks that MUST be completed before this one begins:</p>
              <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto pr-1">
                {validDependencyTasks.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleDependency(t.id)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      dependencies.includes(t.id)
                        ? "bg-indigo-950/40 border-indigo-500 text-indigo-300"
                        : "bg-black border border-[#1a1a1a] text-slate-400 hover:border-[#2a2a2a] hover:text-slate-300"
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="border-t border-[#1a1a1a] pt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#1a1a1a] hover:bg-[#1a1a1a] text-slate-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-xl text-sm font-medium transition-colors hover:shadow-lg hover:shadow-indigo-500/10"
            >
              {existingTask ? "Save Edits" : "Launch Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
