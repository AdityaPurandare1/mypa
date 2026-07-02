import { describe, expect, it } from 'vitest';
import {
  priorityBorderClass,
  priorityTextClass,
  priorityBgClass,
  prioritySegmentActiveClass,
} from './ui';

describe('priority styling', () => {
  it('each level gets a distinct bright hue: P1 red, P2 amber, P3 blue, P4 neutral', () => {
    expect(priorityBorderClass(1)).toBe('border-[#FF5A3C]');
    expect(priorityBorderClass(2)).toBe('border-[#FFAE42]');
    expect(priorityBorderClass(3)).toBe('border-[#4DA3FF]');
    expect(priorityBorderClass(4)).toBe('border-hairline');

    expect(priorityTextClass(1)).toBe('text-[#FF6B4A]');
    expect(priorityTextClass(2)).toBe('text-[#FFB74D]');
    expect(priorityTextClass(3)).toBe('text-[#5FADFF]');

    expect(priorityBgClass(1)).toBe('bg-[#FF5A3C]');
    expect(priorityBgClass(3)).toBe('bg-[#4DA3FF]');
  });

  it('carried keeps at least the amber emphasis for low priorities', () => {
    expect(priorityBorderClass(3, true)).toBe('border-[#FFAE42]');
    expect(priorityBorderClass(4, true)).toBe('border-[#FFAE42]');
    // P1/P2 already read at least as strongly as the carried tint.
    expect(priorityBorderClass(1, true)).toBe('border-[#FF5A3C]');
    expect(priorityBorderClass(2, true)).toBe('border-[#FFAE42]');
  });

  it('active picker segment pairs fill with a readable ink', () => {
    expect(prioritySegmentActiveClass(1)).toContain('bg-[#FF5A3C]');
    expect(prioritySegmentActiveClass(4)).toContain('text-[#191612]');
  });

  it('unknown priorities fall back to the P3 style', () => {
    expect(priorityBorderClass(0)).toBe(priorityBorderClass(3));
    expect(priorityTextClass(99)).toBe(priorityTextClass(3));
  });
});
