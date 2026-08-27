# Docker deployment

iNeedRouter ships a `Dockerfile` that builds the Next.js server + routing engine from source.

## Compose (recommended)

```bash
cp .env.example .env    # review the env contract first
docker compose up -d
```

- Dashboard: `http://localhost:20128/dashboard`
- Endpoint: `http://localhost:20128/v1/...`
- Headroom proxy (optional companion) is included in `docker-compose.yml`.

## Manual build

```bash
docker build -t ineedrouter .
docker run -d --name ineedrouter \
  -p 20128:20128 \
  --env-file .env \
  -v ineedrouter-data:/app/data \
  ineedrouter
```

## Data directory

All state (SQLite DB, usage logs, OAuth tokens) lives under `DATA_DIR` inside the container (`/app/data` by default). Mount a volume so data survives upgrades:

```bash
-v ineedrouter-data:/app/data
```

On the host (non-Docker) the default remains `~/.9router` for compatibility with existing installations; `DATA_DIR` overrides it.

## Environment

See [.env.example](.env.example) for the full contract. Highlights:

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port (default `20128`) |
| `DATA_DIR` | Persistent state directory |
| `JWT_SECRET` | Session cookie signing secret |
| `INITIAL_PASSWORD` | First admin password — **must override `123456`** |
| `API_KEY_SECRET` | Secret for API key derivation |
| `CLOUD_URL` / `NEXT_PUBLIC_CLOUD_URL` | Public base URL shown in the UI (e.g. your tunnel/domain) |

## Upgrades

```bash
docker compose pull      # only if you switch to a registry image
docker compose up -d --build
```

The SQLite schema migrates automatically on first start.
