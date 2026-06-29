import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressBar } from './ProgressBar.js';

describe('ProgressBar', () => {
  let onSeek;
  let bar;

  beforeEach(() => {
    onSeek = vi.fn();
    bar = new ProgressBar(onSeek);

    // Stub getBoundingClientRect so click positions are meaningful
    bar.element.querySelector('.jsp-progress__track').getBoundingClientRect =
      () => ({
        left: 0,
        width: 200,
        top: 0,
        height: 4,
      });
  });

  // ── DOM structure ──────────────────────────────────────────────────────────

  it('creates a root element with class jsp-progress', () => {
    expect(bar.element.className).toContain('jsp-progress');
  });

  it('contains track, fill and thumb children', () => {
    expect(bar.element.querySelector('.jsp-progress__track')).toBeTruthy();
    expect(bar.element.querySelector('.jsp-progress__fill')).toBeTruthy();
    expect(bar.element.querySelector('.jsp-progress__thumb')).toBeTruthy();
  });

  it('has role="slider" and aria attributes', () => {
    expect(bar.element.getAttribute('role')).toBe('slider');
    expect(bar.element.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.element.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.element.getAttribute('aria-valuenow')).toBe('0');
  });

  it('is keyboard focusable (tabIndex 0)', () => {
    expect(bar.element.tabIndex).toBe(0);
  });

  // ── update() ──────────────────────────────────────────────────────────────

  it('update() sets fill width as a percentage', () => {
    const fill = bar.element.querySelector('.jsp-progress__fill');
    bar.update(30, 100);
    expect(fill.style.width).toBe('30%');
  });

  it('update() sets thumb left as a percentage', () => {
    const thumb = bar.element.querySelector('.jsp-progress__thumb');
    bar.update(50, 200);
    expect(thumb.style.left).toBe('25%');
  });

  it('update() updates aria-valuenow', () => {
    bar.update(75, 100);
    expect(bar.element.getAttribute('aria-valuenow')).toBe('75');
  });

  it('update() handles duration=0 without dividing by zero', () => {
    expect(() => bar.update(0, 0)).not.toThrow();
    expect(bar.element.querySelector('.jsp-progress__fill').style.width).toBe(
      '0%',
    );
  });

  it('update() rounds aria-valuenow', () => {
    bar.update(1, 3); // 33.33...%
    const val = parseInt(bar.element.getAttribute('aria-valuenow'));
    expect(val).toBe(33);
  });

  // ── Keyboard seek ──────────────────────────────────────────────────────────

  it('ArrowRight key calls onSeek with +5% fraction', () => {
    bar.update(50, 100); // set position to 50%
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
    });
    bar.element.dispatchEvent(event);
    const called = onSeek.mock.calls[0][0];
    expect(called).toBeCloseTo(0.55, 2); // 50% + 5% = 55%
  });

  it('ArrowLeft key calls onSeek with -5% fraction', () => {
    bar.update(50, 100);
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
    });
    bar.element.dispatchEvent(event);
    const called = onSeek.mock.calls[0][0];
    expect(called).toBeCloseTo(0.45, 2);
  });

  it('ArrowLeft does not go below 0', () => {
    bar.update(0, 100);
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
    });
    bar.element.dispatchEvent(event);
    const called = onSeek.mock.calls[0][0];
    expect(called).toBe(0);
  });

  it('ArrowRight does not exceed 1', () => {
    bar.update(100, 100);
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
    });
    bar.element.dispatchEvent(event);
    const called = onSeek.mock.calls[0][0];
    expect(called).toBe(1);
  });

  it('unrelated keys do not trigger onSeek', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    bar.element.dispatchEvent(event);
    expect(onSeek).not.toHaveBeenCalled();
  });

  // ── element getter ─────────────────────────────────────────────────────────

  it('element getter returns the root DOM node', () => {
    expect(bar.element.nodeType).toBe(1); // ELEMENT_NODE
  });
});
