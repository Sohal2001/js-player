/**
 * End-to-end / UI functional tests — drives the live MX-Player-style demo via
 * Playwright against the Vite dev server (real Chromium).
 *
 * Run:  npm run dev &   # must be running on port 5177
 *       npm run test:e2e
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { chromium } from 'playwright';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5177';
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
  await page.goto(BASE_URL, { waitUntil: 'load' });
});

// Build a tiny valid mono 16-bit PCM WAV so Chromium can treat it as audio.
function makeWav(seconds = 0.3, rate = 8000) {
  const samples = Math.floor(seconds * rate);
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples * 2, 40);
  return buf; // samples left as zero = silence
}

// ── App shell ────────────────────────────────────────────────────────────

describe('App shell', () => {
  it('shows the app title "JS Player"', async () => {
    expect(await page.textContent('.app-title')).toContain('JS Player');
  });

  it('has Music and Video tabs, Music active by default', async () => {
    expect(await page.isVisible('#tab-music')).toBe(true);
    expect(await page.isVisible('#tab-video')).toBe(true);
    expect(await page.getAttribute('#tab-music', 'class')).toContain('active');
    expect(await page.getAttribute('#tab-video', 'class')).not.toContain(
      'active',
    );
  });

  it('has an Add button and a file input accepting audio and video', async () => {
    expect(await page.isVisible('#addBtn')).toBe(true);
    const accept = await page.getAttribute('#fileInput', 'accept');
    expect(accept).toContain('audio/*');
    expect(accept).toContain('video/*');
    expect(await page.getAttribute('#fileInput', 'multiple')).not.toBeNull();
  });

  it('shows the music empty state and hides the mini bar initially', async () => {
    expect(await page.isVisible('#musicEmpty')).toBe(true);
    expect(await page.getAttribute('#miniBar', 'class')).not.toContain('show');
    // Video empty state lives in the (initially hidden) Video view.
    await page.click('#tab-video');
    expect(await page.isVisible('#videoEmpty')).toBe(true);
  });
});

// ── Tabs ─────────────────────────────────────────────────────────────────

describe('Tab switching', () => {
  it('clicking Video activates the video view', async () => {
    await page.click('#tab-video');
    expect(await page.getAttribute('#tab-video', 'class')).toContain('active');
    expect(await page.getAttribute('#view-video', 'class')).toContain('active');
    expect(await page.getAttribute('#tab-music', 'class')).not.toContain(
      'active',
    );
  });

  it('clicking back to Music activates the music view', async () => {
    await page.click('#tab-video');
    await page.click('#tab-music');
    expect(await page.getAttribute('#view-music', 'class')).toContain('active');
  });
});

// ── Music transport controls ─────────────────────────────────────────────

describe('Music transport controls', () => {
  it('renders shuffle, prev, play, next, repeat and a seek bar', async () => {
    for (const id of [
      '#shuffle',
      '#prev',
      '#playPause',
      '#next',
      '#repeat',
      '#seek',
    ]) {
      expect(await page.locator(id).count()).toBe(1);
    }
    expect(await page.getAttribute('#playPause', 'aria-label')).toBe('Play');
  });

  it('repeat button cycles none → all → one', async () => {
    expect(await page.getAttribute('#repeat', 'aria-label')).toBe('Repeat');
    await page.click('#repeat');
    expect(await page.getAttribute('#repeat', 'aria-label')).toBe(
      'Repeat: all',
    );
    await page.click('#repeat');
    expect(await page.getAttribute('#repeat', 'aria-label')).toBe(
      'Repeat: one',
    );
  });

  it('shuffle toggles its active state', async () => {
    expect(await page.getAttribute('#shuffle', 'class')).not.toContain('on');
    await page.click('#shuffle');
    expect(await page.getAttribute('#shuffle', 'class')).toContain('on');
  });
});

// ── Adding & playing a local audio file ──────────────────────────────────

describe('Add and play a local song', () => {
  it('adds an .mp3/.wav to the Music list and plays it', async () => {
    // Inject a real File via DataTransfer (robust across Playwright/Chromium
    // versions, unlike setInputFiles which needs an exact browser match).
    const b64 = makeWav().toString('base64');
    await page.evaluate((b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const file = new File([bytes], 'My Test Song.wav', { type: 'audio/wav' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.getElementById('fileInput');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, b64);

    // It lands in the music list.
    await page.waitForSelector('#musicList .item');
    expect(await page.locator('#musicList .item').count()).toBe(1);
    expect(await page.textContent('#musicList .item')).toContain(
      'My Test Song',
    );

    // Tapping it loads the now-playing screen and shows the mini bar.
    await page.click('#musicList .item');
    expect(await page.textContent('#npTitle')).toContain('My Test Song');
    expect(await page.getAttribute('#miniBar', 'class')).toContain('show');
    expect(await page.getAttribute('#musicList .item', 'class')).toContain(
      'playing',
    );
  });
});
