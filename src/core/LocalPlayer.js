import { Player } from './Player.js';

/**
 * HTML5 <video> backend for local / direct-URL media.
 * Supports any format the browser natively handles.
 */
export class LocalPlayer extends Player {
  /** @type {HTMLVideoElement} */
  #video;

  /**
   * @param {HTMLVideoElement|string} target  Existing element or CSS selector.
   */
  constructor(target) {
    super();
    this.#video =
      typeof target === 'string' ? document.querySelector(target) : target;

    if (!(this.#video instanceof HTMLVideoElement)) {
      throw new TypeError('LocalPlayer requires an HTMLVideoElement target');
    }

    this.#bindEvents();
  }

  // ── Private ────────────────────────────────────────────────────────────────

  #bindEvents() {
    const v = this.#video;

    v.addEventListener('play', () => {
      this._setState('playing');
      this.emit('play');
    });

    v.addEventListener('pause', () => {
      this._setState('paused');
      this.emit('pause');
    });

    v.addEventListener('ended', () => {
      this._setState('ended');
      this.emit('ended');
    });

    v.addEventListener('timeupdate', () => {
      this.emit('timeupdate', v.currentTime, v.duration);
    });

    v.addEventListener('durationchange', () => {
      this.emit('durationchange', v.duration);
    });

    v.addEventListener('volumechange', () => {
      this.emit('volumechange', v.volume, v.muted);
    });

    v.addEventListener('seeking', () => this.emit('seeking', v.currentTime));
    v.addEventListener('seeked', () => this.emit('seeked', v.currentTime));

    v.addEventListener('canplay', () => {
      this._setState('paused');
      this.emit('ready');
    });

    v.addEventListener('error', (e) => {
      this._setState('error');
      this.emit('error', v.error ?? e);
    });

    v.addEventListener('waiting', () => this._setState('loading'));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * @param {string} src  URL or object URL for the video file.
   */
  load(src) {
    this._setState('loading');
    this.#video.src = src;
    this.#video.load();
    return this;
  }

  play() {
    return this.#video.play();
  }

  pause() {
    this.#video.pause();
    return this;
  }

  seek(seconds) {
    this.#video.currentTime = Math.max(0, Math.min(seconds, this.duration));
    return this;
  }

  destroy() {
    this.#video.pause();
    this.#video.removeAttribute('src');
    this.#video.load();
    super.destroy();
  }

  // ── Getters / Setters ──────────────────────────────────────────────────────

  get currentTime() {
    return this.#video.currentTime;
  }

  get duration() {
    return this.#video.duration ?? 0;
  }

  get volume() {
    return this.#video.volume;
  }

  set volume(v) {
    this.#video.volume = Math.max(0, Math.min(1, v));
  }

  get muted() {
    return this.#video.muted;
  }

  set muted(m) {
    this.#video.muted = Boolean(m);
  }

  get playbackRate() {
    return this.#video.playbackRate;
  }

  set playbackRate(r) {
    this.#video.playbackRate = r;
  }

  /** @returns {HTMLVideoElement} */
  get element() {
    return this.#video;
  }
}
