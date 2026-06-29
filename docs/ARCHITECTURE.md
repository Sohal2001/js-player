# Architecture — How JS Player Works

A map of the codebase: the modules, how data flows between them, and how the
same source ships as an npm library, a PWA, and native Android/iOS apps.

---

## Layers at a glance

```
┌──────────────────────────────────────────────────────────────┐
│  Native shell (Capacitor)   android/   ios/                    │
│  WebView hosts the built web app (dist-app/)                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  PWA / web app            demo/   public/                  │ │
│  │  index.html · manifest.json · sw.js                        │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │  Library (src/)  →  dist/js-player.es|umd.js         │  │ │
│  │  │  createPlayer() factory                              │  │ │
│  │  │  Controls · ProgressBar   (UI)                       │  │ │
│  │  │  Player → LocalPlayer / YouTubePlayer  (backends)    │  │ │
│  │  │  EventEmitter · formatTime  (utils)                  │  │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

The **library** is the core. Everything else (PWA shell, native wrappers) hosts
the same built bundle.

---

## Modules (`src/`)

### `utils/events.js` — `EventEmitter`

Minimal pub/sub: `on`, `once`, `off`, `emit`, `removeAllListeners`. Every player
extends it, so listeners attach directly to the player instance.

### `utils/formatTime.js` — `formatTime(seconds)`

Pure helper that renders seconds as `M:SS` or `H:MM:SS`, guarding against
`NaN`/`Infinity`/negatives (→ `"0:00"`).

### `core/Player.js` — `Player` (abstract)

The contract every backend implements. Extends `EventEmitter` and owns the
**state machine**:

```
idle → loading → paused ⇄ playing → ended
                    ↑                  │
                    └──────────────────┘
              (any) → error
```

`_setState(next)` updates state and emits `statechange`. Control methods
(`load`, `play`, `pause`, `seek`) and accessor setters throw until a subclass
overrides them. Accessor getters return safe defaults.

### `core/LocalPlayer.js` — HTML5 `<video>` backend

Wraps a real `<video>` element. `load/play/pause/seek` delegate to the element;
native media events (`play`, `pause`, `ended`, `timeupdate`, `durationchange`,
`error`, `canplay`) are forwarded as `Player` events. `seek()` clamps to
`[0, duration]`. Volume/mute/rate proxy to the element.

### `core/YouTubePlayer.js` — YouTube IFrame API backend

Loads the official **YouTube IFrame Player API** once (shared across instances)
and drives an embedded player. **ToS-compliant by design** — only a video *ID*
is ever used; no stream extraction, no media bytes touched. Because the IFrame
API has no native `timeupdate`, it polls `getCurrentTime()` every ~250ms while
playing. `playerVars` pin `rel: 0` and `modestbranding: 1`.

### `ui/ProgressBar.js` — seek bar

Accessible slider (`role=slider`, `tabIndex=0`). `update(currentTime, duration)`
sets fill/thumb position and `aria-valuenow`; pointer + Arrow-key input invoke an
`onSeek(fraction)` callback. Decoupled from any specific player.

### `ui/Controls.js` — control bar

Builds the play/pause button, time display, `ProgressBar`, mute button, volume
slider, and speed selector. Subscribes to player events to keep the UI in sync,
and translates user input into player calls. Works with any `Player` subclass.

### `index.js` — public entry point + `createPlayer()`

Re-exports the public classes and provides the convenience factory:

```js
const { player, controls, mount } = createPlayer(container, 'local');
```

`createPlayer` builds the chosen backend, mounts a video wrapper + overlays +
`Controls`, and mirrors player state onto the root element as
`data-state="…"` so CSS can react. This factory is the primary surface the
**functional tests** exercise.

---

## Event flow

The player instance is the single event hub. Both the backend and the UI talk
through it — neither references the other directly.

```
 user click ──► Controls ──► player.play()
                                  │
   <video>/YT event ─► player.emit('play' | 'timeupdate' | …)
                                  │
                 ┌────────────────┼─────────────────┐
                 ▼                ▼                  ▼
            Controls         ProgressBar       createPlayer
          (button/time)     (fill/thumb)     (root data-state)
```

This indirection is what makes `LocalPlayer` and `YouTubePlayer`
interchangeable, and what lets the UI be unit-tested against a stub player.

---

## The demo app & PWA (`demo/`, `public/`)

- `demo/index.html` — a mobile-styled shell (source tabs, URL/ID input, player
  mount, an "Up Next" queue, bottom nav) that imports the library and registers
  the service worker.
- `public/manifest.json` — PWA identity, icons, `display: standalone`.
- `public/sw.js` — service worker: cache-first for the app shell, network-first
  for content, and **never** caches YouTube requests.

Two Vite builds produce two artifacts:

| Config | Command | Output | Consumer |
|--------|---------|--------|----------|
| `vite.config.js` (lib mode) | `npm run build:lib` | `dist/js-player.{es,umd}.js` | npm package |
| `vite.app.config.js` | `npm run build` | `dist-app/` | PWA + Capacitor WebView |

`vite.config.js` also pins the dev/preview server to **port 5177** so the E2E
suite and CI agree on the URL.

---

## Native apps (`android/`, `ios/`)

Capacitor wraps the built web app (`dist-app/`) in a native WebView.
`capacitor.config.json` sets the app id `com.juhisohal.jsplayer`, points
`webDir` at `dist-app`, and allow-lists the YouTube IFrame API domains
(`*.youtube.com`, `*.ytimg.com`, `*.googleapis.com`) so embedded playback works
inside the WebView. `npx cap sync` copies the web build into each platform; the
`publish-android` / `publish-ios` workflows build and ship the store artifacts.

See [INTEGRATION.md](./INTEGRATION.md) for the consumer API,
[PIPELINE.md](./PIPELINE.md) for build/release, and [TESTING.md](./TESTING.md)
for the test strategy.
