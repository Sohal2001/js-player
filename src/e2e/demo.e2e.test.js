/**
 * End-to-end / UI functional tests — drives the live demo via Playwright.
 *
 * Run:  npm run dev &  # must be running on port 5177
 *       npx vitest run src/e2e/demo.e2e.test.js
 *
 * These tests use a real Chromium browser (headless) against the Vite dev server.
 * They exercise the full rendering stack: HTML, CSS, and all JS modules.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium } from 'playwright';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5177';

// Prefer an explicit override, then Playwright's own resolution (set when
// `npx playwright install` was used, as in CI). Falling back to `undefined`
// lets Playwright locate its managed Chromium automatically.
const CHROMIUM = process.env.E2E_CHROMIUM_PATH || undefined;

let browser;
let page;

beforeAll(async () => {
  browser = await chromium.launch({
    ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
});

afterAll(async () => {
  await browser?.close();
});

beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
});

// ── Page structure ─────────────────────────────────────────────────────────

describe('Page loads correctly', () => {
  it('shows the app title "JS Player"', async () => {
    const title = await page.textContent('.app-name');
    expect(title).toContain('JS Player');
  });

  it('renders the phone frame', async () => {
    expect(await page.isVisible('.phone-frame')).toBe(true);
  });

  it('renders the status bar with a time string', async () => {
    const time = await page.textContent('.status-bar__time');
    expect(time).toMatch(/\d{1,2}:\d{2}/);
  });

  it('renders Local and YouTube source tabs', async () => {
    expect(await page.isVisible('#tabLocal')).toBe(true);
    expect(await page.isVisible('#tabYoutube')).toBe(true);
  });

  it('Local tab is active by default', async () => {
    const cls = await page.getAttribute('#tabLocal', 'class');
    expect(cls).toContain('active');
  });

  it('renders the URL input and Load button', async () => {
    expect(await page.isVisible('#videoUrl')).toBe(true);
    expect(await page.isVisible('button.load-btn')).toBe(true);
  });

  it('renders the player mount area', async () => {
    expect(await page.isVisible('#playerMount')).toBe(true);
  });

  it('renders the "Up Next" section', async () => {
    const heading = await page.textContent('.section-title');
    expect(heading).toBe('Up Next');
  });

  it('renders 4 video items in the queue', async () => {
    const items = await page.$$('.video-item');
    expect(items.length).toBe(4);
  });

  it('renders the bottom navigation with 5 items', async () => {
    const items = await page.$$('.nav-item');
    expect(items.length).toBe(5);
  });
});

// ── Player controls ────────────────────────────────────────────────────────

describe('Player controls', () => {
  it('player control bar is visible', async () => {
    expect(await page.isVisible('.jsp-controls')).toBe(true);
  });

  it('progress bar is present', async () => {
    expect(await page.isVisible('.jsp-progress')).toBe(true);
  });

  it('time display shows 0:00 / 0:00 initially', async () => {
    const time = await page.textContent('.jsp-time');
    expect(time).toContain('0:00');
  });

  it('speed selector has 1× as default', async () => {
    const val = await page.$eval('.jsp-speed', (s) => s.value);
    expect(val).toBe('1');
  });

  it('speed selector contains 1.5× option', async () => {
    const options = await page.$$eval('.jsp-speed option', (opts) =>
      opts.map((o) => o.value),
    );
    expect(options).toContain('1.5');
  });

  it('volume slider is present', async () => {
    expect(await page.isVisible('.jsp-volume')).toBe(true);
  });
});

// ── Tab switching ──────────────────────────────────────────────────────────

describe('Tab switching', () => {
  it('clicking YouTube tab activates it', async () => {
    await page.click('#tabYoutube');
    const cls = await page.getAttribute('#tabYoutube', 'class');
    expect(cls).toContain('active');
  });

  it('clicking YouTube tab deactivates Local tab', async () => {
    await page.click('#tabYoutube');
    const cls = await page.getAttribute('#tabLocal', 'class');
    expect(cls).not.toContain('active');
  });

  it('YouTube tab shows video ID input', async () => {
    await page.click('#tabYoutube');
    expect(await page.isVisible('#ytVideoId')).toBe(true);
  });

  it('switching back to Local tab shows URL input', async () => {
    await page.click('#tabYoutube');
    await page.click('#tabLocal');
    expect(await page.isVisible('#videoUrl')).toBe(true);
  });
});

// ── Queue interaction ──────────────────────────────────────────────────────

describe('Video queue items', () => {
  it('each queue item has a title', async () => {
    const titles = await page.$$eval('.video-item__title', (els) =>
      els.map((e) => e.textContent.trim()),
    );
    expect(titles.length).toBe(4);
    titles.forEach((t) => expect(t.length).toBeGreaterThan(0));
  });

  it('each queue item has a duration badge', async () => {
    const badges = await page.$$('.video-item__duration');
    expect(badges.length).toBe(4);
  });

  it('tapping a queue item updates the player title', async () => {
    const items = await page.$$('.video-item');
    await items[1].click();
    await page.waitForTimeout(500);
    const title = await page.textContent('#playerTitle');
    expect(title).toContain('Elephants Dream');
  });

  it('tapping Big Buck Bunny updates URL input', async () => {
    const items = await page.$$('.video-item');
    await items[0].click();
    const url = await page.inputValue('#videoUrl');
    expect(url).toContain('BigBuckBunny');
  });
});

// ── URL load ───────────────────────────────────────────────────────────────

describe('Load button', () => {
  it('typing a URL and clicking Load updates the player title', async () => {
    await page.fill('#videoUrl', 'https://example.com/sample.mp4');
    await page.click('button.load-btn');
    const title = await page.textContent('#playerTitle');
    expect(title).toBe('sample');
  });
});

// ── Accessibility ──────────────────────────────────────────────────────────

describe('Accessibility', () => {
  it('progress bar has role=slider', async () => {
    const role = await page.getAttribute('.jsp-progress', 'role');
    expect(role).toBe('slider');
  });

  it('volume slider has aria-label', async () => {
    const label = await page.getAttribute('.jsp-volume', 'aria-label');
    expect(label).toBe('Volume');
  });

  it('speed selector has aria-label', async () => {
    const label = await page.getAttribute('.jsp-speed', 'aria-label');
    expect(label).toBe('Playback speed');
  });

  it('play button has aria-label', async () => {
    const label = await page.getAttribute('.jsp-btn--play', 'aria-label');
    expect(['Play', 'Pause', 'Replay']).toContain(label);
  });

  it('search icon button has aria-label', async () => {
    const label = await page.getAttribute(
      '.icon-btn[aria-label="Search"]',
      'aria-label',
    );
    expect(label).toBe('Search');
  });
});

// ── Visual appearance ──────────────────────────────────────────────────────

describe('Visual / responsive', () => {
  it('phone frame is centred on desktop viewport', async () => {
    const box = await page.locator('.phone-frame').boundingBox();
    expect(box.x).toBeGreaterThan(200); // not flush to left edge
    expect(box.width).toBeLessThanOrEqual(420); // max ~390px + border
  });

  it('bottom nav is positioned at the bottom of the phone frame', async () => {
    const navBox = await page.locator('.bottom-nav').boundingBox();
    const frameBox = await page.locator('.phone-frame').boundingBox();
    const navBottom = navBox.y + navBox.height;
    const frameBottom = frameBox.y + frameBox.height;
    expect(Math.abs(navBottom - frameBottom)).toBeLessThan(10);
  });
});
