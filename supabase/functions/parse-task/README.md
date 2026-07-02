# parse-task edge function

Turns a brain-dump (`{ text, timezone, now }`) into structured task drafts
(`{ tasks: [ { title, notes, due_at, priority } ] }`) by calling the Anthropic
Messages API with a JSON-schema structured output.

- Model + token config: [`config.ts`](./config.ts) (`MODEL_ID = "claude-haiku-4-5"`, `MAX_TOKENS = 1024`).
- The Anthropic key lives ONLY here as a Supabase secret — never in the client bundle.
- Only signed-in users may call it (the caller's JWT is validated via `auth.getUser`).
- Degrades to `{ tasks: [] }` (HTTP 200) on any error, so the client never dead-ends.

## Set the secret

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set ALLOWED_ORIGIN=https://<user>.github.io
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically by the platform.

`ALLOWED_ORIGIN` is the exact production browser origin allowed to call the
function (your Pages origin, e.g. `https://<user>.github.io`). It's added to an
exact CORS allow-list alongside the localhost dev origins — no suffix matching,
so a disallowed origin gets no `Access-Control-Allow-Origin` header and is
blocked by the browser. Set it before/at deploy.

## Deploy

```sh
supabase functions deploy parse-task
```

## Test locally

```sh
deno test --allow-env supabase/functions/parse-task/index.test.ts
```
