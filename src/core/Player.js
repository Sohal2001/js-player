import { EventEmitter } from '../utils/events.js';

/**
 * Abstract base class for all player backends.
 * Subclasses implement the platform-specific control methods.
 *
 * Events emitted:
 *   play, pause, ended, timeupdate, durationchange,
 *   volumechange, error, ready, seeking, seeked
 */
export class Player extends EventEmitter {
  /** @type {'idle'|'loading'|'playing'|'paused'|'ended'|'error'} */
  #state = 'idle';

  get state() {
    return this.#state;
  }

  _setState(next) {
    this.#state = next;
    this.emit('statechange', next);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Load a new source. Must be implemented by subclass. */
  load(_src) {
    throw new Error('load() not implemented');
  }

  /** Destroy the player and release resources. */
  destroy() {
    this.removeAllListeners();
  }

  // ── Playback controls ──────────────────────────────────────────────────────

  play() {
    throw new Error('play() not implemented');
  }

  pause() {
    throw new Error('pause() not implemented');
  }

  /** @param {number} seconds */
  seek(_seconds) {
    throw new Error('seek() not implemented');
  }

  // ── Accessors ──────────────────────────────────────────────────────────────

  /** Current playback position in seconds. @returns {number} */
  get currentTime() {
    return 0;
  }

  /** Total duration in seconds. @returns {number} */
  get duration() {
    return 0;
  }

  /** Volume 0–1. @returns {number} */
  get volume() {
    return 1;
  }

  /** @param {number} v 0–1 */
  set volume(_v) {
    throw new Error('volume setter not implemented');
  }

  get muted() {
    return false;
  }

  set muted(_m) {
    throw new Error('muted setter not implemented');
  }

  /** Playback rate (1 = normal). */
  get playbackRate() {
    return 1;
  }

  set playbackRate(_r) {
    throw new Error('playbackRate setter not implemented');
  }

  get paused() {
    return this.#state !== 'playing';
  }
}
