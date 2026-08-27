# iNeedRouter

**Multi-provider AI gateway with a reseller-ready dashboard** — one OpenAI/Anthropic-compatible endpoint that routes traffic across 40+ upstream providers with automatic fallback, plus a full operator dashboard for keys, models, usage, and routing policies.

iNeedRouter is a maintained fork of [9router](https://github.com/decolua/9router) (MIT). The complete 9router feature set is preserved; iNeedRouter adds operator branding, the iNeed design system, and a reseller layer on top.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Highlights

- **One endpoint, many providers** — `POST /v1/chat/completions` (OpenAI format), `POST /v1/messages` (Anthropic format), plus image, TTS, STT, embeddings, web search, web fetch, and video generation.
- **Automatic fallback** — model combos and multi-account fallback keep requests alive when an upstream fails.
- **Format translation** — requests pivot through OpenAI as the intermediate format, with direct routes for fragile pairs (thinking blocks, tool IDs, protobuf upstreams).
- **OAuth + API key credentials** — token refresh, quota tracking, and per-account management built in.
- **Operator dashboard** — providers, combos, keys, usage analytics, routing policies, CLI-tool one-click setup, agent skills, and more.
- **Token saver (RTK)** — pre-translate hooks compress large `tool_result` payloads to cut token spend; fail-open by design.
- **iNeed design system** — the lavender/indigo/emerald editorial UI from [ineed.web.id](https://ineed.web.id).

## Quick start (source)

```bash
cp .env.example .env
npm install
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev    # dev
npm run build && PORT=20128 HOSTNAME=0.0.0.0 npm run start            # production
```

Dashboard: `http://localhost:20128/dashboard` — default admin password is `123456` (override with `INITIAL_PASSWORD`); change it right away.

Endpoint: `http://localhost:20128/v1/...`

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up -d        # builds the image from source
```

Data lives in the `ineedrouter-data` volume (`DATA_DIR=/app/data`). See [DOCKER.md](DOCKER.md).

## CLI launcher

```bash
npm install -g ineedrouter   # after publishing, or use npx from a checkout
ineedrouter
```

The CLI starts the server in the background, manages the system tray, and keeps the runtime self-healing. The app dashboard's "Check for updates" flow updates from this repository.

## Agent skills

Copy-paste skill files let any AI agent use the gateway directly — chat, image, TTS, STT, embeddings, video, web search, web fetch. Open **Dashboard → Skills** for the raw URLs, or browse [`skills/`](skills/README.md).

## Data & persistence

State is SQLite (driver chain: `bun:sqlite` → `better-sqlite3` → `node:sqlite` → `sql.js` fallback). The data directory resolves via `DATA_DIR`, defaulting to `~/.9router` for compatibility with existing installations.

## Security

- Derives client IP from the TCP socket; `X-Forwarded-For` is trusted only from a loopback reverse proxy.
- Sensitive env: `JWT_SECRET`, `INITIAL_PASSWORD` (default `123456` — must override), `API_KEY_SECRET`, `MACHINE_ID_SALT`. See [.env.example](.env.example) for the full contract.

## Documentation

- [DOCKER.md](DOCKER.md) — Docker deployment
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — request lifecycle, fallback, OAuth, data model
- [CHANGELOG.md](CHANGELOG.md) — release history (upstream history preserved)

## License

[MIT](LICENSE) — inherits 9router by decolua and contributors.
