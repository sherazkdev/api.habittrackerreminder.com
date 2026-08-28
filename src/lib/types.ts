export type Status = "active" | "inactive";
export type Gender = "male" | "female" | "both";
export type Challenge = boolean;
export type Difficulty = "easy" | "medium" | "hard";

export type MealCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  sortOrder: number;
  active: boolean;
  image: string | null;
  mealsCount: number;
  translations?: Partial<Record<string, { name?: string; description?: string | null }>>;
};

export type Ingredient = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
};

export type InstructionStep = {
  id: string;
  step: number;
  instruction: string;
};

export type Meal = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  image: string | null;
  categoryIds: string[];
  calories: number;
  caloriesMax: number;
  protein: number;
  proteinMax: number;
  carbs: number;
  carbsMax: number;
  fats: number;
  fatsMax: number;
  fiber: number;
  fiberMax: number;
  sugar: number;
  sugarMax: number;
  sodium: number;
  sodiumMax: number;
  prepTimeMinutes: number;
  servingSize: string;
  difficulty: Difficulty;
  gender: Gender;
  challenge: boolean;
  minWeight: number;
  maxWeight: number;
  sortOrder: number;
  active: boolean;
  ingredients: Ingredient[];
  instructions: InstructionStep[];
  translations?: Partial<
    Record<
      string,
      {
        title: string;
        shortTitle: string;
        description: string;
        servingSize: string;
        ingredients: Array<{ name: string; unit: string }>;
        instructions: Array<{ text: string }>;
      }
    >
  >;
};

export type WorkoutLevel = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  active: boolean;
  image: string | null;
  translations?: Partial<Record<string, { name?: string; description?: string | null }>>;
};

export type WorkoutCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  levelIds: string[];
  gender: Gender;
  challenge: boolean;
  sortOrder: number;
  active: boolean;
  image: string | null;
  exercisesCount: number;
  translations?: Partial<Record<string, { name?: string; description?: string | null }>>;
};

export type MetricRange = {
  min: number;
  max: number;
};

export type LevelSection = {
  id: string;
  levelId: string;
  title: string;
  notes: string;
  sets: string;
  reps: string;
  restSeconds: string;
};

export type TargetBodyPart = {
  id: string;
  name: string;
  image: string | null;
};

export type ExerciseTip = {
  id: string;
  tip: string;
};

export type Exercise = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  image: string | null;
  animation: string | null;
  animationKey: string | null;
  videoUrl: string | null;
  videoKey: string | null;
  levelIds: string[];
  categoryIds: string[];
  difficulty: Difficulty;
  durationMin: number;
  durationMax: number;
  caloriesMin: number;
  caloriesMax: number;
  setsMin: number;
  setsMax: number;
  repsMin: number;
  repsMax: number;
  restMin: number;
  restMax: number;
  weightMin: number;
  weightMax: number;
  gender: Gender;
  challenge: boolean;
  sortOrder: number;
  active: boolean;
  levelSections: LevelSection[];
  targetBodyParts: TargetBodyPart[];
  howTo: InstructionStep[];
  tips: ExerciseTip[];
  translations?: Partial<
    Record<
      string,
      {
        title: string;
        shortDescription: string;
        description: string;
        targetBodyParts: Array<{ name: string }>;
        howToDo: Array<{ text: string }>;
        tips: Array<{ tip: string }>;
        levelSections: Array<{ notes: string }>;
      }
    >
  >;
};
