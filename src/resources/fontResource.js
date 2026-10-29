import { actionSource } from "../core/action.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { validateUserId } from "../core/identifiers.js";
import { FONT_IDENTITY_KEYS } from "../core/font.js";
import { assertAssetActive, assetError } from "../core/assetHost.js";
import { exactAssetRecord } from "../grammar/assetRequest.js";
import { findStoredResource, requireStoredResource } from "../selectors/resources.js";
import { validateResourceGraph } from "../materialization/resourceState.js";
import { fontResourceHandler, normalizeFontResourceOptions, fontResourceCandidate } from "../materialization/fontState.js";
import { prepareFontAsset } from "./resolveFonts.js";
import { requireFontAuthoringProgram, fontPreparationHost, prepareFontMetricProfile } from "./textMetricsFull.js";

const preparedResources = new WeakMap();

export async function prepareFontResource(program, request, host) {
  requireFontAuthoringProgram(program);
  request = exactAssetRecord(request, ["kind", "id", "target", "uri", "expectedHash", "mimeType", "maxBytes", "license", "attribution", ...FONT_IDENTITY_KEYS], "Font resource request");
  if (!["create", "replace"].includes(request.kind)) throw new TypeError("Font request kind must be create or replace.");
  const creating = request.kind === "create", key = creating ? "id" : "target";
  if (Object.hasOwn(request, creating ? "target" : "id")) throw new TypeError("Font resource request has incompatible identity options.");
  const id = validateUserId(request[key], "Font resource id");
  const { kind, id: _id, target: _target, ...source } = request;
  const options = normalizeFontResourceOptions(source);
  host = fontPreparationHost(host, ["load", "measure"]);
  validateResourceGraph(program);
  const previous = creating ? findStoredResource(program, "font", id) : requireStoredResource(program, { kind: "font", id });
  if (creating && previous !== undefined) throw assetError("duplicate-id", `Font resource "${id}" already exists.`, undefined, "Font");
  if (previous?.revision === Number.MAX_SAFE_INTEGER) throw new RangeError("Font resource revision limit exceeded.");
  const profile = program.materializationConfigs.textMetrics;
  const needsMetrics = profile?.schemaVersion === 2 && profile.fonts.some(binding => binding.resource.id === id);
  if (needsMetrics && typeof host.measure !== "function") throw new TypeError("Replacing a bound font requires a host measure callback.");
  const asset = await prepareFontAsset(options, { load: host.load, decode: host.decode,
    ...(host.signal === undefined ? {} : { signal: host.signal }) });
  assertAssetActive(host.signal, "Font");
  const resource = cloneAndFreeze({ kind: "font", id, revision: previous === undefined ? 0 : previous.revision + 1,
    algorithmVersion: "1", ownership: { mode: "authored" }, inputs: [], options,
    result: { byteLength: asset.byteLength, payload: asset.payload }, provenance: { origin: "authored" } });
  fontResourceHandler.validateStored(resource);
  const candidate = fontResourceCandidate(program, resource, previous);
  const metrics = needsMetrics ? await prepareFontMetricProfile(candidate, { id: profile.id, fonts: profile.fonts.map(binding => binding.resource.id) }, host) : undefined;
  assertAssetActive(host.signal, "Font");
  const handle = cloneAndFreeze({ kind: "font-resource", request: { kind, [key]: id } });
  preparedResources.set(handle, { base: program, requestToken: host.requestToken, signal: host.signal, kind, resource, previous, metrics });
  return handle;
}

export function readPreparedFontResource(program, handle, requestToken, kind) {
  const prepared = preparedResources.get(handle);
  if (prepared === undefined) throw new TypeError("Expected an authentic prepared font resource.");
  if (prepared.base !== actionSource(program) || prepared.requestToken !== requestToken || prepared.kind !== kind) {
    throw assetError("stale-result", "Prepared font resource belongs to a different receiver, token or action.", undefined, "Font");
  }
  assertAssetActive(prepared.signal, "Font");
  return prepared;
}
