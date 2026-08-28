import { adminPath } from "./admin-path";

export const DATA_RESOURCE_IDS = [
  "meal-categories",
  "meals",
  "workout-levels",
  "workout-categories",
  "exercises",
] as const;

export type DataResourceId = (typeof DATA_RESOURCE_IDS)[number];

export type DataResourceDef = {
  id: DataResourceId;
  label: string;
  listHref: string;
  createHref: string;
  addLabel: string;
  hasGender: boolean;
  hasCategory: boolean;
  hasWorkoutLevel: boolean;
  hasWorkoutCategory: boolean;
  hasChallenge: boolean;
};

export const DATA_RESOURCES: DataResourceDef[] = [
  {
    id: "meal-categories",
    label: "Meal Categories",
    listHref: adminPath("/meal/categories"),
    createHref: adminPath("/meal/categories/new"),
    addLabel: "Add Category",
    hasGender: false,
    hasCategory: false,
    hasWorkoutLevel: false,
    hasWorkoutCategory: false,
    hasChallenge: false,
  },
  {
    id: "meals",
    label: "Meals",
    listHref: adminPath("/meal/meals"),
    createHref: adminPath("/meal/meals/new"),
    addLabel: "Add Meal",
    hasGender: true,
    hasCategory: true,
    hasWorkoutLevel: false,
    hasWorkoutCategory: false,
    hasChallenge: true,
  },
  {
    id: "workout-levels",
    label: "Workout Levels",
    listHref: adminPath("/workout/levels"),
    createHref: adminPath("/workout/levels/new"),
    addLabel: "Add Level",
    hasGender: false,
    hasCategory: false,
    hasWorkoutLevel: false,
    hasWorkoutCategory: false,
    hasChallenge: false,
  },
  {
    id: "workout-categories",
    label: "Workout Categories",
    listHref: adminPath("/workout/categories"),
    createHref: adminPath("/workout/categories/new"),
    addLabel: "Add Category",
    hasGender: true,
    hasCategory: false,
    hasWorkoutLevel: true,
    hasWorkoutCategory: false,
    hasChallenge: true,
  },
  {
    id: "exercises",
    label: "Exercises",
    listHref: adminPath("/workout/exercises"),
    createHref: adminPath("/workout/exercises/new"),
    addLabel: "Add Exercise",
    hasGender: true,
    hasCategory: false,
    hasWorkoutLevel: true,
    hasWorkoutCategory: true,
    hasChallenge: true,
  },
];

export type ExportColumn = {
  key: string;
  label: string;
};

export const EXPORT_COLUMNS: Record<DataResourceId, ExportColumn[]> = {
  "meal-categories": [
    { key: "id", label: "ID" },
    { key: "name", label: "Title / Name" },
    { key: "slug", label: "Slug" },
    { key: "status", label: "Status" },
    { key: "sortOrder", label: "Sort Order" },
    { key: "created", label: "Created Date" },
  ],
  meals: [
    { key: "id", label: "ID" },
    { key: "title", label: "Title / Name" },
    { key: "status", label: "Status" },
    { key: "gender", label: "Gender" },
    { key: "category", label: "Category" },
    { key: "calories", label: "Calories" },
    { key: "difficulty", label: "Difficulty" },
    { key: "challenge", label: "Challenge" },
    { key: "created", label: "Created Date" },
  ],
  "workout-levels": [
    { key: "id", label: "ID" },
    { key: "name", label: "Title / Name" },
    { key: "slug", label: "Slug" },
    { key: "status", label: "Status" },
    { key: "created", label: "Created Date" },
  ],
  "workout-categories": [
    { key: "id", label: "ID" },
    { key: "name", label: "Title / Name" },
    { key: "status", label: "Status" },
    { key: "gender", label: "Gender" },
    { key: "level", label: "Workout Level" },
    { key: "challenge", label: "Challenge" },
    { key: "created", label: "Created Date" },
  ],
  exercises: [
    { key: "id", label: "ID" },
    { key: "title", label: "Title / Name" },
    { key: "status", label: "Status" },
    { key: "gender", label: "Gender" },
    { key: "level", label: "Workout Level" },
    { key: "category", label: "Workout Category" },
    { key: "difficulty", label: "Difficulty" },
    { key: "duration", label: "Duration" },
    { key: "challenge", label: "Challenge" },
    { key: "created", label: "Created Date" },
  ],
};

export function getDataResource(id: DataResourceId): DataResourceDef {
  return DATA_RESOURCES.find((item) => item.id === id) ?? DATA_RESOURCES[1];
}

export function parseDataResource(value: string | null | undefined): DataResourceId {
  if (value && (DATA_RESOURCE_IDS as readonly string[]).includes(value)) {
    return value as DataResourceId;
  }
  return "meals";
}

export function sampleRawHref(resource: DataResourceId) {
  return `/samples/raw/${resource}.json`;
}

export function sampleCsvHref(resource: DataResourceId) {
  return `/samples/csv/${resource}.csv`;
}

export function dataActionHrefs(resource: DataResourceId) {
  const query = `resource=${resource}`;
  return {
    import: adminPath(`/data/import-csv?${query}`),
    export: adminPath(`/data/export-csv?${query}`),
    raw: adminPath(`/data/raw-upload?${query}`),
  };
}
