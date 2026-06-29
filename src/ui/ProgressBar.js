/**
 * Seek / progress bar component.
 * Renders a track with a filled region and a draggable thumb.
 */
export class ProgressBar {
  /** @type {HTMLElement} */
  #root;
  #track;
  #fill;
  #thumb;
  #isDragging = false;
  #onSeek;

  /** @param {(fraction: number) => void} onSeek  Called with 0–1 fraction when user seeks. */
  constructor(onSeek) {
    this.#onSeek = onSeek;
    this.#root = this.#build();
    this.#bindDrag();
  }

  // ── Build DOM ──────────────────────────────────────────────────────────────

  #build() {
    const root = document.createElement('div');
    root.className = 'jsp-progress';
    root.setAttribute('role', 'slider');
    root.setAttribute('aria-label', 'Seek');
    root.setAttribute('aria-valuemin', '0');
    root.setAttribute('aria-valuemax', '100');
    root.setAttribute('aria-valuenow', '0');
    root.tabIndex = 0;

    this.#track = document.createElement('div');
    this.#track.className = 'jsp-progress__track';

    this.#fill = document.createElement('div');
    this.#fill.className = 'jsp-progress__fill';

    this.#thumb = document.createElement('div');
    this.#thumb.className = 'jsp-progress__thumb';

    this.#track.append(this.#fill, this.#thumb);
    root.append(this.#track);
    return root;
  }

  // ── Drag handling ──────────────────────────────────────────────────────────

  #bindDrag() {
    const getFraction = (clientX) => {
      const rect = this.#track.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };

    this.#root.addEventListener('mousedown', (e) => {
      this.#isDragging = true;
      this.#seek(getFraction(e.clientX));
    });

    this.#root.addEventListener('touchstart', (e) => {
      this.#isDragging = true;
      this.#seek(getFraction(e.touches[0].clientX));
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
      if (!this.#isDragging) return;
      this.#seek(getFraction(e.clientX));
    });

    document.addEventListener('touchmove', (e) => {
      if (!this.#isDragging) return;
      this.#seek(getFraction(e.touches[0].clientX));
    }, { passive: true });

    document.addEventListener('mouseup', () => { this.#isDragging = false; });
    document.addEventListener('touchend', () => { this.#isDragging = false; });

    // Keyboard: left/right arrow ±5%
    this.#root.addEventListener('keydown', (e) => {
      const now = parseFloat(this.#root.getAttribute('aria-valuenow')) / 100;
      if (e.key === 'ArrowRight') this.#seek(Math.min(1, now + 0.05));
      if (e.key === 'ArrowLeft') this.#seek(Math.max(0, now - 0.05));
    });
  }

  #seek(fraction) {
    this.#update(fraction);
    this.#onSeek(fraction);
  }

  // ── Public ─────────────────────────────────────────────────────────────────

  /**
   * Update the visual position without firing seek callback.
   * @param {number} currentTime
   * @param {number} duration
   */
  update(currentTime, duration) {
    if (this.#isDragging) return;
    const fraction = duration > 0 ? currentTime / duration : 0;
    this.#update(fraction);
  }

  #update(fraction) {
    const pct = `${fraction * 100}%`;
    this.#fill.style.width = pct;
    this.#thumb.style.left = pct;
    this.#root.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
  }

  /** @returns {HTMLElement} */
  get element() {
    return this.#root;
  }
}
