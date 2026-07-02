// parse-task — turn a spoken/typed brain-dump into structured task drafts.
//
// Flow: signed-in client POSTs { text, timezone, now }. We validate the caller's
// JWT (only authenticated users spend tokens), then call the Anthropic Messages
// API with a JSON-schema structured output so the model MUST return
// { tasks: [ { title, notes, due_at, priority } ] }. On ANY error — bad JWT,
// missing key, HTTP failure, unparseable output — we degrade to { tasks: [] }
// (HTTP 200) so the client opens the confirm sheet with a blank row instead of
// dead-ending. The Anthropic key lives only here, never in the client bundle.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { MODEL_ID, MAX_TOKENS, ANTHROPIC_VERSION } from './config.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// Exact allow-list: local dev origins plus the prod Pages origin, which is set
// per-deploy via the ALLOWED_ORIGIN secret (e.g. https://<user>.github.io). We
// only reflect an Origin that's an exact member — no suffix matching, which
// would let any *.github.io site call the function.
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '';
const ALLOWED_ORIGINS = new Set(
  [
    'http://localhost:5173',
    'http://localhost:4173',
    ALLOWED_ORIGIN,
  ].filter(Boolean),
);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  // Only reflect origins on the exact allow-list; otherwise omit the header so
  // the browser blocks a disallowed cross-origin caller.
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// The structured-output schema Claude must conform to.
const TASKS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['tasks'],
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'notes', 'due_at', 'priority'],
        properties: {
          title: { type: 'string', description: 'Short keyword title, at most 6 words.' },
          notes: { type: ['string', 'null'], description: 'Optional extra detail, or null.' },
          due_at: {
            type: ['string', 'null'],
            description: 'ISO 8601 timestamp for the resolved due date/time, or null if none.',
          },
          priority: {
            type: 'integer',
            minimum: 1,
            maximum: 4,
            description: '1 = highest urgency, 4 = lowest. Default 3.',
          },
        },
      },
    },
  },
};

const DEFAULT_TIMEZONE = 'America/Los_Angeles';
const MAX_TEXT_LENGTH = 4000;

// Reject a bogus/unknown IANA zone before it's interpolated into the prompt.
function validTimezone(tz: string): string {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function systemPrompt(now: string, timezone: string): string {
  return [
    'You convert a personal brain-dump into a list of discrete, actionable tasks.',
    'Split the input into separate tasks — one per distinct action.',
    'For each task:',
    '- title: a SHORT keyword phrase, at most 6 words, no trailing punctuation.',
    '- notes: any extra detail worth keeping, else null.',
    `- due_at: resolve relative dates ("tomorrow", "Thursday", "next week", "in 2 hours") against the current time ${now} in the IANA timezone ${timezone}, and return a full ISO 8601 timestamp. If a time of day is implied use it; if only a date is given, default to 09:00 local. If there is no due date, return null.`,
    '- priority: integer 1-4 where 1 is most urgent and 4 least; default to 3 when unclear.',
    'Return only the structured object. If the input has no tasks, return an empty tasks array.',
  ].join('\n');
}

export async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return json(405, { tasks: [] }, origin);
  }

  // Hard-fail loudly in logs if the key is missing, but never leak details to
  // the client — just degrade to an empty list.
  if (!ANTHROPIC_API_KEY) {
    console.error('parse-task: ANTHROPIC_API_KEY is not set');
    return json(200, { tasks: [] }, origin);
  }

  // Only signed-in users may spend tokens. Validate the bearer JWT.
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json(401, { tasks: [] }, origin);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return json(401, { tasks: [] }, origin);
  } catch (e) {
    console.error('parse-task: auth check failed', e);
    return json(401, { tasks: [] }, origin);
  }

  let body: { text?: unknown; timezone?: unknown; now?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(200, { tasks: [] }, origin);
  }

  let text = typeof body.text === 'string' ? body.text.trim() : '';
  const timezone = validTimezone(typeof body.timezone === 'string' ? body.timezone : DEFAULT_TIMEZONE);
  const now = typeof body.now === 'string' ? body.now : new Date().toISOString();

  if (!text) return json(200, { tasks: [] }, origin);
  // Cap input length before spending Anthropic tokens on a runaway paste.
  if (text.length > MAX_TEXT_LENGTH) text = text.slice(0, MAX_TEXT_LENGTH);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: MAX_TOKENS,
        system: systemPrompt(now, timezone),
        messages: [{ role: 'user', content: text }],
        // Structured outputs — guarantee schema-valid JSON. No thinking/effort:
        // Haiku 4.5 rejects `effort`.
        output_config: {
          format: { type: 'json_schema', schema: TASKS_SCHEMA },
        },
      }),
    });

    if (!res.ok) {
      console.error('parse-task: anthropic HTTP', res.status, await res.text().catch(() => ''));
      return json(200, { tasks: [] }, origin);
    }

    const payload = await res.json();
    // With structured outputs the text block is guaranteed-valid JSON matching
    // the schema. Pull the first text block and parse it.
    const block = Array.isArray(payload?.content)
      ? payload.content.find((c: { type?: string }) => c?.type === 'text')
      : null;
    const rawText = typeof block?.text === 'string' ? block.text : '';

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error('parse-task: model output was not JSON');
      return json(200, { tasks: [] }, origin);
    }

    const tasks =
      parsed && typeof parsed === 'object' && Array.isArray((parsed as { tasks?: unknown }).tasks)
        ? (parsed as { tasks: unknown[] }).tasks
        : [];

    return json(200, { tasks }, origin);
  } catch (e) {
    console.error('parse-task: unexpected error', e);
    return json(200, { tasks: [] }, origin);
  }
}

Deno.serve(handler);
