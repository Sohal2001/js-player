# Testing Guide — JS Player

Complete reference for running, understanding, and extending the test suite.

JS Player ships with **four layers** of automated tests:

| Layer | What it proves | Tool | Environment |
|-------|----------------|------|-------------|
| **Unit** | A single class/function behaves correctly in isolation | Vitest | jsdom |
| **Integration** | Two real modules wired together exchange data correctly | Vitest | jsdom |
| **Functional** | The shipped public API behaves as a consumer expects (black-box) | Vitest | jsdom |
| **E2E** | The full demo app renders and responds in a real browser | Vitest + Playwright | Chromium |

---

## Test Architecture

```
src/
├── utils/
│   ├── events.test.js          Unit — EventEmitter
│   └── formatTime.test.js      Unit — formatTime
├── core/
│   ├── Player.test.js          Unit — Player base class
│   ├── LocalPlayer.test.js     Unit — LocalPlayer HTML5 backend
│   └── YouTubePlayer.test.js   Unit — YouTubePlayer IFrame backend (mocked YT API)
├── ui/
│   ├── ProgressBar.test.js     Unit — ProgressBar component
│   └── Controls.test.js        Unit — Controls component
├── integration/
│   └── player-controls.integration.test.js     Integration — LocalPlayer + Controls
├── functional/
│   └── createPlayer.functional.test.js         Functional — public createPlayer() API
└── e2e/
    └── demo.e2e.test.js        E2E — full demo in Chromium
```

**125 unit + integration + functional tests run in jsdom (`npm test`), plus the
Playwright E2E suite (`npm run test:e2e`).**

---

## Running Tests

| Command | Runs |
|---------|------|
| `npm test` | All jsdom tests (unit + integration + functional) |
| `npm run test:watch` | Same, in watch mode |
| `npm run test:coverage` | Same, with coverage + threshold enforcement |
| `npm run test:unit` | Unit tests only (`src/core`, `src/ui`, `src/utils`) |
| `npm run test:integration` | Integration tests only (`src/integration`) |
| `npm run test:functional` | Functional tests only (`src/functional`) |
| `npm run test:e2e` | Playwright E2E (needs the dev server, see below) |
| `npm run test:all` | Coverage suite **and** E2E |

The jsdom layers (unit/integration/functional) use **Vitest** with the **jsdom**
environment — no real browser or network required.

### E2E

```bash
# Terminal 1 — dev server (pinned to port 5177)
npm run dev

# Terminal 2 — Playwright against real Chromium
npm run test:e2e
```

The E2E suite reads two optional environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `E2E_BASE_URL` | `http://localhost:5177` | Where the app is served |
| `E2E_CHROMIUM_PATH` | (Playwright-managed browser) | Use a pre-installed Chromium binary |

In CI, `npx playwright install chromium --with-deps` provides a version-matched
browser, so `E2E_CHROMIUM_PATH` is left unset. In environments that already ship
Chromium, point at it directly, e.g.:

```bash
export E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
npm run test:e2e
```

---

## Coverage Thresholds

Enforced in `vitest.config.js`. CI fails if thresholds are not met.

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Functions | 80% |
| Branches | 75% |
| Statements | 80% |

`src/index.js` (the thin factory wiring) and test files are excluded from the
coverage denominator; the factory is still exercised by the functional layer.

View the HTML report after running coverage:

```bash
npm run test:coverage
open coverage/index.html
```

---

## Unit Tests

Unit tests target one module at a time, stubbing collaborators.

### EventEmitter (`events.test.js`)

`on`/`emit`, multiple listeners, `off`, `once`, `removeAllListeners`, and a
no-listener emit that must not throw.

### formatTime (`formatTime.test.js`)

`5 → "0:05"`, `90 → "1:30"`, `3661 → "1:01:01"`, invalid input → `"0:00"`,
fractional seconds truncated.

### Player (`Player.test.js`)

Initial `idle` state, `statechange` emission, `paused` getter, the
idle→loading→paused→playing sequence, `destroy()` listener cleanup, and that the
abstract control methods throw when not overridden.

### LocalPlayer (`LocalPlayer.test.js`)

Uses a real jsdom `HTMLVideoElement` with spied native methods: constructor
guards, `load`/`play`/`pause`/`seek` (with clamping), event forwarding
(`play`, `pause`, `ended`, `timeupdate`, `durationchange`, `error`,
`canplay→ready`), volume/mute/rate delegation, and `destroy()` cleanup.

### YouTubePlayer (`YouTubePlayer.test.js`)

Runs against a **mocked `window.YT` IFrame API** (no network, no iframe):

| Category | Tests |
|----------|-------|
| Initialization | injects the API `<script>` once; `onReady` → paused + `ready`; ToS-safe `playerVars` (`rel:0`, `modestbranding:1`); width/height/controls options |
| `load()` | queues a pending videoId before ready; calls `loadVideoById` once ready; returns `this` |
| Controls | `play/pause/seek` delegate to `playVideo/pauseVideo/seekTo` |
| State mapping | `PLAYING/PAUSED/ENDED/BUFFERING` → correct state + event |
| Errors | `onError` → `error` state + emitted `Error` with code |
| Polling | emits `timeupdate` ~every 250ms while playing; stops on pause/destroy; no double interval |
| Accessors | volume 0–1 normalisation + clamping, muted, playbackRate, safe defaults before ready |
| `destroy()` | stops polling, destroys the YT instance, nulls internals |

### ProgressBar (`ProgressBar.test.js`)

DOM structure (`role=slider`, `tabIndex=0`), `update()` fill/thumb/aria, and
keyboard seeking (Arrow keys ±5%, clamping, other keys ignored).

### Controls (`Controls.test.js`)

Uses a `StubPlayer`: DOM structure, play-button label transitions, mute toggle,
volume slider, speed selector, and the `MM:SS / MM:SS` time display.

---

## Integration Tests

File: `src/integration/player-controls.integration.test.js`

Wires a **real** `LocalPlayer` (backed by a jsdom `HTMLVideoElement`) to a
**real** `Controls` instance and verifies end-to-end data flow: clicking play
calls `video.play()`, native events update the button/time/progress, the volume
and speed inputs drive the element, mute syncs the icon, keyboard seeks advance
`currentTime`, the full state machine transitions correctly, and `destroy()`
detaches all listeners.

```js
// Real modules, spied native element — no mocks of our own code.
const video  = makeVideoEl();            // jsdom HTMLVideoElement + spied play/pause/load
const player = new LocalPlayer(video);
const controls = new Controls(player);

video.dispatchEvent(new Event('play'));  // simulate the browser
expect(controls.element.querySelector('.jsp-btn--play').textContent).toBe('⏸');
```

---

## Functional Tests

File: `src/functional/createPlayer.functional.test.js`

Functional tests are **black-box**: they import only the public package entry
point (`src/index.js`) and drive the library exactly as a consumer would —
through the documented `createPlayer()` factory and named exports. They assert
on user-facing behaviour and rendered DOM, never on internals.

| Test | Verifies |
|------|----------|
| Public API surface | `createPlayer`, `LocalPlayer`, `YouTubePlayer`, `Controls`, `ProgressBar`, `formatTime` are all exported |
| Factory shape | returns `{ player, controls, mount }` with the right instance types |
| Rendered shell | mounts `.jsp-player`, a `<video>`, `.jsp-video-wrapper`, and a control bar |
| Defaults | local backend when no type given; accepts a selector string |
| `data-state` | root attribute tracks `idle → loading → playing` for CSS hooks |
| Error overlay | shows an error message on the `error` state |
| Load | `player.load(url)` sets `<video>` src + `loading` state |
| Play button | clicking the rendered button calls `video.play()` |
| Tap overlay | toggles play/pause |
| Time sync | `timeupdate` updates the control-bar time display |
| YouTube backend | `createPlayer(el, 'youtube')` builds a `YouTubePlayer` (no raw `<video>`) |

### Functional vs. integration vs. E2E

- **Integration** asserts that two *specific* modules cooperate (white-box, you
  pick the modules and may inspect them).
- **Functional** asserts that the *public contract* of the library holds, going
  in only through documented entry points (black-box, jsdom — fast, no browser).
- **E2E** asserts the *whole running app* works in a real browser, including
  HTML/CSS and the demo shell.

---

## E2E Tests

File: `src/e2e/demo.e2e.test.js`

Drives the full demo app in a real headless Chromium via Playwright.

### Test groups

| Group | What is tested |
|-------|----------------|
| Page loads correctly | Title, phone frame, status bar, both tabs, inputs, player, Up Next queue, bottom nav |
| Player controls | Control bar, progress bar (`role=slider`), time display, speed selector, volume slider |
| Tab switching | YouTube/Local tab activation and input swapping |
| Video queue items | 4 items with titles/durations; clicking updates player title & URL |
| Load button | Typing a URL + Load updates the player title |
| Accessibility | `role=slider`, aria-labels on controls and inputs |
| Visual / responsive | Phone frame centered; bottom nav anchored |

### Prerequisites

- Dev server on port `5177` (`npm run dev`)
- A Chromium binary — Playwright-managed (CI) or via `E2E_CHROMIUM_PATH`

---

## Writing New Tests

### Unit test (utility / class)

```js
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction.js';

describe('myFunction', () => {
  it('does the thing', () => {
    expect(myFunction(1, 2)).toBe(3);
  });
});
```

### Integration test (player + new component)

```js
import { LocalPlayer } from '../core/LocalPlayer.js';
import { MyNewPanel } from '../ui/MyNewPanel.js';

function makeVideoEl() {
  const el = document.createElement('video');
  vi.spyOn(el, 'play').mockResolvedValue(undefined);
  vi.spyOn(el, 'pause').mockImplementation(() => {});
  vi.spyOn(el, 'load').mockImplementation(() => {});
  Object.defineProperty(el, 'duration', { get: () => 100, configurable: true });
  return el;
}

describe('LocalPlayer + MyNewPanel', () => {
  it('panel reacts to player events', () => {
    const player = new LocalPlayer(makeVideoEl());
    const panel = new MyNewPanel(player);
    player.element.dispatchEvent(new Event('play'));
    expect(panel.element.textContent).toBe('Playing');
  });
});
```

### Functional test (public API)

```js
import { createPlayer } from '../index.js';

describe('createPlayer — my new option', () => {
  it('renders the new affordance', () => {
    const host = document.createElement('div');
    const { mount } = createPlayer(host, 'local', { myOption: true });
    expect(mount.querySelector('.jsp-my-affordance')).toBeTruthy();
  });
});
```

### E2E test (new UI feature)

```js
it('my new feature works', async () => {
  const el = page.locator('.my-class');
  await expect(el).toBeVisible();
  await el.click();
  await expect(page.locator('.result')).toHaveText('expected');
});
```

---

## CI Integration

Tests run automatically on every push and pull request via
`.github/workflows/ci.yml`:

- **unit-tests** — `npm test` (unit + integration + functional) across Node 18, 20, 22
- **coverage** — enforces the 80% / 75% thresholds
- **lint** — ESLint **and** Prettier `--check` (both must pass)
- **build** — verifies the lib and app builds
- **e2e** — Playwright against a live dev server on port 5177

All jobs must pass before merging to `main`. See [PIPELINE.md](./PIPELINE.md).
