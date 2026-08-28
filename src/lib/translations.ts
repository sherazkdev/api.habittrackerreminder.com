import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale, type LocaleMap } from "@/lib/locales";

export function snapshotLocale<T>(map: LocaleMap<T>, locale: Locale, copy: T): LocaleMap<T> {
  return { ...map, [locale]: copy };
}

/** Always persist English copy; drop empty/unknown locales before save. */
export function withEnglishCopy<T>(
  map: Partial<Record<string, unknown>> | undefined,
  english: T,
): LocaleMap<T> {
  const next: LocaleMap<T> = { [DEFAULT_LOCALE]: english };
  if (!map) return next;
  for (const locale of SUPPORTED_LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    const value = map[locale];
    if (value) next[locale] = value as T;
  }
  return next;
}
