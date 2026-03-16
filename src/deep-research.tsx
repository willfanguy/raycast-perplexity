import { Action, ActionPanel, Detail, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getPrefs, streamChat } from "./lib/perplexity";
import { saveHistoryEntry } from "./lib/history";

function ResearchView({ query }: { query: string }) {
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("Starting deep research...");
  const finalAnswer = useRef("");
  const wordCount = useRef(0);
  const { saveHistory } = getPrefs();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deep Research",
        message: "Searching across the web...",
      });

      try {
        const stream = streamChat({
          model: "sonar-deep-research",
          messages: [
            {
              role: "system",
              content:
                "You are a thorough research assistant. Provide comprehensive, well-structured reports with clear sections, key findings, and detailed analysis. Use markdown formatting.",
            },
            { role: "user", content: query },
          ],
        });

        let chunkCount = 0;

        for await (const chunk of stream) {
          if (cancelled) return;

          if (chunk.delta) {
            finalAnswer.current += chunk.delta;
            wordCount.current = finalAnswer.current.split(/\s+/).length;
            setAnswer(finalAnswer.current);

            chunkCount++;
            if (chunkCount % 20 === 0) {
              setStatusMsg(`Researching... (~${wordCount.current} words)`);
              toast.message = `~${wordCount.current} words compiled`;
            }
          }
          if (chunk.citations?.length) {
            setCitations(chunk.citations);
          }
        }

        toast.style = Toast.Style.Success;
        toast.title = "Research Complete";
        toast.message = `${wordCount.current} words · ${citations.length} sources`;

        if (saveHistory && finalAnswer.current) {
          await saveHistoryEntry({
            query,
            answer: finalAnswer.current,
            citations,
            model: "sonar-deep-research",
          });
        }
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = "Research Failed";
        toast.message = e instanceof Error ? e.message : "Unknown error";
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
      ? "\n\n---\n## Sources\n" + citations.map((url, i) => `${i + 1}. [${url}](${url})`).join("\n")
      : "";

  const loadingMd = isLoading
    ? `> **${statusMsg}**\n\n---\n\n`
    : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={loadingMd + (answer || "") + citationsMd}
      navigationTitle={`Deep Research: ${query}`}
      metadata={
        citations.length > 0 ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Model" text="Sonar Deep Research" />
            <Detail.Metadata.Label title="Word Count" text={`~${wordCount.current}`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Sources" text={`${citations.length} citations`} />
            {citations.slice(0, 10).map((url, i) => {
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
          <Action.CopyToClipboard title="Copy Report" content={answer} />
          <Action.CopyToClipboard
            title="Copy Report with Sources"
            content={answer + citationsMd}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Sources Only"
            content={citations.join("\n")}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function DeepResearch() {
  const { push } = useNavigation();

  async function handleSubmit(values: Form.Values) {
    if (!values.query?.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a research topic" });
      return;
    }
    push(<ResearchView query={values.query} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Deep Research" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="query"
        title="Research Topic"
        placeholder="What do you want to research in depth?"
        autoFocus
      />
      <Form.Description
        title="About Deep Research"
        text="Uses Sonar Deep Research to conduct exhaustive multi-source research and generate a comprehensive report. May take 30–90 seconds."
      />
    </Form>
  );
}
