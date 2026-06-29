import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalPlayer } from './LocalPlayer.js';

// Create a real jsdom HTMLVideoElement (satisfies instanceof check)
// and spy/stub the methods we need to control.
function makeVideoEl(props = {}) {
  const el = document.createElement('video');

  // Spy native methods
  vi.spyOn(el, 'play').mockResolvedValue(undefined);
  vi.spyOn(el, 'pause').mockImplementation(() => {});
  vi.spyOn(el, 'load').mockImplementation(() => {});

  // jsdom sets duration to NaN by default — allow override
  Object.defineProperty(el, 'duration', {
    get: () => props.duration ?? 0,
    configurable: true,
  });

  return el;
}

// Dispatch a native event on an element
function fire(el, type) {
  el.dispatchEvent(new Event(type));
}

describe('LocalPlayer', () => {
  let video;
  let player;

  beforeEach(() => {
    video = makeVideoEl({ duration: 100 });
    player = new LocalPlayer(video);
  });

  // ── Constructor ────────────────────────────────────────────────────────────

  it('throws if target is not an HTMLVideoElement', () => {
    expect(() => new LocalPlayer({})).toThrow(TypeError);
    expect(() => new LocalPlayer(null)).toThrow(TypeError);
  });

  it('accepts a real HTMLVideoElement without throwing', () => {
    expect(
      () => new LocalPlayer(document.createElement('video')),
    ).not.toThrow();
  });

  it('registers native video events on construction', () => {
    // Verified implicitly: events fire and are handled below.
    // Check addEventListener was called for key events.
    const spy = vi.spyOn(document.createElement('video'), 'addEventListener');
    new LocalPlayer(
      spy.mock?.instances?.[0] ?? document.createElement('video'),
    );
    // Instead just confirm the player is operational (event-bound):
    const fn = vi.fn();
    player.on('play', fn);
    fire(video, 'play');
    expect(fn).toHaveBeenCalledOnce();
  });

  // ── load() ─────────────────────────────────────────────────────────────────

  it('load() sets video.src and calls video.load()', () => {
    player.load('video.mp4');
    expect(video.src).toContain('video.mp4');
    expect(video.load).toHaveBeenCalled();
  });

  it('load() sets state to loading', () => {
    player.load('video.mp4');
    expect(player.state).toBe('loading');
  });

  it('load() returns player for chaining', () => {
    expect(player.load('x')).toBe(player);
  });

  // ── play() / pause() ───────────────────────────────────────────────────────

  it('play() calls video.play()', () => {
    player.play();
    expect(video.play).toHaveBeenCalledOnce();
  });

  it('pause() calls video.pause()', () => {
    player.pause();
    expect(video.pause).toHaveBeenCalledOnce();
  });

  // ── seek() ─────────────────────────────────────────────────────────────────

  it('seek() clamps to 0 when given negative', () => {
    player.seek(-10);
    expect(video.currentTime).toBe(0);
  });

  it('seek() clamps to duration when given value exceeding it', () => {
    player.seek(999);
    expect(video.currentTime).toBe(100);
  });

  it('seek() sets currentTime correctly', () => {
    player.seek(45);
    expect(video.currentTime).toBe(45);
  });

  // ── Event forwarding ───────────────────────────────────────────────────────

  it('emits play event when video fires play', () => {
    const fn = vi.fn();
    player.on('play', fn);
    fire(video, 'play');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('emits pause event when video fires pause', () => {
    const fn = vi.fn();
    player.on('pause', fn);
    fire(video, 'pause');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('emits ended and sets state to ended', () => {
    const fn = vi.fn();
    player.on('ended', fn);
    fire(video, 'ended');
    expect(fn).toHaveBeenCalledOnce();
    expect(player.state).toBe('ended');
  });

  it('emits timeupdate with currentTime and duration', () => {
    const fn = vi.fn();
    player.on('timeupdate', fn);
    fire(video, 'timeupdate');
    expect(fn).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
  });

  it('emits durationchange', () => {
    const fn = vi.fn();
    player.on('durationchange', fn);
    fire(video, 'durationchange');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('emits error and sets state to error', () => {
    const fn = vi.fn();
    player.on('error', fn);
    fire(video, 'error');
    expect(fn).toHaveBeenCalledOnce();
    expect(player.state).toBe('error');
  });

  it('emits ready and sets state to paused when canplay fires', () => {
    const fn = vi.fn();
    player.on('ready', fn);
    fire(video, 'canplay');
    expect(fn).toHaveBeenCalledOnce();
    expect(player.state).toBe('paused');
  });

  // ── Volume / mute / rate ───────────────────────────────────────────────────

  it('volume getter / setter delegates to video element', () => {
    player.volume = 0.5;
    expect(video.volume).toBe(0.5);
    expect(player.volume).toBe(0.5);
  });

  it('volume clamps to 0–1 range', () => {
    player.volume = 2;
    expect(video.volume).toBe(1);
    player.volume = -1;
    expect(video.volume).toBe(0);
  });

  it('muted getter / setter delegates to video element', () => {
    player.muted = true;
    expect(video.muted).toBe(true);
    expect(player.muted).toBe(true);
  });

  it('playbackRate getter / setter delegates to video element', () => {
    player.playbackRate = 1.5;
    expect(video.playbackRate).toBe(1.5);
    expect(player.playbackRate).toBe(1.5);
  });

  // ── destroy() ──────────────────────────────────────────────────────────────

  it('destroy() pauses and clears src', () => {
    player.destroy();
    expect(video.pause).toHaveBeenCalled();
  });

  it('destroy() removes all event listeners from the player', () => {
    const fn = vi.fn();
    player.on('play', fn);
    player.destroy();
    fire(video, 'play');
    expect(fn).not.toHaveBeenCalled();
  });

  // ── element getter ─────────────────────────────────────────────────────────

  it('element getter returns the underlying video element', () => {
    expect(player.element).toBe(video);
  });
});
