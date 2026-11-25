import { MuscleGroup } from '../types';
import { normName } from './history';

export interface LibraryExercise {
  name: string;
  muscle: MuscleGroup;
  equipment: 'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | 'Bodyweight' | 'Kettlebell' | 'Smith';
  cues: string[];
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // Chest
  { name: 'Barbell Flat Bench Press', muscle: 'Chest', equipment: 'Barbell', cues: ['Shoulder blades pinched and down', 'Bar to lower chest, elbows ~45°', 'Feet planted, drive through the floor'] },
  { name: 'Incline Barbell Bench Press', muscle: 'Chest', equipment: 'Barbell', cues: ['Bench at 30–45°', 'Touch upper chest', 'Keep wrists stacked over elbows'] },
  { name: 'Incline Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbell', cues: ['Bench at 30°', 'Lower until a deep stretch', 'Press up and slightly in'] },
  { name: 'Flat Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbell', cues: ['Control the descent', 'Elbows slightly tucked', "Don't clank the dumbbells at the top"] },
  { name: 'Chest Cable Flyes', muscle: 'Chest', equipment: 'Cable', cues: ['Soft bend in the elbows', 'Hug a big tree', 'Squeeze 1s at the middle'] },
  { name: 'Pec Deck Machine', muscle: 'Chest', equipment: 'Machine', cues: ['Handles at chest height', 'Lead with the elbows', 'Slow stretch back'] },
  { name: 'Machine Chest Press', muscle: 'Chest', equipment: 'Machine', cues: ['Seat so handles are mid-chest', 'Keep shoulders back', 'Full range, no lockout bounce'] },
  { name: 'Weighted Dips', muscle: 'Chest', equipment: 'Bodyweight', cues: ['Lean forward for chest', 'Lower until shoulders below elbows', 'Stop short of shoulder pain'] },
  { name: 'Push-ups', muscle: 'Chest', equipment: 'Bodyweight', cues: ['Body in a straight line', 'Chest to the floor', 'Elbows ~45° from torso'] },
  // Back
  { name: 'Conventional Deadlift', muscle: 'Back', equipment: 'Barbell', cues: ['Bar over mid-foot', 'Brace, pull the slack out', 'Push the floor away, hips and chest rise together'] },
  { name: 'Barbell Bent-Over Row', muscle: 'Back', equipment: 'Barbell', cues: ['Hinge to ~45°', 'Pull to lower ribs', 'No torso swinging'] },
  { name: 'Pull-ups / Chin-ups', muscle: 'Back', equipment: 'Bodyweight', cues: ['Start from a dead hang', 'Drive elbows to your pockets', 'Chin over the bar'] },
  { name: 'Lat Pulldown', muscle: 'Back', equipment: 'Cable', cues: ['Slight lean back', 'Pull bar to upper chest', 'Control it up to a full stretch'] },
  { name: 'Seated Cable Row', muscle: 'Back', equipment: 'Cable', cues: ['Chest tall', 'Pull to belly button', 'Let shoulders reach forward on the way back'] },
  { name: 'One-Arm Dumbbell Row', muscle: 'Back', equipment: 'Dumbbell', cues: ['Flat back, hand on bench', 'Row towards the hip', 'Full stretch at the bottom'] },
  { name: 'Chest-Supported T-Bar Row', muscle: 'Back', equipment: 'Machine', cues: ['Chest stays on the pad', 'Squeeze shoulder blades', 'No shrugging'] },
  { name: 'Straight-Arm Pulldown', muscle: 'Back', equipment: 'Cable', cues: ['Arms nearly straight', 'Sweep bar to thighs', 'Feel the lats, not triceps'] },
  // Shoulders
  { name: 'Standing Barbell Overhead Press', muscle: 'Shoulders', equipment: 'Barbell', cues: ['Glutes and abs tight', 'Head through once the bar passes', 'Lock out over mid-foot'] },
  { name: 'Seated Dumbbell Shoulder Press', muscle: 'Shoulders', equipment: 'Dumbbell', cues: ['Back against the pad', 'Lower to ear level', 'Press without flaring ribs'] },
  { name: 'Dumbbell Lateral Raises', muscle: 'Shoulders', equipment: 'Dumbbell', cues: ['Lead with the elbows', 'Stop at shoulder height', 'Slow 2–3s down'] },
  { name: 'Cable Lateral Raise', muscle: 'Shoulders', equipment: 'Cable', cues: ['Cable behind the body', 'Raise out to the side', 'Constant tension'] },
  { name: 'Face Pulls', muscle: 'Shoulders', equipment: 'Cable', cues: ['Rope at face height', 'Pull apart to the ears', 'Thumbs back at the end'] },
  { name: 'Reverse Pec Deck', muscle: 'Shoulders', equipment: 'Machine', cues: ['Arms straight, slight bend', 'Sweep back wide', 'Pause at the back'] },
  // Biceps
  { name: 'Barbell Bicep Curl', muscle: 'Biceps', equipment: 'Barbell', cues: ['Elbows pinned to sides', 'No hip swing', 'Lower slowly'] },
  { name: 'Dumbbell Hammer Curls', muscle: 'Biceps', equipment: 'Dumbbell', cues: ['Neutral grip', 'Curl across or straight up', 'Squeeze at the top'] },
  { name: 'Incline Dumbbell Curl', muscle: 'Biceps', equipment: 'Dumbbell', cues: ['Arms hang behind the body', 'Keep elbows still', 'Big stretch at the bottom'] },
  { name: 'Cable Bicep Curl', muscle: 'Biceps', equipment: 'Cable', cues: ['Step back for tension', 'Elbows fixed', 'Control the negative'] },
  { name: 'Preacher Curl', muscle: 'Biceps', equipment: 'Machine', cues: ['Armpits on the pad', 'Stop just short of lockout', 'No bouncing'] },
  // Triceps
  { name: 'Tricep Rope Pushdown', muscle: 'Triceps', equipment: 'Cable', cues: ['Elbows by your sides', 'Split the rope at the bottom', 'Only forearms move'] },
  { name: 'Overhead Tricep Extension', muscle: 'Triceps', equipment: 'Cable', cues: ['Elbows point forward', 'Deep stretch behind the head', 'Extend fully'] },
  { name: 'Skull Crushers', muscle: 'Triceps', equipment: 'Barbell', cues: ['Lower to forehead or behind', 'Elbows stay narrow', 'Use an EZ bar if wrists hurt'] },
  { name: 'Close-Grip Bench Press', muscle: 'Triceps', equipment: 'Barbell', cues: ['Hands shoulder-width', 'Elbows tucked', 'Touch lower chest'] },
  // Legs
  { name: 'Barbell Back Squat', muscle: 'Legs', equipment: 'Barbell', cues: ['Brace before you descend', 'Knees track over toes', 'Hip crease below knee if mobility allows'] },
  { name: 'Front Squat', muscle: 'Legs', equipment: 'Barbell', cues: ['Elbows high', 'Stay upright', 'Sit straight down'] },
  { name: 'Romanian Deadlift (RDL)', muscle: 'Legs', equipment: 'Barbell', cues: ['Soft knees, push hips back', 'Bar slides down the thighs', 'Stop when hamstrings are stretched'] },
  { name: 'Leg Press', muscle: 'Legs', equipment: 'Machine', cues: ['Feet mid-platform', 'Lower until hips start to tuck, then stop', "Don't lock knees hard"] },
  { name: 'Hack Squat', muscle: 'Legs', equipment: 'Machine', cues: ['Back flat on the pad', 'Deep, controlled reps', 'Drive through the whole foot'] },
  { name: 'Bulgarian Split Squat', muscle: 'Legs', equipment: 'Dumbbell', cues: ['Rear foot on a bench', 'Front shin near vertical for glutes', 'Drop straight down'] },
  { name: 'Walking Lunges', muscle: 'Legs', equipment: 'Dumbbell', cues: ['Long stride', 'Back knee kisses the floor', 'Stay tall'] },
  { name: 'Leg Extension', muscle: 'Legs', equipment: 'Machine', cues: ['Pad above the ankles', 'Squeeze at the top', 'Slow lowering'] },
  { name: 'Lying Leg Curl', muscle: 'Legs', equipment: 'Machine', cues: ['Hips pressed into the pad', 'Curl heels to glutes', "Don't let weights crash"] },
  { name: 'Seated Leg Curl', muscle: 'Legs', equipment: 'Machine', cues: ['Lean forward slightly for stretch', 'Full range', 'Pause at the bottom'] },
  { name: 'Hip Thrust', muscle: 'Legs', equipment: 'Barbell', cues: ['Upper back on the bench', 'Chin tucked', 'Squeeze glutes at lockout'] },
  { name: 'Standing Calf Raises', muscle: 'Legs', equipment: 'Machine', cues: ['Full stretch at the bottom', 'Pause 1s', 'Rise onto big toe'] },
  { name: 'Seated Calf Raise', muscle: 'Legs', equipment: 'Machine', cues: ['Knees under the pad', 'Slow and full range', 'Pause at the top'] },
  // Abs
  { name: 'Hanging Leg Raise', muscle: 'Abs', equipment: 'Bodyweight', cues: ['No swinging', 'Curl the pelvis up', 'Lower slowly'] },
  { name: 'Cable Crunch', muscle: 'Abs', equipment: 'Cable', cues: ['Kneel, rope by the head', 'Crunch ribs to hips', 'Hips stay still'] },
  { name: 'Plank', muscle: 'Abs', equipment: 'Bodyweight', cues: ['Squeeze glutes', 'Ribs down', 'Straight line head to heels'] },
  { name: 'Ab Wheel Rollout', muscle: 'Abs', equipment: 'Bodyweight', cues: ['Keep lower back flat', 'Roll only as far as you control', 'Pull back with the abs'] },
  // Full body
  { name: 'Kettlebell Swing', muscle: 'Full Body', equipment: 'Kettlebell', cues: ['Hinge, not squat', 'Snap the hips', 'Bell floats to chest height'] },
  { name: "Farmer's Carry", muscle: 'Full Body', equipment: 'Dumbbell', cues: ['Stand tall', 'Short quick steps', 'Grip hard'] },
];

const byName = new Map(EXERCISE_LIBRARY.map((e) => [normName(e.name), e]));

export const findLibraryExercise = (name: string) => byName.get(normName(name));

export const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Abs', 'Full Body'];
