import { normalizeAssetRequest } from "../grammar/assetRequest.js";
import { IMAGE_MIME_TYPES, validateImagePayload } from "../grammar/imagePayload.js";
import { validateInputReference } from "../core/resourceReference.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { ownRecord } from "../core/ownData.js";
import { requireStoredResource } from "../selectors/resources.js";

export function concreteImageValue(resource) {
  return { contentHash: resource.options.expectedHash, mimeType: resource.options.mimeType, ...resource.result };
}

function validateStored(resource) {
  const options = normalizeAssetRequest(resource.options, [], IMAGE_MIME_TYPES, "Image");
  if (canonicalJSON(options) !== canonicalJSON(resource.options)) throw new TypeError("Stored image options require normalized defaults.");
  ownRecord(resource.result, "Image resource result");
  if (Object.keys(resource.result).length !== 4 || !["width", "height", "byteLength", "payload"].every(key => Object.hasOwn(resource.result, key))) {
    throw new TypeError("Image result requires exact dimensions, byteLength and payload.");
  }
  validateImagePayload(concreteImageValue(resource));
  if (resource.result.byteLength > options.maxBytes) throw new RangeError("Image payload exceeds its source byte budget.");
  if (resource.ownership.mode !== "authored" || resource.inputs.length !== 0 ||
      Object.keys(resource.provenance).length !== 1 || resource.provenance.origin !== "authored") {
    throw new TypeError("Image resources require authored ownership and provenance without inputs.");
  }
  return resource;
}

export function validateImageBinding(program, layer) {
  if (layer.mark?.type !== "image") {
    if (layer.image !== undefined || layer.alt !== undefined) throw new TypeError("Image binding and alternative text require an image mark.");
    return;
  }
  validateInputReference(layer.image);
  if (layer.image.kind !== "image") throw new TypeError("Image marks require an image resource reference.");
  requireStoredResource(program, layer.image);
  if (typeof layer.alt !== "string" || layer.data !== undefined || layer.coordinate !== undefined ||
      Object.keys(layer.encoding ?? {}).length !== 0 || Object.keys(layer.conditionals ?? {}).length !== 0) {
    throw new TypeError("Image marks require alternative text and cannot bind data, coordinates or encodings.");
  }
}

function validateBindings(program, resource) {
  for (const layer of program.semanticSpec.layers) {
    if (layer.image?.id === resource.id) validateImageBinding(program, layer);
  }
}

export const imageResourceHandler = Object.freeze({ validateStored, validateBindings });
