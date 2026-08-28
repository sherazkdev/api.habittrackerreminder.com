import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api-client";
import { mediaUrl } from "@/lib/media-url";
import { withEnglishCopy } from "@/lib/translations";
import type { WorkoutLevel } from "@/lib/types";

type WorkoutLevelDocumentApi = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  imageKey: string | null;
  sortOrder: number;
  isActive: boolean;
  translations?: Partial<Record<string, { name?: string; description?: string | null }>>;
};

export type WorkoutLevelFormState = {
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  active: boolean;
  image: string | null;
};

export function workoutLevelDocumentToUi(doc: WorkoutLevelDocumentApi): WorkoutLevel {
  return {
    id: String(doc.id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? "",
    sortOrder: doc.sortOrder,
    active: doc.isActive,
    image: doc.image,
    translations: doc.translations,
  };
}

export function workoutLevelFormToApiPayload(
  form: WorkoutLevelFormState,
  translations?: WorkoutLevel["translations"],
) {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: form.description.trim() || null,
    image: mediaUrl(form.image),
    sortOrder: Math.max(0, Math.round(Number(form.sortOrder) || 0)),
    isActive: form.active,
    translations: withEnglishCopy(translations, {
      name: form.name.trim(),
      description: form.description.trim() || null,
    }),
  };
}

export function validateWorkoutLevelForm(form: WorkoutLevelFormState) {
  const errors: Partial<Record<string, string>> = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.slug.trim()) errors.slug = "Slug is required";
  return errors;
}

export async function fetchWorkoutLevelsAdmin(): Promise<WorkoutLevel[]> {
  const data = await apiGet<{ items: WorkoutLevelDocumentApi[] }>("/api/admin/workout-levels");
  return data.items.map(workoutLevelDocumentToUi);
}

export async function fetchWorkoutLevel(id: string) {
  return apiGet<WorkoutLevelDocumentApi>(`/api/admin/workout-levels/${id}`);
}

export async function createWorkoutLevel(payload: ReturnType<typeof workoutLevelFormToApiPayload>) {
  return apiPost<WorkoutLevelDocumentApi>("/api/admin/workout-levels", payload);
}

export async function updateWorkoutLevel(
  id: string,
  payload: ReturnType<typeof workoutLevelFormToApiPayload>,
) {
  return apiPut<WorkoutLevelDocumentApi>(`/api/admin/workout-levels/${id}`, payload);
}

export async function deleteWorkoutLevel(id: string) {
  return apiDelete<{ id: number }>(`/api/admin/workout-levels/${id}`);
}
