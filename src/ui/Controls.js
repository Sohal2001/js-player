import { ProgressBar } from './ProgressBar.js';
import { formatTime } from '../utils/formatTime.js';

/**
 * Full player controls bar: play/pause, seek, time, volume, mute, speed.
 */
export class Controls {
  #root;
  #btnPlayPause;
  #timeDisplay;
  #progressBar;
  #volumeSlider;
  #btnMute;
  #speedSelect;
  #player;

  /** @param {import('../core/Player.js').Player} player */
  constructor(player) {
    this.#player = player;
    this.#progressBar = new ProgressBar((frac) => {
      player.seek(frac * player.duration);
    });
    this.#root = this.#build();
    this.#bindPlayerEvents();
  }

  // ── DOM ────────────────────────────────────────────────────────────────────

  #build() {
    const root = document.createElement('div');
    root.className = 'jsp-controls';

    // ── Row 1: progress bar ──
    root.append(this.#progressBar.element);

    // ── Row 2: buttons ──
    const row = document.createElement('div');
    row.className = 'jsp-controls__row';

    // Play / Pause
    this.#btnPlayPause = this.#btn('▶', 'Play', 'jsp-btn jsp-btn--play', () => {
      this.#player.paused ? this.#player.play() : this.#player.pause();
    });

    // Time display
    this.#timeDisplay = document.createElement('span');
    this.#timeDisplay.className = 'jsp-time';
    this.#timeDisplay.textContent = '0:00 / 0:00';

    // Mute
    this.#btnMute = this.#btn('🔊', 'Mute', 'jsp-btn jsp-btn--mute', () => {
      this.#player.muted = !this.#player.muted;
    });

    // Volume slider
    this.#volumeSlider = document.createElement('input');
    this.#volumeSlider.type = 'range';
    this.#volumeSlider.min = '0';
    this.#volumeSlider.max = '100';
    this.#volumeSlider.value = '100';
    this.#volumeSlider.className = 'jsp-volume';
    this.#volumeSlider.setAttribute('aria-label', 'Volume');
    this.#volumeSlider.addEventListener('input', () => {
      this.#player.volume = Number(this.#volumeSlider.value) / 100;
    });

    // Speed selector
    this.#speedSelect = document.createElement('select');
    this.#speedSelect.className = 'jsp-speed';
    this.#speedSelect.setAttribute('aria-label', 'Playback speed');
    [0.5, 0.75, 1, 1.25, 1.5, 2].forEach((r) => {
      const opt = document.createElement('option');
      opt.value = String(r);
      opt.textContent = `${r}×`;
      if (r === 1) opt.selected = true;
      this.#speedSelect.append(opt);
    });
    this.#speedSelect.addEventListener('change', () => {
      this.#player.playbackRate = Number(this.#speedSelect.value);
    });

    row.append(
      this.#btnPlayPause,
      this.#timeDisplay,
      this.#btnMute,
      this.#volumeSlider,
      this.#speedSelect,
    );
    root.append(row);
    return root;
  }

  #btn(label, ariaLabel, className, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.textContent = label;
    b.setAttribute('aria-label', ariaLabel);
    b.addEventListener('click', onClick);
    return b;
  }

  // ── Player event bindings ──────────────────────────────────────────────────

  #bindPlayerEvents() {
    const p = this.#player;

    p.on('play', () => {
      this.#btnPlayPause.textContent = '⏸';
      this.#btnPlayPause.setAttribute('aria-label', 'Pause');
    });

    p.on('pause', () => {
      this.#btnPlayPause.textContent = '▶';
      this.#btnPlayPause.setAttribute('aria-label', 'Play');
    });

    p.on('ended', () => {
      this.#btnPlayPause.textContent = '↩';
      this.#btnPlayPause.setAttribute('aria-label', 'Replay');
    });

    p.on('timeupdate', (current, duration) => {
      this.#progressBar.update(current, duration);
      this.#timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    });

    p.on('volumechange', (vol, muted) => {
      this.#btnMute.textContent = muted || vol === 0 ? '🔇' : '🔊';
      this.#volumeSlider.value = String(Math.round(vol * 100));
    });
  }

  /** @returns {HTMLElement} */
  get element() {
    return this.#root;
  }
}
