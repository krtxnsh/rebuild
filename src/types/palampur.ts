export type AppRole = 'landing' | 'student' | 'teacher';

export type StudentNavTab =
  | 'home'
  | 'learn'
  | 'missions'
  | 'village'
  | 'achievements'
  | 'leaderboard'
  | 'profile';

export type TeacherNavTab =
  | 'overview'
  | 'class'
  | 'assignments'
  | 'analytics'
  | 'recommendations'
  | 'misconceptions'
  | 'village'
  | 'reports'
  | 'settings';

export type Subject = 'Maths' | 'Science' | 'English' | 'EVS';

export type ConceptMasteryState = 'secure' | 'fragile' | 'misconception' | 'unseen';

export interface QuizOption {
  id: string;
  label: string;
  isCorrect: boolean;
  misconceptionTag?: string;
  explanation: string;
}

export interface QuizQuestion {
  id: string;
  conceptId: string;
  conceptName: string;
  prompt: string;
  contextStory: string;
  options: QuizOption[];
  xpReward: number;
}

export interface LearningModule {
  id: string;
  title: string;
  subject: Subject;
  difficulty: 'Foundation' | 'Intermediate' | 'Challenge';
  estimatedMinutes: number;
  xpReward: number;
  villageImpactPct: number;
  linkedBuildingId: string;
  description: string;
  conceptTag: string;
  progress: number; // 0 to 100
  completed: boolean;
  questions: QuizQuestion[];
}

export interface VillageBuilding {
  id: string;
  name: string;
  category: 'Education' | 'Water' | 'Energy' | 'Agriculture' | 'Health' | 'Community';
  linkedSubject: Subject;
  description: string;
  restorationCostXp: number;
  progress: number; // 0 to 100
  status: 'restored' | 'restoring' | 'foundation';
  communityBenefit: string;
  position: [number, number, number];
  rotationY: number;
  linkedModuleId: string;
}

export interface Mission {
  id: string;
  title: string;
  cadence: 'Daily' | 'Weekly' | 'Milestone';
  description: string;
  xpReward: number;
  villageBoostPct: number;
  currentCount: number;
  targetCount: number;
  completed: boolean;
  claimed: boolean;
  linkedModuleId?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  criteria: string;
  xpBonus: number;
  unlocked: boolean;
  unlockedDate?: string;
  tier: 'Bronze' | 'Silver' | 'Gold';
}

export interface StudentActivityEntry {
  id: string;
  title: string;
  subject: Subject;
  scorePct: number;
  xpEarned: number;
  timestamp: string;
}

export interface StudentRecord {
  id: string;
  name: string;
  rollNo: string;
  avatarVariant: number;
  level: number;
  xp: number;
  streakDays: number;
  overallScore: number;
  predictionCounts?: Partial<Record<Subject, { correct: number; total: number }>>;
  weeklyDelta: number;
  completionRate: number;
  activeThisWeek: boolean;
  status: 'On Track' | 'Fragile' | 'Needs Attention';
  subjects: Record<Subject, number>;
  modulesCompleted: number;
  totalModules: number;
  conceptStates: Record<string, ConceptMasteryState>;
  activeMisconceptions: string[];
  recentActivity: StudentActivityEntry[];
  weeklySeries: number[]; // Mon-Sun
  monthlySeries: number[]; // Jun 1, Jun 8, Jun 15, Jun 22, Jun 30
  badgesUnlocked: string[];
  teacherNote?: string;
}

export interface ConceptInsight {
  id: string;
  conceptTitle: string;
  misconceptionStatement: string;
  domain: string;
  subject: Subject;
  severity: 'High' | 'Medium' | 'Low';
  holdIdeaCount: number;
  fragileCount: number;
  secureCount: number;
  notSeenCount: number;
  unsureCount: number;
  confidenceScore: number;
  scientificModel: string;
  studentMentalModel: string;
  suggestedClassroomActivity: string;
  recommendedNextAction: string;
  activityDurationMin: number;
  affectedStudentIds: string[];
  linkedModuleId: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: Subject;
  conceptFocus: string;
  dueDate: string;
  assignedTo: string;
  submittedCount: number;
  totalCount: number;
  averageScore: number;
  status: 'Active' | 'Completed' | 'Draft';
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  timeAgo: string;
  unread: boolean;
  audience: 'student' | 'teacher';
  targetTab?: string;
}

export interface ClassDataset {
  id: 'class-6a' | 'sample-class' | 'live-class';
  label: string;
  schoolName: string;
  gradeLabel: string;
  teacherName: string;
  villageProgressPct: number;
  classConfidencePct: number;
  classConfidenceDelta: number;
  students: StudentRecord[];
  conceptInsights: ConceptInsight[];
  assignments: Assignment[];
}
