import { getPreferenceValues } from "@raycast/api";

const BASE_URL = "https://api.perplexity.ai";

export type PerplexityModel =
  | "sonar"
  | "sonar-pro"
  | "sonar-reasoning-pro"
  | "sonar-deep-research";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  model: PerplexityModel;
  messages: Message[];
  search_recency_filter?: "hour" | "day" | "week" | "month";
  search_domain_filter?: string[];
  temperature?: number;
}

export interface StreamChunk {
  delta: string;
  citations?: string[];
  done: boolean;
}

interface Preferences {
  apiKey: string;
  defaultModel: PerplexityModel;
  saveHistory: boolean;
}

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export async function* streamChat(options: StreamOptions): AsyncGenerator<StreamChunk> {
  const { apiKey } = getPrefs();

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
      ...(options.search_recency_filter && {
        search_recency_filter: options.search_recency_filter,
      }),
      ...(options.search_domain_filter?.length && {
        search_domain_filter: options.search_domain_filter,
      }),
      ...(options.temperature !== undefined && { temperature: options.temperature }),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Perplexity API error ${response.status}: ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let latestCitations: string[] | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") {
        yield { delta: "", citations: latestCitations, done: true };
        return;
      }

      try {
        const json = JSON.parse(raw);
        const delta: string = json.choices?.[0]?.delta?.content ?? "";
        const citations: string[] | undefined = json.citations;

        if (citations) latestCitations = citations;
        if (delta) yield { delta, citations: latestCitations, done: false };
      } catch {
        // malformed SSE line, skip
      }
    }
  }

  yield { delta: "", citations: latestCitations, done: true };
}

export interface SearchResult {
  title: string;
  url: string;
  date?: string;
  snippet?: string;
}

export async function webSearch(
  queries: string[],
  options: { recency?: string; domains?: string[] } = {}
): Promise<SearchResult[]> {
  const { apiKey } = getPrefs();

  const response = await fetch(`${BASE_URL}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: queries,
      ...(options.recency && { search_recency_filter: options.recency }),
      ...(options.domains?.length && { search_domain_filter: options.domains }),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Perplexity Search API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as { results?: SearchResult[] };
  return data.results ?? [];
}
