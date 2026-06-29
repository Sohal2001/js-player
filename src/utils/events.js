/**
 * Minimal event emitter for decoupled player event handling.
 */
export class EventEmitter {
  constructor() {
    this._listeners = {};
  }

  on(event, fn) {
    (this._listeners[event] ??= []).push(fn);
    return this;
  }

  off(event, fn) {
    const list = this._listeners[event];
    if (!list) return this;
    this._listeners[event] = list.filter((l) => l !== fn);
    return this;
  }

  once(event, fn) {
    const wrapper = (...args) => {
      fn(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    (this._listeners[event] ?? []).forEach((fn) => fn(...args));
    return this;
  }

  removeAllListeners(event) {
    if (event) {
      delete this._listeners[event];
    } else {
      this._listeners = {};
    }
    return this;
  }
}
