# TaskSync

A real-time Kanban task board — think mini Trello. Create boards, organise tasks across columns, drag them between stages, and watch every change appear instantly for everyone on the board.

**Stack:** React (Vite) · Flask · SQLAlchemy (SQLite by default) · Socket.IO · JWT

## Features

- **Accounts** — signup and login with hashed passwords and JWT sessions
- **Boards** — create, rename, recolour and delete boards; new boards start with *Todo → In Progress → Done*
- **Columns** — add, rename (double-click the title) and delete columns
- **Tasks** — create, edit and delete tasks with a description, priority (low / medium / high / urgent), due date and assignee
- **Drag and drop** — move tasks within and between columns, with optimistic UI and server reconciliation
- **Real-time sync** — every change is pushed over WebSockets to everyone viewing the board, and you can see who's online
- **Collaboration** — invite teammates by email, assign tasks to them, remove members
- **Search and filter** — free-text search plus priority, assignee and due-date filters (press `/` to search)
- **Light and dark themes** — a violet / pink / mint palette built on CSS custom properties

## Quick start

You need **Python 3.10+** and **Node 18+**.

### 1. Backend (Flask + Socket.IO) — port 5000

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python seed.py        # optional: demo users and a sample board
python app.py
```

### 2. Frontend (React + Vite) — port 5173

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` and `/socket.io` to Flask, so the browser only talks to one origin.

**Demo logins** (after `python seed.py`): `stuti@tasksync.dev`, `arjun@tasksync.dev` or `maya@tasksync.dev`, all with password `password123`. To see real-time sync, log in as two different users in two browser windows (one of them private).

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | dev value | Signs JWTs — **set this in production** |
| `DATABASE_URL` | `sqlite:///backend/tasksync.db` | Any SQLAlchemy URL, e.g. PostgreSQL |
| `JWT_EXPIRES_HOURS` | `24` | Token lifetime |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `VITE_BACKEND_URL` | `http://localhost:5000` | Where the Vite dev proxy forwards requests |

## Architecture

```
┌────────────── React (Vite) ──────────────┐          ┌──────────────── Flask ────────────────┐
│ AuthContext ── api.js (fetch + JWT) ─────┼── REST ─▶│ routes/  auth · boards · columns ·    │
│                                          │          │          tasks (+ search)             │
│ BoardPage ── boardReducer (normalised)   │          │    │ commit                           │
│     ▲                                    │          │    ▼                                  │
│     └── useBoardSocket ◀── socket.io ────┼◀─ WS ────│ realtime.broadcast ─▶ room board:<id> │
└──────────────────────────────────────────┘          │ SQLAlchemy ─▶ SQLite / PostgreSQL     │
                                                      └───────────────────────────────────────┘
```

### Data model

```
User ──< board_members >── Board ──< BoardColumn ──< Task >── User (assignee)
```

- `Board.owner_id` — only the owner can delete the board or remove other members
- `BoardColumn.position` / `Task.position` — integer order within the parent
- `Task.priority` ∈ {low, medium, high, urgent}; `due_date` and `assignee_id` are optional

### Real-time flow

1. The client connects to Socket.IO with its JWT (`auth: { token }`). Unauthenticated sockets are rejected.
2. Opening a board emits `board:join`. The server checks membership, adds the socket to room `board:<id>` and broadcasts `presence`.
3. Every mutation goes through REST. After the database commit, the server emits an event to the room. The acting client sends its socket id in `X-Socket-ID`, so the server skips echoing the change back to it (it already has the HTTP response).
4. The other clients feed the event into the same reducer the REST responses use. Every transition is idempotent, so duplicated or out-of-order events are harmless.
5. After a reconnect the client refetches the board to catch up on anything it missed.

**Moving a task:** the client moves the card locally straight away (optimistic update), then calls `PATCH /api/tasks/:id/move`. The server re-numbers the affected columns in one transaction and broadcasts the authoritative ordering as `tasks:reordered`. If the request fails, the client reloads the board.

## API reference

All endpoints except signup and login need `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/signup` | `{name, email, password}` → `{token, user}` |
| POST | `/api/auth/login` | `{email, password}` → `{token, user}` |
| GET | `/api/auth/me` | Current user |
| GET | `/api/boards` | Boards you're a member of |
| POST | `/api/boards` | `{name, description?, color?}` |
| GET | `/api/boards/:id` | Board with columns, tasks and members |
| PATCH | `/api/boards/:id` | Update name / description / color |
| DELETE | `/api/boards/:id` | Delete a board (owner only) |
| POST | `/api/boards/:id/members` | `{email}` — invite a user |
| DELETE | `/api/boards/:id/members/:userId` | Remove a member, or leave the board |
| POST | `/api/boards/:id/columns` | `{name}` |
| PATCH | `/api/columns/:id` | `{name}` |
| DELETE | `/api/columns/:id` | Delete a column and its tasks |
| POST | `/api/columns/:id/tasks` | `{title, description?, priority?, due_date?, assignee_id?}` |
| GET | `/api/tasks/:id` | Single task |
| PATCH | `/api/tasks/:id` | Partial update of any task field |
| DELETE | `/api/tasks/:id` | Delete a task |
| PATCH | `/api/tasks/:id/move` | `{column_id, position}` — move or reorder |
| GET | `/api/boards/:id/tasks` | Search: `q`, `priority`, `assignee` (id / `me` / `none`), `due` (`overdue` / `today` / `week` / `none`), `column_id` |

### Socket events

| Direction | Event | Payload |
| --- | --- | --- |
| client → server | `board:join` / `board:leave` | `{board_id}` |
| server → client | `presence` | `{board_id, users}` |
| server → client | `task:created` / `task:updated` | `{task}` |
| server → client | `task:deleted` | `{task_id}` |
| server → client | `tasks:reordered` | `{tasks: [{id, column_id, position}]}` |
| server → client | `column:created` / `column:updated` | `{column}` |
| server → client | `column:deleted` | `{column_id}` |
| server → client | `board:updated` / `board:deleted` | `{board}` / `{board_id}` |
| server → client | `member:added` / `member:removed` | `{user}` / `{user_id}` |
| server → client | `boards:changed` | sent to a user's own room when their board list changes |

## Project structure

```
backend/
  app.py            app factory, blueprint registration, entry point
  config.py         environment-driven settings
  models.py         SQLAlchemy models
  auth.py           JWT helpers and @login_required
  permissions.py    membership checks for boards / columns / tasks
  realtime.py       broadcast helpers and presence tracking
  sockets.py        Socket.IO connect / join / leave handlers
  routes/           auth, boards, columns, tasks
  seed.py           demo data
frontend/src/
  pages/            AuthPage, Dashboard, BoardPage
  components/       Column, TaskCard, TaskModal, FilterBar, MembersModal, ...
  hooks/            useBoardSocket, useTheme
  lib/              api client, socket, board reducer, filters, dates
  styles/           theme tokens and component styles
```

## Possible next steps

- Reorder columns by dragging
- Comments and an activity log on tasks
- Touch-friendly drag and drop for mobile
- Alembic migrations and a PostgreSQL deployment
