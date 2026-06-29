/**
 * Juhi Sohal Player (JS Player)
 * A lightweight JavaScript video player supporting local HTML5 video
 * and YouTube IFrame API (ToS-compliant embedded playback).
 */

export { Player } from './core/Player.js';
export { LocalPlayer } from './core/LocalPlayer.js';
export { YouTubePlayer } from './core/YouTubePlayer.js';
export { Controls } from './ui/Controls.js';
export { ProgressBar } from './ui/ProgressBar.js';
export { EventEmitter } from './utils/events.js';
export { formatTime } from './utils/formatTime.js';

// ── Convenience factory ────────────────────────────────────────────────────

import { LocalPlayer } from './core/LocalPlayer.js';
import { YouTubePlayer } from './core/YouTubePlayer.js';
import { Controls } from './ui/Controls.js';

/**
 * Mount a fully-wired JS Player into a container element.
 *
 * @param {HTMLElement|string} container
 * @param {'local'|'youtube'}  type
 * @param {object}             [options]
 * @returns {{ player: LocalPlayer|YouTubePlayer, controls: Controls, mount: HTMLElement }}
 */
export function createPlayer(container, type = 'local', options = {}) {
  const root =
    typeof container === 'string'
      ? document.querySelector(container)
      : container;

  root.className = `jsp-player ${root.className ?? ''}`.trim();
  root.setAttribute('data-state', 'idle');

  // Video wrapper
  const videoWrapper = document.createElement('div');
  videoWrapper.className = 'jsp-video-wrapper';

  let player;
  if (type === 'youtube') {
    const mountDiv = document.createElement('div');
    videoWrapper.append(mountDiv);
    player = new YouTubePlayer(mountDiv, options);
  } else {
    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'metadata');
    videoWrapper.append(video);
    player = new LocalPlayer(video);

    // Tap overlay for local player
    const overlay = document.createElement('div');
    overlay.className = 'jsp-tap-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    const icon = document.createElement('div');
    icon.className = 'jsp-tap-overlay__icon';
    icon.textContent = '▶';
    overlay.append(icon);
    overlay.addEventListener('click', () => {
      player.paused ? player.play() : player.pause();
    });
    videoWrapper.append(overlay);
  }

  // Loading / error overlay
  const stateOverlay = document.createElement('div');
  stateOverlay.className = 'jsp-state-overlay';
  const spinner = document.createElement('div');
  spinner.className = 'jsp-spinner';
  const stateMsg = document.createElement('span');
  stateOverlay.append(spinner, stateMsg);
  videoWrapper.append(stateOverlay);

  // Controls
  const controls = new Controls(player);

  // Sync data-state attribute for CSS
  player.on('statechange', (s) => {
    root.setAttribute('data-state', s);
    if (s === 'error') {
      spinner.style.display = 'none';
      stateMsg.textContent = 'Playback error. Please try again.';
    } else if (s === 'loading') {
      spinner.style.display = '';
      stateMsg.textContent = '';
    }
  });

  root.append(videoWrapper, controls.element);

  return { player, controls, mount: root };
}
