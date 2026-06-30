import { Task, Habit, TimeBlock, AssistantMessage } from "../types";

const TASKS_KEY = "lastminute_tasks";
const HABITS_KEY = "lastminute_habits";
const BLOCKS_KEY = "lastminute_blocks";
const CHAT_KEY = "lastminute_chat_history";

// Seed data to give a highly functional and fully styled playground right away
const initialTasks = (): Task[] => {
  const today = new Date();
  
  // Set some near-future dates
  const dueToday = new Date(today.getTime() + 5 * 60 * 60 * 1000); // 5 hours from now
  const dueTomorrow = new Date(today.getTime() + 20 * 60 * 60 * 1000); // 20 hours from now
  const dueNextWeek = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

  const formatIso = (date: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  return [
    {
      id: "seed-1",
      title: "Design Pitch Deck Slide 1-5",
      description: "Draft core narrative, value proposition, and competitor comparison slides for tomorrow's investor meeting.",
      deadline: formatIso(dueToday),
      energy: "high",
      difficulty: 4,
      category: "Work",
      estimatedHours: 3,
      progress: 0,
      completed: false,
      dependencies: [],
      subtasks: [
        { id: "sub-1-1", title: "Write copy for value prop slide", completed: false, estimatedMinutes: 20 },
        { id: "sub-1-2", title: "Create competitor feature grid matrix", completed: false, estimatedMinutes: 45 },
        { id: "sub-1-3", title: "Format visual layout in slide deck", completed: false, estimatedMinutes: 60 }
      ]
    },
    {
      id: "seed-2",
      title: "File Outstanding Quarterly Tax Statement",
      description: "Collect receipt PDFs from Google Drive, cross-reference invoice sheets, and submit through secure online portal.",
      deadline: formatIso(dueTomorrow),
      energy: "medium",
      difficulty: 5,
      category: "Finance",
      estimatedHours: 4,
      progress: 0,
      completed: false,
      dependencies: [],
      subtasks: [
        { id: "sub-2-1", title: "Gather Google Drive receipts", completed: false, estimatedMinutes: 30 },
        { id: "sub-2-2", title: "Tally total revenue & tax withholding", completed: false, estimatedMinutes: 60 },
        { id: "sub-2-3", title: "Submit forms in the online portal", completed: false, estimatedMinutes: 40 }
      ]
    },
    {
      id: "seed-3",
      title: "Revise CS301 Systems Architecture Guide",
      description: "Quick summary of distributed database consensus algorithms, CAP theorem, and standard leader-follower repls.",
      deadline: formatIso(dueNextWeek),
      energy: "high",
      difficulty: 3,
      category: "Academics",
      estimatedHours: 2,
      progress: 30,
      completed: false,
      dependencies: [],
      subtasks: [
        { id: "sub-3-1", title: "Review CAP Theorem lecture notes", completed: true, estimatedMinutes: 20 },
        { id: "sub-3-2", title: "Draft flashcards for Paxos/Raft basics", completed: false, estimatedMinutes: 40 },
        { id: "sub-3-3", title: "Complete study guide practice problems", completed: false, estimatedMinutes: 60 }
      ]
    },
    {
      id: "seed-4",
      title: "Call Health Insurance Provider",
      description: "Inquire about claim rejection code 402B for the dental visit last month.",
      deadline: formatIso(new Date(today.getTime() + 48 * 60 * 60 * 1000)), // 2 days from now
      energy: "low",
      difficulty: 2,
      category: "Life",
      estimatedHours: 0.5,
      progress: 0,
      completed: false,
      dependencies: [],
      subtasks: [
        { id: "sub-4-1", title: "Find receipt copy with treatment codes", completed: false, estimatedMinutes: 10 },
        { id: "sub-4-2", title: "Call customer support line & navigate menu", completed: false, estimatedMinutes: 20 }
      ]
    }
  ];
};

const initialHabits = (): Habit[] => {
  const today = new Date();
  const formatYmd = (date: Date) => date.toISOString().split('T')[0];
  const yesterdayYmd = formatYmd(new Date(today.getTime() - 24 * 60 * 60 * 1000));
  
  return [
    {
      id: "habit-1",
      title: "Daily Priority Audit",
      category: "Productivity",
      streak: 4,
      lastCompleted: yesterdayYmd,
      completedDates: [yesterdayYmd, "2026-06-22", "2026-06-21", "2026-06-20"]
    },
    {
      id: "habit-2",
      title: "90-Min Deep Focus Interval",
      category: "Focus",
      streak: 2,
      lastCompleted: yesterdayYmd,
      completedDates: [yesterdayYmd, "2026-06-22"]
    },
    {
      id: "habit-3",
      title: "Digital Clutter Decluttering",
      category: "Mindset",
      streak: 0,
      completedDates: []
    }
  ];
};

const initialBlocks = (): TimeBlock[] => {
  return [
    {
      id: "block-1",
      taskId: "seed-1",
      title: "Focus on Slide Deck Copy",
      startTime: "10:00",
      endTime: "11:30",
      day: "Wednesday",
      type: "manual"
    },
    {
      id: "block-2",
      taskId: "seed-2",
      title: "Gather Invoice & Tax receipts",
      startTime: "14:00",
      endTime: "15:30",
      day: "Thursday",
      type: "manual"
    }
  ];
};

export const loadTasks = (): Task[] => {
  const stored = localStorage.getItem(TASKS_KEY);
  if (!stored) {
    const seeds = initialTasks();
    saveTasks(seeds);
    return seeds;
  }
  return JSON.parse(stored);
};

export const saveTasks = (tasks: Task[]): void => {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
};

export const loadHabits = (): Habit[] => {
  const stored = localStorage.getItem(HABITS_KEY);
  if (!stored) {
    const seeds = initialHabits();
    saveHabits(seeds);
    return seeds;
  }
  return JSON.parse(stored);
};

export const saveHabits = (habits: Habit[]): void => {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
};

export const loadBlocks = (): TimeBlock[] => {
  const stored = localStorage.getItem(BLOCKS_KEY);
  if (!stored) {
    const seeds = initialBlocks();
    saveBlocks(seeds);
    return seeds;
  }
  return JSON.parse(stored);
};

export const saveBlocks = (blocks: TimeBlock[]): void => {
  localStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks));
};

export const loadChatHistory = (): AssistantMessage[] => {
  const stored = localStorage.getItem(CHAT_KEY);
  if (!stored) {
    const welcome: AssistantMessage[] = [
      {
        id: "welcome-msg",
        sender: "assistant",
        text: "Hey! I'm your Timeleft productivity coach. 🚨\n\nI specialize in crushing procrastination and cutting through the anxiety of heavy deadlines. \n\nClick **Run AI Prioritizer** above to map your task list by mental energy and urgency, or click **Create Recipe** on any difficult task to build a custom step-by-step roadmap. Let me know if you are feeling stuck!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    saveChatHistory(welcome);
    return welcome;
  }
  return JSON.parse(stored);
};

export const saveChatHistory = (history: AssistantMessage[]): void => {
  localStorage.setItem(CHAT_KEY, JSON.stringify(history));
};
