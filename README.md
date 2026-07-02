# myPA

Voice-first personal task assistant. Speak or type a brain-dump, and Claude
(via a Supabase Edge Function) parses it into structured tasks — a short
keyword title, a resolved due date/time, a priority, and notes. You review and
edit every task in a confirm sheet before saving. Tasks sync across your PC and
iPhone, show up in agenda + calendar views, and nudge you when they come due.

## Architecture

```
Browser (React PWA)
  │  brain-dump text + timezone + now
  ▼
supabase.functions.invoke('parse-task')          ← only signed-in users
  │
  ▼
parse-task edge fn (Deno)  ──►  Anthropic Messages API (claude-haiku-4-5)
  │  { tasks: [ { title, notes, due_at, priority } ] }  (structured output)
  ▼
Browser confirm sheet  ──►  tasks table (Supabase Postgres, RLS per user)
```

- **Claude key never touches the client.** It lives only as a Supabase secret
  read by the `parse-task` edge function. The browser bundle contains no
  Anthropic reference.
- **RLS per user.** Every row in `profiles` and `tasks` is owned by
  `auth.uid()`. `tasks.user_id` defaults to `auth.uid()` server-side — the
  client never writes it.
- **Sync = refetch-on-focus (P1).** No websockets yet; the task list refetches
  when the tab regains focus and after every mutation. A `subscribeTasks()`
  no-op seam exists for P2 realtime.
- **Reminders (P1) are in-app only.** While a tab is open, a ~60s scan fires a
  browser Notification once per due-soon open task. Server push is P2
  (scaffolded, not wired).

## Model configuration

`MODEL_ID` and `MAX_TOKENS` live in one place:
[`supabase/functions/parse-task/config.ts`](supabase/functions/parse-task/config.ts)
(`claude-haiku-4-5`, `1024`). The function uses Anthropic structured outputs
(`output_config.format.type = "json_schema"`) so the model must return valid
JSON matching the tasks schema, with client-side normalization
(`src/lib/parseDrafts.ts`) as a fallback. Any parse/HTTP error degrades to
`{ tasks: [] }` so the UI never dead-ends.

## The two things only you can do

1. **Create + link a Supabase project** and set its secrets (URL/anon key in
   the client `.env`, `ANTHROPIC_API_KEY` on the edge function).
2. **Configure the Google OAuth provider + redirect URLs** in the Supabase
   Auth dashboard (add the Pages origin `https://<user>.github.io` and the
   `/mypa/` redirect, plus `http://localhost:5173` for dev).

## Local development

```sh
cp .env.example .env.local     # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev                    # http://localhost:5173/
```

The app builds and its tests pass with placeholder env (before a real project
is linked); you just can't sign in or save until the two steps above are done.

Scripts:

| command             | what it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Vite dev server                       |
| `npm run typecheck` | `tsc --noEmit`                        |
| `npm run test`      | Vitest (client only)                  |
| `npm run build`     | typecheck + Vite build (writes dist/) |
| `npm run preview`   | preview the production build          |

## Database

Apply the migrations **in order** (the orchestrator runs these — do not run
`supabase` yourself unless that's your job):

```
supabase/migrations/
  20260701000001_schema.sql        profiles + tasks + task_status enum + index
  20260701000002_functions.sql     set_updated_at trigger + handle_new_user trigger
  20260701000003_rls.sql           enable RLS + own-profile / own-tasks policies
  20260701000004_push_scaffold.sql push_subscriptions (P2 scaffold; cron commented)
```

## Edge function deploy

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy parse-task
# send-reminders is a P2 scaffold — do NOT deploy in P1.
```

Test the parse-task function under Deno:

```sh
deno test --allow-env supabase/functions/parse-task/index.test.ts
```

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` runs typecheck → test → build on push to `main`,
then publishes `dist/` to Pages. The base path is `/mypa/` on build (override
with the `VITE_BASE` env var). `public/404.html` is an SPA fallback so deep
links under `/mypa/` resolve.

**Required repo secrets** (Settings → Secrets and variables → Actions) — set
these before the Pages build or the deployed app bakes in placeholder Supabase
creds and can't connect:

| secret                    | value                                           |
| ------------------------- | ----------------------------------------------- |
| `VITE_SUPABASE_URL`       | your project URL, e.g. `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY`  | the anon/public key (public by design — RLS enforces access) |

## iOS install + dictation

- Open the Pages URL in Safari → Share → **Add to Home Screen**. The manifest
  (`display: standalone`, scope/start_url `/mypa/`, 192 + 512 + maskable icons)
  makes it launch full-screen.
- iOS Safari has no Web Speech API, so the in-app mic button is hidden there.
  Use the **microphone key on the iOS keyboard** to dictate straight into the
  capture box — it fills the same field the parser reads.
- Works in Edge/Chrome on desktop, where the in-app mic button is shown.

## P1 vs P2 scope

| Area       | P1 (this build)                              | P2 (scaffolded, not wired)                          |
| ---------- | -------------------------------------------- | --------------------------------------------------- |
| Sync       | refetch on focus + after mutation            | realtime via `subscribeTasks()` no-op seam          |
| Reminders  | in-app Notification while tab open           | server push: `send-reminders` fn + `push_subscriptions` + `src/lib/push.ts` + `src/sw.js` handlers + pg_cron (commented) |
| Auth       | Google OAuth + email magic link              | —                                                   |

## Deployment checklist / P2 notes

- **Pages secrets (P1, required):** set `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY` as repo secrets before the first Pages build (see
  [Deploy](#deploy-github-pages)) — otherwise the bundle bakes in placeholder
  creds and the deployed app can't connect.
- **parse-task edge fn:** set `ALLOWED_ORIGIN` (your Pages origin) so CORS
  admits only your site (see the function README). After deploy, run a live
  smoke test with the sample dictation — "remind me to send the invoice
  Thursday and block 2 hrs for the deck Friday morning" — and confirm **2
  tasks** come back. That live call is the real structured-output contract
  check; the Deno test mocks Anthropic.
- **send-reminders (P2 scaffold, do not deploy in P1):** before wiring it,
  set a high-entropy `REMINDERS_SHARED_SECRET`, set a real `VAPID_SUBJECT`
  (currently the placeholder `mailto:noreply@mypa.app`), and note it hardcodes
  the notification URL `/mypa/` (update if the base path changes).
- **Known follow-up (Z4):** due-time rendering uses a local-midnight heuristic
  plus a 09:00 default for date-only inputs. A proper all-day / `has_time` flag
  is a future improvement.

## Try it end-to-end

After linking + secrets, sign in and dictate/type:

> "Send the vendor invoice Thursday, block the deck for Friday morning, and
> remind me to call the plumber tomorrow at 2pm."

You should get three draft cards with concise titles, resolved due dates in your
local timezone, and editable priority — review, tweak, and Save all.
