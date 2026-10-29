import assert from "node:assert/strict";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { DOMParser } from "@xmldom/xmldom";

// This scaffold checks initial snippet execution. Browser tests own gesture,
// focus and scheduling behavior; the scaffold never synthesizes those effects.
function eventsFor(element) {
  const events = new EventTarget();
  for (const method of ["addEventListener", "removeEventListener", "dispatchEvent"]) element[method] = events[method].bind(events);
  return element;
}

function controlElement(tag) {
  const element = eventsFor(new DOMParser().parseFromString(`<${tag}></${tag}>`, "text/html").documentElement);
  const decorated = new WeakSet([element]);
  Object.defineProperty(element, "innerHTML", { set(value) {
    const fragment = new DOMParser().parseFromString(`<${tag}>${value}</${tag}>`, "text/html").documentElement;
    while (element.firstChild) element.removeChild(element.firstChild);
    while (fragment.firstChild) element.appendChild(fragment.firstChild);
  } });
  element.querySelector = selector => {
    assert.match(selector, /^(?:#[a-z][a-z0-9-]*|button|input|output)$/, "Undocumented control selector");
    const found = [...element.getElementsByTagName(selector.startsWith("#") ? "*" : selector)]
      .find(node => !selector.startsWith("#") || node.getAttribute("id") === selector.slice(1));
    assert.ok(found, `Missing documented control: ${selector}`);
    if (!decorated.has(found)) { eventsFor(found); decorated.add(found); }
    return found;
  };
  element.remove = () => element.parentNode?.removeChild(element);
  return element;
}

export function documentationEnvironment(example, data) {
  const canvas = createCanvas(1, 1);
  eventsFor(canvas);
  canvas.style = {};
  canvas.before = element => assert.ok(element.nodeType === 1, "Expected a documented control element");
  canvas.setPointerCapture = canvas.releasePointerCapture = () => assert.fail("Capture requires a browser test");
  canvas.ownerDocument = { defaultView: eventsFor({
    requestAnimationFrame() { assert.fail("Animation frames require a browser test"); },
    cancelAnimationFrame() { assert.fail("Animation frames require a browser test"); }
  }) };
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: canvas.width, height: canvas.height });
  return { canvas,
    document: example.environment === "browser-module" ? {
      createElement(tag) {
        assert.ok(["canvas", "div", "nav"].includes(tag), "Undocumented element creation");
        return tag === "canvas" ? createCanvas(1, 1) : controlElement(tag);
      },
      querySelector(selector) {
        assert.ok(["#chart", "canvas"].includes(selector), `Undocumented Canvas selector: ${selector}`);
        return canvas;
      }
    } : undefined,
    createImageBitmap: example.environment === "browser-module" ? async blob => {
      assert.ok(blob instanceof Blob, "Documented image decoding requires a Blob");
      return loadImage(new Uint8Array(await blob.arrayBuffer()));
    } : undefined,
    fetch: example.dataset ? async url => {
      assert.equal(url, `/${example.dataset}.json`, "The snippet must request its documented dataset URL");
      return { ok: true, status: 200, json: async () => structuredClone(data) };
    } : undefined
  };
}

export function assertDocumentationRendering(example, canvas) {
  if (example.rendering !== "renders-canvas") return;
  assert.ok(canvas.width > 1 && canvas.height > 1, "The displayed snippet must render its own Canvas");
  const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  const colors = new Set();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] > 0) colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]},${pixels[i+3]}`);
    if (colors.size > 1) return;
  }
  assert.fail("The displayed snippet must paint more than a uniform background");
}
