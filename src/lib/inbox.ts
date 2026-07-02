// localStorage stash for parsed-but-unsaved task drafts. Capture writes here
// and navigates to the Inbox tab; Confirm reads/clears it on save or discard.

import type { TaskDraft } from '@/types';

export interface InboxStash {
  drafts: TaskDraft[];
  /** The original brain-dump text, preserved as raw_input on save. */
  rawInput: string;
}

const KEY = 'mypa.inbox.v1';

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Read the pending stash, or null when empty/unavailable. Never throws. */
export function getInbox(): InboxStash | null {
  const store = safeStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InboxStash>;
    if (!parsed || !Array.isArray(parsed.drafts)) return null;
    return { drafts: parsed.drafts, rawInput: typeof parsed.rawInput === 'string' ? parsed.rawInput : '' };
  } catch {
    return null;
  }
}

/** Persist a pending stash. */
export function setInbox(stash: InboxStash): void {
  const store = safeStorage();
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify(stash));
  } catch {
    // Storage full / unavailable — drafts just won't survive a reload.
  }
}

/** Drop the pending stash (after save or discard). */
export function clearInbox(): void {
  const store = safeStorage();
  if (!store) return;
  try {
    store.removeItem(KEY);
  } catch {
    // ignore
  }
}
