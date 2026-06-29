/**
 * Functional (black-box) tests for the JS Player public API.
 *
 * Unlike the unit tests (which target a single class) and the integration tests
 * (which wire two specific modules together), these tests drive the library the
 * way a real consumer would: through the documented `createPlayer` factory and
 * the public exports from the package entry point. They assert on user-facing
 * behaviour and DOM output, not on internals.
 *
 * Environment: jsdom (no real browser, no network).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createPlayer,
  LocalPlayer,
  YouTubePlayer,
  Controls,
  ProgressBar,
  formatTime,
} from '../index.js';

describe('Public API surface', () => {
  it('exports the documented entry points', () => {
    expect(typeof createPlayer).toBe('function');
    expect(typeof LocalPlayer).toBe('function');
    expect(typeof YouTubePlayer).toBe('function');
    expect(typeof Controls).toBe('function');
    expect(typeof ProgressBar).toBe('function');
    expect(typeof formatTime).toBe('function');
  });
});

describe('createPlayer() — local backend', () => {
  let host;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('mounts a fully-wired player and returns the documented shape', () => {
    const result = createPlayer(host, 'local');

    expect(result).toHaveProperty('player');
    expect(result).toHaveProperty('controls');
    expect(result).toHaveProperty('mount');
    expect(result.player).toBeInstanceOf(LocalPlayer);
    expect(result.controls).toBeInstanceOf(Controls);
    expect(result.mount).toBe(host);
  });

  it('renders the player shell, a <video> element and a control bar', () => {
    const { controls } = createPlayer(host, 'local');

    expect(host.classList.contains('jsp-player')).toBe(true);
    expect(host.querySelector('video')).toBeTruthy();
    expect(host.querySelector('.jsp-video-wrapper')).toBeTruthy();
    expect(host.querySelector('.jsp-controls')).toBeTruthy();
    expect(host.contains(controls.element)).toBe(true);
  });

  it('defaults to the local backend when no type is given', () => {
    const { player } = createPlayer(host);
    expect(player).toBeInstanceOf(LocalPlayer);
  });

  it('accepts a CSS selector string as the container', () => {
    host.id = 'fn-mount';
    const { mount } = createPlayer('#fn-mount', 'local');
    expect(mount).toBe(host);
  });

  it('reflects player state on the root via data-state (for CSS hooks)', () => {
    const { player } = createPlayer(host, 'local');
    expect(host.getAttribute('data-state')).toBe('idle');

    player._setState('loading');
    expect(host.getAttribute('data-state')).toBe('loading');

    player._setState('playing');
    expect(host.getAttribute('data-state')).toBe('playing');
  });

  it('shows an error message in the state overlay on playback error', () => {
    const { player } = createPlayer(host, 'local');
    player._setState('error');
    const overlay = host.querySelector('.jsp-state-overlay');
    expect(overlay.textContent).toContain('error');
  });

  it('loads a source through the public player API', () => {
    const { player } = createPlayer(host, 'local');
    vi.spyOn(player.element, 'load').mockImplementation(() => {});

    player.load('https://example.com/clip.mp4');

    expect(player.element.getAttribute('src')).toBe(
      'https://example.com/clip.mp4',
    );
    expect(player.state).toBe('loading');
  });

  it('drives playback by clicking the rendered play button', async () => {
    const { player } = createPlayer(host, 'local');
    const playSpy = vi
      .spyOn(player.element, 'play')
      .mockResolvedValue(undefined);

    const playBtn = host.querySelector('.jsp-controls button');
    expect(playBtn).toBeTruthy();
    playBtn.click();

    expect(playSpy).toHaveBeenCalled();
  });

  it('toggles play/pause via the tap overlay', () => {
    const { player } = createPlayer(host, 'local');
    const playSpy = vi
      .spyOn(player.element, 'play')
      .mockResolvedValue(undefined);
    const pauseSpy = vi
      .spyOn(player.element, 'pause')
      .mockImplementation(() => {});

    const overlay = host.querySelector('.jsp-tap-overlay');
    expect(overlay).toBeTruthy();

    overlay.click(); // paused → play
    expect(playSpy).toHaveBeenCalled();

    player._setState('playing'); // now "not paused"
    overlay.click(); // playing → pause
    expect(pauseSpy).toHaveBeenCalled();
  });

  it('keeps the control bar time display in sync with player events', () => {
    const { player } = createPlayer(host, 'local');
    Object.defineProperty(player.element, 'duration', {
      get: () => 120,
      configurable: true,
    });
    Object.defineProperty(player.element, 'currentTime', {
      get: () => 30,
      configurable: true,
    });

    player.element.dispatchEvent(new Event('timeupdate'));

    const time = host.querySelector('.jsp-controls').textContent;
    expect(time).toContain(formatTime(30));
    expect(time).toContain(formatTime(120));
  });
});

describe('createPlayer() — youtube backend', () => {
  let host;
  let ytInstances;

  beforeEach(() => {
    ytInstances = [];
    class FakeYTPlayer {
      constructor(el, config) {
        this.el = el;
        this.config = config;
        this.destroy = vi.fn();
        ytInstances.push(this);
      }
    }
    window.YT = {
      Player: FakeYTPlayer,
      PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 },
    };
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('creates a YouTube-backed player from the factory', () => {
    const { player, controls } = createPlayer(host, 'youtube');
    expect(player).toBeInstanceOf(YouTubePlayer);
    expect(controls).toBeInstanceOf(Controls);
    // No raw <video> element for the YouTube backend (uses an iframe mount).
    expect(host.querySelector('video')).toBeNull();
  });
});
