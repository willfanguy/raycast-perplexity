import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { HistoryEntry, clearHistory, deleteHistoryEntry, loadHistory } from "./lib/history";
import { Detail } from "@raycast/api";

const MODEL_COLORS: Record<string, Color> = {
  sonar: Color.Blue,
  "sonar-pro": Color.Purple,
  "sonar-reasoning-pro": Color.Orange,
  "sonar-deep-research": Color.Green,
};

function EntryDetail({ entry }: { entry: HistoryEntry }) {
  const citationsMd =
    entry.citations.length > 0
      ? "\n\n---\n**Sources**\n" + entry.citations.map((url, i) => `${i + 1}. [${url}](${url})`).join("\n")
      : "";

  return (
    <Detail
      markdown={`# ${entry.query}\n\n${entry.answer}${citationsMd}`}
      navigationTitle={entry.query}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Model" text={entry.model} />
          <Detail.Metadata.Label
            title="Date"
            text={new Date(entry.createdAt).toLocaleString()}
          />
          {entry.citations.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Sources" text={`${entry.citations.length}`} />
              {entry.citations.slice(0, 8).map((url, i) => {
                let hostname = url;
                try {
                  hostname = new URL(url).hostname.replace("www.", "");
                } catch {}
                return <Detail.Metadata.Link key={i} title={`[${i + 1}]`} target={url} text={hostname} />;
              })}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={entry.answer} />
          <Action.CopyToClipboard
            title="Copy Question"
            content={entry.query}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function History() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function load() {
    const data = await loadHistory();
    setEntries(data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    await deleteHistoryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await showToast({ style: Toast.Style.Success, title: "Deleted" });
  }

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "This will permanently delete all saved searches. Are you sure?",
      primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await clearHistory();
      setEntries([]);
      await showToast({ style: Toast.Style.Success, title: "History cleared" });
    }
  }

  const grouped = entries.reduce<Record<string, HistoryEntry[]>>((acc, entry) => {
    const date = new Date(entry.createdAt).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  return (
    <List isLoading={isLoading} navigationTitle="Search History">
      {entries.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No history yet"
          description="Your searches will appear here"
        />
      ) : (
        <>
          {Object.entries(grouped).map(([date, dayEntries]) => (
            <List.Section key={date} title={date} subtitle={`${dayEntries.length} searches`}>
              {dayEntries.map((entry) => (
                <List.Item
                  key={entry.id}
                  icon={{ source: Icon.Bubble, tintColor: MODEL_COLORS[entry.model] ?? Color.SecondaryText }}
                  title={entry.query}
                  subtitle={entry.answer.slice(0, 80).replace(/\n/g, " ") + "..."}
                  accessories={[
                    { tag: { value: entry.model, color: MODEL_COLORS[entry.model] ?? Color.SecondaryText } },
                    { text: new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="View Answer"
                        icon={Icon.Eye}
                        onAction={() => push(<EntryDetail entry={entry} />)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Answer"
                        content={entry.answer}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Question"
                        content={entry.query}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      <Action
                        title="Delete Entry"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={() => handleDelete(entry.id)}
                      />
                      <Action
                        title="Clear All History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                        onAction={handleClearAll}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}
