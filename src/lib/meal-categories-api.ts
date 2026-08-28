import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api-client";
import { isValidMediaUrl, mediaUrl } from "@/lib/media-url";
import type { MealCategory } from "@/lib/types";

type MealCategoryDocumentApi = {
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

export type MealCategoryFormState = {
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  sortOrder: string;
  active: boolean;
  image: string | null;
};

export function mealCategoryDocumentToUi(doc: MealCategoryDocumentApi): MealCategory {
  return {
    id: String(doc.id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? "",
    icon: doc.icon ?? null,
    sortOrder: doc.sortOrder,
    active: doc.isActive,
    image: doc.image,
    mealsCount: 0,
    translations: doc.translations,
  };
}

export function mealCategoryFormToApiPayload(form: MealCategoryFormState) {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: form.description.trim() || null,
    icon: form.icon?.trim() || null,
    image: mediaUrl(form.image),
    sortOrder: Math.max(0, Math.round(Number(form.sortOrder) || 0)),
    isActive: form.active,
  };
}

export function validateMealCategoryForm(form: MealCategoryFormState): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.slug.trim()) errors.slug = "Slug is required";
  const image = form.image?.trim();
  if (image && !isValidMediaUrl(image)) {
    errors.image = "Image URL must be a valid http(s) link";
  }
  return errors;
}

export async function fetchMealCategoriesAdmin(): Promise<MealCategory[]> {
  const data = await apiGet<{ items: MealCategoryDocumentApi[] }>("/api/admin/meal-categories");
  return (data.items ?? []).map(mealCategoryDocumentToUi);
}

export async function fetchMealCategory(id: string): Promise<MealCategoryDocumentApi> {
  return apiGet<MealCategoryDocumentApi>(`/api/admin/meal-categories/${id}`);
}

export async function createMealCategory(payload: ReturnType<typeof mealCategoryFormToApiPayload>) {
  return apiPost<MealCategoryDocumentApi>("/api/admin/meal-categories", payload);
}

export async function updateMealCategory(
  id: string,
  payload: ReturnType<typeof mealCategoryFormToApiPayload>,
) {
  return apiPut<MealCategoryDocumentApi>(`/api/admin/meal-categories/${id}`, payload);
}

export async function deleteMealCategory(id: string) {
  return apiDelete<{ id: number }>(`/api/admin/meal-categories/${id}`);
}
