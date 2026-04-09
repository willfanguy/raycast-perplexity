# Raycast Perplexity

A Raycast extension for Perplexity AI with streaming answers, citations, Deep Research, and conversation history.

## Features

- **Ask Perplexity** — streaming Q&A with domain and recency filters
- **Deep Research** — exhaustive reports via Sonar Deep Research (30-90s)
- **Web Search** — raw ranked search results with recency filtering
- **Ask About Selection** — grab selected text, get answer copied to clipboard
- **Search History** — browse past Q&A pairs

## Installation

```bash
git clone https://github.com/willfanguy/raycast-perplexity.git
cd raycast-perplexity
npm install
npm run dev
```

Requires Raycast 1.26.0+ and Node.js 22+.

## Configuration

Open Raycast extension preferences to set:

- **API Key** — from [perplexity.ai/settings/api](https://perplexity.ai/settings/api) (stored in Raycast Keychain)
- **Default Model** — sonar, sonar-pro, or sonar-reasoning-pro
- **Save History** — toggle LocalStorage persistence

## Models

| Model | Best for |
|-------|----------|
| `sonar` | Fast factual Q&A |
| `sonar-pro` | General search (default) |
| `sonar-reasoning-pro` | Chain-of-thought problems |
| `sonar-deep-research` | Exhaustive reports |

## Development

```bash
npm run dev      # dev mode with hot reload
npm run build    # production build
npm run lint     # ESLint
```

## License

MIT
