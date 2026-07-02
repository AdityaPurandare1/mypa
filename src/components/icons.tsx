// Inline line icons (stroke 1.7, currentColor). No emoji, no external deps.
// Sized via the `size` prop; color follows `currentColor` from the parent.

interface IconProps {
  size?: number;
  className?: string;
}

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };
}

/** Today — list / lines. */
export function IconToday({ size = 23, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <line x1="4" y1="6" x2="4.01" y2="6" />
      <line x1="4" y1="12" x2="4.01" y2="12" />
      <line x1="4" y1="18" x2="4.01" y2="18" />
    </svg>
  );
}

/** Calendar. */
export function IconCalendar({ size = 23, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="2.5" x2="8" y2="6" />
      <line x1="16" y1="2.5" x2="16" y2="6" />
    </svg>
  );
}

/** Plus — capture. */
export function IconPlus({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/** Inbox / tray. */
export function IconInbox({ size = 23, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 13l2.5-7A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.3L20 13v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M4 13h4l1.5 2.5h5L16 13h4" />
    </svg>
  );
}

/** Settings — sliders. */
export function IconSettings({ size = 23, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <line x1="4" y1="8" x2="20" y2="8" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="9" cy="8" r="2.3" fill="var(--tab-fill, #141210)" />
      <circle cx="15" cy="16" r="2.3" fill="var(--tab-fill, #141210)" />
    </svg>
  );
}

/** Microphone. */
export function IconMic({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="21" />
    </svg>
  );
}

/** Chevron pointing left (back). */
export function IconBack({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <polyline points="15 5 8 12 15 19" />
    </svg>
  );
}

/** Chevron pointing right (forward). */
export function IconForward({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <polyline points="9 5 16 12 9 19" />
    </svg>
  );
}

/** Arrow right (button trailing). */
export function IconArrowRight({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}

/** Trash — delete. */
export function IconTrash({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <polyline points="4 6 20 6" />
      <path d="M6 6l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M9 6V4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v2" />
    </svg>
  );
}

/** Check — used inside the filled done circle. */
export function IconCheck({ size = 13, className }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2.4}>
      <polyline points="5 12.5 10 17 19 6.5" />
    </svg>
  );
}
