# raycast-perplexity

Raycast extension for Perplexity AI. Full-featured: streaming answers, citations, domain/recency filters, Deep Research, raw web search, conversation history.

## Commands

- **Ask Perplexity** (`quick-ask`) — streaming Q&A with Sonar/Sonar Pro/Sonar Reasoning Pro; domain + recency filters
- **Deep Research** (`deep-research`) — Sonar Deep Research with live progress; takes 30–90s
- **Web Search** (`web-search`) — raw ranked results via Perplexity Search API; recency dropdown
- **Ask About Selection** (`ask-selection`) — no-view: grabs selected text, copies answer to clipboard
- **Search History** (`history`) — browse past Q&A pairs stored in LocalStorage

## Development

```bash
npm install
npm run dev      # dev mode with hot reload in Raycast
npm run build    # production build
npm run lint     # ESLint
```

Requires Raycast 1.26.0+, Node.js 22+.

## Preferences

- **API Key** — from perplexity.ai/settings/api (stored securely in Raycast Keychain)
- **Default Model** — sonar | sonar-pro | sonar-reasoning-pro
- **Save History** — toggle LocalStorage persistence

## Key Files

- `src/lib/perplexity.ts` — streaming chat client + Search API wrapper
- `src/lib/history.ts` — LocalStorage CRUD for history entries
- `src/quick-ask.tsx` — main command: Form → streamed Detail with citation sidebar
- `src/deep-research.tsx` — long-running research with animated Toast progress
- `src/web-search.tsx` — List with recency Dropdown; usePromise for async search
- `src/ask-selection.tsx` — no-view command using getSelectedText + showHUD

## Perplexity Models

| Model | Use case |
|---|---|
| `sonar` | Fast factual Q&A |
| `sonar-pro` | Best general search |
| `sonar-reasoning-pro` | Chain-of-thought problems |
| `sonar-deep-research` | Exhaustive reports (slow) |

## Publishing to Raycast Store

When ready to share publicly:
1. Add a real 512x512 PNG icon as `assets/perplexity-logo.png`
2. Run `npm run publish` (requires Raycast developer account)
3. Or submit PR to github.com/raycast/extensions
