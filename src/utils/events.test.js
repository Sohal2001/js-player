import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from './events.js';

describe('EventEmitter', () => {
  it('calls listener when event is emitted', () => {
    const ee = new EventEmitter();
    const fn = vi.fn();
    ee.on('test', fn);
    ee.emit('test', 42);
    expect(fn).toHaveBeenCalledWith(42);
  });

  it('supports multiple listeners for same event', () => {
    const ee = new EventEmitter();
    const a = vi.fn(), b = vi.fn();
    ee.on('x', a).on('x', b);
    ee.emit('x');
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it('removes a specific listener with off()', () => {
    const ee = new EventEmitter();
    const fn = vi.fn();
    ee.on('e', fn);
    ee.off('e', fn);
    ee.emit('e');
    expect(fn).not.toHaveBeenCalled();
  });

  it('once() fires exactly one time', () => {
    const ee = new EventEmitter();
    const fn = vi.fn();
    ee.once('ping', fn);
    ee.emit('ping');
    ee.emit('ping');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('removeAllListeners() clears all events', () => {
    const ee = new EventEmitter();
    const fn = vi.fn();
    ee.on('a', fn).on('b', fn);
    ee.removeAllListeners();
    ee.emit('a');
    ee.emit('b');
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not throw when emitting event with no listeners', () => {
    const ee = new EventEmitter();
    expect(() => ee.emit('nothing')).not.toThrow();
  });
});
