export const SUPPORTED_LOCALES = [
  "en",
  "bn",
  "de",
  "es",
  "fr",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "ms",
  "pt",
  "ru",
  "tr",
  "zh",
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  bn: "বাংলা",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  hi: "हिन्दी",
  id: "Indonesia",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  ms: "Melayu",
  pt: "Português",
  ru: "Русский",
  tr: "Türkçe",
  zh: "中文",
};

export type LocaleMap<T> = Partial<Record<Locale, T>>;

export type NamedCopy = {
  name: string;
  description: string;
};

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
