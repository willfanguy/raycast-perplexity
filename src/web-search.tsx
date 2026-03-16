import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { webSearch, SearchResult } from "./lib/perplexity";

const RECENCY_OPTIONS = [
  { label: "Any time", value: "" },
  { label: "Past hour", value: "hour" },
  { label: "Past day", value: "day" },
  { label: "Past week", value: "week" },
  { label: "Past month", value: "month" },
];

export default function WebSearch() {
  const [query, setQuery] = useState("");
  const [recency, setRecency] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const { data: results, isLoading } = usePromise(
    async (q: string, r: string) => {
      if (!q.trim()) return [];
      try {
        return await webSearch([q], { recency: r || undefined });
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: e instanceof Error ? e.message : "Unknown error",
        });
        return [];
      }
    },
    [submittedQuery, recency],
    { execute: !!submittedQuery }
  );

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search the web via Perplexity..."
      searchBarAccessory={
        <List.Dropdown tooltip="Recency Filter" onChange={setRecency}>
          {RECENCY_OPTIONS.map((opt) => (
            <List.Dropdown.Item key={opt.value} title={opt.label} value={opt.value} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Search"
            icon={Icon.MagnifyingGlass}
            onAction={() => setSubmittedQuery(query)}
            shortcut={{ modifiers: [], key: "return" }}
          />
        </ActionPanel>
      }
    >
      {!submittedQuery ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Perplexity"
          description="Type your query and press Enter"
        />
      ) : !results?.length && !isLoading ? (
        <List.EmptyView icon={Icon.XMarkCircle} title="No results" description="Try a different query" />
      ) : (
        <List.Section title={`Results for "${submittedQuery}"`} subtitle={`${results?.length ?? 0} found`}>
          {(results ?? []).map((result: SearchResult, i: number) => {
            let hostname = result.url;
            try {
              hostname = new URL(result.url).hostname.replace("www.", "");
            } catch {}

            return (
              <List.Item
                key={i}
                icon={Icon.Globe}
                title={result.title || result.url}
                subtitle={hostname}
                accessories={result.date ? [{ text: result.date }] : []}
                detail={
                  result.snippet ? (
                    <List.Item.Detail markdown={result.snippet} />
                  ) : undefined
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Browser" url={result.url} />
                    <Action.CopyToClipboard
                      title="Copy URL"
                      content={result.url}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Title + URL"
                      content={`${result.title}\n${result.url}`}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
