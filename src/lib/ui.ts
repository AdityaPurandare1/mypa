/**
 * Shared presentational helpers.
 *
 * Priority hues come from the Woody accent stack so each level reads at a
 * glance without inventing new colors:
 *   P1 oxide red (#D4694E) · P2 warm tan (#D2A46E) · P3 slate-blue (#7E9AC0)
 *   · P4 neutral (faint bone).
 * Sage stays reserved for "done"/success.
 */

interface PriorityStyle {
  /** Card outline (translucent so cards stay dark-first). */
  border: string;
  /** Text/badge foreground. */
  text: string;
  /** Solid fill for dots / active picker segments. */
  bg: string;
  /** Ink color used on top of the solid fill. */
  onBg: string;
}

const PRIORITY_STYLES: Record<number, PriorityStyle> = {
  1: {
    border: 'border-[rgba(212,105,78,0.55)]',
    text: 'text-[#D4694E]',
    bg: 'bg-[#D4694E]',
    onBg: 'text-[#1A0F0B]',
  },
  2: {
    border: 'border-[rgba(210,164,110,0.45)]',
    text: 'text-[#D2A46E]',
    bg: 'bg-[#D2A46E]',
    onBg: 'text-[#191612]',
  },
  3: {
    border: 'border-[rgba(126,154,192,0.35)]',
    text: 'text-[#7E9AC0]',
    bg: 'bg-[#7E9AC0]',
    onBg: 'text-[#0E1319]',
  },
  4: {
    border: 'border-hairline',
    text: 'text-ink-muted',
    bg: 'bg-[#6B6359]',
    onBg: 'text-[#F3EDE5]',
  },
};

function styleFor(priority: number): PriorityStyle {
  return PRIORITY_STYLES[priority] ?? PRIORITY_STYLES[3];
}

/** Card outline graded/hued by priority; carried keeps a tan floor. */
export function priorityBorderClass(priority: number, carried = false): string {
  const s = styleFor(priority);
  // A carried task should never look weaker than the soft-tan flag it had.
  if (carried && priority >= 3) return 'border-[rgba(210,164,110,0.45)]';
  return s.border;
}

/** Foreground class for P-badges and labels. */
export function priorityTextClass(priority: number): string {
  return styleFor(priority).text;
}

/** Solid dot fill for timeline rows / calendar rails. */
export function priorityBgClass(priority: number): string {
  return styleFor(priority).bg;
}

/** Fill + ink pair for the active segment of a priority picker. */
export function prioritySegmentActiveClass(priority: number): string {
  const s = styleFor(priority);
  return `${s.bg} ${s.onBg}`;
}
