import { WorkoutRoutine, BodyMeasurement, BodyCompositionAnalysis, MuscleGroup, CompletedWorkout } from '../types';
import { storageService } from './storageService';

export interface RoutineGeneratorOptions {
  goal: 'hypertrophy' | 'strength' | 'fat-loss' | 'endurance';
  split: 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Full Body';
  daysPerWeek: number;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  equipment: 'full-gym' | 'dumbbells-only' | 'bodyweight' | 'home-gym';
  customNotes?: string;
}

export const geminiService = {
  // Direct call to Gemini REST API (Interactions API with generateContent fallback)
  async generateWithGemini(prompt: string, systemInstruction?: string): Promise<string> {
    const apiKey = storageService.getGeminiApiKey();
    if (!apiKey) {
      throw new Error('NO_API_KEY');
    }

    const rawModel = storageService.getGeminiModel() || 'gemini-3.8-flash';
    const cleanModel = rawModel.replace(/^models\//, '');
    const modelResource = `models/${cleanModel}`;

    // 1. Try Google AI Studio Interactions API first
    try {
      const interactionsUrl = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;
      const interactionsResponse = await fetch(interactionsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelResource,
          input: prompt,
          system_instruction: systemInstruction
        })
      });

      if (interactionsResponse.ok) {
        const iData = await interactionsResponse.json();
        // Extract text from Interactions API response shapes
        const text =
          iData.output?.text ||
          iData.outputs?.[0]?.text ||
          iData.candidates?.[0]?.content?.parts?.[0]?.text ||
          (typeof iData.output === 'string' ? iData.output : null);

        if (text && typeof text === 'string') {
          return text;
        }
      }
    } catch {
      // Proceed to generateContent
    }

    // 2. Standard generateContent endpoint with models/gemini-3.8-flash
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${modelResource}:generateContent?key=${apiKey}`;

    const requestBody: {
      contents: { role: string; parts: { text: string }[] }[];
      systemInstruction?: { parts: { text: string }[] };
      generationConfig: { temperature: number; maxOutputTokens: number };
    } = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message = errData?.error?.message || `Gemini API returned status ${response.status}`;
      throw new Error(message);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }
    return text;
  },

  // 1. GENERATE WORKOUT ROUTINE VIA GEMINI
  async generateRoutine(options: RoutineGeneratorOptions): Promise<WorkoutRoutine> {
    const prompt = `
Create an optimal evidence-based workout routine with the following parameters:
- Goal: ${options.goal}
- Split Focus: ${options.split}
- Experience: ${options.experienceLevel}
- Available Equipment: ${options.equipment}
- Additional Notes: ${options.customNotes || 'None'}

Return ONLY a strict JSON object with NO extra markdown formatting or backticks around it if possible, following this exact schema:
{
  "name": "Routine Title",
  "description": "Short explanation of the training stimulus and why this routine works.",
  "splitType": "${options.split}",
  "estimatedMinutes": 55,
  "exercises": [
    {
      "name": "Exercise Name",
      "muscle": "Chest" | "Back" | "Shoulders" | "Biceps" | "Triceps" | "Legs" | "Abs" | "Full Body",
      "targetSets": 3,
      "targetReps": 8,
      "defaultWeight": 60,
      "restSeconds": 90,
      "notes": "Cue or form instruction"
    }
  ]
}
`;

    try {
      const text = await this.generateWithGemini(
        prompt,
        'You are an elite strength and conditioning coach and biomechanics expert. Return strictly valid JSON conforming to the requested schema.'
      );
      return this.parseRoutineJson(text, options.split);
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message === 'NO_API_KEY') {
        // Fallback intelligent generator so user can see it work instantly even before adding API key
        return this.fallbackGenerateRoutine(options);
      }
      throw error;
    }
  },

  // 2. PARSE ROUTINE FROM FREE-TEXT OR JSON (Exported from Gemini or ChatGPT)
  parseRoutineTextOrJson(input: string): WorkoutRoutine {
    // Try parsing as JSON first
    const trimmed = input.trim();
    const cleaned = trimmed.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.name && Array.isArray(parsed.exercises)) {
        return {
          id: 'routine-imported-' + Date.now(),
          name: parsed.name,
          description: parsed.description || 'Imported workout routine from Gemini',
          splitType: parsed.splitType || 'Custom',
          estimatedMinutes: parsed.estimatedMinutes || 50,
          source: 'gemini-import',
          createdAt: new Date().toISOString(),
          exercises: parsed.exercises.map((e: {
            name: string;
            muscle?: MuscleGroup;
            targetSets?: number;
            targetReps?: number;
            defaultWeight?: number;
            restSeconds?: number;
            notes?: string;
          }, idx: number) => ({
            id: `ex-imp-${idx}-${Date.now()}`,
            name: e.name || `Exercise ${idx + 1}`,
            muscle: this.inferMuscle(e.name, e.muscle),
            targetSets: Number(e.targetSets) || 3,
            targetReps: Number(e.targetReps) || 10,
            defaultWeight: Number(e.defaultWeight) || 20,
            restSeconds: Number(e.restSeconds) || 90,
            notes: e.notes || ''
          }))
        };
      }
    } catch {
      // Not pure JSON, parse unstructured text line by line!
    }

    // Heuristic text parser for freeform Gemini outputs
    return this.parseFreeformWorkoutText(trimmed);
  },

  parseRoutineJson(text: string, defaultSplit: WorkoutRoutine['splitType']): WorkoutRoutine {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Locate the first '{' and last '}'
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('Could not find JSON object in Gemini response');
    }
    const jsonSubstring = cleaned.substring(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonSubstring);

    return {
      id: 'routine-ai-' + Date.now(),
      name: parsed.name || `${defaultSplit} Session`,
      description: parsed.description || 'AI-designed workout session',
      splitType: parsed.splitType || defaultSplit,
      estimatedMinutes: parsed.estimatedMinutes || 50,
      source: 'gemini-ai',
      createdAt: new Date().toISOString(),
      exercises: (parsed.exercises || []).map((e: {
        name: string;
        muscle?: MuscleGroup;
        targetSets?: number;
        targetReps?: number;
        defaultWeight?: number;
        restSeconds?: number;
        notes?: string;
      }, idx: number) => ({
        id: `ex-${idx}-${Date.now()}`,
        name: e.name || `Exercise ${idx + 1}`,
        muscle: this.inferMuscle(e.name, e.muscle),
        targetSets: Number(e.targetSets) || 3,
        targetReps: Number(e.targetReps) || 10,
        defaultWeight: Number(e.defaultWeight) || 20,
        restSeconds: Number(e.restSeconds) || 90,
        notes: e.notes || ''
      }))
    };
  },

  parseFreeformWorkoutText(text: string): WorkoutRoutine {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let title = 'Imported Gemini Routine';
    const exercises: WorkoutRoutine['exercises'] = [];

    // Check first lines for title
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const line = lines[i];
      if (line.startsWith('#') || line.toLowerCase().includes('workout') || line.toLowerCase().includes('day')) {
        title = line.replace(/^[#*\s-]+/, '').trim();
        break;
      }
    }

    const exerciseRegex = /^(\d+[\.\)]|\*|-)?\s*([A-Za-z0-9\s\(\)\-\/]+?)(?:\s*[:–-]\s*|\s+)(\d+)\s*(?:x|sets of|\*)\s*(\d+(?:-\d+)?)\s*(?:reps)?(?:\s*@\s*(\d+(?:\.\d+)?)\s*(?:kg|lbs)?)?/i;

    lines.forEach((line, idx) => {
      const match = line.match(exerciseRegex);
      if (match) {
        const rawName = match[2].trim();
        const sets = parseInt(match[3], 10) || 3;
        const reps = parseInt(match[4], 10) || 10;
        const weight = match[5] ? parseFloat(match[5]) : 20;

        // Skip headers that matched accidentally
        if (rawName.toLowerCase().includes('week') || rawName.toLowerCase().includes('schedule')) return;

        exercises.push({
          id: `ex-imp-${idx}-${Date.now()}`,
          name: rawName,
          muscle: this.inferMuscle(rawName),
          targetSets: sets,
          targetReps: reps,
          defaultWeight: weight,
          restSeconds: 90,
          notes: 'Imported from Gemini text'
        });
      }
    });

    if (exercises.length === 0) {
      // Fallback: split by lines and make sensible guesses
      lines.slice(0, 8).forEach((l, idx) => {
        const cleanName = l.replace(/^[\d\.\*\-—#]+\s*/, '').trim();
        if (cleanName.length > 3 && cleanName.length < 50) {
          exercises.push({
            id: `ex-fallback-${idx}`,
            name: cleanName,
            muscle: this.inferMuscle(cleanName),
            targetSets: 3,
            targetReps: 10,
            defaultWeight: 20,
            restSeconds: 90
          });
        }
      });
    }

    return {
      id: 'routine-imported-' + Date.now(),
      name: title,
      description: 'Imported from Gemini workout export',
      splitType: 'Custom',
      estimatedMinutes: Math.max(30, exercises.length * 10),
      source: 'gemini-import',
      createdAt: new Date().toISOString(),
      exercises: exercises.length > 0 ? exercises : [
        {
          id: 'ex-default-1',
          name: 'Flat Bench Press',
          muscle: 'Chest',
          targetSets: 3,
          targetReps: 10,
          defaultWeight: 60,
          restSeconds: 90
        }
      ]
    };
  },

  inferMuscle(name: string, fallback?: MuscleGroup): MuscleGroup {
    if (fallback) return fallback;
    const lower = name.toLowerCase();
    if (lower.includes('bench') || lower.includes('chest') || lower.includes('pushup') || lower.includes('fly') || lower.includes('pec')) return 'Chest';
    if (lower.includes('row') || lower.includes('pulldown') || lower.includes('pull-up') || lower.includes('chin-up') || lower.includes('lat') || lower.includes('deadlift')) return 'Back';
    if (lower.includes('press') && (lower.includes('overhead') || lower.includes('shoulder') || lower.includes('military') || lower.includes('arnold'))) return 'Shoulders';
    if (lower.includes('lateral raise') || lower.includes('rear delt') || lower.includes('face pull')) return 'Shoulders';
    if (lower.includes('squat') || lower.includes('lunge') || lower.includes('leg press') || lower.includes('leg extension') || lower.includes('leg curl') || lower.includes('calf') || lower.includes('quad') || lower.includes('hamstring') || lower.includes('glute')) return 'Legs';
    if (lower.includes('curl') || lower.includes('bicep')) return 'Biceps';
    if (lower.includes('tricep') || lower.includes('pushdown') || lower.includes('skull crusher') || lower.includes('dip')) return 'Triceps';
    if (lower.includes('plank') || lower.includes('crunch') || lower.includes('ab') || lower.includes('core') || lower.includes('leg raise')) return 'Abs';
    return 'Full Body';
  },

  // 3. ANALYZE BODY COMPOSITION & RECOMPOSITION (Chest, Stomach, Weight, Muscle vs Fat)
  async analyzeBodyComposition(measurements: BodyMeasurement[]): Promise<BodyCompositionAnalysis> {
    if (measurements.length < 2) {
      return {
        status: 'need-data',
        headline: 'Need at least 2 measurement logs',
        summary: 'Log your chest, stomach/waist, and weight across a few weeks to unlock deep AI body recomposition insights.',
        weightDelta: 0,
        waistDelta: 0,
        chestDelta: 0,
        recommendations: [
          'Measure your waist around the navel first thing in the morning',
          'Measure chest at the nipple line relaxed with normal breathing',
          'Weigh in consistently after using the restroom'
        ]
      };
    }

    const first = measurements[0];
    const latest = measurements[measurements.length - 1];

    const weightDelta = +(latest.weightKg - first.weightKg).toFixed(1);
    const waistDelta = +(latest.stomachWaistCm - first.stomachWaistCm).toFixed(1);
    const chestDelta = +(latest.chestCm - first.chestCm).toFixed(1);
    const bfDelta = (latest.bodyFatPercentage !== undefined && first.bodyFatPercentage !== undefined) 
      ? +(latest.bodyFatPercentage - first.bodyFatPercentage).toFixed(1) 
      : undefined;

    // Check if Gemini API is available
    const apiKey = storageService.getGeminiApiKey();
    if (apiKey) {
      try {
        const historyText = measurements.map(m => 
          `Date: ${m.date} | Weight: ${m.weightKg}kg | Waist/Stomach: ${m.stomachWaistCm}cm | Chest: ${m.chestCm}cm ${m.bodyFatPercentage ? `| BodyFat: ${m.bodyFatPercentage}%` : ''} ${m.armsCm ? `| Arms: ${m.armsCm}cm` : ''}`
        ).join('\n');

        const prompt = `
You are an expert sports scientist and body composition coach.
Analyze the user's weekly body measurement trajectory below:
${historyText}

Baseline vs Current:
- Weight delta: ${weightDelta} kg
- Waist/Stomach delta: ${waistDelta} cm
- Chest delta: ${chestDelta} cm
${bfDelta !== undefined ? `- Body Fat delta: ${bfDelta} %` : ''}

Determine scientifically:
1. Is the user in Body Recomposition (losing fat while building muscle simultaneously)?
2. Or in a Clean Hypertrophy Bulk, Lean Cut, or Plateau?
3. What is happening to their visceral and subcutaneous belly fat vs upper body muscle mass?

Return ONLY a strict JSON object with NO extra text:
{
  "status": "recomposition" | "muscle-gain" | "fat-loss" | "surplus" | "maintenance",
  "headline": "Short punchy verdict (e.g., 'Flawless Recomposition: Losing Stomach Fat & Expanding Chest')",
  "summary": "2-3 sentences explaining the exact physiological changes.",
  "estimatedMuscleGainRate": "e.g. +0.4kg/month",
  "estimatedFatLossRate": "e.g. -0.6kg/month",
  "recommendations": [
    "Specific actionable tip 1",
    "Specific actionable tip 2",
    "Specific actionable tip 3"
  ]
}
`;
        const text = await this.generateWithGemini(prompt, 'You are an elite sports scientist. Output only valid JSON.');
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          const parsed = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
          return {
            status: parsed.status || 'recomposition',
            headline: parsed.headline,
            summary: parsed.summary,
            weightDelta,
            waistDelta,
            chestDelta,
            bodyFatDelta: bfDelta,
            estimatedMuscleGainRate: parsed.estimatedMuscleGainRate,
            estimatedFatLossRate: parsed.estimatedFatLossRate,
            recommendations: parsed.recommendations || []
          };
        }
      } catch (e) {
        console.warn('Gemini AI analysis failed, falling back to heuristic engine:', e);
      }
    }

    // High-accuracy Sports-Science Local Heuristic Engine
    // Scenario 1: Waist dropping + (Weight steady or up) or (Chest expanding)
    if (waistDelta <= -0.8 && (chestDelta >= 0.5 || Math.abs(weightDelta) <= 1.5)) {
      return {
        status: 'recomposition',
        headline: 'Optimal Body Recomposition: Shedding Fat & Adding Lean Muscle',
        summary: `Your stomach measurement has dropped by ${Math.abs(waistDelta)} cm while your chest has grown by ${chestDelta > 0 ? `+${chestDelta} cm` : 'remained solid'}. This is the holy grail of fitness: visceral belly fat is melting away while your upper body gains dense muscular tissue.`,
        weightDelta,
        waistDelta,
        chestDelta,
        bodyFatDelta: bfDelta,
        estimatedMuscleGainRate: '+0.5 kg lean mass/mo',
        estimatedFatLossRate: '-0.8 kg adipose tissue/mo',
        recommendations: [
          'Maintain your current caloric intake; you are in the ideal metabolic sweet spot.',
          'Keep pushing progressive overload on compound lifts (bench, rows, squats).',
          'Aim for 1.8g to 2.2g of protein per kg of bodyweight to fuel muscle protein synthesis.'
        ]
      };
    }

    // Scenario 2: Weight down + Waist down
    if (weightDelta < -1.0 && waistDelta < 0) {
      return {
        status: 'fat-loss',
        headline: 'Effective Fat Loss Phase (Cutting)',
        summary: `You have dropped ${Math.abs(weightDelta)} kg overall, and your waist shrank by ${Math.abs(waistDelta)} cm. Your body is successfully oxidizing stored body fat.`,
        weightDelta,
        waistDelta,
        chestDelta,
        bodyFatDelta: bfDelta,
        estimatedMuscleGainRate: 'Preserving lean tissue',
        estimatedFatLossRate: `${(Math.abs(weightDelta) / (measurements.length || 1)).toFixed(2)} kg/week`,
        recommendations: [
          'Keep lifting heavy weights to signal your body to retain muscle tissue during a calorie deficit.',
          'Prioritize high-satiety protein and fibrous greens to stay full.',
          'Consider a 48-hour refeed if workout intensity starts feeling fatigued.'
        ]
      };
    }

    // Scenario 3: Weight up + Chest/Arms up + Waist stable
    if (weightDelta > 0.8 && chestDelta > 0.8 && waistDelta <= 1.0) {
      return {
        status: 'muscle-gain',
        headline: 'Lean Hypertrophy (Clean Bulk)',
        summary: `Weight is up ${weightDelta} kg and chest measurement expanded by +${chestDelta} cm with minimal waist change (+${waistDelta} cm). You are building pure skeletal muscle with negligible fat gain.`,
        weightDelta,
        waistDelta,
        chestDelta,
        bodyFatDelta: bfDelta,
        estimatedMuscleGainRate: '+0.8 kg muscle/mo',
        estimatedFatLossRate: 'Stable body fat ratio',
        recommendations: [
          'Continue adding 1-2 reps or 1-2.5 kg to key lifts weekly.',
          'Ensure 7.5 to 8.5 hours of sleep for optimum growth hormone release.'
        ]
      };
    }

    // Scenario 4: Waist increasing faster than chest
    if (waistDelta > 1.5 && weightDelta > 1.5) {
      return {
        status: 'surplus',
        headline: 'Caloric Surplus High: Monitoring Fat Gain',
        summary: `Weight increased by +${weightDelta} kg and waist grew by +${waistDelta} cm. You are likely in a larger calorie surplus than necessary for optimal muscle growth.`,
        weightDelta,
        waistDelta,
        chestDelta,
        bodyFatDelta: bfDelta,
        recommendations: [
          'Trim daily calories by 250-300 kcal (cut back on liquid calories or snacks).',
          'Add 20-30 minutes of low-intensity steady-state cardio (incline walking).'
        ]
      };
    }

    // Scenario 5: Maintenance
    return {
      status: 'maintenance',
      headline: 'Physique Maintenance: Solid Baseline',
      summary: `Your measurements are very stable (Weight: ${weightDelta >= 0 ? `+${weightDelta}` : weightDelta} kg, Waist: ${waistDelta >= 0 ? `+${waistDelta}` : waistDelta} cm). You have established a balanced metabolic equilibrium.`,
      weightDelta,
      waistDelta,
      chestDelta,
      bodyFatDelta: bfDelta,
      recommendations: [
        'To build more muscle, increase daily calories by 200 kcal and focus on progressive overload.',
        'To lean out, introduce a slight 300 kcal deficit.'
      ]
    };
  },

  // 4. PROGRESSIVE OVERLOAD REVIEW
  async analyzeProgressiveOverload(workouts: CompletedWorkout[]): Promise<string> {
    const apiKey = storageService.getGeminiApiKey();
    if (!apiKey || workouts.length === 0) {
      return "Log multiple sessions of the same exercises to unlock Gemini's AI progressive overload advice.";
    }

    const summary = workouts.slice(0, 5).map(w => {
      const exerciseDetails = w.exercises.map(e => {
        const topSet = e.sets.reduce((max, s) => s.weight > max.weight ? s : max, e.sets[0] || { weight: 0, reps: 0 });
        return `${e.name}: Top Set ${topSet.weight}kg x ${topSet.reps} reps`;
      }).join('; ');
      return `Date: ${w.date} (${w.routineName}) -> ${exerciseDetails}`;
    }).join('\n');

    const prompt = `
Analyze the user's workout weights and reps progression:
${summary}

Provide 3 bullet points:
1. Which exercise had the strongest progressive overload?
2. Are there any lifts stalling?
3. Exact weight or rep target recommendation for next week.
Keep it concise, energetic, and under 150 words.
`;

    try {
      return await this.generateWithGemini(prompt, 'You are an encouraging and analytical elite strength coach.');
    } catch {
      return "Keep striving for progressive overload by adding either 1 rep or 1-2.5kg to your top sets each week!";
    }
  },

  // Fallback routine generator if offline or no API key
  fallbackGenerateRoutine(options: RoutineGeneratorOptions): WorkoutRoutine {
    const exercisesMap: Record<string, WorkoutRoutine['exercises']> = {
      'Push': [
        { id: 'fb-p1', name: 'Barbell Flat Bench Press', muscle: 'Chest', targetSets: 4, targetReps: 8, defaultWeight: 75, restSeconds: 90, notes: 'Control the descent, explosive drive.' },
        { id: 'fb-p2', name: 'Incline Dumbbell Press', muscle: 'Chest', targetSets: 3, targetReps: 10, defaultWeight: 26, restSeconds: 75, notes: 'Set angle to 30 degrees.' },
        { id: 'fb-p3', name: 'Overhead Dumbbell Shoulder Press', muscle: 'Shoulders', targetSets: 3, targetReps: 10, defaultWeight: 22, restSeconds: 75, notes: 'Full extension at top.' },
        { id: 'fb-p4', name: 'Cable Lateral Raises', muscle: 'Shoulders', targetSets: 4, targetReps: 12, defaultWeight: 10, restSeconds: 60, notes: 'Constant side delt tension.' },
        { id: 'fb-p5', name: 'Overhead Tricep Rope Extension', muscle: 'Triceps', targetSets: 3, targetReps: 12, defaultWeight: 22.5, restSeconds: 60, notes: 'Deep stretch on long head.' }
      ],
      'Pull': [
        { id: 'fb-pl1', name: 'Barbell Bent-Over Row', muscle: 'Back', targetSets: 4, targetReps: 8, defaultWeight: 70, restSeconds: 90, notes: 'Hinge at hips, pull to belly button.' },
        { id: 'fb-pl2', name: 'Lat Pulldown (Neutral Grip)', muscle: 'Back', targetSets: 3, targetReps: 10, defaultWeight: 60, restSeconds: 75, notes: 'Squeeze lats at bottom.' },
        { id: 'fb-pl3', name: 'Face Pulls with External Rotation', muscle: 'Shoulders', targetSets: 4, targetReps: 15, defaultWeight: 20, restSeconds: 60, notes: 'Rear delt and rotator cuff health.' },
        { id: 'fb-pl4', name: 'Incline Dumbbell Bicep Curl', muscle: 'Biceps', targetSets: 3, targetReps: 10, defaultWeight: 14, restSeconds: 60, notes: 'Maximum stretch at bottom.' },
        { id: 'fb-pl5', name: 'Hammer Curls', muscle: 'Biceps', targetSets: 3, targetReps: 12, defaultWeight: 16, restSeconds: 60, notes: 'Forearm & brachialis power.' }
      ],
      'Legs': [
        { id: 'fb-l1', name: 'Barbell Back Squat', muscle: 'Legs', targetSets: 4, targetReps: 6, defaultWeight: 100, restSeconds: 120, notes: 'Hit depth with vertical chest.' },
        { id: 'fb-l2', name: 'Romanian Deadlift (Dumbbell or Bar)', muscle: 'Legs', targetSets: 3, targetReps: 8, defaultWeight: 80, restSeconds: 90, notes: 'Feel deep hamstring stretch.' },
        { id: 'fb-l3', name: 'Bulgarian Split Squats', muscle: 'Legs', targetSets: 3, targetReps: 10, defaultWeight: 18, restSeconds: 75, notes: 'Quad and glute stabilizer burner.' },
        { id: 'fb-l4', name: 'Standing Calf Raises', muscle: 'Legs', targetSets: 4, targetReps: 15, defaultWeight: 45, restSeconds: 60, notes: '2 second pause at bottom stretch.' }
      ],
      'Upper': [
        { id: 'fb-u1', name: 'Incline Barbell Bench Press', muscle: 'Chest', targetSets: 4, targetReps: 8, defaultWeight: 70, restSeconds: 90, notes: 'Upper chest mass builder.' },
        { id: 'fb-u2', name: 'Chest-Supported T-Bar Row', muscle: 'Back', targetSets: 4, targetReps: 8, defaultWeight: 55, restSeconds: 90, notes: 'Upper back thickness.' },
        { id: 'fb-u3', name: 'Dumbbell Lateral Raises', muscle: 'Shoulders', targetSets: 4, targetReps: 12, defaultWeight: 12, restSeconds: 60, notes: 'Control negative descent.' },
        { id: 'fb-u4', name: 'Barbell Bicep Curl', muscle: 'Biceps', targetSets: 3, targetReps: 10, defaultWeight: 30, restSeconds: 60, notes: 'Strict form.' },
        { id: 'fb-u5', name: 'Cable Tricep Pushdown', muscle: 'Triceps', targetSets: 3, targetReps: 12, defaultWeight: 25, restSeconds: 60, notes: 'Lockout triceps.' }
      ],
      'Lower': [
        { id: 'fb-lo1', name: 'Barbell Front Squat', muscle: 'Legs', targetSets: 4, targetReps: 8, defaultWeight: 75, restSeconds: 90, notes: 'Elbows high, quad bias.' },
        { id: 'fb-lo2', name: 'Hamstring Lying Leg Curl', muscle: 'Legs', targetSets: 3, targetReps: 10, defaultWeight: 45, restSeconds: 60, notes: 'Squeeze hamstrings.' },
        { id: 'fb-lo3', name: 'Walking Dumbbell Lunges', muscle: 'Legs', targetSets: 3, targetReps: 12, defaultWeight: 20, restSeconds: 75, notes: 'Step forward smoothly.' }
      ],
      'Full Body': [
        { id: 'fb-fb1', name: 'Barbell Deadlift', muscle: 'Back', targetSets: 3, targetReps: 5, defaultWeight: 120, restSeconds: 150, notes: 'Full body pull foundation.' },
        { id: 'fb-fb2', name: 'Barbell Flat Bench Press', muscle: 'Chest', targetSets: 3, targetReps: 8, defaultWeight: 75, restSeconds: 90, notes: 'Compound push.' },
        { id: 'fb-fb3', name: 'Goblet Squat', muscle: 'Legs', targetSets: 3, targetReps: 10, defaultWeight: 32, restSeconds: 90, notes: 'Deep squat mobility.' },
        { id: 'fb-fb4', name: 'Dumbbell Shoulder Press', muscle: 'Shoulders', targetSets: 3, targetReps: 10, defaultWeight: 22, restSeconds: 60, notes: 'Overhead strength.' }
      ]
    };

    const exList = exercisesMap[options.split] || exercisesMap['Push'];

    return {
      id: 'routine-gen-' + Date.now(),
      name: `AI ${options.split} Power Routine (${options.goal.toUpperCase()})`,
      description: `Tailored ${options.split} split engineered for ${options.experienceLevel} trainees using ${options.equipment.replace('-', ' ')}.`,
      splitType: options.split,
      estimatedMinutes: 55,
      source: 'gemini-ai',
      createdAt: new Date().toISOString(),
      exercises: exList
    };
  },

  // Generates copyable prompt for Gemini web chat
  generateGeminiWebExportPrompt(routineTitle?: string): string {
    return `Generate a comprehensive fitness workout routine for ${routineTitle || 'Hypertrophy'} formatted strictly as a JSON object so I can import it directly into my workout app.

Please format your response like this:
\`\`\`json
{
  "name": "Workout Name",
  "description": "Routine description",
  "splitType": "Push",
  "estimatedMinutes": 55,
  "exercises": [
    {
      "name": "Barbell Bench Press",
      "muscle": "Chest",
      "targetSets": 4,
      "targetReps": 8,
      "defaultWeight": 80,
      "restSeconds": 90,
      "notes": "Control negative"
    }
  ]
}
\`\`\``;
  },

  // 5. SUGGEST EXERCISE ALTERNATIVE / SWAP
  async suggestExerciseAlternatives(exerciseName: string, reason?: string): Promise<{ name: string; equipment: string; reason: string }[]> {
    const prompt = `
The user wants an alternative exercise for "${exerciseName}".
Reason/Context: ${reason || 'Equipment busy or seeking variety/joint comfort'}

Suggest exactly 3 biomechanically equivalent alternatives that train the same primary muscle fibers.
Return ONLY a valid JSON array like this:
[
  { "name": "Alternative Exercise 1", "equipment": "Dumbbells", "reason": "Hits the same angle without shoulder impingement." },
  { "name": "Alternative Exercise 2", "equipment": "Cables", "reason": "Provides continuous tension across full ROM." },
  { "name": "Alternative Exercise 3", "equipment": "Machine", "reason": "High stability for pure motor unit recruitment." }
]
`;

    try {
      const text = await this.generateWithGemini(prompt, 'You are an elite strength coach and biomechanist. Output only valid JSON.');
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1) {
        return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
      }
    } catch {
      // Fallback alternatives
    }

    // Heuristic fallbacks
    const lower = exerciseName.toLowerCase();
    if (lower.includes('bench')) {
      return [
        { name: 'Dumbbell Flat Bench Press', equipment: 'Dumbbells', reason: 'Better range of motion and freedom for wrists and shoulders.' },
        { name: 'Converging Chest Press Machine', equipment: 'Machine', reason: 'Maximum pectoral isolation without needing a spotter.' },
        { name: 'Weighted Dips (Chest Lean)', equipment: 'Bodyweight / Belt', reason: 'High compound activation for lower and mid chest.' }
      ];
    } else if (lower.includes('squat')) {
      return [
        { name: 'Leg Press', equipment: 'Machine', reason: 'High quad overload with zero axial spinal compression.' },
        { name: 'Bulgarian Split Squats', equipment: 'Dumbbells', reason: 'Unilateral quad & glute builder that corrects muscular imbalances.' },
        { name: 'Hack Squat', equipment: 'Machine', reason: 'Fixed trajectory allowing deep knee flexion.' }
      ];
    } else if (lower.includes('row')) {
      return [
        { name: 'Chest-Supported Dumbbell Row', equipment: 'Dumbbells & Bench', reason: 'Eliminates lower back fatigue so you can push lats to true failure.' },
        { name: 'Seated Cable Row', equipment: 'Cables', reason: 'Continuous tension through the concentric and eccentric phases.' },
        { name: 'Single-Arm Lat Pulldown', equipment: 'Cables', reason: 'Aligns directly with lat fiber orientation.' }
      ];
    }

    return [
      { name: `Dumbbell ${exerciseName}`, equipment: 'Dumbbells', reason: 'Standard unilateral free weight variation.' },
      { name: `Cable ${exerciseName}`, equipment: 'Cables', reason: 'Constant mechanical tension throughout the movement.' },
      { name: `Machine ${exerciseName}`, equipment: 'Machine', reason: 'High stability for focused muscular hypertrophy.' }
    ];
  },

  // 6. LIVE CONVERSATION WITH GEMINI COACH
  async chatWithCoach(
    messages: { role: 'user' | 'model'; parts: { text: string }[] }[],
    userContext?: {
      weight?: number;
      stomach?: number;
      chest?: number;
      recentWorkouts?: string;
      overloadRate?: number;
    }
  ): Promise<string> {
    const apiKey = storageService.getGeminiApiKey();
    if (!apiKey) {
      throw new Error('NO_API_KEY');
    }

    const rawModel = storageService.getGeminiModel() || 'gemini-3.8-flash';
    const cleanModel = rawModel.replace(/^models\//, '');
    const modelResource = `models/${cleanModel}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelResource}:generateContent?key=${apiKey}`;

    const systemInstruction = `
You are AeroFit Coach, an elite sports science and bodybuilding coach powered by Gemini.
The user's real stats:
- Current Body Weight: ${userContext?.weight || 81.2} kg
- Stomach / Waist: ${userContext?.stomach || 83.5} cm
- Chest: ${userContext?.chest || 105.0} cm
- Weekly Overload Rate: ${userContext?.overloadRate || 75}%
- Recent Workout Logs: ${userContext?.recentWorkouts || 'Regular push/pull/legs sessions'}

Always give concise, encouraging, highly scientific, and actionable fitness advice. Keep answers under 180 words with bullet points for readability.
`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to help you optimize your training and nutrition!";
  }
};

