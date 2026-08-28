import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api-client";
import { mediaUrl } from "@/lib/media-url";
import { withEnglishCopy } from "@/lib/translations";
import type {
  Difficulty,
  Exercise,
  ExerciseTip,
  Gender,
  InstructionStep,
  LevelSection,
  TargetBodyPart,
} from "@/lib/types";

type ExerciseDifficultyApi = "Beginner" | "Intermediate" | "Advanced";

type ExerciseDocumentApi = {
  id: number;
  categoryIds: number[];
  levelIds: number[];
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  image: string | null;
  imageKey: string | null;
  videoUrl: string | null;
  videoKey: string | null;
  animationUrl: string | null;
  animationKey: string | null;
  difficulty: ExerciseDifficultyApi;
  caloriesMin: number;
  caloriesMax: number;
  repsMin: number;
  repsMax: number;
  setsMin: number;
  setsMax: number;
  durationMin: number;
  durationMax: number;
  restTimeMin: number;
  restTimeMax: number;
  minWeight: number;
  maxWeight: number;
  gender: Gender;
  isChallenge: boolean;
  sortOrder: number;
  isActive: boolean;
  targetBodyParts: Array<{
    name: string;
    imageUrl: string | null;
    imageKey: string | null;
    sortOrder: number;
  }>;
  howToDo: Array<{ step: number; text: string }>;
  tips: Array<{ tip: string; sortOrder: number }>;
  levelSections: Array<{
    levelId: number;
    customDurationMin: number;
    customDurationMax: number;
    customSetsMin: number;
    customSetsMax: number;
    customRepsMin: number;
    customRepsMax: number;
    customCaloriesMin: number;
    customCaloriesMax: number;
    notes: string | null;
    sortOrder: number;
  }>;
  translations?: Exercise["translations"];
};

export type ExerciseFormState = {
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  levelIds: string[];
  categoryIds: string[];
  difficulty: Difficulty;
  gender: Gender;
  challenge: boolean;
  sortOrder: string;
  active: boolean;
  image: string | null;
  animation: string | null;
  animationKey: string | null;
  videoUrl: string | null;
  videoKey: string | null;
  durationMin: string;
  durationMax: string;
  caloriesMin: string;
  caloriesMax: string;
  setsMin: string;
  setsMax: string;
  repsMin: string;
  repsMax: string;
  restMin: string;
  restMax: string;
  weightMin: string;
  weightMax: string;
  levelSections: LevelSection[];
  bodyParts: TargetBodyPart[];
  howTo: InstructionStep[];
  tips: ExerciseTip[];
};

const difficultyToApi: Record<Difficulty, ExerciseDifficultyApi> = {
  easy: "Beginner",
  medium: "Intermediate",
  hard: "Advanced",
};

const difficultyFromApi: Record<ExerciseDifficultyApi, Difficulty> = {
  Beginner: "easy",
  Intermediate: "medium",
  Advanced: "hard",
};

function num(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function exerciseDocumentToUi(doc: ExerciseDocumentApi): Exercise {
  return {
    id: String(doc.id),
    title: doc.title,
    slug: doc.slug,
    shortDescription: doc.shortDescription ?? "",
    fullDescription: doc.description ?? "",
    image: mediaUrl(doc.image),
    animation: mediaUrl(doc.animationUrl),
    animationKey: doc.animationKey,
    videoUrl: mediaUrl(doc.videoUrl),
    videoKey: doc.videoKey,
    levelIds: doc.levelIds.map(String),
    categoryIds: doc.categoryIds.map(String),
    difficulty: difficultyFromApi[doc.difficulty],
    durationMin: doc.durationMin,
    durationMax: doc.durationMax,
    caloriesMin: doc.caloriesMin,
    caloriesMax: doc.caloriesMax,
    setsMin: doc.setsMin,
    setsMax: doc.setsMax,
    repsMin: doc.repsMin,
    repsMax: doc.repsMax,
    restMin: doc.restTimeMin,
    restMax: doc.restTimeMax,
    weightMin: doc.minWeight,
    weightMax: doc.maxWeight,
    gender: doc.gender,
    challenge: doc.isChallenge,
    sortOrder: doc.sortOrder,
    active: doc.isActive,
    levelSections: doc.levelSections.map((section, index) => ({
      id: `ls-${section.levelId}-${index}`,
      levelId: String(section.levelId),
      title: `Level section ${index + 1}`,
      notes: section.notes ?? "",
      sets: String(section.customSetsMin),
      reps: String(section.customRepsMin),
      restSeconds: String(Math.round(section.customDurationMin * 60)),
    })),
    targetBodyParts: doc.targetBodyParts.map((part, index) => ({
      id: `bp-${index}`,
      name: part.name,
      image: part.imageUrl,
    })),
    howTo: doc.howToDo.map((step, index) => ({
      id: `how-${index}`,
      step: step.step,
      instruction: step.text,
    })),
    tips: doc.tips.map((tip, index) => ({
      id: `tip-${index}`,
      tip: tip.tip,
    })),
    translations: doc.translations,
  };
}

export function exerciseFormToApiPayload(
  form: ExerciseFormState,
  translations?: Exercise["translations"],
) {
  const image = mediaUrl(form.image);
  const animation = mediaUrl(form.animation);
  const videoUrl = mediaUrl(form.videoUrl);
  const englishCopy = {
    title: form.title.trim(),
    shortDescription: form.shortDescription.trim() || null,
    description: form.fullDescription.trim() || null,
    targetBodyParts: form.bodyParts
      .filter((part) => part.name.trim())
      .map((part) => ({ name: part.name.trim() })),
    howToDo: form.howTo
      .filter((step) => step.instruction.trim())
      .map((step) => ({ text: step.instruction.trim() })),
    tips: form.tips.filter((tip) => tip.tip.trim()).map((tip) => ({ tip: tip.tip.trim() })),
    levelSections: form.levelSections.map((section) => ({ notes: section.notes.trim() || null })),
  };

  return {
    categoryIds: form.categoryIds.map((id) => Number(id)).filter((id) => id > 0),
    levelIds: form.levelIds.map((id) => Number(id)).filter((id) => id > 0),
    title: form.title.trim(),
    slug: form.slug.trim(),
    shortDescription: form.shortDescription.trim() || null,
    description: form.fullDescription.trim() || null,
    image,
    animationUrl: animation,
    animationKey: form.animationKey?.trim() ? form.animationKey.trim() : null,
    videoUrl: videoUrl,
    videoKey: form.videoKey?.trim() ? form.videoKey.trim() : null,
    difficulty: difficultyToApi[form.difficulty],
    caloriesMin: num(form.caloriesMin),
    caloriesMax: num(form.caloriesMax),
    repsMin: num(form.repsMin),
    repsMax: num(form.repsMax),
    setsMin: num(form.setsMin),
    setsMax: num(form.setsMax),
    durationMin: num(form.durationMin),
    durationMax: num(form.durationMax),
    restTimeMin: num(form.restMin),
    restTimeMax: num(form.restMax),
    minWeight: num(form.weightMin),
    maxWeight: num(form.weightMax),
    gender: form.gender,
    isChallenge: form.challenge,
    sortOrder: Math.max(0, Math.round(num(form.sortOrder))),
    isActive: form.active,
    targetBodyParts: form.bodyParts
      .filter((part) => part.name.trim())
      .map((part, index) => ({
        name: part.name.trim(),
        imageUrl: part.image?.trim() ? part.image.trim() : null,
        sortOrder: index,
      })),
    howToDo: form.howTo
      .filter((step) => step.instruction.trim())
      .map((step, index) => ({
        step: index + 1,
        text: step.instruction.trim(),
      })),
    tips: form.tips
      .filter((tip) => tip.tip.trim())
      .map((tip, index) => ({
        tip: tip.tip.trim(),
        sortOrder: index,
      })),
    levelSections: form.levelSections.map((section, index) => {
      const sets = num(section.sets);
      const reps = num(section.reps);
      const restMinutes = num(section.restSeconds) / 60;
      return {
        levelId: Number(section.levelId),
        customDurationMin: restMinutes,
        customDurationMax: restMinutes,
        customSetsMin: sets,
        customSetsMax: sets,
        customRepsMin: reps,
        customRepsMax: reps,
        customCaloriesMin: num(form.caloriesMin),
        customCaloriesMax: num(form.caloriesMax),
        notes: section.notes.trim() || null,
        sortOrder: index,
      };
    }),
    translations: withEnglishCopy(translations, englishCopy),
  };
}

export function validateExerciseForm(form: ExerciseFormState) {
  const errors: Partial<Record<string, string>> = {};
  if (!form.title.trim()) errors.title = "Title is required";
  if (!form.slug.trim()) errors.slug = "Slug is required";
  if (form.levelIds.length === 0) errors.levelIds = "Select at least one workout level";
  if (form.categoryIds.length === 0) errors.categoryIds = "Select at least one workout category";
  return errors;
}

export function createDefaultLevelSection(levelId: string, levelName?: string): LevelSection {
  return {
    id: uid(),
    levelId,
    title: levelName ? `${levelName} section` : "Level section",
    notes: "",
    sets: "3",
    reps: "12",
    restSeconds: "30",
  };
}

export async function fetchExercisesAdmin(): Promise<Exercise[]> {
  const data = await apiGet<{ items: ExerciseDocumentApi[]; total: number }>("/api/admin/exercises");
  return data.items.map(exerciseDocumentToUi);
}

export async function fetchExercise(id: string) {
  return apiGet<ExerciseDocumentApi>(`/api/admin/exercises/${id}`);
}

export async function createExercise(payload: ReturnType<typeof exerciseFormToApiPayload>) {
  return apiPost<ExerciseDocumentApi>("/api/admin/exercises", payload);
}

export async function updateExercise(id: string, payload: ReturnType<typeof exerciseFormToApiPayload>) {
  return apiPut<ExerciseDocumentApi>(`/api/admin/exercises/${id}`, payload);
}

export async function deleteExercise(id: string) {
  return apiDelete<{ id: number }>(`/api/admin/exercises/${id}`);
}
