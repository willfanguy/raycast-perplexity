import {
  Action,
  ActionPanel,
  Detail,
  Form,
  List,
  Toast,
  getSelectedText,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getPrefs, streamChat, PerplexityModel } from "./lib/perplexity";
import { saveHistoryEntry } from "./lib/history";

type RecencyFilter = "" | "hour" | "day" | "week" | "month";

function AnswerView({
  query,
  model,
  recency,
  domainFilter,
}: {
  query: string;
  model: PerplexityModel;
  recency: RecencyFilter;
  domainFilter: string;
}) {
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const finalAnswer = useRef("");
  const { saveHistory } = getPrefs();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const domains = domainFilter
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);

        const stream = streamChat({
          model,
          messages: [{ role: "user", content: query }],
          ...(recency ? { search_recency_filter: recency } : {}),
          ...(domains.length ? { search_domain_filter: domains } : {}),
        });

        for await (const chunk of stream) {
          if (cancelled) return;
          if (chunk.delta) {
            finalAnswer.current += chunk.delta;
            setAnswer(finalAnswer.current);
          }
          if (chunk.citations?.length) {
            setCitations(chunk.citations);
          }
        }

        if (saveHistory && finalAnswer.current) {
          await saveHistoryEntry({
            query,
            answer: finalAnswer.current,
            citations: citations,
            model,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const citationsMd =
    citations.length > 0
      ? "\n\n---\n**Sources**\n" + citations.map((url, i) => `${i + 1}. [${url}](${url})`).join("\n")
      : "";

  const modelLabel: Record<PerplexityModel, string> = {
    sonar: "Sonar",
    "sonar-pro": "Sonar Pro",
    "sonar-reasoning-pro": "Sonar Reasoning Pro",
    "sonar-deep-research": "Sonar Deep Research",
  };

  const metadata = isLoading ? "_Searching the web..._\n\n" : "";
  const markdown = metadata + (answer || (error ? `**Error:** ${error}` : ""));

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown + citationsMd}
      navigationTitle={query}
      metadata={
        citations.length > 0 ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Model" text={modelLabel[model]} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Sources" text={`${citations.length} citations`} />
            {citations.slice(0, 8).map((url, i) => {
              let hostname = url;
              try {
                hostname = new URL(url).hostname.replace("www.", "");
              } catch {}
              return <Detail.Metadata.Link key={i} title={`[${i + 1}]`} target={url} text={hostname} />;
            })}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={answer} />
          <Action.CopyToClipboard
            title="Copy with Citations"
            content={answer + citationsMd}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {citations.length > 0 && (
            <Action.CopyToClipboard
              title="Copy Sources"
              content={citations.join("\n")}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function QuickAsk() {
  const { defaultModel } = getPrefs();
  const [query, setQuery] = useState("");
  const [model, setModel] = useState<PerplexityModel>(defaultModel);
  const [recency, setRecency] = useState<RecencyFilter>("");
  const [domainFilter, setDomainFilter] = useState("");
  const { push } = useNavigation();

  async function handleSubmit(values: Form.Values) {
    if (!values.query?.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a question" });
      return;
    }
    push(
      <AnswerView
        query={values.query}
        model={values.model as PerplexityModel}
        recency={values.recency as RecencyFilter}
        domainFilter={values.domainFilter || ""}
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Perplexity" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="query" title="Question" placeholder="Ask anything..." autoFocus />
      <Form.Dropdown id="model" title="Model" value={model} onChange={(v) => setModel(v as PerplexityModel)}>
        <Form.Dropdown.Item title="Sonar (Fast)" value="sonar" />
        <Form.Dropdown.Item title="Sonar Pro (Best)" value="sonar-pro" />
        <Form.Dropdown.Item title="Sonar Reasoning Pro (Chain of Thought)" value="sonar-reasoning-pro" />
      </Form.Dropdown>
      <Form.Dropdown id="recency" title="Recency" value={recency} onChange={(v) => setRecency(v as RecencyFilter)}>
        <Form.Dropdown.Item title="Any time" value="" />
        <Form.Dropdown.Item title="Past hour" value="hour" />
        <Form.Dropdown.Item title="Past day" value="day" />
        <Form.Dropdown.Item title="Past week" value="week" />
        <Form.Dropdown.Item title="Past month" value="month" />
      </Form.Dropdown>
      <Form.TextField
        id="domainFilter"
        title="Domain Filter"
        placeholder="e.g. reddit.com, arxiv.org (comma-separated)"
        info="Restrict search to specific domains"
      />
    </Form>
  );
}
