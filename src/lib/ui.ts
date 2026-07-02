/**
 * Shared presentational helpers.
 */

/**
 * Card outline graded by priority — the Woody accent stack keeps the UI ~95%
 * neutral, so urgency is expressed as border intensity of the tan priority
 * accent rather than a new hue per level:
 *   P1 strong tan · P2 soft tan · P3 neutral hairline · P4 extra-faint.
 * A carried task keeps at least the soft-tan emphasis it had before.
 */
export function priorityBorderClass(priority: number, carried = false): string {
  if (priority === 1) return 'border-[rgba(210,164,110,0.6)]';
  if (priority === 2 || carried) return 'border-[rgba(210,164,110,0.32)]';
  if (priority === 4) return 'border-[rgba(245,239,229,0.04)]';
  return 'border-hairline';
}
