export interface SourceConfig {
  label: string;
  url: string;
}

export interface AppSettings {
  recommendedSources: SourceConfig[];
  selectedRecommendedSourceUrls: string[];
  showRecommendedSources: boolean;
  enableHistory: boolean;
  showAnalysis: boolean;
}

export const SETTINGS_STORAGE_KEY = 'porsuk-app-settings';
export const HISTORY_STORAGE_KEY = 'porsuk-url-history';
const DEPRECATED_SOURCE_URLS = new Set<string>();

export const DEFAULT_SOURCES: SourceConfig[] = [
  { label: 'TechCrunch', url: 'https://techcrunch.com/' },
  { label: 'The Verge', url: 'https://www.theverge.com/tech' },
  { label: 'Wired', url: 'https://www.wired.com/' },
  { label: 'Webrazzi', url: 'https://webrazzi.com/' },
  { label: 'ShiftDelete', url: 'https://shiftdelete.net/' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  recommendedSources: DEFAULT_SOURCES,
  selectedRecommendedSourceUrls: [],
  showRecommendedSources: true,
  enableHistory: true,
  showAnalysis: true,
};

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function sanitizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
  const candidate = value as Partial<AppSettings>;

  const recommendedSources = Array.isArray(candidate.recommendedSources)
    ? candidate.recommendedSources
        .filter((item): item is SourceConfig => {
          return Boolean(
            item &&
              typeof item === 'object' &&
              typeof item.label === 'string' &&
              typeof item.url === 'string' &&
              item.label.trim() &&
              item.url.trim()
          );
        })
        .map((item) => ({
          label: item.label.trim().slice(0, 40),
          url: normalizeUrl(item.url.trim()),
        }))
        .filter((item) => item.url && !DEPRECATED_SOURCE_URLS.has(item.url))
    : DEFAULT_SOURCES;

  const allowedSourceSet = new Set(recommendedSources.map((source) => source.url));
  const selectedRecommendedSourceUrls = Array.isArray(candidate.selectedRecommendedSourceUrls)
    ? candidate.selectedRecommendedSourceUrls
        .filter((url): url is string => typeof url === 'string' && allowedSourceSet.has(url))
    : [];

  return {
    recommendedSources: recommendedSources.length ? recommendedSources : DEFAULT_SOURCES,
    selectedRecommendedSourceUrls,
    showRecommendedSources: candidate.showRecommendedSources ?? true,
    enableHistory: candidate.enableHistory ?? true,
    showAnalysis: candidate.showAnalysis ?? true,
  };
}

export function loadSettingsFromStorage(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettingsToStorage(settings: AppSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function readHistoryFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
  } catch {
    return [];
  }
}

export function saveHistoryToStorage(history: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

export function clearHistoryInStorage() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
}
