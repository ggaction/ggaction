import { createMockCanvasContext } from "./canvas.js";

// A minimal document for live chart tests: elements record children, styles,
// listeners and pointer capture; frames run only when flushed.
export function createLiveDocument({ width = 300, height = 200 } = {}) {
  const frames = new Map();
  let next = 0, now = 0;
  const view = {
    devicePixelRatio: 1,
    performance: { now: () => now },
    requestAnimationFrame: callback => { frames.set(++next, callback); return next; },
    cancelAnimationFrame: id => frames.delete(id)
  };
  const document = { defaultView: view, createElement: tag => element(tag) };
  function element(tag) {
    const listeners = new Map(), captures = new Set(), attributes = new Map();
    const node = {
      tagName: tag.toUpperCase(), style: {}, children: [], parentNode: null, textContent: "", ownerDocument: document,
      appendChild(child) { child.parentNode = node; node.children.push(child); return child; },
      remove() { if (node.parentNode) node.parentNode.children = node.parentNode.children.filter(child => child !== node); node.parentNode = null; },
      setAttribute: (key, value) => attributes.set(key, value), getAttribute: key => attributes.get(key),
      clicks: 0, click() { node.clicks++; },
      addEventListener: (type, listener) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
      removeEventListener: (type, listener) => listeners.get(type)?.delete(listener),
      listenerCount: type => listeners.get(type)?.size ?? 0,
      getBoundingClientRect: () => ({ left: 0, top: 0, width, height, right: width, bottom: height }),
      setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id), releasePointerCapture: id => captures.delete(id),
      requestAnimationFrame: view.requestAnimationFrame, cancelAnimationFrame: view.cancelAnimationFrame,
      fire(type, point = { x: 0, y: 0 }, extra = {}) {
        const event = { type, pointerId: 1, pointerType: "mouse", button: 0, buttons: 1, clientX: point.x, clientY: point.y,
          shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {}, ...extra };
        for (const listener of [...(listeners.get(type) ?? [])]) listener(event);
      }
    };
    if (tag === "canvas") {
      const context = createMockCanvasContext();
      context.canvas = node; node.width = width; node.height = height; node.context = context;
      node.getContext = () => context;
      node.toBlob = (callback, type) => callback(new Blob(["png"], { type }));
    }
    return node;
  }
  document.body = element("body");
  return {
    document, view,
    canvas() { const canvas = element("canvas"); document.body.appendChild(canvas); return canvas; },
    advance(ms) { now += ms; },
    flush(steps = 1) {
      for (let i = 0; i < steps; i++) {
        const pending = [...frames.values()]; frames.clear();
        for (const callback of pending) callback(now);
      }
    },
    frames
  };
}
