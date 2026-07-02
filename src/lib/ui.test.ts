import { describe, expect, it } from 'vitest';
import { priorityBorderClass } from './ui';

describe('priorityBorderClass', () => {
  it('grades border intensity by priority', () => {
    expect(priorityBorderClass(1)).toBe('border-[rgba(210,164,110,0.6)]');
    expect(priorityBorderClass(2)).toBe('border-[rgba(210,164,110,0.32)]');
    expect(priorityBorderClass(3)).toBe('border-hairline');
    expect(priorityBorderClass(4)).toBe('border-[rgba(245,239,229,0.04)]');
  });

  it('carried keeps at least the soft-tan emphasis', () => {
    expect(priorityBorderClass(3, true)).toBe('border-[rgba(210,164,110,0.32)]');
    expect(priorityBorderClass(4, true)).toBe('border-[rgba(210,164,110,0.32)]');
    // P1 outranks the carried tint
    expect(priorityBorderClass(1, true)).toBe('border-[rgba(210,164,110,0.6)]');
  });
});
