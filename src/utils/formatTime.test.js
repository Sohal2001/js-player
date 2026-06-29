import { describe, it, expect } from 'vitest';
import { formatTime } from './formatTime.js';

describe('formatTime', () => {
  it('formats seconds under a minute', () => {
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(59)).toBe('0:59');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(599)).toBe('9:59');
  });

  it('formats hours', () => {
    expect(formatTime(3600)).toBe('1:00:00');
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(36000)).toBe('10:00:00');
  });

  it('returns 0:00 for invalid input', () => {
    expect(formatTime(-1)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });

  it('floors fractional seconds', () => {
    expect(formatTime(61.9)).toBe('1:01');
  });
});
