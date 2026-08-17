/**
 * Curated library of popular resistance-training and conditioning exercises,
 * organized by primary muscle group. Used by the coach training-program
 * builders (see ExercisePicker) so coaches can quickly select common movements
 * while still typing in custom exercise names.
 *
 * Names are real, correctly-spelled movement names. Groups are ordered
 * roughly head-to-toe / push-pull-legs-core for a natural browse experience.
 */

export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Legs (Quads)"
  | "Hamstrings"
  | "Glutes"
  | "Calves"
  | "Abs/Core"
  | "Full Body / Olympic"
  | "Cardio";

export interface ExerciseDef {
  name: string;
  group: MuscleGroup;
}

/**
 * Ordered muscle-group -> exercises listing. This is the source of truth;
 * ALL_EXERCISES is derived from it.
 */
export const EXERCISE_GROUPS: { group: MuscleGroup; exercises: string[] }[] = [
  {
    group: "Chest",
    exercises: [
      "Barbell Bench Press",
      "Incline Barbell Bench Press",
      "Dumbbell Bench Press",
      "Incline Dumbbell Press",
      "Dumbbell Fly",
      "Cable Crossover",
      "Pec Deck Machine",
      "Chest Press Machine",
      "Push-Up",
      "Dips (Chest)",
      "Decline Bench Press",
      "Landmine Press",
    ],
  },
  {
    group: "Back",
    exercises: [
      "Deadlift",
      "Pull-Up",
      "Chin-Up",
      "Lat Pulldown",
      "Bent-Over Barbell Row",
      "Seated Cable Row",
      "T-Bar Row",
      "Single-Arm Dumbbell Row",
      "Face Pull",
      "Straight-Arm Pulldown",
      "Pendlay Row",
      "Inverted Row",
      "Rack Pull",
    ],
  },
  {
    group: "Shoulders",
    exercises: [
      "Overhead Press",
      "Seated Dumbbell Shoulder Press",
      "Arnold Press",
      "Lateral Raise",
      "Front Raise",
      "Reverse Fly",
      "Face Pull",
      "Upright Row",
      "Cable Lateral Raise",
      "Landmine Press",
      "Push Press",
      "Shrug",
    ],
  },
  {
    group: "Biceps",
    exercises: [
      "Barbell Curl",
      "Dumbbell Curl",
      "Hammer Curl",
      "Preacher Curl",
      "Incline Dumbbell Curl",
      "Concentration Curl",
      "Cable Curl",
      "EZ-Bar Curl",
      "Spider Curl",
      "Chin-Up",
    ],
  },
  {
    group: "Triceps",
    exercises: [
      "Tricep Pushdown",
      "Rope Pushdown",
      "Skull Crusher",
      "Overhead Tricep Extension",
      "Close-Grip Bench Press",
      "Dips (Triceps)",
      "Dumbbell Kickback",
      "Bench Dip",
      "Cable Overhead Extension",
      "Diamond Push-Up",
    ],
  },
  {
    group: "Legs (Quads)",
    exercises: [
      "Back Squat",
      "Front Squat",
      "Leg Press",
      "Hack Squat",
      "Goblet Squat",
      "Leg Extension",
      "Walking Lunge",
      "Bulgarian Split Squat",
      "Step-Up",
      "Box Squat",
      "Sissy Squat",
      "Smith Machine Squat",
    ],
  },
  {
    group: "Hamstrings",
    exercises: [
      "Romanian Deadlift",
      "Lying Leg Curl",
      "Seated Leg Curl",
      "Stiff-Leg Deadlift",
      "Good Morning",
      "Nordic Hamstring Curl",
      "Glute-Ham Raise",
      "Single-Leg Romanian Deadlift",
      "Cable Pull-Through",
    ],
  },
  {
    group: "Glutes",
    exercises: [
      "Hip Thrust",
      "Glute Bridge",
      "Bulgarian Split Squat",
      "Romanian Deadlift",
      "Cable Kickback",
      "Step-Up",
      "Sumo Deadlift",
      "Curtsy Lunge",
      "Frog Pump",
      "Reverse Lunge",
      "Kettlebell Swing",
    ],
  },
  {
    group: "Calves",
    exercises: [
      "Standing Calf Raise",
      "Seated Calf Raise",
      "Leg Press Calf Raise",
      "Donkey Calf Raise",
      "Single-Leg Calf Raise",
      "Smith Machine Calf Raise",
      "Jump Rope",
    ],
  },
  {
    group: "Abs/Core",
    exercises: [
      "Plank",
      "Hanging Leg Raise",
      "Cable Crunch",
      "Russian Twist",
      "Ab Wheel Rollout",
      "Bicycle Crunch",
      "Dead Bug",
      "Mountain Climber",
      "Side Plank",
      "Crunch",
      "Sit-Up",
      "Leg Raise",
      "Pallof Press",
      "Hollow Body Hold",
    ],
  },
  {
    group: "Full Body / Olympic",
    exercises: [
      "Clean and Jerk",
      "Snatch",
      "Power Clean",
      "Hang Clean",
      "Clean and Press",
      "Thruster",
      "Burpee",
      "Kettlebell Swing",
      "Turkish Get-Up",
      "Wall Ball",
      "Farmer's Carry",
      "Sled Push",
    ],
  },
  {
    group: "Cardio",
    exercises: [
      "Treadmill Run",
      "Outdoor Running",
      "Cycling",
      "Rowing Machine",
      "Elliptical",
      "Stair Climber",
      "Jump Rope",
      "Assault Bike",
      "Incline Walking",
      "Swimming",
      "Battle Ropes",
      "High-Knees",
    ],
  },
];

/** Flattened list of every exercise with its muscle group. */
export const ALL_EXERCISES: ExerciseDef[] = EXERCISE_GROUPS.flatMap(({ group, exercises }) =>
  exercises.map((name) => ({ name, group }))
);

/**
 * Case-insensitive "contains" search over exercise names.
 * Returns all exercises (capped) when the query is empty/whitespace.
 * Results are capped at 50 to keep the picker dropdown lightweight.
 */
export function searchExercises(query: string): ExerciseDef[] {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return ALL_EXERCISES.slice(0, 50);
  return ALL_EXERCISES.filter((ex) => ex.name.toLowerCase().includes(q)).slice(0, 50);
}
