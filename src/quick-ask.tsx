import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getPrefs, streamChat, PerplexityModel, Message } from "./lib/perplexity";
import { saveHistoryEntry } from "./lib/history";

type RecencyFilter = "" | "hour" | "day" | "week" | "month";

interface ConversationConfig {
  model: PerplexityModel;
  recency: RecencyFilter;
  domainFilter: string;
}

// ─── Follow-up form ────────────────────────────────────────────────────────

function FollowUpForm({
  messages,
  config,
}: {
  messages: Message[];
  config: ConversationConfig;
}) {
  const { push } = useNavigation();

  function handleSubmit(values: Form.Values) {
    if (!values.followUp?.trim()) return;
    const updated: Message[] = [...messages, { role: "user", content: values.followUp }];
    push(<AnswerView messages={updated} config={config} />);
  }

  const turnCount = messages.filter((m) => m.role === "user").length;

  return (
    <Form
      navigationTitle={`Follow-up (turn ${turnCount + 1})`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.ArrowRight} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="followUp"
        title="Follow-up"
        placeholder="Ask a follow-up question..."
        autoFocus
      />
      <Form.Description
        title="Conversation context"
        text={`${turnCount} turn${turnCount !== 1 ? "s" : ""} so far · Model: ${config.model}`}
      />
    </Form>
  );
}

// ─── Answer view ───────────────────────────────────────────────────────────

function AnswerView({
  messages,
  config,
}: {
  messages: Message[];
  config: ConversationConfig;
}) {
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const finalAnswer = useRef("");
  const { push } = useNavigation();
  const { saveHistory } = getPrefs();

  const currentQuery = messages[messages.length - 1]?.content ?? "";
  const priorTurns = messages.slice(0, -1); // everything before the current user message

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const domains = config.domainFilter
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);

        const stream = streamChat({
          model: config.model,
          messages,
          ...(config.recency ? { search_recency_filter: config.recency } : {}),
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
            query: currentQuery,
            answer: finalAnswer.current,
            citations,
            model: config.model,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, []);

  // Build conversation thread for display
  const threadMd = buildThreadMarkdown(priorTurns);

  const citationsMd =
    citations.length > 0
      ? "\n\n---\n**Sources**\n" +
        citations.map((url, i) => `${i + 1}. [${url}](${url})`).join("\n")
      : "";

  const loadingIndicator = isLoading ? "\n\n_Searching the web..._" : "";
  const currentAnswerMd = answer || (error ? `**Error:** ${error}` : "");
  const turnCount = messages.filter((m) => m.role === "user").length;

  const fullMd =
    threadMd +
    `**${escapeMarkdown(currentQuery)}**\n\n` +
    currentAnswerMd +
    loadingIndicator +
    citationsMd;

  // Build updated messages with assistant reply for follow-up
  function getUpdatedMessages(): Message[] {
    return [...messages, { role: "assistant", content: finalAnswer.current }];
  }

  const modelLabel: Record<PerplexityModel, string> = {
    sonar: "Sonar",
    "sonar-pro": "Sonar Pro",
    "sonar-reasoning-pro": "Sonar Reasoning Pro",
    "sonar-deep-research": "Sonar Deep Research",
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={fullMd}
      navigationTitle={currentQuery.slice(0, 60)}
      metadata={
        citations.length > 0 ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Model" text={modelLabel[config.model]} />
            <Detail.Metadata.Label title="Turn" text={`${turnCount}`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Sources" text={`${citations.length}`} />
            {citations.slice(0, 8).map((url, i) => {
              let hostname = url;
              try { hostname = new URL(url).hostname.replace("www.", ""); } catch {}
              return (
                <Detail.Metadata.Link key={i} title={`[${i + 1}]`} target={url} text={hostname} />
              );
            })}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Ask Follow-up"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => {
              if (isLoading) {
                showToast({ style: Toast.Style.Failure, title: "Wait for the answer to finish" });
                return;
              }
              push(<FollowUpForm messages={getUpdatedMessages()} config={config} />);
            }}
          />
          <Action.CopyToClipboard
            title="Copy Answer"
            content={answer}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Answer + Sources"
            content={answer + citationsMd}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Full Conversation"
            content={buildPlainTextThread(getUpdatedMessages())}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildThreadMarkdown(messages: Message[]): string {
  if (messages.length === 0) return "";
  let md = "";
  for (let i = 0; i < messages.length - 1; i += 2) {
    const userMsg = messages[i];
    const assistantMsg = messages[i + 1];
    if (userMsg?.role === "user") {
      md += `**${escapeMarkdown(userMsg.content)}**\n\n`;
    }
    if (assistantMsg?.role === "assistant") {
      md += `${assistantMsg.content}\n\n---\n\n`;
    }
  }
  return md;
}

function buildPlainTextThread(messages: Message[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "Q" : "A"}: ${m.content}`)
    .join("\n\n");
}

function escapeMarkdown(text: string): string {
  return text.replace(/[[\]()#*_`>]/g, "\\$&");
}

// ─── Entry point ───────────────────────────────────────────────────────────

export default function QuickAsk() {
  const { defaultModel } = getPrefs();
  const [model, setModel] = useState<PerplexityModel>(defaultModel);
  const { push } = useNavigation();

  function handleSubmit(values: Form.Values) {
    if (!values.query?.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Enter a question" });
      return;
    }
    const config: ConversationConfig = {
      model: values.model as PerplexityModel,
      recency: values.recency as RecencyFilter,
      domainFilter: values.domainFilter || "",
    };
    const messages: Message[] = [{ role: "user", content: values.query }];
    push(<AnswerView messages={messages} config={config} />);
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
      <Form.Dropdown
        id="model"
        title="Model"
        value={model}
        onChange={(v) => setModel(v as PerplexityModel)}
      >
        <Form.Dropdown.Item title="Sonar (Fast)" value="sonar" />
        <Form.Dropdown.Item title="Sonar Pro (Best)" value="sonar-pro" />
        <Form.Dropdown.Item title="Sonar Reasoning Pro (Chain of Thought)" value="sonar-reasoning-pro" />
      </Form.Dropdown>
      <Form.Dropdown id="recency" title="Recency" defaultValue="">
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
