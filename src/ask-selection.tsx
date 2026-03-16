import { Clipboard, Toast, getSelectedText, showHUD, showToast } from "@raycast/api";
import { getPrefs, streamChat } from "./lib/perplexity";
import { saveHistoryEntry } from "./lib/history";

export default async function AskSelection() {
  let selectedText = "";

  try {
    selectedText = await getSelectedText();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text selected",
      message: "Select some text first, then run this command",
    });
    return;
  }

  if (!selectedText.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "Selected text is empty" });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Asking Perplexity...",
    message: selectedText.slice(0, 60) + (selectedText.length > 60 ? "..." : ""),
  });

  const { defaultModel, saveHistory } = getPrefs();

  let answer = "";
  let citations: string[] = [];

  try {
    const stream = streamChat({
      model: defaultModel,
      messages: [
        {
          role: "system",
          content: "Answer concisely and accurately. If the text is a question, answer it. If it's a topic, summarize the key facts.",
        },
        { role: "user", content: selectedText },
      ],
    });

    for await (const chunk of stream) {
      if (chunk.delta) answer += chunk.delta;
      if (chunk.citations?.length) citations = chunk.citations;
    }

    await Clipboard.copy(answer);

    if (saveHistory && answer) {
      await saveHistoryEntry({ query: selectedText, answer, citations, model: defaultModel });
    }

    await showHUD(`✓ Answer copied to clipboard`);
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = e instanceof Error ? e.message : "Unknown error";
  }
}
