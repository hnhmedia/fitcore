import { WorkoutRoutine, CompletedWorkout, BodyMeasurement } from '../types';

export const INITIAL_ROUTINES: WorkoutRoutine[] = [
  {
    id: 'routine-push-day',
    name: 'Push Hypertrophy (Chest, Shoulders & Triceps)',
    description: 'Focuses on progressive overload on the bench press, shoulder overhead pressing, and tricep extension volume.',
    splitType: 'Push',
    estimatedMinutes: 55,
    source: 'gemini-ai',
    createdAt: '2026-10-01T10:00:00.000Z',
    exercises: [
      {
        id: 'ex-bench-press',
        name: 'Barbell Flat Bench Press',
        muscle: 'Chest',
        targetSets: 4,
        targetReps: 8,
        defaultWeight: 80,
        restSeconds: 90,
        notes: 'Lower bar with control, tuck elbows 45 deg, explosive press.'
      },
      {
        id: 'ex-incline-db-press',
        name: 'Incline Dumbbell Press',
        muscle: 'Chest',
        targetSets: 3,
        targetReps: 10,
        defaultWeight: 28,
        restSeconds: 75,
        notes: 'Set bench to 30 degrees for upper chest activation.'
      },
      {
        id: 'ex-overhead-press',
        name: 'Standing Barbell Overhead Press (OHP)',
        muscle: 'Shoulders',
        targetSets: 3,
        targetReps: 8,
        defaultWeight: 50,
        restSeconds: 90,
        notes: 'Brace core and glutes firmly.'
      },
      {
        id: 'ex-lateral-raises',
        name: 'Dumbbell Lateral Raises',
        muscle: 'Shoulders',
        targetSets: 4,
        targetReps: 12,
        defaultWeight: 12,
        restSeconds: 60,
        notes: 'Lead with elbows, pause 0.5s at top.'
      },
      {
        id: 'ex-cable-tricep-pushdown',
        name: 'Cable Tricep Rope Pushdown',
        muscle: 'Triceps',
        targetSets: 3,
        targetReps: 12,
        defaultWeight: 25,
        restSeconds: 60,
        notes: 'Flare rope out at bottom of contraction.'
      }
    ]
  },
  {
    id: 'routine-pull-day',
    name: 'Pull Strength & Lats (Back & Biceps)',
    description: 'Heavy compound rows, lat pulldowns, and focused bicep hypertrophy.',
    splitType: 'Pull',
    estimatedMinutes: 50,
    source: 'gemini-ai',
    createdAt: '2026-10-02T10:00:00.000Z',
    exercises: [
      {
        id: 'ex-barbell-row',
        name: 'Barbell Bent-Over Row',
        muscle: 'Back',
        targetSets: 4,
        targetReps: 8,
        defaultWeight: 75,
        restSeconds: 90,
        notes: 'Pull towards lower ribs, squeeze shoulder blades.'
      },
      {
        id: 'ex-lat-pulldown',
        name: 'Lat Pulldown',
        muscle: 'Back',
        targetSets: 3,
        targetReps: 10,
        defaultWeight: 65,
        restSeconds: 75,
        notes: 'Drive elbows downward into your pockets.'
      },
      {
        id: 'ex-seated-cable-row',
        name: 'Seated Cable Row',
        muscle: 'Back',
        targetSets: 3,
        targetReps: 12,
        defaultWeight: 60,
        restSeconds: 60,
        notes: 'Neutral grip, 1s hold at contraction.'
      },
      {
        id: 'ex-barbell-curl',
        name: 'Barbell Bicep Curl',
        muscle: 'Biceps',
        targetSets: 3,
        targetReps: 10,
        defaultWeight: 30,
        restSeconds: 60,
        notes: 'Keep elbows pinned to your sides, no swinging.'
      },
      {
        id: 'ex-hammer-curl',
        name: 'Dumbbell Hammer Curls',
        muscle: 'Biceps',
        targetSets: 3,
        targetReps: 12,
        defaultWeight: 14,
        restSeconds: 60,
        notes: 'Brachialis focus for arm thickness.'
      }
    ]
  },
  {
    id: 'routine-legs-core',
    name: 'Legs & Core Power',
    description: 'Squat pattern, Romanian deadlift hamstring stretch, and quad pump.',
    splitType: 'Legs',
    estimatedMinutes: 60,
    source: 'gemini-ai',
    createdAt: '2026-10-03T10:00:00.000Z',
    exercises: [
      {
        id: 'ex-barbell-squat',
        name: 'Barbell Back Squat',
        muscle: 'Legs',
        targetSets: 4,
        targetReps: 6,
        defaultWeight: 100,
        restSeconds: 120,
        notes: 'Hit parallel depth, push knees out, keep chest upright.'
      },
      {
        id: 'ex-romanian-deadlift',
        name: 'Romanian Deadlift (RDL)',
        muscle: 'Legs',
        targetSets: 3,
        targetReps: 8,
        defaultWeight: 90,
        restSeconds: 90,
        notes: 'Push hips back, feel intense stretch in hamstrings.'
      },
      {
        id: 'ex-leg-press',
        name: 'Leg Press',
        muscle: 'Legs',
        targetSets: 3,
        targetReps: 12,
        defaultWeight: 180,
        restSeconds: 90,
        notes: 'Full range of motion, avoid locking knees at top.'
      },
      {
        id: 'ex-standing-calf-raise',
        name: 'Standing Calf Raises',
        muscle: 'Legs',
        targetSets: 4,
        targetReps: 15,
        defaultWeight: 50,
        restSeconds: 60,
        notes: 'Pause 2 seconds at the bottom stretch.'
      },
      {
        id: 'ex-hanging-leg-raise',
        name: 'Hanging Leg Raise',
        muscle: 'Abs',
        targetSets: 3,
        targetReps: 12,
        defaultWeight: 0,
        restSeconds: 60,
        notes: 'Curl pelvis up towards chest.'
      }
    ]
  }
];

export const INITIAL_BODY_MEASUREMENTS: BodyMeasurement[] = [
  {
    id: 'm-1',
    date: '2026-09-27',
    weightKg: 82.5,
    chestCm: 101.0,
    stomachWaistCm: 89.0,
    hipsCm: 99.0,
    armsCm: 35.5,
    thighsCm: 58.0,
    bodyFatPercentage: 20.5,
    notes: 'Starting baseline measurement cycle.'
  },
  {
    id: 'm-2',
    date: '2026-10-04',
    weightKg: 82.2,
    chestCm: 101.5,
    stomachWaistCm: 88.0,
    hipsCm: 98.5,
    armsCm: 35.8,
    thighsCm: 58.2,
    bodyFatPercentage: 19.8,
    notes: 'Waist down 1cm, feeling tighter.'
  },
  {
    id: 'm-3',
    date: '2026-10-11',
    weightKg: 81.9,
    chestCm: 102.5,
    stomachWaistCm: 86.8,
    hipsCm: 98.0,
    armsCm: 36.2,
    thighsCm: 58.5,
    bodyFatPercentage: 19.0,
    notes: 'Solid chest pump and waist noticeably smaller.'
  },
  {
    id: 'm-4',
    date: '2026-10-18',
    weightKg: 81.6,
    chestCm: 103.5,
    stomachWaistCm: 85.5,
    hipsCm: 97.5,
    armsCm: 36.6,
    thighsCm: 59.0,
    bodyFatPercentage: 18.2,
    notes: 'Stomach down 3.5cm from baseline! Muscle definition showing.'
  },
  {
    id: 'm-5',
    date: '2026-10-25',
    weightKg: 81.4,
    chestCm: 104.2,
    stomachWaistCm: 84.5,
    hipsCm: 97.0,
    armsCm: 37.0,
    thighsCm: 59.2,
    bodyFatPercentage: 17.5,
    notes: 'Body recomposition is working cleanly. Arms up, waist down.'
  },
  {
    id: 'm-6',
    date: '2026-11-01',
    weightKg: 81.2,
    chestCm: 105.0,
    stomachWaistCm: 83.5,
    hipsCm: 96.5,
    armsCm: 37.5,
    thighsCm: 59.5,
    bodyFatPercentage: 16.8,
    notes: 'Down 5.5cm on stomach waist, up 4cm on chest! True recomposition.'
  }
];

export const INITIAL_COMPLETED_WORKOUTS: CompletedWorkout[] = [
  {
    id: 'w-history-1',
    routineId: 'routine-push-day',
    routineName: 'Push Hypertrophy',
    date: '2026-10-05',
    startTime: 1728118800000,
    endTime: 1728122100000,
    durationMinutes: 55,
    totalVolumeKg: 4920,
    totalSets: 17,
    totalReps: 164,
    exercises: [
      {
        id: 'ex-1',
        name: 'Barbell Flat Bench Press',
        muscle: 'Chest',
        restSeconds: 90,
        isFinished: true,
        sets: [
          { id: 's1', setNumber: 1, weight: 70, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's2', setNumber: 2, weight: 70, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's3', setNumber: 3, weight: 70, reps: 7, isCompleted: true, type: 'normal' },
          { id: 's4', setNumber: 4, weight: 65, reps: 8, isCompleted: true, type: 'normal' },
        ]
      },
      {
        id: 'ex-2',
        name: 'Standing Barbell Overhead Press (OHP)',
        muscle: 'Shoulders',
        restSeconds: 90,
        isFinished: true,
        sets: [
          { id: 's5', setNumber: 1, weight: 42.5, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's6', setNumber: 2, weight: 42.5, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's7', setNumber: 3, weight: 40, reps: 8, isCompleted: true, type: 'normal' },
        ]
      }
    ]
  },
  {
    id: 'w-history-2',
    routineId: 'routine-push-day',
    routineName: 'Push Hypertrophy',
    date: '2026-10-12',
    startTime: 1728723600000,
    endTime: 1728726900000,
    durationMinutes: 55,
    totalVolumeKg: 5380,
    totalSets: 17,
    totalReps: 168,
    exercises: [
      {
        id: 'ex-1',
        name: 'Barbell Flat Bench Press',
        muscle: 'Chest',
        restSeconds: 90,
        isFinished: true,
        sets: [
          { id: 's1', setNumber: 1, weight: 72.5, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's2', setNumber: 2, weight: 72.5, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's3', setNumber: 3, weight: 72.5, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's4', setNumber: 4, weight: 70, reps: 8, isCompleted: true, type: 'normal' },
        ]
      },
      {
        id: 'ex-2',
        name: 'Standing Barbell Overhead Press (OHP)',
        muscle: 'Shoulders',
        restSeconds: 90,
        isFinished: true,
        sets: [
          { id: 's5', setNumber: 1, weight: 45, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's6', setNumber: 2, weight: 45, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's7', setNumber: 3, weight: 42.5, reps: 8, isCompleted: true, type: 'normal' },
        ]
      }
    ]
  },
  {
    id: 'w-history-3',
    routineId: 'routine-push-day',
    routineName: 'Push Hypertrophy',
    date: '2026-10-19',
    startTime: 1729328400000,
    endTime: 1729332000000,
    durationMinutes: 60,
    totalVolumeKg: 5780,
    totalSets: 17,
    totalReps: 170,
    exercises: [
      {
        id: 'ex-1',
        name: 'Barbell Flat Bench Press',
        muscle: 'Chest',
        restSeconds: 90,
        isFinished: true,
        sets: [
          { id: 's1', setNumber: 1, weight: 75, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's2', setNumber: 2, weight: 75, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's3', setNumber: 3, weight: 75, reps: 7, isCompleted: true, type: 'normal' },
          { id: 's4', setNumber: 4, weight: 72.5, reps: 8, isCompleted: true, type: 'normal' },
        ]
      },
      {
        id: 'ex-2',
        name: 'Standing Barbell Overhead Press (OHP)',
        muscle: 'Shoulders',
        restSeconds: 90,
        isFinished: true,
        sets: [
          { id: 's5', setNumber: 1, weight: 47.5, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's6', setNumber: 2, weight: 47.5, reps: 7, isCompleted: true, type: 'normal' },
          { id: 's7', setNumber: 3, weight: 45, reps: 8, isCompleted: true, type: 'normal' },
        ]
      }
    ]
  },
  {
    id: 'w-history-4',
    routineId: 'routine-push-day',
    routineName: 'Push Hypertrophy',
    date: '2026-10-26',
    startTime: 1729933200000,
    endTime: 1729936800000,
    durationMinutes: 60,
    totalVolumeKg: 6150,
    totalSets: 17,
    totalReps: 172,
    exercises: [
      {
        id: 'ex-1',
        name: 'Barbell Flat Bench Press',
        muscle: 'Chest',
        restSeconds: 90,
        isFinished: true,
        sets: [
          { id: 's1', setNumber: 1, weight: 77.5, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's2', setNumber: 2, weight: 77.5, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's3', setNumber: 3, weight: 77.5, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's4', setNumber: 4, weight: 75, reps: 8, isCompleted: true, type: 'normal' },
        ]
      },
      {
        id: 'ex-2',
        name: 'Standing Barbell Overhead Press (OHP)',
        muscle: 'Shoulders',
        restSeconds: 90,
        isFinished: true,
        sets: [
          { id: 's5', setNumber: 1, weight: 50, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's6', setNumber: 2, weight: 50, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's7', setNumber: 3, weight: 47.5, reps: 8, isCompleted: true, type: 'normal' },
        ]
      }
    ]
  },
  {
    id: 'w-history-5',
    routineId: 'routine-push-day',
    routineName: 'Push Hypertrophy',
    date: '2026-11-02',
    startTime: 1730538000000,
    endTime: 1730541600000,
    durationMinutes: 60,
    totalVolumeKg: 6480,
    totalSets: 17,
    totalReps: 174,
    exercises: [
      {
        id: 'ex-1',
        name: 'Barbell Flat Bench Press',
        muscle: 'Chest',
        restSeconds: 90,
        isFinished: true,
        sets: [
          { id: 's1', setNumber: 1, weight: 80, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's2', setNumber: 2, weight: 80, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's3', setNumber: 3, weight: 80, reps: 7, isCompleted: true, type: 'normal' },
          { id: 's4', setNumber: 4, weight: 77.5, reps: 8, isCompleted: true, type: 'normal' },
        ]
      },
      {
        id: 'ex-2',
        name: 'Standing Barbell Overhead Press (OHP)',
        muscle: 'Shoulders',
        restSeconds: 90,
        isFinished: true,
        sets: [
          { id: 's5', setNumber: 1, weight: 52.5, reps: 7, isCompleted: true, type: 'normal' },
          { id: 's6', setNumber: 2, weight: 50, reps: 8, isCompleted: true, type: 'normal' },
          { id: 's7', setNumber: 3, weight: 50, reps: 8, isCompleted: true, type: 'normal' },
        ]
      }
    ]
  }
];

