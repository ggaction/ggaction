import { canvasSceneProgram } from "./canvasScene.js";
import { concreteFonts, fontRenderAlias } from "./fonts.js";
import { fontPayloadBytes } from "../grammar/fontPayload.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { assertAssetActive, assetError, assetHostStage } from "../core/assetHost.js";
import { canonicalJSON, contentDigest } from "../core/contentDigest.js";

const preparedFonts = new WeakMap();
const registrationsByAlias = new Map();
const fail = (code, message) => assetError(code, message, undefined, "Font");
function record(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).some(key => !keys.includes(key))) throw new TypeError(`${label} contains unsupported properties.`);
  return value;
}
function graphicInput(program) {
  const graphicSpec = program?.graphicSpec;
  if (graphicSpec === null || typeof graphicSpec !== "object") throw new TypeError("Font rendering requires a graphicSpec.");
  return graphicSpec;
}
function graphicDigest(graphicSpec) {
  // Reject accessors before either collecting fonts or fingerprinting a foreign
  // mutable graphic. Host callbacks never observe partially inspected input.
  const pending = [graphicSpec], seen = new WeakSet();
  while (pending.length) {
    const value = pending.pop();
    if (value === null || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value)) ownArray(value, "Font graphic"); else ownRecord(value, "Font graphic");
    for (const child of Object.values(value)) pending.push(child);
  }
  return contentDigest(canonicalJSON(graphicSpec));
}
function disposeResult(result) {
  const callback = result !== null && typeof result === "object" ? Object.getOwnPropertyDescriptor(result, "dispose")?.value : undefined;
  if (typeof callback === "function") callback();
}

function registrationLease(alias, registration) {
  let references = 1;
  const lease = { retain() { references++; }, release() {
    if (--references !== 0) return;
    const entries = registrationsByAlias.get(alias); entries.delete(lease);
    if (entries.size === 0) registrationsByAlias.delete(alias);
    registration.dispose();
  } };
  let entries = registrationsByAlias.get(alias);
  if (entries === undefined) { entries = new Set(); registrationsByAlias.set(alias, entries); }
  entries.add(lease);
  return lease;
}

// Native font engines may deduplicate the same byte registration. Borrow all
// prepared leases for that exact alias while its native registration exists,
// so a user's Canvas handle can be disposed during a native output safely.
export function retainPreparedFontRegistrations(alias) {
  const leases = [...registrationsByAlias.get(alias) ?? []];
  if (!leases.length) return undefined;
  leases.forEach(lease => lease.retain());
  let retained = true;
  return () => {
    if (!retained) return; retained = false;
    const errors = [];
    for (const lease of leases) { try { lease.release(); } catch (error) { errors.push(error); } }
    if (errors.length) throw new AggregateError(errors, "Borrowed font registrations failed to dispose.");
  };
}

export async function prepareFontRendering(program, options) {
  options = record(options, ["register", "signal"], "Font rendering options");
  const { register, signal } = options;
  if (typeof register !== "function") throw new TypeError("Font rendering requires an explicit register callback.");
  assertAssetActive(signal, "Font");
  const scene = program?.version === 2 && Array.isArray(program.nodes) ? program : undefined;
  const graphicSpec = graphicInput(scene === undefined ? program : canvasSceneProgram(scene));
  const digest = graphicDigest(graphicSpec), values = concreteFonts(graphicSpec);
  const registrations = [], aliases = new Map();
  let active = true, abortListener, cleanupError;
  const dispose = () => {
    if (!active) { if (cleanupError !== undefined) throw cleanupError; return; }
    active = false;
    if (abortListener !== undefined) EventTarget.prototype.removeEventListener.call(signal, "abort", abortListener);
    const errors = [];
    for (const registration of registrations.reverse()) {
      try { registration.release(); } catch (error) { errors.push(error); }
    }
    if (errors.length) { cleanupError = new AggregateError(errors, "Font registrations failed to dispose."); throw cleanupError; }
  };
  try {
    for (const [key, font] of values) {
      const family = fontRenderAlias(font);
      const expected = { contentHash: font.contentHash, family, style: font.style, weight: font.weight, metricsProviderVersion: font.metricsProviderVersion };
      const raw = await assetHostStage(async request => {
        const result = await register(request);
        try { assertAssetActive(signal, "Font"); }
        catch (error) { disposeResult(result); throw error; }
        return result;
      }, Object.freeze({ ...expected, sourceFamily: font.family, mimeType: font.mimeType,
        bytes: fontPayloadBytes(font), ...(signal === undefined ? {} : { signal }) }), signal, "register-error", "Font");
      let registration;
      try {
        registration = record(raw, [...Object.keys(expected), "dispose"], "Registered font");
        if (typeof registration.dispose !== "function" || Object.entries(expected).some(([name, value]) => registration[name] !== value)) {
          throw fail("font-identity-mismatch", "Registered font does not match its exact byte identity and alias.");
        }
      } catch (error) { disposeResult(raw); throw error; }
      registrations.push(registrationLease(family, registration)); aliases.set(key, family);
    }
    assertAssetActive(signal, "Font");
    const handle = Object.freeze({ kind: "font-rendering", fontCount: aliases.size, dispose });
    preparedFonts.set(handle, { graphicSpec, digest, aliases, signal, active: () => active });
    readPreparedFonts(scene === undefined ? graphicSpec : canvasSceneProgram(scene).graphicSpec, handle);
    if (signal !== undefined) {
      // Cleanup errors remain observable through explicit disposal; an event
      // callback cannot report them synchronously to the renderer's caller.
      abortListener = () => { try { dispose(); } catch {} };
      EventTarget.prototype.addEventListener.call(signal, "abort", abortListener, { once: true });
    }
    return handle;
  } catch (error) {
    try { dispose(); } catch (cleanup) { throw new AggregateError([error, cleanup], "Font preparation and cleanup failed."); }
    throw error;
  }
}

export function readPreparedFonts(graphicSpec, handle) {
  if (handle === undefined) {
    const values = concreteFonts(graphicSpec);
    if (values.size) throw fail("preparation-required", "Font-bound text requires prepareFontRendering before Canvas render.");
    return new Map();
  }
  const digest = graphicDigest(graphicSpec);
  concreteFonts(graphicSpec);
  const prepared = preparedFonts.get(handle);
  if (prepared === undefined) throw new TypeError("Expected an authentic prepared font rendering handle.");
  if (!prepared.active()) throw fail("disposed", "Prepared font rendering has been disposed.");
  assertAssetActive(prepared.signal, "Font");
  if (prepared.graphicSpec !== graphicSpec || prepared.digest !== digest) {
    throw fail("stale-result", "Prepared fonts belong to a different or changed graphicSpec.");
  }
  return prepared.aliases;
}
