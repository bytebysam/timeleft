export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // YYYY-MM-DDTHH:mm
  energy: 'low' | 'medium' | 'high';
  difficulty: number; // 1 to 5
  category: string; // "essay", "coding", "reading", "design", "general"
  estimatedHours: number;
  progress: number; // 0 to 100
  completed: boolean;
  dependencies: string[]; // Task IDs
  priorityScore?: number; // 0 - 100 assigned by AI
  priorityReason?: string; // AI explanation
  dangerZone?: boolean; // AI flag for highly critical tasks
  subtasks: SubTask[];
  aiModelUsed?: string; // e.g. "Flash" or "Pro"
  dna?: TaskDNA;
  futureSelfLetters?: FutureSelfLetters;
  stressLevel?: 'Calm' | 'Anxious' | 'Melting Down';
  milestones?: Milestone[];
  starterDraft?: string;
  extensionPrompt?: string;
  focusTimeSeconds?: number;
}

export interface Milestone {
  id: string;
  title: string;
  duration: string; // e.g. "15 mins"
  instructions: string;
  reward: string;
  completed: boolean;
}

export interface TaskDNA {
  complexity: number; // 1-5
  energyType: 'Deep Work' | 'Admin' | 'Creative' | 'Communication';
  bestTimeOfDay: 'Morning' | 'Afternoon' | 'Evening';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  similarCompletedBefore: boolean;
}

export interface FutureSelfLetters {
  successLetter: string;
  failureLetter: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  estimatedMinutes: number;
}

export interface Habit {
  id: string;
  title: string;
  category: string;
  streak: number;
  lastCompleted?: string; // YYYY-MM-DD
  completedDates: string[]; // YYYY-MM-DD array
}

export interface TimeBlock {
  id: string;
  taskId?: string;
  title: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  day: string; // 'Monday', 'Tuesday', etc.
  type: 'manual' | 'ai';
  aiModelUsed?: string;
}

export interface ExecutionRecipe {
  taskId: string;
  taskTitle: string;
  steps: RecipeStep[];
  resources: string[];
  recommendedMethod: string; // e.g. "Pomodoro Technique", "Ultradian Rhythm"
  mindsetTip: string;
  aiModelUsed?: string;
}

export interface RecipeStep {
  id: string;
  stepNumber: number;
  title: string;
  detail: string;
  durationMinutes: number;
  completed: boolean;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  aiModelUsed?: string;
  searchGrounded?: boolean;
}

export interface RecommendationBrief {
  urgencyWarning?: string;
  focusMethods: string[];
  motivationQuote: string;
  suggestedNextTask?: string;
}
