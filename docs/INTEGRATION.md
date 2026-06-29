# Integration Guide — JS Player

How to embed the Juhi Sohal Player (JS Player) in your web app, PWA, or Capacitor mobile app.

---

## Installation

### From npm (once published)

```bash
npm install js-player
```

### From source

```bash
git clone https://github.com/Sohal2001/js-player.git
cd js-player
npm install
npm run build:lib   # outputs dist/js-player.es.js + dist/js-player.umd.js
```

### CDN (ES module)

```html
<script type="module">
  import { createPlayer } from './dist/js-player.es.js';
</script>
```

---

## Quick Start

### 1. Add the stylesheet

```html
<link rel="stylesheet" href="dist/js-player.es.css" />
<!-- or inline from: src/styles/player.css -->
```

### 2. Mount a local video player

```html
<div id="player"></div>

<script type="module">
  import { createPlayer } from './dist/js-player.es.js';

  const { player } = createPlayer('#player', 'local');
  player.load('https://example.com/video.mp4');
  player.play();
</script>
```

### 3. Mount a YouTube player

```html
<div id="yt-player"></div>

<script type="module">
  import { createPlayer } from './dist/js-player.es.js';

  const { player } = createPlayer('#yt-player', 'youtube');
  player.load('dQw4w9WgXcQ');   // YouTube video ID only
</script>
```

---

## API Reference

### `createPlayer(container, type, options)`

Creates a fully-wired player (video element + controls) and mounts it.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `container` | `HTMLElement \| string` | — | Mount point element or CSS selector |
| `type` | `'local' \| 'youtube'` | `'local'` | Backend to use |
| `options` | `object` | `{}` | Passed to the player backend |

Returns `{ player, controls, mount }`.

**YouTube options:**

| Option | Type | Default |
|--------|------|---------|
| `width` | number | 640 |
| `height` | number | 360 |
| `autoplay` | boolean | false |
| `controls` | boolean | true (YouTube native controls) |

---

### `LocalPlayer`

HTML5 `<video>` backend. Extends `Player`.

```js
import { LocalPlayer } from 'js-player';

const video = document.getElementById('my-video'); // existing <video> element
const player = new LocalPlayer(video);

player.load('video.mp4');
player.play();
```

| Method | Description |
|--------|-------------|
| `load(src)` | Set video URL and call `video.load()`. Returns `this`. |
| `play()` | Returns the Promise from `video.play()`. |
| `pause()` | Pause playback. Returns `this`. |
| `seek(seconds)` | Seek to position (clamped to `[0, duration]`). Returns `this`. |
| `destroy()` | Stop playback, clear src, remove all event listeners. |

| Getter/Setter | Type | Description |
|---------------|------|-------------|
| `state` | `string` | Current state: idle/loading/playing/paused/ended/error |
| `paused` | `boolean` | `true` when not playing |
| `currentTime` | `number` | Current position in seconds |
| `duration` | `number` | Total duration in seconds |
| `volume` | `0–1` | Get/set volume (clamped) |
| `muted` | `boolean` | Get/set muted state |
| `playbackRate` | `number` | Get/set playback rate |
| `element` | `HTMLVideoElement` | The underlying `<video>` element |

---

### `YouTubePlayer`

YouTube IFrame API backend. Extends `Player`.

```js
import { YouTubePlayer } from 'js-player';

const player = new YouTubePlayer('#mount', { autoplay: false });
player.load('dQw4w9WgXcQ');
```

Same API as `LocalPlayer` except:
- `load(videoId)` — takes a YouTube video **ID** (11 characters), not a URL
- `element` getter is not available (YouTube embeds an iframe)
- `playbackRate` support depends on the individual video

---

### Events

All events are emitted on the `player` instance.

```js
player.on('play',         () => {});
player.on('pause',        () => {});
player.on('ended',        () => {});
player.on('ready',        () => {});
player.on('error',        (err) => {});
player.on('statechange',  (state) => {});
player.on('timeupdate',   (currentTime, duration) => {});
player.on('durationchange', (duration) => {});
player.on('volumechange', (volume, muted) => {});
player.on('seeking',      (currentTime) => {});
player.on('seeked',       (currentTime) => {});

// Remove a listener
player.off('play', myHandler);

// One-time listener
player.once('ready', () => console.log('ready!'));
```

---

### `Controls`

Build the control bar separately (without `createPlayer`):

```js
import { LocalPlayer, Controls } from 'js-player';

const video = document.querySelector('video');
const player = new LocalPlayer(video);
const controls = new Controls(player);

document.getElementById('controls-mount').appendChild(controls.element);
```

---

### `ProgressBar`

Use the seek bar standalone:

```js
import { ProgressBar } from 'js-player';

const bar = new ProgressBar((fraction) => {
  player.seek(fraction * player.duration);
});

document.body.appendChild(bar.element);

// Update on timeupdate
player.on('timeupdate', (cur, dur) => bar.update(cur, dur));
```

---

## Styling

All CSS classes are prefixed with `jsp-`. Override via CSS custom properties:

```css
.my-player-root {
  --jsp-bg: #1a1b2e;          /* player background */
  --jsp-accent: #7c3aed;      /* progress fill, active states */
  --jsp-accent-hover: #8b5cf6;
  --jsp-text: #f8fafc;
  --jsp-text-secondary: #94a3b8;
  --jsp-radius: 16px;
}
```

### State-based CSS

```css
/* Show custom overlay when loading */
.my-player[data-state="loading"] .my-loading-spinner {
  display: flex;
}

/* Hide controls when playing (auto-hide) */
.my-player[data-state="playing"] .jsp-controls {
  opacity: 0;
  transition: opacity 2s;
}

.my-player:hover .jsp-controls {
  opacity: 1;
}
```

---

## Capacitor (Native Mobile)

JS Player ships with a pre-configured Capacitor setup.

### Build and sync

```bash
npm run build        # builds to dist-app/
npx cap sync         # copies to android/ and ios/
```

### Open in native IDE

```bash
npx cap open android  # opens Android Studio
npx cap open ios      # opens Xcode
```

### allowNavigation

`capacitor.config.json` is pre-configured to allow the YouTube IFrame API domains:

```json
{
  "server": {
    "allowNavigation": [
      "*.youtube.com",
      "*.ytimg.com",
      "*.googleapis.com"
    ]
  }
}
```

---

## PWA

The demo app includes a full PWA setup in `public/`:

- `manifest.json` — app identity, icons, shortcuts
- `sw.js` — service worker (cache-first for app shell, network-first for content, never caches YouTube)

Register the service worker:

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
```

---

## YouTube Compliance

**Only the official YouTube IFrame Player API is used.** No video bytes are downloaded or accessed.

```js
// Correct: pass only the video ID
player.load('dQw4w9WgXcQ');

// Never pass a YouTube stream URL — it will not work and violates ToS
// player.load('https://...'); // NOT SUPPORTED for YouTube type
```

Reference: [YouTube IFrame API docs](https://developers.google.com/youtube/iframe_api_reference)

---

## Framework Examples

### React

```jsx
import { useEffect, useRef } from 'react';
import { createPlayer } from 'js-player';
import 'js-player/dist/js-player.es.css';

export function VideoPlayer({ src }) {
  const ref = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    const { player } = createPlayer(ref.current, 'local');
    playerRef.current = player;
    return () => player.destroy();
  }, []);

  useEffect(() => {
    playerRef.current?.load(src);
  }, [src]);

  return <div ref={ref} />;
}
```

### Vue 3

```vue
<template>
  <div ref="mount" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { createPlayer } from 'js-player';

const props = defineProps(['src']);
const mount = ref(null);
let player;

onMounted(() => {
  ({ player } = createPlayer(mount.value, 'local'));
});

watch(() => props.src, (src) => player?.load(src));
onUnmounted(() => player?.destroy());
</script>
```

### Vanilla JS with ES modules

```html
<div id="player"></div>
<script type="module">
  import { LocalPlayer, Controls } from './dist/js-player.es.js';

  const video = document.createElement('video');
  document.getElementById('player').appendChild(video);

  const player = new LocalPlayer(video);
  const controls = new Controls(player);
  document.getElementById('player').appendChild(controls.element);

  player.load('video.mp4');
</script>
```
