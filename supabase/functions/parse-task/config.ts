// Single source of truth for the Anthropic model config used by parse-task.
// Keep changes here — the index handler and tests read these constants.

// Cheapest capable model for short brain-dump parsing (confirmed decision).
export const MODEL_ID = 'claude-haiku-4-5';

// Small ceiling — output is a compact JSON array of tasks, never prose.
export const MAX_TOKENS = 1024;

// Anthropic Messages API version header value.
export const ANTHROPIC_VERSION = '2023-06-01';
