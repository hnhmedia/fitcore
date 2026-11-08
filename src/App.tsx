import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { ActiveWorkoutPlayer } from './components/ActiveWorkoutPlayer';
import { RoutineManager } from './components/RoutineManager';
import { ProgressAnalytics } from './components/ProgressAnalytics';
import { BodyCompositionTracker } from './components/BodyCompositionTracker';
import { GeminiSettingsModal } from './components/GeminiSettingsModal';
import { GeminiCoachChat } from './components/GeminiCoachChat';
import { PlateCalculatorModal } from './components/PlateCalculatorModal';
import { storageService, ActiveWorkoutState } from './services/storageService';
import { WorkoutRoutine, CompletedWorkout, BodyMeasurement } from './types';
import { Play, Sparkles, Upload, Plus, Dumbbell, Trophy } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('routines');
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(null);
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [completedWorkouts, setCompletedWorkouts] = useState<CompletedWorkout[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCoachChatOpen, setIsCoachChatOpen] = useState(false);
  const [isPlateCalcOpen, setIsPlateCalcOpen] = useState(false);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');

  // Initial Load from Storage
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    setRoutines(storageService.getRoutines());
    setCompletedWorkouts(storageService.getCompletedWorkouts());
    setBodyMeasurements(storageService.getBodyMeasurements());
    
    const existingActive = storageService.getActiveWorkout();
    if (existingActive) {
      setActiveWorkout(existingActive);
      setCurrentTab('workout');
    }

    const prefs = storageService.getPreferences();
    setUnit(prefs.unit || 'kg');
  };

  const handleStartWorkout = (workoutState: ActiveWorkoutState) => {
    setActiveWorkout(workoutState);
    storageService.saveActiveWorkout(workoutState);
    setCurrentTab('workout');
  };

  const handleWorkoutFinished = (completed: CompletedWorkout) => {
    const updated = storageService.addCompletedWorkout(completed);
    setCompletedWorkouts(updated);
    setActiveWorkout(null);
    storageService.clearActiveWorkout();
    setCurrentTab('progress');
  };

  const handleWorkoutDiscarded = () => {
    setActiveWorkout(null);
    storageService.clearActiveWorkout();
    setCurrentTab('routines');
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeWorkout={activeWorkout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCoachChat={() => setIsCoachChatOpen(true)}
        onOpenPlateCalc={() => setIsPlateCalcOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto pt-4 px-2 sm:px-4">
        {/* TAB 1: WORKOUT */}
        {currentTab === 'workout' && (
          activeWorkout ? (
            <ActiveWorkoutPlayer
              workout={activeWorkout}
              onWorkoutFinished={handleWorkoutFinished}
              onWorkoutDiscarded={handleWorkoutDiscarded}
              unit={unit}
            />
          ) : (
            /* No workout in progress - Quick Launch Screen */
            <div className="max-w-xl mx-auto py-12 px-4 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mx-auto mb-4 shadow-xl">
                <Dumbbell size={32} />
              </div>
              <h2 className="text-2xl font-black text-white">Ready for your workout?</h2>
              <p className="text-sm text-zinc-400 mt-2 mb-8">
                Choose a saved routine, generate an AI split with Gemini, or start an empty workout.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => setCurrentTab('routines')}
                  className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Play size={18} /> Choose Routine to Start
                </button>

                <button
                  onClick={() => {
                    handleStartWorkout({
                      routineName: 'Freeform Workout',
                      startTime: Date.now(),
                      exercises: [
                        {
                          id: `ex-free-${Date.now()}`,
                          name: 'Barbell Flat Bench Press',
                          muscle: 'Chest',
                          restSeconds: 90,
                          isFinished: false,
                          sets: [
                            { id: `s1-${Date.now()}`, setNumber: 1, weight: 60, reps: 10, isCompleted: false, type: 'normal' },
                            { id: `s2-${Date.now()}`, setNumber: 2, weight: 60, reps: 10, isCompleted: false, type: 'normal' },
                            { id: `s3-${Date.now()}`, setNumber: 3, weight: 60, reps: 10, isCompleted: false, type: 'normal' },
                          ]
                        }
                      ]
                    });
                  }}
                  className="w-full py-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Plus size={18} /> Start Blank Workout
                </button>
              </div>

              {/* Recent workouts preview */}
              {completedWorkouts.length > 0 && (
                <div className="mt-12 text-left">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                    Recent Workouts Logged
                  </h4>
                  <div className="space-y-2">
                    {completedWorkouts.slice(0, 3).map(w => (
                      <div key={w.id} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-zinc-200">{w.routineName}</p>
                          <p className="text-[11px] text-zinc-400">{w.date} • {w.durationMinutes} mins</p>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">
                          {w.totalVolumeKg.toLocaleString()} {unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* TAB 2: ROUTINES */}
        {currentTab === 'routines' && (
          <RoutineManager
            routines={routines}
            completedWorkouts={completedWorkouts}
            onStartWorkout={handleStartWorkout}
            onRoutinesChanged={setRoutines}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {/* TAB 3: PROGRESSIVE OVERLOAD */}
        {currentTab === 'progress' && (
          <ProgressAnalytics
            completedWorkouts={completedWorkouts}
            unit={unit}
          />
        )}

        {/* TAB 4: BODY COMPOSITION */}
        {currentTab === 'body' && (
          <BodyCompositionTracker
            measurements={bodyMeasurements}
            onMeasurementsChanged={setBodyMeasurements}
            unit={unit}
          />
        )}
      </main>

      {/* Gemini Settings Modal */}
      <GeminiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          const prefs = storageService.getPreferences();
          setUnit(prefs.unit || 'kg');
        }}
        onDataReloaded={loadAllData}
      />

      {/* Gemini AI Coach Chat Modal */}
      <GeminiCoachChat
        isOpen={isCoachChatOpen}
        onClose={() => setIsCoachChatOpen(false)}
        measurements={bodyMeasurements}
        workouts={completedWorkouts}
        onOpenSettings={() => {
          setIsCoachChatOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* Barbell Plate Calculator Modal */}
      <PlateCalculatorModal
        isOpen={isPlateCalcOpen}
        onClose={() => setIsPlateCalcOpen(false)}
        defaultWeight={unit === 'kg' ? 80 : 185}
        unit={unit}
      />
    </div>
  );
}

export default App;

