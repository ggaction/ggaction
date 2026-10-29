import { normalizeAssetRequest } from "../grammar/assetRequest.js";
import { FONT_MIME_TYPES, validateFontPayload } from "../grammar/fontPayload.js";
import { FONT_IDENTITY_KEYS, validateFontIdentity } from "../core/font.js";
import { normalizeFontMetricProfile } from "../core/textMetricProfile.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { ownRecord } from "../core/ownData.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { requireStoredResource, findStoredResource } from "../selectors/resources.js";
import { walkGraphicTreeEvents } from "../grammar/schemas/graphicTree.js";

export function normalizeFontResourceOptions(input) {
  const options = normalizeAssetRequest(input, FONT_IDENTITY_KEYS, FONT_MIME_TYPES, "Font");
  validateFontIdentity(options);
  return options;
}

export function concreteFontValue(resource) {
  return { contentHash: resource.options.expectedHash, mimeType: resource.options.mimeType,
    ...Object.fromEntries(FONT_IDENTITY_KEYS.map(key => [key, resource.options[key]])), ...resource.result };
}

export function fontResourceIdentity(resource) {
  return { contentHash: resource.options.expectedHash,
    ...Object.fromEntries(FONT_IDENTITY_KEYS.map(key => [key, resource.options[key]])) };
}

function validateStored(resource) {
  const options = normalizeFontResourceOptions(resource.options);
  if (canonicalJSON(options) !== canonicalJSON(resource.options)) throw new TypeError("Stored font options require normalized defaults.");
  ownRecord(resource.result, "Font resource result");
  if (Object.keys(resource.result).length !== 2 || !["byteLength", "payload"].every(key => Object.hasOwn(resource.result, key))) {
    throw new TypeError("Font result requires exact byteLength and payload fields.");
  }
  validateFontPayload(concreteFontValue(resource));
  if (resource.result.byteLength > options.maxBytes) throw new RangeError("Font payload exceeds its source byte budget.");
  if (resource.ownership.mode !== "authored" || resource.inputs.length !== 0 ||
      Object.keys(resource.provenance).length !== 1 || resource.provenance.origin !== "authored") {
    throw new TypeError("Font resources require authored ownership and provenance without inputs.");
  }
  return resource;
}

export function validateFontMetricBindings(program, profile = program.materializationConfigs.textMetrics) {
  if (profile?.schemaVersion !== 2) return;
  normalizeFontMetricProfile(profile);
  for (const binding of profile.fonts) {
    const resource = requireStoredResource(program, binding.resource);
    if (canonicalJSON(fontResourceIdentity(resource)) !== canonicalJSON(binding.identity)) {
      throw new TypeError("Font metric identity does not match its exact font resource.");
    }
  }
}

// Editable snapshots retain both the measured profile and the concrete font
// consumed by renderers. A matching font tuple must prove the same bytes and
// provider; independently authored extension text may use another tuple.
export function validateConcreteFontBindings(program) {
  const profile = program.materializationConfigs.textMetrics;
  if (profile?.schemaVersion !== 2) return;
  const validate = (object, type) => {
    const font = object.properties?.font;
    if (type !== "text" || font === undefined) return;
    const binding = profile.fonts.find(value => value.identity.family === font.family &&
      value.identity.style === font.style && value.identity.weight === font.weight);
    if (binding === undefined) return;
    const expected = concreteFontValue(requireStoredResource(program, binding.resource));
    if (canonicalJSON(font) !== canonicalJSON(expected)) throw new TypeError("Concrete font is stale for its measured font resource.");
  };
  walkGraphicTreeEvents(program.graphicSpec, {
    enter({ object }) { if (!object.items) validate(object, object.type); },
    item({ object, owner }) { validate(object, object.type ?? owner.type); }
  });
}

export const fontResourceHandler = Object.freeze({ validateStored, validateBindings: program => validateFontMetricBindings(program) });

// Only children that inherited the exact old binding participate. Independent
// child namespaces with the same user ID are never silently overwritten.
export function fontResourceCandidate(program, resource, previous, root = true) {
  const old = findStoredResource(program, "font", resource.id);
  const bound = program.materializationConfigs.textMetrics?.schemaVersion === 2 &&
    program.materializationConfigs.textMetrics.fonts.some(binding => binding.resource.id === resource.id);
  const replace = root || (bound && previous !== undefined && canonicalJSON(old) === canonicalJSON(previous));
  let next = program;
  if (replace) {
    const resources = old === undefined ? [...program.semanticSpec.resources, resource]
      : program.semanticSpec.resources.map(entry => entry === old ? resource : entry);
    next = next._clone({ semanticSpec: { ...next.semanticSpec, resources: cloneAndFreeze(resources) } });
    if (bound) {
      const profile = next.materializationConfigs.textMetrics;
      next = next._withMaterializationConfig(["textMetrics"], { ...profile, measurements: [],
        fonts: profile.fonts.map(binding => binding.resource.id !== resource.id ? binding : {
          resource: { kind: "font", id: resource.id, revision: resource.revision }, identity: fontResourceIdentity(resource)
        }) });
    }
  }
  if (next.compositionSpec !== undefined) next = next._withCompositionState({ compositionSpec: next.compositionSpec,
    children: Object.fromEntries(Object.entries(next.children).map(([id, child]) => [id, fontResourceCandidate(child, resource, previous, false)])) });
  return next;
}


export function inheritFontMetricResources(parent, child, profile) {
  const additions = [];
  for (const binding of profile.fonts) {
    const source = requireStoredResource(parent, binding.resource);
    const existing = findStoredResource(child, "font", source.id);
    if (existing === undefined) additions.push(source);
    else if (canonicalJSON(existing) !== canonicalJSON(source)) throw new Error("Inherited font conflicts with the explicit child font resource.");
  }
  if (additions.length) child = child._clone({ semanticSpec: { ...child.semanticSpec,
    resources: cloneAndFreeze([...child.semanticSpec.resources, ...additions]) } });
  return child;
}

export function fontResourceWriteBase(program, resource, previous) {
  return fontResourceCandidate(program, resource, previous)._clone({ semanticSpec: program.semanticSpec });
}
