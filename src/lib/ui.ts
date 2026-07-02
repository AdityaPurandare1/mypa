/**
 * Shared presentational helpers.
 *
 * Priority hues are deliberately bright so each level pops against the dark
 * surface:
 *   P1 vivid red (#FF5A3C) · P2 bright amber (#FFAE42) · P3 bright blue
 *   (#4DA3FF) · P4 neutral (faint bone).
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
    border: 'border-[#FF5A3C]',
    text: 'text-[#FF6B4A]',
    bg: 'bg-[#FF5A3C]',
    onBg: 'text-[#1A0F0B]',
  },
  2: {
    border: 'border-[#FFAE42]',
    text: 'text-[#FFB74D]',
    bg: 'bg-[#FFAE42]',
    onBg: 'text-[#191612]',
  },
  3: {
    border: 'border-[#4DA3FF]',
    text: 'text-[#5FADFF]',
    bg: 'bg-[#4DA3FF]',
    onBg: 'text-[#0E1319]',
  },
  4: {
    border: 'border-hairline',
    text: 'text-ink-muted',
    bg: 'bg-[#8A8178]',
    onBg: 'text-[#191612]',
  },
};

function styleFor(priority: number): PriorityStyle {
  return PRIORITY_STYLES[priority] ?? PRIORITY_STYLES[3];
}

/** Card outline graded/hued by priority; carried keeps a tan floor. */
export function priorityBorderClass(priority: number, carried = false): string {
  const s = styleFor(priority);
  // A carried task should never look weaker than the amber flag it had.
  if (carried && priority >= 3) return 'border-[#FFAE42]';
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
