export type MuscleGroup = 
  | 'Chest' 
  | 'Back' 
  | 'Shoulders' 
  | 'Biceps' 
  | 'Triceps' 
  | 'Legs' 
  | 'Abs' 
  | 'Full Body';

export interface ExerciseSet {
  id: string;
  setNumber: number;
  weight: number; // in kg (or lbs)
  reps: number;
  targetReps?: number;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  isCompleted: boolean;
  type: 'warmup' | 'normal' | 'dropset' | 'failure';
  previousWeight?: number;
  previousReps?: number;
}

export interface ActiveExercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  restSeconds: number;
  notes?: string;
  sets: ExerciseSet[];
  isFinished: boolean;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  description: string;
  splitType: 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Full Body' | 'Custom';
  estimatedMinutes: number;
  exercises: {
    id: string;
    name: string;
    muscle: MuscleGroup;
    targetSets: number;
    targetReps: number;
    defaultWeight: number;
    restSeconds: number;
    notes?: string;
  }[];
  createdAt: string;
  updatedAt?: string;
  source?: 'user' | 'gemini-ai' | 'gemini-import';
}

export interface CompletedWorkout {
  id: string;
  routineId?: string;
  routineName: string;
  date: string; // ISO date string YYYY-MM-DD
  startTime: number; // timestamp
  endTime: number; // timestamp
  durationMinutes: number;
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  exercises: ActiveExercise[];
  notes?: string;
  prs?: {
    exerciseName: string;
    weight: number;
    reps: number;
  }[];
}

export interface BodyMeasurement {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  chestCm: number;
  stomachWaistCm: number;
  hipsCm?: number;
  armsCm?: number;
  thighsCm?: number;
  bodyFatPercentage?: number;
  notes?: string;
}

export interface BodyCompositionAnalysis {
  status: 'recomposition' | 'muscle-gain' | 'fat-loss' | 'surplus' | 'maintenance' | 'need-data';
  headline: string;
  summary: string;
  weightDelta: number;
  waistDelta: number;
  chestDelta: number;
  bodyFatDelta?: number;
  estimatedMuscleGainRate?: string;
  estimatedFatLossRate?: string;
  recommendations: string[];
}

export interface ExerciseProgress {
  exerciseName: string;
  muscle: MuscleGroup;
  history: {
    date: string;
    maxWeight: number;
    totalVolume: number;
    bestSet: string;
    estimated1RM: number;
  }[];
  trend: 'increasing' | 'stable' | 'decreasing';
  percentageChange: number;
  lastWeight: number;
  firstWeight: number;
}

