// Deno test for parse-task. Drives the real exported `handler` end to end,
// mocking global fetch so we control BOTH the Supabase auth check
// (GET /auth/v1/user) and the Anthropic Messages API response. We assert:
//   1. a realistic Anthropic success response yields the parsed tasks;
//   2. the outgoing Anthropic request carries text + now + timezone + MODEL_ID;
//   3. an HTTP error / non-JSON model output degrades to { tasks: [] } AND logs.
//
// Run with: deno test --allow-env supabase/functions/parse-task/index.test.ts

import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { MODEL_ID } from './config.ts';

// The handler reads these at module load, so set them before importing index.ts.
Deno.env.set('ANTHROPIC_API_KEY', 'sk-ant-test');
Deno.env.set('SUPABASE_URL', 'https://project.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'anon-test');

const { handler } = await import('./index.ts');

const AUTH_URL = 'https://project.supabase.co/auth/v1/user';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

function req(body: unknown): Request {
  return new Request('https://fn.local/parse-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer good-jwt' },
    body: JSON.stringify(body),
  });
}

/**
 * Install a fetch mock. `anthropic` is the Response the Anthropic endpoint
 * returns; auth always succeeds with a fake user. Captures the Anthropic
 * request body into `captured`.
 */
function installFetch(anthropic: () => Response) {
  const captured: { body?: Record<string, unknown> } = {};
  const real = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(AUTH_URL)) {
      return Promise.resolve(
        new Response(JSON.stringify({ id: 'user-1', aud: 'authenticated' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (url.startsWith(ANTHROPIC_URL)) {
      captured.body = JSON.parse(String(init?.body ?? '{}'));
      return Promise.resolve(anthropic());
    }
    return Promise.resolve(new Response('{}', { status: 200 }));
  }) as typeof fetch;
  return { captured, restore: () => { globalThis.fetch = real; } };
}

Deno.test('parses a realistic Anthropic success response into tasks', async () => {
  const modelJson = JSON.stringify({
    tasks: [
      { title: 'Send invoice', notes: null, due_at: '2026-07-02T09:00:00-07:00', priority: 2 },
      { title: 'Client deck block', notes: '2 hrs', due_at: '2026-07-03T09:00:00-07:00', priority: 2 },
    ],
  });
  const { captured, restore } = installFetch(
    () =>
      new Response(
        JSON.stringify({
          content: [{ type: 'text', text: modelJson }],
          stop_reason: 'end_turn',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
  );

  try {
    const now = '2026-07-01T12:00:00Z';
    const tz = 'America/Los_Angeles';
    const res = await handler(req({ text: 'send the invoice Thursday and block 2 hrs for the deck Friday', now, timezone: tz }));
    assertEquals(res.status, 200);
    const out = await res.json();
    assertEquals(out.tasks.length, 2);
    assertEquals(out.tasks[0].title, 'Send invoice');
    assertEquals(out.tasks[1].title, 'Client deck block');
    assertEquals(out.tasks[1].notes, '2 hrs');

    // Request-shape contract: text + now + timezone + MODEL_ID reach Anthropic.
    assertEquals(captured.body!.model, MODEL_ID);
    assertStringIncludes(String(captured.body!.system), now);
    assertStringIncludes(String(captured.body!.system), tz);
    const messages = captured.body!.messages as Array<{ content: string }>;
    assertStringIncludes(messages[0].content, 'invoice');
  } finally {
    restore();
  }
});

Deno.test('degrades to { tasks: [] } and logs when Anthropic returns HTTP 400', async () => {
  const errors: unknown[][] = [];
  const realError = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };

  const { restore } = installFetch(
    () => new Response('{"type":"error","error":{"message":"bad request"}}', { status: 400 }),
  );

  try {
    const res = await handler(req({ text: 'do a thing tomorrow', now: '2026-07-01T12:00:00Z', timezone: 'America/Los_Angeles' }));
    assertEquals(res.status, 200);
    const out = await res.json();
    assertEquals(out.tasks, []);
    // Misconfiguration must be observable in logs.
    assertEquals(errors.length >= 1, true);
  } finally {
    restore();
    console.error = realError;
  }
});

Deno.test('degrades to { tasks: [] } and logs when the model text is not JSON', async () => {
  const errors: unknown[][] = [];
  const realError = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };

  const { restore } = installFetch(
    () =>
      new Response(
        JSON.stringify({ content: [{ type: 'text', text: 'sorry, I cannot do that' }], stop_reason: 'end_turn' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
  );

  try {
    const res = await handler(req({ text: 'anything', now: '2026-07-01T12:00:00Z', timezone: 'America/Los_Angeles' }));
    assertEquals(res.status, 200);
    const out = await res.json();
    assertEquals(out.tasks, []);
    assertEquals(errors.length >= 1, true);
  } finally {
    restore();
    console.error = realError;
  }
});
