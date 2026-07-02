import { useState } from 'react';
import { getInbox, clearInbox } from '@/lib/inbox';
import { ConfirmSheet } from './ConfirmSheet';

interface Props {
  /** Refresh the task list after a save. */
  onSaved: () => void;
  /** Navigate to Today (after save). */
  goToday: () => void;
  /** Navigate to Capture (empty-state CTA). */
  goCapture: () => void;
}

/**
 * The Inbox tab. When Capture parses a brain-dump it stashes the drafts in
 * localStorage and routes here; this renders the review (Confirm) UI. With no
 * pending drafts it shows an empty state pointing back at Capture.
 */
export function Inbox({ onSaved, goToday, goCapture }: Props) {
  // Read once on mount; a new parse remounts this via the tab switch.
  const [stash] = useState(() => getInbox());

  if (!stash || stash.drafts.length === 0) {
    return (
      <div className="flex flex-1 flex-col px-[22px] pb-6 pt-8">
        <h1 className="text-[26px] font-bold tracking-[-0.01em] text-ink-primary">Inbox</h1>
        <p className="mt-1 text-[13px] text-ink-muted">Parsed tasks waiting for review land here.</p>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16">
          <p className="text-[13px] text-ink-fainter">Nothing to review.</p>
          <button
            onClick={goCapture}
            className="rounded-full border border-hairline-08 bg-surface px-4 py-2 text-[13px] text-ink-secondary transition-colors duration-[120ms] hover:text-ink-primary"
          >
            Capture something
          </button>
        </div>
      </div>
    );
  }

  return (
    <ConfirmSheet
      initial={stash.drafts}
      rawInput={stash.rawInput}
      onClose={() => {
        clearInbox();
        goCapture();
      }}
      onSaved={() => {
        clearInbox();
        onSaved();
        goToday();
      }}
    />
  );
}
