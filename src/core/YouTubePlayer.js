import { Player } from './Player.js';

/**
 * YouTube IFrame Player API backend.
 *
 * Uses the official YouTube IFrame API — fully ToS-compliant.
 * No stream extraction. No media bytes accessed.
 * https://developers.google.com/youtube/iframe_api_reference
 */
export class YouTubePlayer extends Player {
  /** @type {YT.Player|null} */
  #yt = null;

  /** @type {HTMLElement} */
  #container;

  /** @type {string|null} */
  #pendingVideoId = null;

  /** @type {ReturnType<setInterval>|null} */
  #pollTimer = null;

  static #apiLoaded = false;
  static #apiLoadCallbacks = [];

  /**
   * @param {HTMLElement|string} container  Mount point element or selector.
   * @param {object}             [options]
   * @param {number}             [options.width=640]
   * @param {number}             [options.height=360]
   * @param {boolean}            [options.autoplay=false]
   * @param {boolean}            [options.controls=true]
   */
  constructor(container, options = {}) {
    super();
    this.#container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;

    this._options = {
      width: 640,
      height: 360,
      autoplay: false,
      controls: true,
      ...options,
    };

    YouTubePlayer.#loadApi().then(() => this.#initPlayer());
  }

  // ── API loader (shared across all instances) ───────────────────────────────

  static #loadApi() {
    if (YouTubePlayer.#apiLoaded) return Promise.resolve();

    return new Promise((resolve) => {
      YouTubePlayer.#apiLoadCallbacks.push(resolve);

      if (document.getElementById('yt-iframe-api-script')) return;

      const script = document.createElement('script');
      script.id = 'yt-iframe-api-script';
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);

      // YouTube calls this global when the API is ready
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        YouTubePlayer.#apiLoaded = true;
        YouTubePlayer.#apiLoadCallbacks.forEach((cb) => cb());
        YouTubePlayer.#apiLoadCallbacks = [];
        prev?.();
      };
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  #initPlayer() {
    const autoplay = this._options.autoplay ? 1 : 0;
    const controls = this._options.controls ? 1 : 0;

    this.#yt = new window.YT.Player(this.#container, {
      width: this._options.width,
      height: this._options.height,
      videoId: this.#pendingVideoId ?? '',
      playerVars: {
        autoplay,
        controls,
        rel: 0,         // No unrelated video suggestions
        modestbranding: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          this._setState('paused');
          this.emit('ready');
          if (this.#pendingVideoId) {
            this.#pendingVideoId = null;
          }
        },
        onStateChange: (e) => this.#onStateChange(e.data),
        onError: (e) => {
          this._setState('error');
          this.emit('error', new Error(`YouTube player error code: ${e.data}`));
        },
      },
    });
  }

  #onStateChange(state) {
    const S = window.YT.PlayerState;
    switch (state) {
      case S.PLAYING:
        this._setState('playing');
        this.emit('play');
        this.#startPoll();
        break;
      case S.PAUSED:
        this._setState('paused');
        this.emit('pause');
        this.#stopPoll();
        break;
      case S.ENDED:
        this._setState('ended');
        this.emit('ended');
        this.#stopPoll();
        break;
      case S.BUFFERING:
        this._setState('loading');
        break;
    }
  }

  // YouTube IFrame API does not fire timeupdate events natively,
  // so we poll at ~250ms during playback.
  #startPoll() {
    if (this.#pollTimer) return;
    this.#pollTimer = setInterval(() => {
      if (!this.#yt) return;
      this.emit('timeupdate', this.currentTime, this.duration);
    }, 250);
  }

  #stopPoll() {
    clearInterval(this.#pollTimer);
    this.#pollTimer = null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Load a YouTube video by its 11-character video ID.
   * Only the video ID is used — no media bytes are ever accessed by this code.
   * @param {string} videoId
   */
  load(videoId) {
    this._setState('loading');
    if (this.#yt) {
      this.#yt.loadVideoById(videoId);
    } else {
      this.#pendingVideoId = videoId;
    }
    return this;
  }

  play() {
    this.#yt?.playVideo();
    return this;
  }

  pause() {
    this.#yt?.pauseVideo();
    return this;
  }

  seek(seconds) {
    this.#yt?.seekTo(seconds, true);
    return this;
  }

  destroy() {
    this.#stopPoll();
    this.#yt?.destroy();
    this.#yt = null;
    super.destroy();
  }

  // ── Getters / Setters ──────────────────────────────────────────────────────

  get currentTime() {
    return this.#yt?.getCurrentTime() ?? 0;
  }

  get duration() {
    return this.#yt?.getDuration() ?? 0;
  }

  get volume() {
    return (this.#yt?.getVolume() ?? 100) / 100;
  }

  set volume(v) {
    this.#yt?.setVolume(Math.max(0, Math.min(1, v)) * 100);
  }

  get muted() {
    return this.#yt?.isMuted() ?? false;
  }

  set muted(m) {
    m ? this.#yt?.mute() : this.#yt?.unMute();
  }

  /** YouTube IFrame API does not support custom playback rates on all videos. */
  get playbackRate() {
    return this.#yt?.getPlaybackRate() ?? 1;
  }

  set playbackRate(r) {
    this.#yt?.setPlaybackRate(r);
  }
}
