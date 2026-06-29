import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Player } from './Player.js';

// Concrete subclass that exposes protected internals for testing
class TestPlayer extends Player {
  load(src)       { this._setState('loading'); this._src = src; }
  play()          { this._setState('playing'); }
  pause()         { this._setState('paused'); }
  seek(s)         { this._seeked = s; }
  get currentTime() { return this._ct ?? 0; }
  get duration()    { return this._dur ?? 0; }
  get volume()      { return this._vol ?? 1; }
  set volume(v)     { this._vol = v; }
  get muted()       { return this._muted ?? false; }
  set muted(m)      { this._muted = m; }
  get playbackRate() { return this._rate ?? 1; }
  set playbackRate(r){ this._rate = r; }
}

describe('Player (base class)', () => {
  let player;

  beforeEach(() => { player = new TestPlayer(); });

  it('starts in idle state', () => {
    expect(player.state).toBe('idle');
  });

  it('emits statechange when _setState called', () => {
    const handler = vi.fn();
    player.on('statechange', handler);
    player.load('file.mp4');
    expect(handler).toHaveBeenCalledWith('loading');
  });

  it('paused is true when state is not playing', () => {
    expect(player.paused).toBe(true);
    player.play();
    expect(player.paused).toBe(false);
    player.pause();
    expect(player.paused).toBe(true);
  });

  it('transitions: idle → loading → playing → paused → ended', () => {
    const states = [];
    player.on('statechange', (s) => states.push(s));
    player.load('x');
    player.play();
    player.pause();
    player._setState('ended');
    expect(states).toEqual(['loading', 'playing', 'paused', 'ended']);
  });

  it('destroy removes all listeners', () => {
    const fn = vi.fn();
    player.on('statechange', fn);
    player.destroy();
    player._setState('playing');   // would fire if listener still attached
    expect(fn).not.toHaveBeenCalled();
  });

  it('throws for unimplemented methods on base class directly', () => {
    const base = new Player();
    expect(() => base.play()).toThrow('play() not implemented');
    expect(() => base.pause()).toThrow('pause() not implemented');
    expect(() => base.seek(0)).toThrow('seek() not implemented');
    expect(() => base.load('x')).toThrow('load() not implemented');
  });
});
