import { WorkoutRoutine, CompletedWorkout, BodyMeasurement, ActiveExercise } from '../types';
import { INITIAL_ROUTINES, INITIAL_BODY_MEASUREMENTS, INITIAL_COMPLETED_WORKOUTS } from '../utils/sampleData';

const KEYS = {
  ROUTINES: 'aerofit_routines',
  COMPLETED_WORKOUTS: 'aerofit_completed_workouts',
  ACTIVE_WORKOUT: 'aerofit_active_workout',
  BODY_MEASUREMENTS: 'aerofit_body_measurements',
  GEMINI_API_KEY: 'aerofit_gemini_api_key',
  GEMINI_MODEL: 'aerofit_gemini_model',
  USER_PREFERENCES: 'aerofit_user_preferences',
};

export interface UserPreferences {
  unit: 'kg' | 'lbs';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoStartRestTimer: boolean;
  defaultRestSeconds: number;
}

export interface ActiveWorkoutState {
  routineId?: string;
  routineName: string;
  startTime: number;
  exercises: ActiveExercise[];
  notes?: string;
}

export const storageService = {
  // ROUTINES
  getRoutines(): WorkoutRoutine[] {
    const raw = localStorage.getItem(KEYS.ROUTINES);
    if (!raw) {
      this.saveRoutines(INITIAL_ROUTINES);
      return INITIAL_ROUTINES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_ROUTINES;
    }
  },

  saveRoutines(routines: WorkoutRoutine[]) {
    localStorage.setItem(KEYS.ROUTINES, JSON.stringify(routines));
  },

  addRoutine(routine: WorkoutRoutine) {
    const current = this.getRoutines();
    const updated = [routine, ...current];
    this.saveRoutines(updated);
    return updated;
  },

  deleteRoutine(id: string) {
    const current = this.getRoutines();
    const updated = current.filter(r => r.id !== id);
    this.saveRoutines(updated);
    return updated;
  },

  // COMPLETED WORKOUTS
  getCompletedWorkouts(): CompletedWorkout[] {
    const raw = localStorage.getItem(KEYS.COMPLETED_WORKOUTS);
    if (!raw) {
      this.saveCompletedWorkouts(INITIAL_COMPLETED_WORKOUTS);
      return INITIAL_COMPLETED_WORKOUTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_COMPLETED_WORKOUTS;
    }
  },

  saveCompletedWorkouts(workouts: CompletedWorkout[]) {
    localStorage.setItem(KEYS.COMPLETED_WORKOUTS, JSON.stringify(workouts));
  },

  addCompletedWorkout(workout: CompletedWorkout) {
    const current = this.getCompletedWorkouts();
    const updated = [workout, ...current];
    this.saveCompletedWorkouts(updated);
    return updated;
  },

  deleteCompletedWorkout(id: string) {
    const current = this.getCompletedWorkouts();
    const updated = current.filter(w => w.id !== id);
    this.saveCompletedWorkouts(updated);
    return updated;
  },

  // ACTIVE WORKOUT (Session persistence across refreshes)
  getActiveWorkout(): ActiveWorkoutState | null {
    const raw = localStorage.getItem(KEYS.ACTIVE_WORKOUT);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  saveActiveWorkout(workout: ActiveWorkoutState | null) {
    if (!workout) {
      localStorage.removeItem(KEYS.ACTIVE_WORKOUT);
    } else {
      localStorage.setItem(KEYS.ACTIVE_WORKOUT, JSON.stringify(workout));
    }
  },

  clearActiveWorkout() {
    localStorage.removeItem(KEYS.ACTIVE_WORKOUT);
  },

  // BODY MEASUREMENTS
  getBodyMeasurements(): BodyMeasurement[] {
    const raw = localStorage.getItem(KEYS.BODY_MEASUREMENTS);
    if (!raw) {
      this.saveBodyMeasurements(INITIAL_BODY_MEASUREMENTS);
      return INITIAL_BODY_MEASUREMENTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_BODY_MEASUREMENTS;
    }
  },

  saveBodyMeasurements(measurements: BodyMeasurement[]) {
    // Keep sorted by date ascending
    const sorted = [...measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    localStorage.setItem(KEYS.BODY_MEASUREMENTS, JSON.stringify(sorted));
  },

  addBodyMeasurement(entry: BodyMeasurement) {
    const current = this.getBodyMeasurements();
    const updated = [...current, entry];
    this.saveBodyMeasurements(updated);
    return this.getBodyMeasurements();
  },

  deleteBodyMeasurement(id: string) {
    const current = this.getBodyMeasurements();
    const updated = current.filter(m => m.id !== id);
    this.saveBodyMeasurements(updated);
    return updated;
  },

  // GEMINI SETTINGS
  getGeminiApiKey(): string {
    return localStorage.getItem(KEYS.GEMINI_API_KEY) || '';
  },

  saveGeminiApiKey(key: string) {
    localStorage.setItem(KEYS.GEMINI_API_KEY, key.trim());
  },

  getGeminiModel(): string {
    const stored = localStorage.getItem(KEYS.GEMINI_MODEL);
    if (!stored || stored.includes('2.0') || stored.includes('1.5')) {
      this.saveGeminiModel('gemini-3.8-flash');
      return 'gemini-3.8-flash';
    }
    return stored;
  },

  saveGeminiModel(model: string) {
    localStorage.setItem(KEYS.GEMINI_MODEL, model);
  },

  // PREFERENCES
  getPreferences(): UserPreferences {
    const raw = localStorage.getItem(KEYS.USER_PREFERENCES);
    if (!raw) {
      return {
        unit: 'kg',
        soundEnabled: true,
        vibrationEnabled: true,
        autoStartRestTimer: true,
        defaultRestSeconds: 90
      };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        unit: 'kg',
        soundEnabled: true,
        vibrationEnabled: true,
        autoStartRestTimer: true,
        defaultRestSeconds: 90
      };
    }
  },

  savePreferences(prefs: UserPreferences) {
    localStorage.setItem(KEYS.USER_PREFERENCES, JSON.stringify(prefs));
  },

  // EXPORT / IMPORT ALL APP DATA
  exportAllDataJson(): string {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      routines: this.getRoutines(),
      completedWorkouts: this.getCompletedWorkouts(),
      bodyMeasurements: this.getBodyMeasurements(),
      preferences: this.getPreferences()
    };
    return JSON.stringify(data, null, 2);
  },

  importAllDataJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.routines && Array.isArray(data.routines)) {
        this.saveRoutines(data.routines);
      }
      if (data.completedWorkouts && Array.isArray(data.completedWorkouts)) {
        this.saveCompletedWorkouts(data.completedWorkouts);
      }
      if (data.bodyMeasurements && Array.isArray(data.bodyMeasurements)) {
        this.saveBodyMeasurements(data.bodyMeasurements);
      }
      if (data.preferences) {
        this.savePreferences(data.preferences);
      }
      return true;
    } catch (e) {
      console.error("Failed to import data", e);
      return false;
    }
  },

  clearAllData(clearRoutines: boolean = false) {
    this.saveCompletedWorkouts([]);
    this.saveBodyMeasurements([]);
    this.clearActiveWorkout();
    if (clearRoutines) {
      this.saveRoutines([]);
    }
  },

  resetToDefault() {
    this.saveRoutines(INITIAL_ROUTINES);
    this.saveCompletedWorkouts(INITIAL_COMPLETED_WORKOUTS);
    this.saveBodyMeasurements(INITIAL_BODY_MEASUREMENTS);
  }
};

