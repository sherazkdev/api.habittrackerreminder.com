import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from "@/lib/api-client";
import { isValidMediaUrl, mediaUrl } from "@/lib/media-url";
import { withEnglishCopy } from "@/lib/translations";
import type { Difficulty, Gender, Ingredient, InstructionStep, Meal } from "@/lib/types";

type MealDifficultyApi = "Easy" | "Medium" | "Hard";

type MealDocumentApi = {
  id: number;
  categoryIds: number[];
  title: string;
  shortTitle: string | null;
  description: string | null;
  image: string | null;
  nutrition: {
    caloriesMin: number;
    caloriesMax: number;
    proteinMin: number;
    proteinMax: number;
    carbsMin: number;
    carbsMax: number;
    fatsMin: number;
    fatsMax: number;
    fiberMin: number;
    fiberMax: number;
    sugarMin: number;
    sugarMax: number;
    sodiumMin: number;
    sodiumMax: number;
  };
  minWeight: number;
  maxWeight: number;
  prepTimeMinutes: number;
  difficulty: MealDifficultyApi;
  servingSize: string | null;
  gender: Gender;
  isChallenge: boolean;
  isActive: boolean;
  sortOrder: number;
  ingredients: Array<{ name: string; quantity: string | null; unit: string | null; sortOrder: number }>;
  instructions: Array<{ step: number; text: string }>;
  translations?: Meal["translations"];
};

type MealCategoryDocumentApi = {
  id: number;
  name: string;
};

export type MealListResponse = {
  items: MealDocumentApi[];
  total: number;
  page: number;
  limit: number;
};

export type MealCategoryOption = {
  id: string;
  name: string;
};

const difficultyToApi: Record<Difficulty, MealDifficultyApi> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const difficultyFromApi: Record<string, Difficulty> = {
  Easy: "easy",
  Medium: "medium",
  Hard: "hard",
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

function emptyNutrition() {
  return {
    caloriesMin: 0,
    caloriesMax: 0,
    proteinMin: 0,
    proteinMax: 0,
    carbsMin: 0,
    carbsMax: 0,
    fatsMin: 0,
    fatsMax: 0,
    fiberMin: 0,
    fiberMax: 0,
    sugarMin: 0,
    sugarMax: 0,
    sodiumMin: 0,
    sodiumMax: 0,
  };
}

export function mealDocumentToUi(doc: MealDocumentApi): Meal {
  const nutrition = doc.nutrition ?? emptyNutrition();
  const categoryIds = Array.isArray(doc.categoryIds) ? doc.categoryIds : [];
  const ingredients = Array.isArray(doc.ingredients) ? doc.ingredients : [];
  const instructions = Array.isArray(doc.instructions) ? doc.instructions : [];
  const gender: Gender = doc.gender === "male" || doc.gender === "female" ? doc.gender : "both";
  return {
    id: String(doc.id),
    title: doc.title ?? "",
    shortTitle: doc.shortTitle ?? "",
    description: doc.description ?? "",
    image: doc.image,
    categoryIds: categoryIds.map(String),
    calories: nutrition.caloriesMin,
    caloriesMax: nutrition.caloriesMax,
    protein: nutrition.proteinMin,
    proteinMax: nutrition.proteinMax,
    carbs: nutrition.carbsMin,
    carbsMax: nutrition.carbsMax,
    fats: nutrition.fatsMin,
    fatsMax: nutrition.fatsMax,
    fiber: nutrition.fiberMin,
    fiberMax: nutrition.fiberMax,
    sugar: nutrition.sugarMin,
    sugarMax: nutrition.sugarMax,
    sodium: nutrition.sodiumMin,
    sodiumMax: nutrition.sodiumMax,
    prepTimeMinutes: doc.prepTimeMinutes ?? 0,
    servingSize: doc.servingSize ?? "",
    difficulty: difficultyFromApi[String(doc.difficulty)] ?? "medium",
    gender,
    challenge: Boolean(doc.isChallenge),
    minWeight: doc.minWeight ?? 0,
    maxWeight: doc.maxWeight ?? 0,
    sortOrder: doc.sortOrder ?? 0,
    active: Boolean(doc.isActive),
    ingredients: ingredients.map((item, index) => ({
      id: `ing-${doc.id}-${index}`,
      name: item.name,
      quantity: item.quantity ?? "",
      unit: item.unit ?? "",
    })),
    instructions: instructions.map((item, index) => ({
      id: `step-${doc.id}-${index}`,
      step: item.step,
      instruction: item.text,
    })),
    translations: doc.translations as Meal["translations"],
  };
}

export type MealFormState = {
  title: string;
  shortTitle: string;
  description: string;
  image: string | null;
  categoryIds: string[];
  difficulty: Difficulty;
  prepTimeMinutes: string;
  servingSize: string;
  gender: Gender;
  challenge: boolean;
  sortOrder: string;
  active: boolean;
  nutrition: {
    calories: string;
    caloriesMax: string;
    protein: string;
    proteinMax: string;
    carbs: string;
    carbsMax: string;
    fats: string;
    fatsMax: string;
    fiber: string;
    fiberMax: string;
    sugar: string;
    sugarMax: string;
    sodium: string;
    sodiumMax: string;
  };
  minWeight: string;
  maxWeight: string;
  ingredients: Ingredient[];
  instructions: InstructionStep[];
};

function num(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Treat an unfilled max of 0 as "same as min" so Create/Save is not blocked. */
function fillUnsetMax(min: number, max: number) {
  return max === 0 && min > 0 ? min : max;
}

export function mealFormToApiPayload(
  form: MealFormState,
  translations?: Meal["translations"],
) {
  const caloriesMin = num(form.nutrition.calories);
  const proteinMin = num(form.nutrition.protein);
  const carbsMin = num(form.nutrition.carbs);
  const fatsMin = num(form.nutrition.fats);
  const fiberMin = num(form.nutrition.fiber);
  const sugarMin = num(form.nutrition.sugar);
  const sodiumMin = num(form.nutrition.sodium);
  const englishCopy = {
    title: form.title.trim(),
    shortTitle: form.shortTitle.trim() || null,
    description: form.description.trim() || null,
    servingSize: form.servingSize.trim() || null,
    ingredients: form.ingredients
      .filter((item) => item.name.trim())
      .map((item) => ({ name: item.name.trim(), unit: item.unit.trim() || null })),
    instructions: form.instructions
      .filter((item) => item.instruction.trim())
      .map((item) => ({ text: item.instruction.trim() })),
  };
  return {
    categoryIds: form.categoryIds.map((id) => Number(id)).filter((id) => id > 0),
    title: form.title.trim(),
    shortTitle: form.shortTitle.trim() || null,
    description: form.description.trim() || null,
    image: mediaUrl(form.image),
    nutrition: {
      caloriesMin,
      caloriesMax: fillUnsetMax(caloriesMin, num(form.nutrition.caloriesMax)),
      proteinMin,
      proteinMax: fillUnsetMax(proteinMin, num(form.nutrition.proteinMax)),
      carbsMin,
      carbsMax: fillUnsetMax(carbsMin, num(form.nutrition.carbsMax)),
      fatsMin,
      fatsMax: fillUnsetMax(fatsMin, num(form.nutrition.fatsMax)),
      fiberMin,
      fiberMax: fillUnsetMax(fiberMin, num(form.nutrition.fiberMax)),
      sugarMin,
      sugarMax: fillUnsetMax(sugarMin, num(form.nutrition.sugarMax)),
      sodiumMin,
      sodiumMax: fillUnsetMax(sodiumMin, num(form.nutrition.sodiumMax)),
    },
    minWeight: num(form.minWeight),
    maxWeight: num(form.maxWeight),
    prepTimeMinutes: Math.max(0, Math.round(num(form.prepTimeMinutes))),
    difficulty: difficultyToApi[form.difficulty],
    servingSize: form.servingSize.trim() || null,
    gender: form.gender,
    isChallenge: form.challenge,
    isActive: form.active,
    sortOrder: Math.max(0, Math.round(num(form.sortOrder))),
    ingredients: form.ingredients
      .filter((item) => item.name.trim())
      .map((item, index) => ({
        name: item.name.trim(),
        quantity: item.quantity.trim() || null,
        unit: item.unit.trim() || null,
        sortOrder: index + 1,
      })),
    instructions: form.instructions
      .filter((item) => item.instruction.trim())
      .map((item, index) => ({
        step: index + 1,
        text: item.instruction.trim(),
      })),
    translations: withEnglishCopy(translations, englishCopy),
  };
}

export type MealFormErrors = Partial<Record<string, string>>;

export function validateMealForm(form: MealFormState): MealFormErrors {
  const errors: MealFormErrors = {};

  if (!form.title.trim()) errors.title = "Title is required";
  if (form.categoryIds.length === 0) errors.categoryIds = "Select at least one category";

  const image = form.image?.trim();
  if (image && !isValidMediaUrl(image)) {
    errors.image = "Image URL must be a valid http(s) link";
  }

  const minWeight = num(form.minWeight);
  const maxWeight = num(form.maxWeight);
  if (minWeight > maxWeight) errors.minWeight = "Minimum weight cannot exceed maximum weight";

  const ranges: Array<[keyof MealFormState["nutrition"], keyof MealFormState["nutrition"], string]> = [
    ["calories", "caloriesMax", "Calories"],
    ["protein", "proteinMax", "Protein"],
    ["carbs", "carbsMax", "Carbs"],
    ["fats", "fatsMax", "Fats"],
    ["fiber", "fiberMax", "Fiber"],
    ["sugar", "sugarMax", "Sugar"],
    ["sodium", "sodiumMax", "Sodium"],
  ];

  for (const [minKey, maxKey, label] of ranges) {
    const min = num(form.nutrition[minKey]);
    const max = num(form.nutrition[maxKey]);
    if (max > 0 && min > max) {
      errors.nutrition = `${label} min cannot exceed max`;
      break;
    }
  }

  return errors;
}

export async function fetchMeals(params?: {
  categoryId?: string;
  gender?: string;
  challenge?: string;
  search?: string;
}): Promise<MealListResponse> {
  const query = new URLSearchParams();
  query.set("limit", "100");
  if (params?.categoryId && params.categoryId !== "all") {
    query.set("category_id", params.categoryId);
  }
  if (params?.gender && params.gender !== "all") {
    query.set("gender", params.gender);
  }
  if (params?.challenge === "yes") query.set("is_challenge", "true");
  if (params?.challenge === "no") query.set("is_challenge", "false");
  if (params?.search?.trim()) query.set("search", params.search.trim());

  return apiGet<MealListResponse>(`/api/admin/meals?${query.toString()}`).then((data) => ({
    items: data.items ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    limit: data.limit ?? 100,
  }));
}

export async function fetchMeal(id: string): Promise<MealDocumentApi> {
  return apiGet<MealDocumentApi>(`/api/admin/meals/${id}`);
}

export async function createMeal(payload: ReturnType<typeof mealFormToApiPayload>): Promise<MealDocumentApi> {
  return apiPost<MealDocumentApi>("/api/admin/meals", payload);
}

export async function updateMeal(
  id: string,
  payload: ReturnType<typeof mealFormToApiPayload>,
): Promise<MealDocumentApi> {
  return apiPut<MealDocumentApi>(`/api/admin/meals/${id}`, payload);
}

export async function deleteMeal(id: string): Promise<{ id: number }> {
  return apiDelete<{ id: number }>(`/api/admin/meals/${id}`);
}

export async function uploadMealImage(file: File): Promise<{ url: string; key: string }> {
  return apiUpload<{ url: string; key: string }>("/api/admin/media/upload", file);
}

export async function fetchMealCategories(): Promise<MealCategoryOption[]> {
  const data = await apiGet<{ items: MealCategoryDocumentApi[] }>("/api/admin/meal-categories");
  return (data.items ?? []).map((item) => ({ id: String(item.id), name: item.name }));
}
