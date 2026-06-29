import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Controls } from './Controls.js';
import { EventEmitter } from '../utils/events.js';

// Minimal Player stub — just needs EventEmitter + the fields Controls reads
class StubPlayer extends EventEmitter {
  state = 'paused';
  paused = true;
  volume = 1;
  muted = false;
  playbackRate = 1;
  duration = 120;
  currentTime = 0;

  play  = vi.fn(() => { this.paused = false; this.emit('play'); });
  pause = vi.fn(() => { this.paused = true;  this.emit('pause'); });
  seek  = vi.fn((s) => { this.currentTime = s; });
}

describe('Controls', () => {
  let player;
  let controls;

  beforeEach(() => {
    player   = new StubPlayer();
    controls = new Controls(player);
  });

  // ── DOM structure ──────────────────────────────────────────────────────────

  it('element getter returns a DOM node', () => {
    expect(controls.element.nodeType).toBe(1);
  });

  it('contains a play/pause button', () => {
    expect(controls.element.querySelector('.jsp-btn--play')).toBeTruthy();
  });

  it('contains a mute button', () => {
    expect(controls.element.querySelector('.jsp-btn--mute')).toBeTruthy();
  });

  it('contains a volume input', () => {
    const vol = controls.element.querySelector('.jsp-volume');
    expect(vol).toBeTruthy();
    expect(vol.type).toBe('range');
  });

  it('contains a speed selector with 6 options', () => {
    const sel = controls.element.querySelector('.jsp-speed');
    expect(sel).toBeTruthy();
    expect(sel.options.length).toBe(6);
  });

  it('contains a progress bar element', () => {
    expect(controls.element.querySelector('.jsp-progress')).toBeTruthy();
  });

  it('contains a time display', () => {
    expect(controls.element.querySelector('.jsp-time')).toBeTruthy();
  });

  // ── Play/pause button ──────────────────────────────────────────────────────

  it('clicking play button calls player.play() when paused', () => {
    player.paused = true;
    controls.element.querySelector('.jsp-btn--play').click();
    expect(player.play).toHaveBeenCalledOnce();
  });

  it('clicking play button calls player.pause() when playing', () => {
    player.paused = false;
    controls.element.querySelector('.jsp-btn--play').click();
    expect(player.pause).toHaveBeenCalledOnce();
  });

  it('play event changes button text to ⏸', () => {
    const btn = controls.element.querySelector('.jsp-btn--play');
    player.emit('play');
    expect(btn.textContent).toBe('⏸');
  });

  it('pause event changes button text back to ▶', () => {
    const btn = controls.element.querySelector('.jsp-btn--play');
    player.emit('play');
    player.emit('pause');
    expect(btn.textContent).toBe('▶');
  });

  it('ended event changes button text to ↩', () => {
    const btn = controls.element.querySelector('.jsp-btn--play');
    player.emit('ended');
    expect(btn.textContent).toBe('↩');
  });

  // ── Mute button ────────────────────────────────────────────────────────────

  it('clicking mute button toggles player.muted', () => {
    expect(player.muted).toBe(false);
    controls.element.querySelector('.jsp-btn--mute').click();
    expect(player.muted).toBe(true);
    controls.element.querySelector('.jsp-btn--mute').click();
    expect(player.muted).toBe(false);
  });

  it('volumechange event with muted=true changes mute button to 🔇', () => {
    const btn = controls.element.querySelector('.jsp-btn--mute');
    player.emit('volumechange', 1, true);
    expect(btn.textContent).toBe('🔇');
  });

  it('volumechange event with muted=false changes mute button to 🔊', () => {
    const btn = controls.element.querySelector('.jsp-btn--mute');
    player.emit('volumechange', 0.8, false);
    expect(btn.textContent).toBe('🔊');
  });

  // ── Volume slider ──────────────────────────────────────────────────────────

  it('volumechange event updates slider value', () => {
    player.emit('volumechange', 0.6, false);
    const slider = controls.element.querySelector('.jsp-volume');
    expect(slider.value).toBe('60');
  });

  it('changing volume slider sets player.volume', () => {
    const slider = controls.element.querySelector('.jsp-volume');
    slider.value = '75';
    slider.dispatchEvent(new Event('input'));
    expect(player.volume).toBeCloseTo(0.75, 2);
  });

  // ── Speed selector ─────────────────────────────────────────────────────────

  it('changing speed selector sets player.playbackRate', () => {
    const sel = controls.element.querySelector('.jsp-speed');
    sel.value = '1.5';
    sel.dispatchEvent(new Event('change'));
    expect(player.playbackRate).toBe(1.5);
  });

  it('default speed is 1×', () => {
    const sel = controls.element.querySelector('.jsp-speed');
    expect(sel.value).toBe('1');
  });

  // ── Time display ───────────────────────────────────────────────────────────

  it('timeupdate event updates time display', () => {
    player.emit('timeupdate', 65, 180);
    const display = controls.element.querySelector('.jsp-time').textContent;
    expect(display).toBe('1:05 / 3:00');
  });

  it('timeupdate event updates progress bar', () => {
    player.emit('timeupdate', 30, 120);
    const fill = controls.element.querySelector('.jsp-progress__fill');
    expect(fill.style.width).toBe('25%');
  });
});
