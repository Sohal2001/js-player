# JS Player — Juhi Sohal Player

A lightweight, zero-dependency JavaScript video player with a **mobile-first UI**.

Supports:
- **Local / direct-URL video** via the native HTML5 `<video>` element
- **YouTube playback** via the official YouTube IFrame API (fully ToS-compliant — no stream extraction)

---

## Quick Start

```bash
cd js-player
npm install
npm run dev        # Opens the mobile demo in your browser
```

## Build

```bash
npm run build      # Outputs dist/js-player.es.js and dist/js-player.umd.js
```

## Test

```bash
npm test           # Run unit tests (Vitest)
npm run test:coverage
```

---

## Usage

### As a module

```js
import { createPlayer } from 'js-player';

// Local video player
const { player } = createPlayer('#mount', 'local');
player.load('https://example.com/video.mp4');
player.play();

// YouTube player (IFrame API — ToS compliant)
const { player: yt } = createPlayer('#ytMount', 'youtube');
yt.load('dQw4w9WgXcQ');  // Pass the YouTube video ID only
```

### Events

```js
player.on('play',       () => console.log('playing'));
player.on('pause',      () => console.log('paused'));
player.on('timeupdate', (current, duration) => console.log(current, duration));
player.on('ended',      () => console.log('ended'));
player.on('error',      (err) => console.error(err));
```

### Controls

```js
player.play();
player.pause();
player.seek(30);          // seconds
player.volume = 0.8;      // 0–1
player.muted = true;
player.playbackRate = 1.5;
player.currentTime;       // getter
player.duration;          // getter
```

---

## Project Structure

```
js-player/
├── src/
│   ├── core/
│   │   ├── Player.js         Base class (EventEmitter + state machine)
│   │   ├── LocalPlayer.js    HTML5 <video> backend
│   │   └── YouTubePlayer.js  YouTube IFrame API backend
│   ├── ui/
│   │   ├── Controls.js       Play/pause, seek bar, volume, speed
│   │   └── ProgressBar.js    Draggable seek bar (touch + mouse + keyboard)
│   ├── utils/
│   │   ├── events.js         EventEmitter
│   │   └── formatTime.js     Seconds → MM:SS / HH:MM:SS
│   ├── styles/
│   │   └── player.css        Dark theme, mobile-optimised
│   └── index.js              Public API + createPlayer() factory
├── demo/
│   └── index.html            Mobile phone-frame demo
├── vite.config.js
└── package.json
```

---

## YouTube Compliance

YouTube playback uses **only** the [official YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).

- No video downloading
- No stream extraction
- No media bytes accessed by this library
- Only video IDs and metadata are handled

---

## License

Apache-2.0 © Juhi Sohal
