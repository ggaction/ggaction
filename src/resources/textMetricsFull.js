import { ChartProgram } from "../core/ChartProgram.js";
import { assertAssetActive, assetError } from "../core/assetHost.js";
import { ownArray } from "../core/ownData.js";
import { validateUserId } from "../core/identifiers.js";
import { validateWorkLimit } from "../core/validation.js";
import { textMetricKey } from "../core/font.js";
import { missingFontMetricQuery } from "../core/textMetrics.js";
import { normalizeFontMetricProfile, FONT_METRIC_MAX_FONTS, FONT_METRIC_MAX_QUERIES, FONT_METRIC_MAX_TEXT_UNITS } from "../core/textMetricProfile.js";
import { exactAssetRecord } from "../grammar/assetRequest.js";
import { requireStoredResource } from "../selectors/resources.js";
import { validateResourceGraph } from "../materialization/resourceState.js";
import { getBuiltinResourceKindHandler } from "../materialization/resourceKinds.js";
import { fontResourceHandler, concreteFontValue, fontResourceIdentity } from "../materialization/fontState.js";
import { applyTextMetricProfile } from "../actions/textMetrics/index.js";
import { prepareStoredFontAsset, prepareFontMeasurements } from "./resolveFonts.js";
import { preparedTextMetricHandle } from "./textMetrics.js";

const MAX_UNIQUE_BYTES = 64 * 1024 * 1024;
const MAX_PASSES = 256;
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

export function requireFontAuthoringProgram(program) {
  if (!(program instanceof ChartProgram) || getBuiltinResourceKindHandler(program.constructor, "font")?.validateStored !== fontResourceHandler.validateStored) {
    throw new TypeError("Font preparation requires a font-authoring ChartProgram.");
  }
}

export function fontPreparationHost(host, keys) {
  host = exactAssetRecord(host, ["requestToken", "decode", "signal", ...keys], "Font preparation host");
  if (typeof host.requestToken !== "string" || !host.requestToken) throw new TypeError("Font preparation requires a nonempty requestToken.");
  validateWorkLimit(host.requestToken.length, "Font request token length");
  assertAssetActive(host.signal, "Font");
  return host;
}

// Run the existing synchronous layout until every required width is measured.
// Candidates and traces are private; an unmeasured width is never an estimate.
export async function prepareFontMetricProfile(program, request, host) {
  request = exactAssetRecord(request, ["id", "fonts"], "Text metrics request");
  validateUserId(request.id, "Text metrics profile id");
  ownArray(request.fonts, "Text metric font IDs");
  if (!request.fonts.length || request.fonts.length > FONT_METRIC_MAX_FONTS) throw new RangeError("Font metric binding count exceeds its budget.");
  request.fonts.forEach(id => validateUserId(id, "Font resource id"));
  const resources = request.fonts.map(id => requireStoredResource(program, { kind: "font", id }));
  const fonts = resources.map(resource => ({ resource: { kind: "font", id: resource.id, revision: resource.revision }, identity: fontResourceIdentity(resource) }));
  let profile = normalizeFontMetricProfile({ schemaVersion: 2, id: request.id, fonts, measurements: [] });
  if (typeof host.decode !== "function" || typeof host.measure !== "function") throw new TypeError("Text metrics require host decode and measure callbacks.");
  const unique = new Set(); let byteLength = 0;
  for (const resource of resources) {
    if (unique.has(resource.options.expectedHash)) continue;
    unique.add(resource.options.expectedHash);
    byteLength += resource.result.byteLength;
    if (byteLength > MAX_UNIQUE_BYTES) throw new RangeError("Text metric font bytes exceed their unique byte budget.");
  }
  assertAssetActive(host.signal, "Font");
  const assets = new Map();
  for (const resource of resources) assets.set(resource.id, await prepareStoredFontAsset(concreteFontValue(resource), {
    decode: host.decode, ...(host.signal === undefined ? {} : { signal: host.signal })
  }));
  const measurements = [], seen = new Set(); let textUnits = 0;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    assertAssetActive(host.signal, "Font");
    let missing;
    try { applyTextMetricProfile(program, profile); return profile; }
    catch (error) { missing = missingFontMetricQuery(error); if (missing === undefined) throw error; }
    const queries = [];
    const add = text => {
      const key = textMetricKey({ ...missing.query, text });
      if (seen.has(key)) return;
      if (seen.size === FONT_METRIC_MAX_QUERIES || textUnits + text.length > FONT_METRIC_MAX_TEXT_UNITS) {
        throw new RangeError("Font measurement query closure exceeds its budget.");
      }
      seen.add(key); textUnits += text.length;
      queries.push({ text, fontSize: missing.query.fontSize });
    };
    add(missing.query.text); add("");
    // Short prefixes amortize word/character wrapping without an unbounded
    // quadratic expansion of an otherwise unwrapped long label.
    if (missing.query.text.length <= 128) {
      let prefix = "";
      for (const { segment } of segmenter.segment(missing.query.text)) { prefix += segment; add(prefix); }
    }
    if (!queries.length) throw new Error("Text metric preparation made no progress.");
    const result = await prepareFontMeasurements(assets.get(missing.resource.id), queries, {
      measure: host.measure, ...(host.signal === undefined ? {} : { signal: host.signal })
    });
    measurements.push(...result.measurements);
    profile = normalizeFontMetricProfile({ schemaVersion: 2, id: request.id, fonts, measurements });
  }
  throw assetError("work-limit", "Text metric preparation exceeded its layout pass budget.", undefined, "Font");
}

export async function prepareTextMetrics(program, request, host) {
  requireFontAuthoringProgram(program);
  host = fontPreparationHost(host, ["measure"]);
  validateResourceGraph(program);
  const profile = await prepareFontMetricProfile(program, request, host);
  assertAssetActive(host.signal, "Font");
  return preparedTextMetricHandle(program, profile, host);
}
