import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { YouTubePlayer } from './YouTubePlayer.js';

// ── Fake YouTube IFrame API ──────────────────────────────────────────────────
// Records every constructed player so tests can drive its event callbacks and
// assert on the spied control methods. No network, no real iframe.

let instances;

function installYT() {
  instances = [];

  class FakeYTPlayer {
    constructor(el, config) {
      this.el = el;
      this.config = config;
      this._time = 0;
      this._dur = 0;
      this._vol = 100;
      this._muted = false;
      this._rate = 1;

      this.loadVideoById = vi.fn();
      this.playVideo = vi.fn();
      this.pauseVideo = vi.fn();
      this.seekTo = vi.fn();
      this.destroy = vi.fn();
      this.getCurrentTime = vi.fn(() => this._time);
      this.getDuration = vi.fn(() => this._dur);
      this.getVolume = vi.fn(() => this._vol);
      this.setVolume = vi.fn((v) => {
        this._vol = v;
      });
      this.isMuted = vi.fn(() => this._muted);
      this.mute = vi.fn(() => {
        this._muted = true;
      });
      this.unMute = vi.fn(() => {
        this._muted = false;
      });
      this.getPlaybackRate = vi.fn(() => this._rate);
      this.setPlaybackRate = vi.fn((r) => {
        this._rate = r;
      });

      instances.push(this);
    }
  }

  window.YT = {
    Player: FakeYTPlayer,
    PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

// Construct a player, resolve the (mocked) API load, run #initPlayer, and fire
// onReady — returning the player plus its underlying fake YT instance.
async function mountReady(container, options) {
  const player = new YouTubePlayer(container, options);
  // First instance triggers the API loader's global ready callback.
  if (typeof window.onYouTubeIframeAPIReady === 'function') {
    window.onYouTubeIframeAPIReady();
  }
  await flush();
  const yt = instances[instances.length - 1];
  yt.config.events.onReady();
  return { player, yt };
}

describe('YouTubePlayer', () => {
  let container;

  beforeEach(() => {
    installYT();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('injects the IFrame API <script> once', async () => {
      await mountReady(container);
      expect(document.getElementById('yt-iframe-api-script')).toBeTruthy();
    });

    it('emits "ready" and moves to paused state on onReady', async () => {
      const ready = vi.fn();
      const player = new YouTubePlayer(container);
      player.on('ready', ready);
      if (typeof window.onYouTubeIframeAPIReady === 'function') {
        window.onYouTubeIframeAPIReady();
      }
      await flush();
      instances[0].config.events.onReady();

      expect(ready).toHaveBeenCalledOnce();
      expect(player.state).toBe('paused');
    });

    it('passes ToS-safe playerVars (rel:0, modestbranding)', async () => {
      const { yt } = await mountReady(container);
      expect(yt.config.playerVars.rel).toBe(0);
      expect(yt.config.playerVars.modestbranding).toBe(1);
    });

    it('honours width/height/controls options', async () => {
      const { yt } = await mountReady(container, {
        width: 800,
        height: 450,
        controls: false,
      });
      expect(yt.config.width).toBe(800);
      expect(yt.config.height).toBe(450);
      expect(yt.config.playerVars.controls).toBe(0);
    });
  });

  describe('load()', () => {
    it('queues a pending videoId when called before the player is ready', async () => {
      const player = new YouTubePlayer(container);
      player.load('dQw4w9WgXcQ'); // before init → pending
      expect(player.state).toBe('loading');

      if (typeof window.onYouTubeIframeAPIReady === 'function') {
        window.onYouTubeIframeAPIReady();
      }
      await flush();
      expect(instances[0].config.videoId).toBe('dQw4w9WgXcQ');
    });

    it('calls loadVideoById when already ready and returns this (chaining)', async () => {
      const { player, yt } = await mountReady(container);
      const ret = player.load('abc12345678');
      expect(yt.loadVideoById).toHaveBeenCalledWith('abc12345678');
      expect(player.state).toBe('loading');
      expect(ret).toBe(player);
    });
  });

  describe('playback controls delegate to the IFrame API', () => {
    it('play() → playVideo()', async () => {
      const { player, yt } = await mountReady(container);
      expect(player.play()).toBe(player);
      expect(yt.playVideo).toHaveBeenCalled();
    });

    it('pause() → pauseVideo()', async () => {
      const { player, yt } = await mountReady(container);
      player.pause();
      expect(yt.pauseVideo).toHaveBeenCalled();
    });

    it('seek() → seekTo(seconds, true)', async () => {
      const { player, yt } = await mountReady(container);
      player.seek(42);
      expect(yt.seekTo).toHaveBeenCalledWith(42, true);
    });
  });

  describe('onStateChange mapping', () => {
    it('PLAYING → state playing + "play" event', async () => {
      const { player, yt } = await mountReady(container);
      const play = vi.fn();
      player.on('play', play);
      yt.config.events.onStateChange({ data: window.YT.PlayerState.PLAYING });
      expect(player.state).toBe('playing');
      expect(play).toHaveBeenCalled();
    });

    it('PAUSED → state paused + "pause" event', async () => {
      const { player, yt } = await mountReady(container);
      const pause = vi.fn();
      player.on('pause', pause);
      yt.config.events.onStateChange({ data: window.YT.PlayerState.PAUSED });
      expect(player.state).toBe('paused');
      expect(pause).toHaveBeenCalled();
    });

    it('ENDED → state ended + "ended" event', async () => {
      const { player, yt } = await mountReady(container);
      const ended = vi.fn();
      player.on('ended', ended);
      yt.config.events.onStateChange({ data: window.YT.PlayerState.ENDED });
      expect(player.state).toBe('ended');
      expect(ended).toHaveBeenCalled();
    });

    it('BUFFERING → state loading', async () => {
      const { player, yt } = await mountReady(container);
      yt.config.events.onStateChange({ data: window.YT.PlayerState.BUFFERING });
      expect(player.state).toBe('loading');
    });
  });

  describe('onError', () => {
    it('moves to error state and emits an Error', async () => {
      const { player, yt } = await mountReady(container);
      const onErr = vi.fn();
      player.on('error', onErr);
      yt.config.events.onError({ data: 150 });
      expect(player.state).toBe('error');
      expect(onErr).toHaveBeenCalledWith(expect.any(Error));
      expect(onErr.mock.calls[0][0].message).toContain('150');
    });
  });

  describe('timeupdate polling', () => {
    it('emits timeupdate ~every 250ms while playing and stops on pause', async () => {
      const { player, yt } = await mountReady(container);
      const onTime = vi.fn();
      player.on('timeupdate', onTime);
      yt._time = 5;
      yt._dur = 100;

      vi.useFakeTimers();
      yt.config.events.onStateChange({ data: window.YT.PlayerState.PLAYING });
      vi.advanceTimersByTime(500);
      expect(onTime).toHaveBeenCalledWith(5, 100);
      const callsWhilePlaying = onTime.mock.calls.length;
      expect(callsWhilePlaying).toBeGreaterThanOrEqual(2);

      yt.config.events.onStateChange({ data: window.YT.PlayerState.PAUSED });
      vi.advanceTimersByTime(500);
      expect(onTime.mock.calls.length).toBe(callsWhilePlaying); // no more
    });

    it('does not start a second interval if already polling', async () => {
      const { player, yt } = await mountReady(container);
      const onTime = vi.fn();
      player.on('timeupdate', onTime);

      vi.useFakeTimers();
      yt.config.events.onStateChange({ data: window.YT.PlayerState.PLAYING });
      yt.config.events.onStateChange({ data: window.YT.PlayerState.PLAYING });
      vi.advanceTimersByTime(250);
      expect(onTime).toHaveBeenCalledTimes(1); // single interval, not two
    });
  });

  describe('getters / setters', () => {
    it('reads currentTime and duration from the API', async () => {
      const { player, yt } = await mountReady(container);
      yt._time = 12.5;
      yt._dur = 300;
      expect(player.currentTime).toBe(12.5);
      expect(player.duration).toBe(300);
    });

    it('normalises volume between 0–1 and clamps on set', async () => {
      const { player, yt } = await mountReady(container);
      yt._vol = 50;
      expect(player.volume).toBe(0.5);

      player.volume = 0.25;
      expect(yt.setVolume).toHaveBeenCalledWith(25);

      player.volume = 5; // clamps to 1 → 100
      expect(yt.setVolume).toHaveBeenLastCalledWith(100);

      player.volume = -3; // clamps to 0
      expect(yt.setVolume).toHaveBeenLastCalledWith(0);
    });

    it('muted getter/setter delegates to mute()/unMute()', async () => {
      const { player, yt } = await mountReady(container);
      player.muted = true;
      expect(yt.mute).toHaveBeenCalled();
      expect(player.muted).toBe(true);

      player.muted = false;
      expect(yt.unMute).toHaveBeenCalled();
    });

    it('playbackRate getter/setter delegates to the API', async () => {
      const { player, yt } = await mountReady(container);
      player.playbackRate = 1.5;
      expect(yt.setPlaybackRate).toHaveBeenCalledWith(1.5);
      expect(player.playbackRate).toBe(1.5);
    });

    it('returns safe defaults before the API instance exists', () => {
      const player = new YouTubePlayer(container); // not ready yet
      expect(player.currentTime).toBe(0);
      expect(player.duration).toBe(0);
      expect(player.volume).toBe(1);
      expect(player.muted).toBe(false);
      expect(player.playbackRate).toBe(1);
    });
  });

  describe('destroy()', () => {
    it('stops polling, destroys the YT instance and clears listeners', async () => {
      const { player, yt } = await mountReady(container);
      const onTime = vi.fn();
      player.on('timeupdate', onTime);

      vi.useFakeTimers();
      yt.config.events.onStateChange({ data: window.YT.PlayerState.PLAYING });
      player.destroy();
      vi.advanceTimersByTime(1000);

      expect(yt.destroy).toHaveBeenCalled();
      expect(onTime).not.toHaveBeenCalled(); // poll stopped before first tick
      expect(player.currentTime).toBe(0); // #yt nulled → default
    });
  });

  it('accepts a CSS selector string as its container', async () => {
    container.id = 'yt-mount';
    const player = new YouTubePlayer('#yt-mount');
    if (typeof window.onYouTubeIframeAPIReady === 'function') {
      window.onYouTubeIframeAPIReady();
    }
    await flush();
    expect(instances[0].el).toBe(container);
    player.destroy();
  });
});
