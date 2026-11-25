// Step-by-step how-to for each library exercise.
import { normName } from './history';

export interface ExerciseGuide {
  primary: string;
  secondary?: string;
  setup: string[];
  steps: string[];
  mistakes: string[];
}

const G: Record<string, ExerciseGuide> = {
  // ---------- Chest ----------
  'Barbell Flat Bench Press': {
    primary: 'Chest', secondary: 'Front shoulders, triceps',
    setup: ['Lie with eyes under the bar, feet flat on the floor.', 'Grip slightly wider than shoulders; squeeze shoulder blades together and down.', 'Unrack and hold the bar over your shoulders with straight arms.'],
    steps: ['Breathe in and lower the bar under control to your lower chest/nipple line.', 'Keep elbows about 45° from your body, forearms vertical.', 'Touch lightly, then press up and slightly back toward your face.', 'Breathe out near the top; keep your upper back tight for the next rep.'],
    mistakes: ['Bouncing the bar off the chest.', 'Flaring elbows to 90°, which stresses the shoulders.', 'Lifting the hips off the bench.'],
  },
  'Incline Barbell Bench Press': {
    primary: 'Upper chest', secondary: 'Front shoulders, triceps',
    setup: ['Set the bench to 30–45°.', 'Grip just wider than shoulders, shoulder blades pinched.', 'Unrack so the bar sits over your shoulders.'],
    steps: ['Lower the bar to your upper chest, just below the collarbone.', 'Keep wrists straight and stacked over elbows.', 'Press up to lockout over your shoulders.'],
    mistakes: ['Bench too steep (turns it into a shoulder press).', 'Touching too low on the chest.', 'Arching so much the hips leave the seat.'],
  },
  'Incline Dumbbell Press': {
    primary: 'Upper chest', secondary: 'Front shoulders, triceps',
    setup: ['Bench at about 30°.', 'Sit with dumbbells on your thighs, kick them up one at a time as you lie back.', 'Start with dumbbells above your shoulders, palms forward or slightly turned in.'],
    steps: ['Lower slowly until you feel a stretch across the chest, elbows slightly below the bench line.', 'Keep shoulder blades back against the bench.', 'Press up and slightly together without banging the weights.'],
    mistakes: ['Cutting the range short.', 'Letting the dumbbells drift too wide at the bottom.', 'Dropping the weights to the sides at the end of a set instead of bringing them to your thighs.'],
  },
  'Flat Dumbbell Press': {
    primary: 'Chest', secondary: 'Front shoulders, triceps',
    setup: ['Lie flat with dumbbells kicked up from your thighs.', 'Feet planted, shoulder blades squeezed.'],
    steps: ['Lower with control until the dumbbells are beside your chest.', 'Elbows about 45° from your body.', 'Press up and slightly in, stopping just short of the weights touching.'],
    mistakes: ['Rushing the lowering phase.', 'Shoulders rolling forward at the top.'],
  },
  'Chest Cable Flyes': {
    primary: 'Chest', secondary: 'Front shoulders',
    setup: ['Set both pulleys at about shoulder height.', 'Take a handle in each hand and step forward into a split stance.', 'Arms out to the sides with a soft bend in the elbows.'],
    steps: ['Bring the handles together in a wide hugging arc in front of your chest.', 'Squeeze the chest for a second when the hands meet.', 'Return slowly until you feel a stretch, keeping the same elbow bend.'],
    mistakes: ['Bending and straightening the elbows (turns it into a press).', 'Going too heavy and losing the stretch.'],
  },
  'Pec Deck Machine': {
    primary: 'Chest', secondary: 'Front shoulders',
    setup: ['Adjust the seat so the handles are at mid-chest height.', 'Back flat against the pad.'],
    steps: ['Bring the handles together in front of you, leading with the elbows.', 'Squeeze for a second.', 'Open slowly until you feel a stretch, without letting the stack touch.'],
    mistakes: ['Seat too low or high, shifting work to the shoulders.', 'Letting the weights slam between reps.'],
  },
  'Machine Chest Press': {
    primary: 'Chest', secondary: 'Front shoulders, triceps',
    setup: ['Set the seat so the handles line up with your mid-chest.', 'Back and head against the pad, shoulder blades back.'],
    steps: ['Press the handles forward until your arms are nearly straight.', 'Return slowly until you feel a chest stretch.', 'Keep the shoulders down and back throughout.'],
    mistakes: ['Seat too high (handles at the neck).', 'Locking out hard and resting at the top.'],
  },
  'Weighted Dips': {
    primary: 'Lower chest, triceps', secondary: 'Front shoulders',
    setup: ['Grip the bars and jump up to straight arms.', 'Add weight with a belt only once 12+ bodyweight reps are easy.'],
    steps: ['Lean the torso slightly forward.', 'Lower until your shoulders are just below your elbows.', 'Press back up to straight arms.'],
    mistakes: ['Going so deep it hurts the front of the shoulder.', 'Swinging the legs for momentum.'],
  },
  'Push-ups': {
    primary: 'Chest', secondary: 'Triceps, shoulders, core',
    setup: ['Hands slightly wider than shoulders, fingers forward.', 'Body in one straight line from head to heels.'],
    steps: ['Lower until your chest is a fist from the floor.', 'Elbows about 45° from the body.', 'Push the floor away to straight arms.'],
    mistakes: ['Hips sagging or piking up.', 'Half reps.', 'Head dropping toward the floor.'],
  },
  // ---------- Back ----------
  'Conventional Deadlift': {
    primary: 'Hamstrings, glutes, back', secondary: 'Traps, forearms, core',
    setup: ['Stand with the bar over your mid-foot, feet hip-width.', 'Hinge down and grip just outside your legs.', 'Shins touch the bar, chest up, back flat.'],
    steps: ['Take a big breath and brace your stomach.', 'Pull the slack out of the bar until it clicks.', 'Push the floor away; hips and chest rise together, bar stays against the legs.', 'Stand tall, then lower by pushing hips back first.'],
    mistakes: ['Rounding the lower back.', 'Hips shooting up first so it becomes a stiff-leg pull.', 'Bar drifting away from the body.'],
  },
  'Barbell Bent-Over Row': {
    primary: 'Upper back, lats', secondary: 'Biceps, rear shoulders',
    setup: ['Hold the bar with a shoulder-width grip.', 'Soft knees, hinge forward to about 45° with a flat back.'],
    steps: ['Pull the bar to your lower ribs, driving elbows back.', 'Squeeze the shoulder blades together.', 'Lower under control to straight arms.'],
    mistakes: ['Standing up as you row (body English).', 'Rounding the back.', 'Shrugging the bar up with the traps.'],
  },
  'Pull-ups / Chin-ups': {
    primary: 'Lats', secondary: 'Biceps, mid back',
    setup: ['Overhand grip (pull-up) or underhand (chin-up), about shoulder-width.', 'Hang with straight arms.'],
    steps: ['Pull the shoulders down first, then drive elbows toward your hips.', 'Pull until your chin passes the bar.', 'Lower all the way to a dead hang.'],
    mistakes: ['Kipping/swinging.', 'Stopping halfway down.', 'Craning the neck to reach the bar.'],
  },
  'Lat Pulldown': {
    primary: 'Lats', secondary: 'Biceps, mid back',
    setup: ['Lock your thighs under the pads.', 'Grip a bit wider than shoulders.', 'Lean back slightly, chest up.'],
    steps: ['Pull the bar to your upper chest, elbows down and back.', 'Squeeze the lats at the bottom.', 'Let the bar rise slowly until your arms are straight and lats stretched.'],
    mistakes: ['Leaning way back and rowing it.', 'Pulling behind the neck.', 'Letting the stack yank your arms up.'],
  },
  'Seated Cable Row': {
    primary: 'Mid back, lats', secondary: 'Biceps, rear shoulders',
    setup: ['Feet on the platform, knees slightly bent.', 'Sit tall holding the handle with straight arms.'],
    steps: ['Pull the handle to your belly button, elbows close.', 'Squeeze shoulder blades together.', 'Return slowly, letting the shoulders reach forward a little for a stretch.'],
    mistakes: ['Rocking the torso back and forth.', 'Shrugging the shoulders up.'],
  },
  'One-Arm Dumbbell Row': {
    primary: 'Lats, mid back', secondary: 'Biceps, rear shoulders',
    setup: ['One hand and knee on a bench, other foot on the floor.', 'Back flat and parallel to the floor, dumbbell hanging.'],
    steps: ['Row the dumbbell toward your hip, elbow close to the body.', 'Pause at the top.', 'Lower to a full stretch.'],
    mistakes: ['Twisting the torso to lift more.', 'Pulling to the chest instead of the hip.'],
  },
  'Chest-Supported T-Bar Row': {
    primary: 'Mid back', secondary: 'Lats, rear shoulders, biceps',
    setup: ['Chest on the pad, feet braced.', 'Grip the handles with straight arms.'],
    steps: ['Row the handles up, driving elbows back.', 'Squeeze shoulder blades.', 'Lower slowly to straight arms.'],
    mistakes: ['Lifting the chest off the pad.', 'Using a range so short the back barely moves.'],
  },
  'Straight-Arm Pulldown': {
    primary: 'Lats', secondary: 'Triceps (long head), core',
    setup: ['Cable high, straight bar or rope.', 'Step back, hinge slightly, arms straight in front.'],
    steps: ['Sweep the bar down in an arc to your thighs, arms nearly straight.', 'Squeeze the lats.', 'Return slowly to eye level.'],
    mistakes: ['Bending the elbows (turns into a pushdown).', 'Using the torso to swing.'],
  },
  // ---------- Shoulders ----------
  'Standing Barbell Overhead Press': {
    primary: 'Shoulders', secondary: 'Triceps, upper chest, core',
    setup: ['Bar on the front of the shoulders, grip just outside shoulders.', 'Feet hip-width, squeeze glutes and abs.'],
    steps: ['Press straight up, moving your head back slightly so the bar passes your face.', 'Once past the forehead, push your head through.', 'Lock out with the bar over mid-foot, then lower to the shoulders.'],
    mistakes: ['Leaning back excessively.', 'Pressing the bar forward around the face.', 'Loose core.'],
  },
  'Seated Dumbbell Shoulder Press': {
    primary: 'Shoulders', secondary: 'Triceps',
    setup: ['Bench upright (about 80–90°).', 'Dumbbells at ear height, palms forward.'],
    steps: ['Press up until arms are nearly straight.', 'Lower slowly back to ear level.'],
    mistakes: ['Arching the lower back off the pad.', 'Short reps that stop at the forehead.'],
  },
  'Dumbbell Lateral Raises': {
    primary: 'Side shoulders', secondary: 'Upper traps',
    setup: ['Stand tall, dumbbells at your sides, slight bend in the elbows.', 'Lean forward very slightly.'],
    steps: ['Raise the dumbbells out to the sides, leading with the elbows.', 'Stop at shoulder height.', 'Lower slowly over 2–3 seconds.'],
    mistakes: ['Swinging with the hips.', 'Shrugging the weights up with the traps.', 'Going too heavy — this is a light, strict exercise.'],
  },
  'Cable Lateral Raise': {
    primary: 'Side shoulders',
    setup: ['Cable at the lowest setting, stand side-on.', 'Hold the handle with the far hand, cable crossing in front or behind you.'],
    steps: ['Raise your arm out to the side to shoulder height.', 'Pause.', 'Lower slowly, keeping tension at the bottom.'],
    mistakes: ['Leaning away from the machine to cheat.', 'Bending the elbow more as you lift.'],
  },
  'Face Pulls': {
    primary: 'Rear shoulders, upper back', secondary: 'Rotator cuff',
    setup: ['Rope at face height or a bit higher.', 'Overhand grip, thumbs toward you; step back to tension.'],
    steps: ['Pull the rope toward your face, splitting the ends past your ears.', 'Finish with elbows high and hands rotated back.', 'Return slowly.'],
    mistakes: ['Pulling to the chest with elbows low.', 'Leaning back to move the weight.'],
  },
  'Reverse Pec Deck': {
    primary: 'Rear shoulders', secondary: 'Upper back',
    setup: ['Face the pad, handles at shoulder height.', 'Arms straight with a slight bend.'],
    steps: ['Sweep the handles back and out wide.', 'Pause with arms in line with your body.', 'Return slowly.'],
    mistakes: ['Squeezing the shoulder blades too hard (turns into a back exercise).', 'Using momentum.'],
  },
  // ---------- Arms ----------
  'Barbell Bicep Curl': {
    primary: 'Biceps', secondary: 'Forearms',
    setup: ['Stand tall, underhand grip at shoulder width.', 'Elbows pinned at your sides.'],
    steps: ['Curl the bar up without moving the elbows forward.', 'Squeeze at the top.', 'Lower slowly to straight arms.'],
    mistakes: ['Swinging the hips.', 'Elbows drifting forward.', 'Dropping the bar on the way down.'],
  },
  'Dumbbell Hammer Curls': {
    primary: 'Brachialis, forearms', secondary: 'Biceps',
    setup: ['Dumbbells at your sides, palms facing each other.'],
    steps: ['Curl up keeping the neutral grip.', 'Squeeze at the top.', 'Lower under control.'],
    mistakes: ['Swinging.', 'Rotating the wrists.'],
  },
  'Incline Dumbbell Curl': {
    primary: 'Biceps (long head)',
    setup: ['Bench at about 45–60°.', 'Sit back, arms hanging straight behind your torso.'],
    steps: ['Curl up without moving your upper arms forward.', 'Lower slowly to a full stretch.'],
    mistakes: ['Shoulders rolling forward.', 'Going too heavy and shortening the range.'],
  },
  'Cable Bicep Curl': {
    primary: 'Biceps',
    setup: ['Cable low, straight or EZ bar.', 'Step back slightly for tension at the bottom.'],
    steps: ['Curl up with elbows fixed.', 'Squeeze.', 'Lower slowly.'],
    mistakes: ['Leaning back.', 'Letting the elbows travel.'],
  },
  'Preacher Curl': {
    primary: 'Biceps',
    setup: ['Adjust the seat so your armpits rest on top of the pad.', 'Upper arms flat on the pad.'],
    steps: ['Curl up to about vertical forearms.', 'Lower slowly until arms are almost straight.'],
    mistakes: ['Bouncing out of the bottom (risky for the elbow tendon).', 'Lifting the elbows off the pad.'],
  },
  'Tricep Rope Pushdown': {
    primary: 'Triceps',
    setup: ['Cable high with a rope.', 'Elbows tucked at your sides, slight forward lean.'],
    steps: ['Push down until arms are straight.', 'Spread the rope ends apart at the bottom.', 'Return until forearms are about parallel to the floor.'],
    mistakes: ['Elbows flaring or moving forward.', 'Using the shoulders and body weight.'],
  },
  'Overhead Tricep Extension': {
    primary: 'Triceps (long head)',
    setup: ['Cable low with a rope, face away from the machine.', 'Rope behind your head, elbows pointing forward.'],
    steps: ['Extend your arms forward and up until straight.', 'Return slowly for a deep stretch behind the head.'],
    mistakes: ['Elbows flaring wide.', 'Arching the lower back.'],
  },
  'Skull Crushers': {
    primary: 'Triceps',
    setup: ['Lie on a flat bench, EZ bar held over your chest.', 'Arms angled slightly back toward your head.'],
    steps: ['Bend only at the elbows to lower the bar toward your forehead or just behind.', 'Extend back up.'],
    mistakes: ['Elbows flaring out.', 'Moving the upper arms so it becomes a pullover.'],
  },
  'Close-Grip Bench Press': {
    primary: 'Triceps', secondary: 'Chest, front shoulders',
    setup: ['Like a bench press but hands about shoulder-width.', 'Shoulder blades pinched.'],
    steps: ['Lower to the lower chest with elbows tucked.', 'Press up to lockout.'],
    mistakes: ['Grip too narrow (hurts wrists).', 'Elbows flaring out.'],
  },
  // ---------- Legs ----------
  'Barbell Back Squat': {
    primary: 'Quads, glutes', secondary: 'Adductors, lower back, core',
    setup: ['Bar on the upper back (traps), not the neck.', 'Feet about shoulder-width, toes slightly out.', 'Unrack and take two steps back.'],
    steps: ['Big breath, brace your stomach.', 'Sit down and back, knees tracking over your toes.', 'Go as deep as you can with a neutral back (ideally hips below knees).', 'Drive up through the whole foot, chest and hips rising together.'],
    mistakes: ['Knees caving in.', 'Heels lifting.', 'Lower back rounding at the bottom ("butt wink") from going deeper than your mobility allows.'],
  },
  'Front Squat': {
    primary: 'Quads', secondary: 'Glutes, upper back, core',
    setup: ['Bar resting on the front of the shoulders, fingertips under the bar.', 'Elbows high.'],
    steps: ['Sit straight down, keeping the torso upright.', 'Drive up while pushing the elbows up.'],
    mistakes: ['Elbows dropping (bar rolls forward).', 'Rounding the upper back.'],
  },
  'Romanian Deadlift (RDL)': {
    primary: 'Hamstrings, glutes', secondary: 'Lower back',
    setup: ['Stand holding the bar at your hips, shoulder-width grip.', 'Knees slightly bent and staying that way.'],
    steps: ['Push your hips back, sliding the bar down your thighs.', 'Stop when you feel a strong hamstring stretch (usually just below the knee).', 'Drive the hips forward to stand tall.'],
    mistakes: ['Rounding the back to reach lower.', 'Bending the knees more and turning it into a squat.', 'Bar drifting away from the legs.'],
  },
  'Leg Press': {
    primary: 'Quads, glutes', secondary: 'Hamstrings, adductors',
    setup: ['Back and hips flat on the pad.', 'Feet shoulder-width, mid-platform.'],
    steps: ['Release the safeties and lower the sled until knees are around 90° or until your hips start to curl up.', 'Press back up without locking the knees hard.'],
    mistakes: ['Lowering so deep the lower back rounds off the pad.', 'Knees caving in.', 'Bouncing at the bottom.'],
  },
  'Hack Squat': {
    primary: 'Quads', secondary: 'Glutes',
    setup: ['Shoulders under the pads, back flat on the pad.', 'Feet shoulder-width on the platform.'],
    steps: ['Lower deep under control.', 'Drive up through the whole foot.'],
    mistakes: ['Heels lifting.', 'Half reps with heavy weight.'],
  },
  'Bulgarian Split Squat': {
    primary: 'Quads, glutes', secondary: 'Adductors',
    setup: ['Back foot laces-down on a bench.', 'Front foot far enough forward that you can drop straight down.'],
    steps: ['Lower until the back knee nearly touches the floor.', 'Drive up through the front foot.', 'Finish all reps on one leg, then switch.'],
    mistakes: ['Front foot too close (knee shoots far forward and heel lifts).', 'Wobbling — start light.'],
  },
  'Walking Lunges': {
    primary: 'Quads, glutes', secondary: 'Hamstrings, core',
    setup: ['Dumbbells at your sides, stand tall.'],
    steps: ['Take a long step forward.', 'Lower until the back knee almost touches the floor.', 'Push through the front foot and step into the next lunge.'],
    mistakes: ['Steps too short.', 'Leaning forward heavily.'],
  },
  'Leg Extension': {
    primary: 'Quads',
    setup: ['Knees in line with the machine pivot.', 'Pad just above the ankles.'],
    steps: ['Straighten your legs fully and squeeze the quads.', 'Lower slowly.'],
    mistakes: ['Swinging the weight up.', 'Seat set so the knee is not aligned with the pivot.'],
  },
  'Lying Leg Curl': {
    primary: 'Hamstrings',
    setup: ['Lie face down, pad just above the heels.', 'Hips pressed into the bench.'],
    steps: ['Curl heels toward your glutes.', 'Pause.', 'Lower slowly to almost straight legs.'],
    mistakes: ['Hips lifting off the pad.', 'Letting the weight drop.'],
  },
  'Seated Leg Curl': {
    primary: 'Hamstrings',
    setup: ['Knee aligned with the pivot, thigh pad locked down.', 'Pad behind the lower calves.'],
    steps: ['Curl down and back as far as possible.', 'Return slowly to full extension.'],
    mistakes: ['Thigh pad too loose.', 'Short reps.'],
  },
  'Hip Thrust': {
    primary: 'Glutes', secondary: 'Hamstrings',
    setup: ['Upper back against a bench, bar padded across the hips.', 'Feet flat, about shoulder-width.'],
    steps: ['Drive through the heels to lift hips until the torso is flat.', 'Squeeze glutes hard at the top with chin tucked.', 'Lower under control.'],
    mistakes: ['Arching the lower back instead of using the glutes.', 'Feet too far forward (hamstrings take over).'],
  },
  'Standing Calf Raises': {
    primary: 'Calves',
    setup: ['Balls of the feet on the edge of the platform.', 'Shoulders under the pads, legs straight.'],
    steps: ['Lower the heels for a full stretch and pause.', 'Rise as high as possible onto the big toe.', 'Pause at the top.'],
    mistakes: ['Bouncing.', 'Bending the knees to cheat.'],
  },
  'Seated Calf Raise': {
    primary: 'Calves (soleus)',
    setup: ['Knee pad snug on the lower thighs.', 'Balls of the feet on the platform.'],
    steps: ['Lower for a full stretch.', 'Press up as high as possible.', 'Pause at both ends.'],
    mistakes: ['Tiny bouncing reps.'],
  },
  // ---------- Abs ----------
  'Hanging Leg Raise': {
    primary: 'Abs', secondary: 'Hip flexors',
    setup: ['Hang from a bar, shoulders engaged.'],
    steps: ['Raise your legs while curling the pelvis up.', 'Lower slowly without swinging.'],
    mistakes: ['Swinging.', 'Only lifting the legs without tilting the pelvis.'],
  },
  'Cable Crunch': {
    primary: 'Abs',
    setup: ['Kneel facing a high cable, rope beside your head.'],
    steps: ['Crunch your ribs toward your hips, rounding the spine.', 'Return slowly.'],
    mistakes: ['Sitting back with the hips instead of crunching.'],
  },
  Plank: {
    primary: 'Core',
    setup: ['Forearms on the floor, elbows under shoulders.', 'Legs straight behind you.'],
    steps: ['Squeeze glutes and abs.', 'Hold a straight line from head to heels.'],
    mistakes: ['Hips sagging.', 'Holding the breath.'],
  },
  'Ab Wheel Rollout': {
    primary: 'Abs', secondary: 'Lats, shoulders',
    setup: ['Kneel holding the wheel under your shoulders.'],
    steps: ['Roll forward slowly, keeping the lower back flat.', 'Go only as far as you can control.', 'Pull back with the abs.'],
    mistakes: ['Lower back sagging.', 'Going too far too soon.'],
  },
  // ---------- Full body ----------
  'Kettlebell Swing': {
    primary: 'Glutes, hamstrings', secondary: 'Back, core, shoulders',
    setup: ['Bell slightly in front of you, feet a bit wider than hips.', 'Hinge and grab the handle.'],
    steps: ['Hike the bell back between your legs.', 'Snap the hips forward to float the bell to chest height.', 'Let it fall and hinge again.'],
    mistakes: ['Squatting instead of hinging.', 'Lifting with the arms.'],
  },
  "Farmer's Carry": {
    primary: 'Grip, traps, core',
    setup: ['Heavy dumbbells or handles at your sides.'],
    steps: ['Stand tall and walk with short, quick steps.', 'Keep shoulders down and back.'],
    mistakes: ['Leaning to one side.', 'Shrugging.'],
  },
};

const byName = new Map(Object.entries(G).map(([k, v]) => [normName(k), v]));

export const findGuide = (name: string) => byName.get(normName(name));
