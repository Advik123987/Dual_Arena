# Duel Arena

Real-time 1v1 coding/aptitude battle platform, built for **The Zerops
Challenge (WeMakeDevs x Zerops)**.

Two players queue up, get matched, and duel on an AI-generated problem
targeted at both players' tracked weak areas. Submissions are judged live,
an AI commentator narrates the match, and results feed a persistent
leaderboard + per-player weak-spot profile.

## Architecture

| Service | Type              | Role |
|---------|-------------------|------|
| `db`    | `postgresql@14`   | Players, matches, weak-area tracking, leaderboard |
| `cache` | `valkey@7`        | Live duel-room state (timer, submissions) — decouples WS state from a single api process |
| `api`   | `python@3.11`     | FastAPI + WebSocket: matchmaking, problem generation (Groq), live sync, judging, persistence |
| `gui`   | `static@1`        | React + Vite duel UI, built with Node, served static |

```
duel-arena/
├── zerops-project-import.yaml   # import this in Zerops to create all 4 services
├── api/
│   ├── zerops.yaml
│   ├── main.py                  # FastAPI app + /ws/{player_id}
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── config.py            # env-driven settings
│       ├── db.py                # async SQLAlchemy engine/session
│       ├── models.py            # Player, Match
│       ├── schemas.py           # Pydantic request/response models
│       ├── cache.py             # Valkey client (live room state)
│       ├── matchmaking.py       # in-memory waiting queue -> pairs
│       ├── problem_gen.py       # Groq call, 3-model fallback chain
│       ├── judge.py             # mcq/short_answer exact-match + sandboxed code exec
│       ├── commentary.py        # short AI commentary lines
│       ├── websocket_manager.py # ConnectionManager + DuelRoom (timer loop, finalize)
│       └── routers/leaderboard.py  # /api/queue/join, /api/leaderboard, /api/players/:id/profile
└── gui/
    ├── zerops.yaml
    ├── package.json / vite.config.js / index.html
    ├── .env.example
    └── src/
        ├── main.jsx / App.jsx / api.js / styles.css
        └── components/DuelRoom.jsx, Timer.jsx, CommentaryFeed.jsx, Leaderboard.jsx
```

## Duel flow

1. `POST /api/queue/join {nickname}` → gets/creates a `Player` row, enqueues
   them in the in-process matchmaking queue. If this completes a pair, a
   `DuelRoom` is started **in the background** (doesn't block the HTTP
   response on the Groq round trip).
2. Client opens `WS /ws/{player_id}` and sends `{"action": "join_queue"}`.
3. Once the room's problem is generated, both sockets receive `duel_start`
   with the problem (answer/test cases stripped) and a synced duration.
4. `DuelRoom.run()` ticks every second (`tick` events) and fires short
   Groq-generated `commentary` lines at 60s/30s/10s remaining.
5. `submit_answer` → judged via `judge.py` → opponent gets `opponent_progress`;
   on a correct answer (or timeout) the room finalizes: persists the `Match`,
   nudges both players' `weak_areas` (rolling wrong-rate per category used to
   bias future problem generation), updates rating/wins/losses, broadcasts
   `duel_end`.

## Scope decisions flagged for judges

These are deliberate 48h-hackathon trade-offs, not oversights — happy to
walk through the "real" version of each if asked:

- **Judging is constrained to 3 problem types** (`mcq`, `short_answer`,
  `code`) rather than arbitrary free-form code, so grading stays
  deterministic and the code path stays safe to sandbox.
- **The `code` judge is an in-process `exec()` with a locked builtins dict
  and a 3s wall-clock timeout** — not a real subprocess/container sandbox.
  Acceptable for generated, constrained problems in a demo; not safe for
  untrusted production input. A real version would shell out per submission
  (Docker-in-Docker / firecracker).
- **No password auth** — nickname-based identity only, matched to a `Player`
  row by unique nickname. Fine for a live-judging demo, not for a public
  product.
- **Matchmaking queue is in-process** (a plain list + lock), not in Valkey —
  it's a quick handshake, not something that needs to survive a restart.
  Live *duel* state, which does need to survive a hiccup / support multiple
  api replicas, lives in Valkey instead.
- **A brief race is possible**: if a match pairs before both players'
  WebSockets are open, the `duel_start` push to the not-yet-connected socket
  is silently dropped. In practice the client opens the WS immediately after
  the HTTP join, so this is rare — but it's a known gap, not fixed here.
- **In-duel disconnects aren't handled** — the opponent isn't notified and
  there's no forfeit timer. Flagged as a known gap.

## Local development

**api**
```bash
cd api
cp .env.example .env   # fill in GROQ_API_KEY; point DATABASE_URL/CACHE_URL at local Postgres/Valkey
pip install -r requirements.txt
uvicorn main:app --reload
```

**gui**
```bash
cd gui
cp .env.example .env   # defaults already point at localhost:8000
npm install
npm run dev
```

## Deploying to Zerops

1. Create a new project in the Zerops GUI, import `zerops-project-import.yaml`
   (this creates `db`, `cache`, `api`, `gui`).
2. Set `GROQ_API_KEY` as a secret on the `api` service (Zerops GUI →
   `api` → Environment Variables → Secrets).
3. Confirm the auto-generated connection-string env var names for `db` and
   `cache` in the Zerops GUI and match them in `DATABASE_URL` / `CACHE_URL`
   on `api` if they differ from the `${db_connectionString}` /
   `${cache_connectionString}` placeholders in the import YAML.
4. Deploy `db` and `cache` first, confirm both are green.
5. Deploy `api`. Check `/health` on its public subdomain. Watch the deploy
   pipeline logs for anything from `init_models()` (table creation) failing —
   that means `DATABASE_URL` isn't wired right.
6. Before deploying `gui`, set `VITE_API_HTTP_URL` / `VITE_API_WS_URL` in
   `gui/zerops.yaml`'s `envVariables` to `api`'s real public subdomain
   (`https://api-<subdomain>.zerops.app` / `wss://api-<subdomain>.zerops.app`).
   These are **build-time** Vite vars — baked into the JS bundle — so `gui`
   must be rebuilt any time `api`'s subdomain changes.
7. Deploy `gui`, open its public URL.
8. **WebSocket-through-the-balancer check**: open the deployed `gui` URL,
   open browser devtools → Network → WS, join the queue, and confirm the
   `/ws/{player_id}` connection shows `101 Switching Protocols` rather than
   failing or falling back to polling. This is the step most likely to trip
   up — Zerops's L7 balancer needs `httpSupport: true` on the port (already
   set in `api/zerops.yaml`) for WS upgrade to pass through.
9. Two-browser-tab end-to-end test: open the `gui` URL in two tabs (or one
   normal + one incognito, so cookies/localStorage don't collide), queue
   both, play a full duel, confirm tick sync, commentary lines, and that
   the leaderboard updates after `duel_end`.
10. If time allows: connect the GitHub repo in the Zerops project settings
    so pushes to `main` trigger redeploys automatically.

## AI tool usage disclosure

See `AI_DISCLOSURE.md` — keep it updated as you build on top of this
scaffold, since the challenge rules require disclosing AI-generated vs.
human-authored work.
