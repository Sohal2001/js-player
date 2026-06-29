# Testing Guide — JS Player

Complete reference for running, understanding, and extending the test suite.

---

## Test Architecture

```
src/
├── utils/
│   ├── events.test.js          Unit — EventEmitter (6 tests)
│   └── formatTime.test.js      Unit — formatTime (5 tests)
├── core/
│   ├── Player.test.js          Unit — Player base class (6 tests)
│   └── LocalPlayer.test.js     Unit — LocalPlayer HTML5 backend (25 tests)
├── ui/
│   ├── ProgressBar.test.js     Unit — ProgressBar component (15 tests)
│   └── Controls.test.js        Unit — Controls component (21 tests)
├── integration/
│   └── player-controls.integration.test.js  Integration (12 tests)
└── e2e/
    └── demo.e2e.test.js        E2E — full demo in Chromium (~50 tests)
```

**Total: 90 unit + integration tests, ~50 E2E tests**

---

## Running Tests

### Unit & Integration

```bash
npm test                  # run once
npm run test:watch        # re-run on file change
npm run test:coverage     # with coverage report
```

Uses **Vitest** with **jsdom** environment — no real browser needed.

### E2E

```bash
# Terminal 1
npm run dev               # start dev server on port 5177

# Terminal 2
npm run test:e2e          # run Playwright tests
```

Uses **Playwright** with real **Chromium**.

---

## Coverage Thresholds

Enforced in `vitest.config.js`. CI fails if thresholds are not met.

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Functions | 80% |
| Branches | 75% |
| Statements | 80% |

View the HTML report after running coverage:

```bash
npm run test:coverage
open coverage/index.html
```

---

## Unit Tests

### EventEmitter (`events.test.js`)

| Test | Description |
|------|-------------|
| calls listener | `on()` + `emit()` basic flow |
| multiple listeners | same event, multiple handlers |
| `off()` | removes a specific handler |
| `once()` | fires exactly once |
| `removeAllListeners()` | clears all events |
| no-listener emit | does not throw |

### formatTime (`formatTime.test.js`)

| Test | Input → Output |
|------|----------------|
| under a minute | `5` → `"0:05"` |
| minutes + seconds | `90` → `"1:30"` |
| hours | `3661` → `"1:01:01"` |
| invalid input | `NaN`, `-1`, `Infinity` → `"0:00"` |
| fractional seconds | `61.9` → `"1:01"` |

### Player (`Player.test.js`)

| Test | Description |
|------|-------------|
| initial state | `state === 'idle'` |
| statechange event | `_setState()` emits `statechange` |
| `paused` getter | true when not playing |
| state sequence | idle → loading → paused → playing |
| `destroy()` | removes all listeners |
| abstract methods | `play/pause/seek/volume` throw |

### LocalPlayer (`LocalPlayer.test.js`)

Tests use real `jsdom` `HTMLVideoElement` elements with spied methods.

| Category | Tests |
|----------|-------|
| Constructor | rejects plain objects, accepts real video el, binds events |
| `load()` | sets src, calls `video.load()`, returns player (chaining), state → loading |
| `play()` | delegates to `video.play()` |
| `pause()` | delegates to `video.pause()` |
| `seek()` | clamps negative → 0, clamps overflow → duration, sets currentTime |
| Event forwarding | `play`, `pause`, `ended`, `timeupdate`, `durationchange`, `error`, `canplay→ready` |
| Volume/mute/rate | getters/setters delegate to video element; volume clamps 0–1 |
| `destroy()` | pauses, clears src, removes all listeners |
| `element` getter | returns underlying video element |

### ProgressBar (`ProgressBar.test.js`)

| Category | Tests |
|----------|-------|
| DOM structure | `.jsp-progress`, `.jsp-progress__track`, fill, thumb; role=slider, tabIndex=0 |
| `update()` | fill width %, thumb left %, aria-valuenow; 0-duration guard |
| Keyboard | ArrowRight +5%, ArrowLeft -5%, clamp to 0/1, other keys ignored |

### Controls (`Controls.test.js`)

Uses a `StubPlayer` (extends EventEmitter with vi.fn() methods).

| Category | Tests |
|----------|-------|
| DOM | `.jsp-controls`, progress bar, time display, mute btn, volume, speed |
| Play button | click → `player.play()`; play event → label ⏸; pause event → label ▶; ended → ↩ |
| Mute | click → toggles `player.muted`; volumechange event syncs icon |
| Volume slider | input event → sets `player.volume` (0–100 → 0–1) |
| Speed selector | change event → sets `player.playbackRate` |
| Time display | timeupdate → `MM:SS / MM:SS` format |
| Progress bar | timeupdate → fill width % |

---

## Integration Tests

File: `src/integration/player-controls.integration.test.js`

Wires a real `LocalPlayer` (backed by a jsdom `HTMLVideoElement`) to a real `Controls` instance and verifies end-to-end data flow.

| Test | Verifies |
|------|----------|
| Click play button | `video.play()` called |
| Native play event | Controls button shows ⏸ |
| Native pause event | Controls button shows ▶ |
| Native timeupdate | Progress bar fill width updates |
| Native timeupdate | Time display shows correct `MM:SS / MM:SS` |
| Volume slider input | `video.volume` set to correct fraction |
| Speed selector change | `video.playbackRate` updated |
| Native volumechange | Volume slider value synced |
| Mute toggle | `video.muted` toggled; icon updated on volumechange |
| ArrowRight on progress bar | `video.currentTime` advances |
| State transitions | loading → paused → playing → paused → ended |
| `destroy()` cleanup | no events after destroy |

### How integration tests work

```js
function makeVideoEl() {
  const el = document.createElement('video'); // real jsdom HTMLVideoElement
  vi.spyOn(el, 'play').mockResolvedValue(undefined); // spy, no network
  vi.spyOn(el, 'pause').mockImplementation(() => {});
  vi.spyOn(el, 'load').mockImplementation(() => {});
  Object.defineProperty(el, 'duration', {
    get: () => _duration,
    set: (v) => { _duration = v; },
    configurable: true,
  });
  return el;
}

// Fire native events to simulate browser behaviour
video.dispatchEvent(new Event('play'));
video.dispatchEvent(new Event('timeupdate'));
```

---

## E2E Tests

File: `src/e2e/demo.e2e.test.js`

Tests the full demo app running in a real Chromium browser via Playwright.

### Test groups

| Group | What is tested |
|-------|----------------|
| Page loads correctly | Title, phone frame, status bar, both tabs, inputs, player, Up Next queue, bottom nav |
| Player controls | Control bar, progress bar (role=slider), time display, speed selector, volume slider |
| Tab switching | YouTube tab activates, Local tab deactivates; inputs swap; vice versa |
| Video queue items | 4 items present, correct titles/durations; clicking updates player title & URL |
| Load button | Typing URL + clicking Load updates player title |
| Accessibility | role=slider, aria-label on controls, aria-labels on inputs |
| Visual / responsive | Phone frame centered; bottom nav at bottom |

### Prerequisites

- Dev server running on port `5177` (`npm run dev`)
- Chromium installed at `/opt/pw-browsers/chromium-*/chrome-linux/chrome` (pre-installed in this environment)
- For local machines: `npx playwright install chromium`

### Updating E2E tests

When adding new UI features, add test cases in the appropriate group in `demo.e2e.test.js`. Follow this pattern:

```js
it('my new feature works', async () => {
  await page.goto('http://localhost:5177');
  const el = page.locator('.my-class');
  await expect(el).toBeVisible();
  await el.click();
  await expect(page.locator('.result')).toHaveText('expected');
});
```

---

## Writing New Tests

### Unit test (new utility function)

```js
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction.js';

describe('myFunction', () => {
  it('does the thing', () => {
    expect(myFunction(1, 2)).toBe(3);
  });
});
```

### Unit test (DOM component)

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyComponent } from './MyComponent.js';

describe('MyComponent', () => {
  let component;

  beforeEach(() => {
    component = new MyComponent();
  });

  it('renders the root element', () => {
    expect(component.element.className).toContain('my-component');
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
  Object.defineProperty(el, 'duration', {
    get: () => 100,
    configurable: true,
  });
  return el;
}

describe('LocalPlayer + MyNewPanel', () => {
  it('panel reacts to player events', () => {
    const video = makeVideoEl();
    const player = new LocalPlayer(video);
    const panel = new MyNewPanel(player);

    video.dispatchEvent(new Event('play'));
    expect(panel.element.textContent).toBe('Playing');
  });
});
```

---

## CI Integration

Tests run automatically on every push and pull request via `.github/workflows/ci.yml`.

- **unit-tests**: matrix across Node 18, 20, 22
- **coverage**: enforces 80%/75% thresholds
- **lint**: ESLint check
- **build**: verifies both lib and app builds succeed
- **e2e**: Playwright against a live dev server

All jobs must pass before merging to `main`.
