import { actionSource } from "../core/action.js";
import { ChartProgram } from "../core/ChartProgram.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { validateUserId } from "../core/identifiers.js";
import { validateWorkLimit } from "../core/validation.js";
import { assertAssetActive, assetError } from "../core/assetHost.js";
import { exactAssetRecord, normalizeAssetRequest } from "../grammar/assetRequest.js";
import { IMAGE_MIME_TYPES } from "../grammar/imagePayload.js";
import { findStoredResource, requireStoredResource } from "../selectors/resources.js";
import { getBuiltinResourceKindHandler } from "../materialization/resourceKinds.js";
import { validateResourceGraph } from "../materialization/resourceState.js";
import { imageResourceHandler } from "../materialization/imageState.js";
import { prepareImageAsset } from "./resolveAssets.js";

const preparedResources = new WeakMap();

export async function prepareImageResource(program, request, host) {
  if (!(program instanceof ChartProgram) || getBuiltinResourceKindHandler(program.constructor, "image")?.validateStored !== imageResourceHandler.validateStored) {
    throw new TypeError("Image preparation requires an image-authoring ChartProgram.");
  }
  if (program.compositionSpec !== undefined) throw new Error("Prepare an image resource in an explicit unit chart scope.");
  request = exactAssetRecord(request, ["kind", "id", "target", "uri", "expectedHash", "mimeType", "maxBytes", "license", "attribution"], "Image resource request");
  if (!["create", "replace"].includes(request.kind)) throw new TypeError("Image request kind must be create or replace.");
  const creating = request.kind === "create", key = creating ? "id" : "target";
  if (Object.hasOwn(request, creating ? "target" : "id")) throw new TypeError("Image resource request has incompatible identity options.");
  const id = validateUserId(request[key], "Image resource id");
  const { kind, id: _id, target: _target, ...source } = request;
  const options = normalizeAssetRequest(source, [], IMAGE_MIME_TYPES, "Image");
  host = exactAssetRecord(host, ["requestToken", "load", "decode", "signal"], "Image resource host");
  if (typeof host.requestToken !== "string" || !host.requestToken) throw new TypeError("Image preparation requires a nonempty requestToken.");
  validateWorkLimit(host.requestToken.length, "Image request token length");
  assertAssetActive(host.signal);
  validateResourceGraph(program);
  const previous = creating ? findStoredResource(program, "image", id) : requireStoredResource(program, { kind: "image", id });
  if (creating && previous !== undefined) throw assetError("duplicate-id", `Image resource "${id}" already exists.`);
  if (previous?.revision === Number.MAX_SAFE_INTEGER) throw new RangeError("Image resource revision limit exceeded.");
  const asset = await prepareImageAsset(options, { load: host.load, decode: host.decode,
    ...(host.signal === undefined ? {} : { signal: host.signal }) });
  assertAssetActive(host.signal);
  const resource = cloneAndFreeze({ kind: "image", id, revision: previous === undefined ? 0 : previous.revision + 1,
    algorithmVersion: "1", ownership: { mode: "authored" }, inputs: [], options,
    result: { width: asset.width, height: asset.height, byteLength: asset.byteLength, payload: asset.payload },
    provenance: { origin: "authored" } });
  imageResourceHandler.validateStored(resource);
  const handle = cloneAndFreeze({ kind: "image-resource", request: { kind, [key]: id } });
  preparedResources.set(handle, { base: program, requestToken: host.requestToken, signal: host.signal, kind, resource });
  return handle;
}

export function readPreparedImageResource(program, handle, requestToken, kind) {
  const prepared = preparedResources.get(handle);
  if (prepared === undefined) throw new TypeError("Expected an authentic prepared image resource.");
  if (prepared.base !== actionSource(program) || prepared.requestToken !== requestToken || prepared.kind !== kind) {
    throw assetError("stale-result", "Prepared image resource belongs to a different receiver, token or action.");
  }
  assertAssetActive(prepared.signal);
  return prepared.resource;
}
