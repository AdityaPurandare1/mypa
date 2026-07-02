import { describe, expect, it } from 'vitest';
import {
  priorityBorderClass,
  priorityTextClass,
  priorityBgClass,
  prioritySegmentActiveClass,
} from './ui';

describe('priority styling', () => {
  it('each level gets a distinct hue: P1 red, P2 tan, P3 slate, P4 neutral', () => {
    expect(priorityBorderClass(1)).toBe('border-[rgba(212,105,78,0.55)]');
    expect(priorityBorderClass(2)).toBe('border-[rgba(210,164,110,0.45)]');
    expect(priorityBorderClass(3)).toBe('border-[rgba(126,154,192,0.35)]');
    expect(priorityBorderClass(4)).toBe('border-hairline');

    expect(priorityTextClass(1)).toBe('text-[#D4694E]');
    expect(priorityTextClass(2)).toBe('text-[#D2A46E]');
    expect(priorityTextClass(3)).toBe('text-[#7E9AC0]');

    expect(priorityBgClass(1)).toBe('bg-[#D4694E]');
    expect(priorityBgClass(3)).toBe('bg-[#7E9AC0]');
  });

  it('carried keeps at least the soft-tan emphasis for low priorities', () => {
    expect(priorityBorderClass(3, true)).toBe('border-[rgba(210,164,110,0.45)]');
    expect(priorityBorderClass(4, true)).toBe('border-[rgba(210,164,110,0.45)]');
    // P1/P2 already read at least as strongly as the carried tint.
    expect(priorityBorderClass(1, true)).toBe('border-[rgba(212,105,78,0.55)]');
    expect(priorityBorderClass(2, true)).toBe('border-[rgba(210,164,110,0.45)]');
  });

  it('active picker segment pairs fill with a readable ink', () => {
    expect(prioritySegmentActiveClass(1)).toContain('bg-[#D4694E]');
    expect(prioritySegmentActiveClass(4)).toContain('text-[#F3EDE5]');
  });

  it('unknown priorities fall back to the P3 neutral-ish style', () => {
    expect(priorityBorderClass(0)).toBe(priorityBorderClass(3));
    expect(priorityTextClass(99)).toBe(priorityTextClass(3));
  });
});
