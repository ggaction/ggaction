import { ownArray, ownRecord } from "../core/ownData.js";
import { canonicalJSON, contentDigest } from "../core/contentDigest.js";
import { assetError, assertAssetActive } from "../core/assetHost.js";
import { validateWorkLimit } from "../core/validation.js";
import { walkGraphicSources } from "../grammar/schemas/graphicSources.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";

const preparedShadows = new WeakMap();
const fail = (code, message) => assetError(code, message, undefined, "Shadow");

export function shadowGraphicDigest(graphicSpec) {
  const pending = [graphicSpec], seen = new WeakSet();
  let work = 0;
  while (pending.length) {
    const value = pending.pop();
    if (value === null || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value)) ownArray(value, "Shadow graphic"); else ownRecord(value, "Shadow graphic");
    const values = Object.values(value);
    work += values.length;
    validateWorkLimit(work, "Shadow graphic validation work");
    for (const child of values) {
      if (typeof child === "string") work += child.length;
      validateWorkLimit(work, "Shadow graphic validation work");
      pending.push(child);
    }
  }
  return contentDigest(canonicalJSON(graphicSpec));
}

export function shadowGraphicItems(graphicSpec) {
  const items = new Map();
  const add = (id, object, type) => {
    if (!Object.hasOwn(object.properties ?? {}, "shadow")) return;
    validateConcreteGraphicProperties(type, object.properties);
    items.set(id, { object, type });
  };
  walkGraphicSources(graphicSpec, add);
  return items;
}

export function createPreparedShadowHandle(graphicSpec, digest, glyphs, pixelRatio, signal) {
  let active = true, abortListener;
  const dispose = () => {
    if (!active) return;
    active = false;
    if (abortListener !== undefined) EventTarget.prototype.removeEventListener.call(signal, "abort", abortListener);
    glyphs.clear();
  };
  const handle = Object.freeze({ kind: "shadow-rendering", glyphCount: glyphs.size, pixelRatio, dispose });
  preparedShadows.set(handle, { graphicSpec, digest, glyphs, signal, active: () => active });
  readPreparedShadows(graphicSpec, handle, pixelRatio);
  if (signal !== undefined) {
    abortListener = dispose;
    EventTarget.prototype.addEventListener.call(signal, "abort", abortListener, { once: true });
  }
  return handle;
}

export function readPreparedShadows(graphicSpec, handle, pixelRatio) {
  if (handle === undefined) {
    if (shadowGraphicItems(graphicSpec).size) throw fail("preparation-required", "Shadow graphics require prepareShadowRendering before rendering.");
    return new Map();
  }
  const prepared = preparedShadows.get(handle);
  if (prepared === undefined) throw new TypeError("Expected an authentic prepared shadow rendering handle.");
  if (!prepared.active()) throw fail("disposed", "Prepared shadow rendering has been disposed.");
  assertAssetActive(prepared.signal, "Shadow");
  if (prepared.graphicSpec !== graphicSpec || prepared.digest !== shadowGraphicDigest(graphicSpec)) {
    throw fail("stale-result", "Prepared shadows belong to a different or changed graphicSpec.");
  }
  if (pixelRatio !== undefined && pixelRatio !== handle.pixelRatio) throw fail("density-mismatch", "Prepared shadow density does not match this output.");
  return prepared.glyphs;
}
