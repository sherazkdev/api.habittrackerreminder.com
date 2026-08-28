import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api-client";
import { mediaUrl } from "@/lib/media-url";
import { withEnglishCopy } from "@/lib/translations";
import type { Gender, WorkoutCategory } from "@/lib/types";

type WorkoutCategoryDocumentApi = {
  id: number;
  levelIds: number[];
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  imageKey: string | null;
  gender: Gender;
  isChallenge: boolean;
  sortOrder: number;
  isActive: boolean;
  translations?: Partial<Record<string, { name?: string; description?: string | null }>>;
};

export type WorkoutCategoryFormState = {
  name: string;
  slug: string;
  description: string;
  levelIds: string[];
  gender: Gender;
  challenge: boolean;
  sortOrder: string;
  active: boolean;
  image: string | null;
};

export function workoutCategoryDocumentToUi(doc: WorkoutCategoryDocumentApi): WorkoutCategory {
  return {
    id: String(doc.id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? "",
    levelIds: doc.levelIds.map(String),
    gender: doc.gender,
    challenge: doc.isChallenge,
    sortOrder: doc.sortOrder,
    active: doc.isActive,
    image: doc.image,
    exercisesCount: 0,
    translations: doc.translations,
  };
}

export function workoutCategoryFormToApiPayload(
  form: WorkoutCategoryFormState,
  translations?: WorkoutCategory["translations"],
) {
  return {
    levelIds: form.levelIds.map((id) => Number(id)).filter((id) => id > 0),
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: form.description.trim() || null,
    image: mediaUrl(form.image),
    gender: form.gender,
    isChallenge: form.challenge,
    sortOrder: Math.max(0, Math.round(Number(form.sortOrder) || 0)),
    isActive: form.active,
    translations: withEnglishCopy(translations, {
      name: form.name.trim(),
      description: form.description.trim() || null,
    }),
  };
}

export function validateWorkoutCategoryForm(form: WorkoutCategoryFormState) {
  const errors: Partial<Record<string, string>> = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.slug.trim()) errors.slug = "Slug is required";
  if (form.levelIds.length === 0) errors.levelIds = "Select at least one workout level";
  return errors;
}

export async function fetchWorkoutCategoriesAdmin(): Promise<WorkoutCategory[]> {
  const data = await apiGet<{ items: WorkoutCategoryDocumentApi[]; total: number }>(
    "/api/admin/workout-categories",
  );
  return data.items.map(workoutCategoryDocumentToUi);
}

export async function fetchWorkoutCategory(id: string) {
  return apiGet<WorkoutCategoryDocumentApi>(`/api/admin/workout-categories/${id}`);
}

export async function createWorkoutCategory(payload: ReturnType<typeof workoutCategoryFormToApiPayload>) {
  return apiPost<WorkoutCategoryDocumentApi>("/api/admin/workout-categories", payload);
}

export async function updateWorkoutCategory(
  id: string,
  payload: ReturnType<typeof workoutCategoryFormToApiPayload>,
) {
  return apiPut<WorkoutCategoryDocumentApi>(`/api/admin/workout-categories/${id}`, payload);
}

export async function deleteWorkoutCategory(id: string) {
  return apiDelete<{ id: number }>(`/api/admin/workout-categories/${id}`);
}
