/**
 * Integration tests — LocalPlayer + Controls wired together.
 * Verifies end-to-end data flow without mocking internals.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalPlayer } from '../core/LocalPlayer.js';
import { Controls } from '../ui/Controls.js';

function makeVideoEl() {
  const el = document.createElement('video');
  let _duration = 100;

  vi.spyOn(el, 'play').mockResolvedValue(undefined);
  vi.spyOn(el, 'pause').mockImplementation(() => {});
  vi.spyOn(el, 'load').mockImplementation(() => {});

  Object.defineProperty(el, 'duration', {
    get: () => _duration,
    set: (v) => { _duration = v; },
    configurable: true,
  });

  return el;
}

describe('LocalPlayer + Controls integration', () => {
  let video, player, controls;

  beforeEach(() => {
    video    = makeVideoEl();
    player   = new LocalPlayer(video);
    controls = new Controls(player);
  });

  it('clicking play button triggers video.play()', () => {
    controls.element.querySelector('.jsp-btn--play').click();
    expect(video.play).toHaveBeenCalled();
  });

  it('native "play" event propagates to controls button label', () => {
    video.dispatchEvent(new Event('play'));
    expect(controls.element.querySelector('.jsp-btn--play').textContent).toBe('⏸');
  });

  it('native "pause" event propagates to controls button label', () => {
    video.dispatchEvent(new Event('play'));
    video.dispatchEvent(new Event('pause'));
    expect(controls.element.querySelector('.jsp-btn--play').textContent).toBe('▶');
  });

  it('native timeupdate event updates progress bar fill', () => {
    video.currentTime = 25;
    video.duration = 100;
    video.dispatchEvent(new Event('timeupdate'));
    const fill = controls.element.querySelector('.jsp-progress__fill');
    expect(fill.style.width).toBe('25%');
  });

  it('native timeupdate event updates time display', () => {
    video.currentTime = 90;
    video.duration = 180;
    video.dispatchEvent(new Event('timeupdate'));
    expect(controls.element.querySelector('.jsp-time').textContent).toBe('1:30 / 3:00');
  });

  it('volume slider change propagates to video element volume', () => {
    const slider = controls.element.querySelector('.jsp-volume');
    slider.value = '40';
    slider.dispatchEvent(new Event('input'));
    expect(video.volume).toBeCloseTo(0.4, 2);
  });

  it('speed selector change propagates to video playbackRate', () => {
    const sel = controls.element.querySelector('.jsp-speed');
    sel.value = '2';
    sel.dispatchEvent(new Event('change'));
    expect(video.playbackRate).toBe(2);
  });

  it('native volumechange event syncs slider to video volume', () => {
    video.volume = 0.3;
    video.dispatchEvent(new Event('volumechange'));
    const slider = controls.element.querySelector('.jsp-volume');
    expect(parseInt(slider.value)).toBe(30);
  });

  it('mute button toggling updates mute button icon and video.muted', () => {
    const muteBtn = controls.element.querySelector('.jsp-btn--mute');
    muteBtn.click();
    expect(video.muted).toBe(true);
    video.dispatchEvent(new Event('volumechange'));
    expect(muteBtn.textContent).toBe('🔇');
    muteBtn.click();
    video.dispatchEvent(new Event('volumechange'));
    expect(video.muted).toBe(false);
  });

  it('ArrowRight on progress bar calls video seek forward', () => {
    video.duration = 100;
    video.currentTime = 50;
    // Sync the progress bar to 50% before pressing ArrowRight
    video.dispatchEvent(new Event('timeupdate'));
    controls.element.querySelector('.jsp-progress').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    );
    expect(video.currentTime).toBeGreaterThan(50);
  });

  it('player state transitions are reflected in statechange events', () => {
    const states = [];
    player.on('statechange', (s) => states.push(s));
    player.load('video.mp4');
    video.dispatchEvent(new Event('canplay'));
    video.dispatchEvent(new Event('play'));
    video.dispatchEvent(new Event('pause'));
    video.dispatchEvent(new Event('ended'));
    expect(states).toEqual(['loading', 'paused', 'playing', 'paused', 'ended']);
  });

  it('destroy cleans up: no events fire after destroy', () => {
    const fn = vi.fn();
    player.on('play', fn);
    player.destroy();
    video.dispatchEvent(new Event('play'));
    expect(fn).not.toHaveBeenCalled();
  });
});
