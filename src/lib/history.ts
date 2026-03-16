import { LocalStorage } from "@raycast/api";

export interface HistoryEntry {
  id: string;
  query: string;
  answer: string;
  citations: string[];
  model: string;
  createdAt: string;
}

const STORAGE_KEY = "perplexity_history";
const MAX_ENTRIES = 100;

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function saveHistoryEntry(entry: Omit<HistoryEntry, "id" | "createdAt">): Promise<void> {
  const history = await loadHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  const trimmed = [newEntry, ...history].slice(0, MAX_ENTRIES);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const history = await loadHistory();
  const filtered = history.filter((e) => e.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
