import { canvasSceneProgram } from "./canvasScene.js";
import { ownRecord } from "../core/ownData.js";
import { assetError, assertAssetActive, assetHostStage } from "../core/assetHost.js";
import { imagePayloadBytes, validateImagePayload } from "../grammar/imagePayload.js";
import { walkGraphicTreeEvents } from "../grammar/schemas/graphicTree.js";

const MAX_BYTES = 64 * 1024 * 1024;
const MAX_PIXELS = 64 * 1024 * 1024;
const preparedImages = new WeakMap();

function imageSpec(program) {
  const graphicSpec = program?.graphicSpec;
  if (graphicSpec === null || typeof graphicSpec !== "object") throw new TypeError("Image rendering requires a graphicSpec.");
  return graphicSpec;
}

function record(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).some(key => !keys.includes(key))) throw new TypeError(`${label} has unsupported properties.`);
  return Object.assign(Object.create(null), value);
}

function imageValues(graphicSpec) {
  const values = new Map();
  let bytes = 0, pixels = 0;
  function add(object, type) {
    if (type !== "image") return;
    const image = validateImagePayload(object.properties?.image);
    const previous = values.get(image.contentHash);
    if (previous !== undefined) {
      if (previous.width !== image.width || previous.height !== image.height || previous.mimeType !== image.mimeType ||
          previous.payload.data !== image.payload.data) throw new Error("One image hash has inconsistent metadata.");
      return;
    }
    bytes += image.byteLength;
    pixels += image.width * image.height;
    if (bytes > MAX_BYTES || pixels > MAX_PIXELS) throw assetError("render-budget", "Image rendering exceeds the unique byte or pixel budget.");
    values.set(image.contentHash, image);
  }
  walkGraphicTreeEvents(graphicSpec, {
    enter({ object }) { if (!Array.isArray(object.items)) add(object, object.type); },
    item({ object, owner }) { add(object, object.type ?? owner.type); }
  });
  return values;
}

export async function prepareImageRendering(program, options) {
  options = record(options, ["decode", "signal"], "Image rendering options");
  const { decode, signal } = options;
  if (typeof decode !== "function") throw new TypeError("Image rendering requires an explicit decode callback.");
  assertAssetActive(signal);
  const scene = program?.version === 2 && Array.isArray(program.nodes) ? program : undefined;
  const graphicSpec = imageSpec(scene === undefined ? program : canvasSceneProgram(scene));
  // Complete every payload and cumulative budget check before the first callback.
  const values = imageValues(graphicSpec);
  const decoded = new Map();
  for (const image of values.values()) {
    const request = Object.freeze({ bytes: imagePayloadBytes(image), mimeType: image.mimeType,
      contentHash: image.contentHash, width: image.width, height: image.height,
      ...(signal === undefined ? {} : { signal }) });
    const result = record(await assetHostStage(decode, request, signal, "decode-error"),
      ["image", "width", "height", "originClean"], "Decoded rendering image");
    if (result.originClean !== true) throw assetError("cors", "Decoded image is not origin-clean for export.");
    if (result.width !== request.width || result.height !== request.height ||
        result.image === null || !["object", "function"].includes(typeof result.image)) {
      throw assetError("dimension-limit", "Decoded rendering image does not match its stored dimensions.");
    }
    decoded.set(image.contentHash, Object.freeze({ image: result.image, width: request.width, height: request.height }));
  }
  assertAssetActive(signal);
  const handle = Object.freeze({ kind: "image-rendering", imageCount: decoded.size });
  preparedImages.set(handle, { graphicSpec, decoded, signal });
  // Recheck mutable foreign graphic inputs after asynchronous callbacks.
  readPreparedImages(scene === undefined ? graphicSpec : canvasSceneProgram(scene).graphicSpec, handle);
  return handle;
}

export function readPreparedImages(graphicSpec, handle) {
  const values = imageValues(graphicSpec);
  if (handle === undefined) {
    if (values.size > 0) throw assetError("preparation-required", "Image graphics require prepareImageRendering before Canvas render.");
    return new Map();
  }
  const prepared = preparedImages.get(handle);
  if (prepared === undefined) throw new TypeError("Expected an authentic prepared image rendering handle.");
  if (prepared.graphicSpec !== graphicSpec) throw assetError("stale-result", "Prepared images belong to a different graphicSpec.");
  assertAssetActive(prepared.signal);
  if (values.size !== prepared.decoded.size) throw assetError("stale-result", "Prepared image inputs changed.");
  for (const image of values.values()) {
    const entry = prepared.decoded.get(image.contentHash);
    if (entry === undefined || entry.width !== image.width || entry.height !== image.height) throw assetError("stale-result", "Prepared image inputs changed.");
  }
  return prepared.decoded;
}
