import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { ActiveWorkoutPlayer } from './components/ActiveWorkoutPlayer';
import { RoutineManager } from './components/RoutineManager';
import { GeminiSettingsModal } from './components/GeminiSettingsModal';
import { GeminiCoachChat } from './components/GeminiCoachChat';
import { PlateCalculatorModal } from './components/PlateCalculatorModal';
import { AccountModal } from './components/AccountModal';
import { HomeDashboard } from './components/HomeDashboard';
import { storageService, ActiveWorkoutState } from './services/storageService';
import { syncService } from './services/syncService';
import { WorkoutRoutine, CompletedWorkout, BodyMeasurement } from './types';

// Chart-heavy screens load only when opened, so the app starts faster.
const ProgressAnalytics = lazy(() =>
  import('./components/ProgressAnalytics').then((m) => ({ default: m.ProgressAnalytics }))
);
const BodyCompositionTracker = lazy(() =>
  import('./components/BodyCompositionTracker').then((m) => ({ default: m.BodyCompositionTracker }))
);

const TabLoading = () => (
  <div className="py-24 flex justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-emerald-400 animate-spin" />
  </div>
);

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('workout');
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(null);
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [completedWorkouts, setCompletedWorkouts] = useState<CompletedWorkout[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCoachChatOpen, setIsCoachChatOpen] = useState(false);
  const [isPlateCalcOpen, setIsPlateCalcOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');

  // Initial Load from Storage
  useEffect(() => {
    loadAllData();
    // Reload the screens whenever newer data arrives from the account, then start syncing.
    const off = syncService.onRemoteData(loadAllData);
    const openAccount = () => setIsAccountOpen(true);
    window.addEventListener('aerofit:open-account', openAccount);
    void syncService.start();
    return () => {
      off();
      window.removeEventListener('aerofit:open-account', openAccount);
    };
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
    setCurrentTab('workout');
  };

  const handleWorkoutDiscarded = () => {
    setActiveWorkout(null);
    storageService.clearActiveWorkout();
    setCurrentTab('workout');
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
        onOpenAccount={() => setIsAccountOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto pt-4 px-2 sm:px-4">
        {/* TAB 1: WORKOUT */}
        {currentTab === 'workout' && (
          activeWorkout ? (
            <ActiveWorkoutPlayer
              workout={activeWorkout}
              completedWorkouts={completedWorkouts}
              onWorkoutFinished={handleWorkoutFinished}
              onWorkoutDiscarded={handleWorkoutDiscarded}
              unit={unit}
            />
          ) : (
            <HomeDashboard
              routines={routines}
              completedWorkouts={completedWorkouts}
              unit={unit}
              onStartWorkout={handleStartWorkout}
              onGoToRoutines={() => setCurrentTab('routines')}
              onOpenAccount={() => setIsAccountOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
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
          <Suspense fallback={<TabLoading />}>
            <ProgressAnalytics
              completedWorkouts={completedWorkouts}
              unit={unit}
            />
          </Suspense>
        )}

        {/* TAB 4: BODY COMPOSITION */}
        {currentTab === 'body' && (
          <Suspense fallback={<TabLoading />}>
            <BodyCompositionTracker
              measurements={bodyMeasurements}
              onMeasurementsChanged={setBodyMeasurements}
              unit={unit}
            />
          </Suspense>
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

      {/* Account & cloud backup */}
      <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />

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

