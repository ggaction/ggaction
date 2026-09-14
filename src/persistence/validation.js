import { isPlainObject } from "../core/immutable.js";
import { validateUserId } from "../core/identifiers.js";
import { collectAllResourceReferences } from "../core/resourceReferences.js";
import { requiredTraceExtension } from "../core/extensionRegistry.js";
import { resolveDatasetReference } from "../selectors/datasets.js";
import { normalizeMarkSelector } from "../grammar/markSelection.js";
import { parseSemanticPath } from "../grammar/schemas/semanticPath.js";
import { validateStoredSemanticValue } from "../actions/primitives/semantic.js";
import { validateGraphicType, isGraphicContainerType } from "../grammar/schemas/graphic.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";
import { walkGraphicTreeEvents } from "../grammar/schemas/graphicTree.js";
import { invalidSnapshot } from "./codec.js";

export const STATE_KEYS = Object.freeze([
  "semanticSpec", "graphicSpec", "resolvedScales", "materializationConfigs",
  "children", "compositionSpec", "context", "trace", "actionStack"
]);

export function requireObject(value, path) {
  if (!isPlainObject(value)) throw invalidSnapshot(`${path} must be a plain object.`, path);
}

export function exactKeys(value, keys, path) {
  requireObject(value, path);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    throw invalidSnapshot(`${path} must contain exactly: ${keys.join(", ")}.`, path);
  }
}

function requireArray(value, path) {
  if (!Array.isArray(value) || Array.from({ length: value.length }, (_, i) => i).some(i => !Object.hasOwn(value, i))) {
    throw invalidSnapshot(`${path} must be a dense array.`, path);
  }
}

export function validateGraphic(graphic, path = "payload.graphicSpec") {
  exactKeys(graphic, ["objects", "order"], path);
  requireObject(graphic.objects, `${path}.objects`);
  requireArray(graphic.order, `${path}.order`);
  const ids = new Set(Object.keys(graphic.objects));
  function attachment(id) {
    if (typeof id !== "string" || !Object.hasOwn(graphic.objects, id)) {
      throw invalidSnapshot(`Unknown graphic attachment "${String(id)}".`, path);
    }
  }
  for (const [id, object] of Object.entries(graphic.objects)) {
    if (!id.length) throw invalidSnapshot("Graphic IDs must be non-empty.", path);
    requireObject(object, `${path}.objects.${id}`);
    validateGraphicType(object.type);
    if (Object.keys(object).some(key => !["type", "properties", "items", "children"].includes(key))) {
      throw invalidSnapshot(`Unknown graphic member at ${id}.`, path);
    }
    if (object.properties !== undefined) validateConcreteGraphicProperties(object.type, object.properties);
    if (object.items !== undefined) {
      if (object.type === "canvas" || object.properties !== undefined) throw invalidSnapshot(`Invalid item owner "${id}".`, path);
      requireArray(object.items, `${path}.objects.${id}.items`);
      for (const item of object.items) {
        exactKeys(item, object.type === "collection" ? ["id", "type", "properties"] : ["id", "properties"], path);
        if (typeof item.id !== "string" || !item.id.length || ids.has(item.id)) throw invalidSnapshot(`Duplicate or invalid graphic item ID "${item.id}".`, path);
        ids.add(item.id);
        const type = item.type ?? object.type;
        validateGraphicType(type);
        if (isGraphicContainerType(type)) throw invalidSnapshot("Graphic items must be primitive drawables.", path);
        validateConcreteGraphicProperties(type, item.properties);
      }
    } else if (object.properties === undefined) {
      throw invalidSnapshot(`Graphic "${id}" requires properties or items.`, path);
    }
    if (object.children !== undefined) {
      if (!isGraphicContainerType(object.type)) throw invalidSnapshot(`Graphic "${id}" cannot own children.`, path);
      requireArray(object.children, `${path}.objects.${id}.children`);
      object.children.forEach(attachment);
    }
  }
  graphic.order.forEach(attachment);
  walkGraphicTreeEvents(graphic, {});
}

export function validateTrace(trace, ProgramClass, extensions, path = "payload.trace") {
  const seen = new Set();
  function visit(node, root) {
    exactKeys(node, ["id", "op", "description", "args", "children"], path);
    if (typeof node.description !== "string" || typeof node.op !== "string" ||
        (root ? node.id !== "program" || node.op !== "program" : !/^a[1-9]\d*$/.test(node.id) || node.op === "program") || seen.has(node.id)) {
      throw invalidSnapshot(`Invalid or duplicate trace node "${node.id}".`, path);
    }
    seen.add(node.id);
    requireObject(node.args, `${path}.args`);
    requireArray(node.children, `${path}.children`);
    const extension = requiredTraceExtension(ProgramClass, node.op);
    if (extension !== undefined) extensions.add(extension);
    node.children.forEach(child => visit(child, false));
  }
  visit(trace, true);
  // The constructor derives the next action number from the node count.
  for (let index = 1; index < seen.size; index++) {
    if (!seen.has(`a${index}`)) throw invalidSnapshot("Trace action IDs must be consecutive.", path);
  }
}

function validateSemanticProperties(program, value, property) {
  let parsed;
  try { parsed = parseSemanticPath(property); } catch (error) {
    if (!isPlainObject(value) || !Object.keys(value).length) throw error;
    for (const [key, child] of Object.entries(value)) validateSemanticProperties(program, child, `${property}.${key}`);
    return;
  }
  const leaf = parsed.path.at(-1);
  if (["data", "coordinate", "scale"].includes(leaf)) validateUserId(value, property);
  if (leaf === "field" && (typeof value !== "string" || value.length === 0)) throw invalidSnapshot(`Invalid field at ${property}.`, property);
  validateStoredSemanticValue(program, parsed, value);
}

export function validateProgramState(program, path) {
  const semantic = program.semanticSpec;
  exactKeys(semantic, ["datasets", "layers", "scales", "coordinates", "guides", "title"], `${path}.semanticSpec`);
  const resources = new Map();
  for (const [collection, kind, referenceKind] of [
    ["datasets", "dataset", "data"], ["layers", "layer", "mark"],
    ["scales", "scale", "scale"], ["coordinates", "coordinate", "coordinate"]
  ]) {
    requireArray(semantic[collection], `${path}.semanticSpec.${collection}`);
    const entries = new Map();
    for (const resource of semantic[collection]) {
      requireObject(resource, `${path}.semanticSpec.${collection}`);
      validateUserId(resource.id, `${kind} id`);
      if (entries.has(resource.id)) throw invalidSnapshot(`Duplicate ${kind} "${resource.id}".`, path);
      entries.set(resource.id, resource);
    }
    resources.set(referenceKind, entries);
    for (const resource of entries.values()) {
      for (const [key, value] of Object.entries(resource)) {
        if (key !== "id") validateSemanticProperties(program, value, `${kind}[${resource.id}].${key}`);
      }
    }
  }
  for (const [key, prefix] of [["guides", "guide"], ["title", "title"]]) {
    requireObject(semantic[key], `${path}.semanticSpec.${key}`);
    for (const [name, value] of Object.entries(semantic[key])) validateSemanticProperties(program, value, `${prefix}.${name}`);
  }
  for (const key of ["resolvedScales", "materializationConfigs", "context"]) requireObject(program[key], `${path}.${key}`);
  for (const key of ["marks", "guides"]) requireObject(program.materializationConfigs[key], `${path}.materializationConfigs.${key}`);
  const selections = program.materializationConfigs.selections ?? {};
  requireObject(selections, `${path}.materializationConfigs.selections`);
  for (const [id, selection] of Object.entries(selections)) {
    validateUserId(id, "Selection id");
    exactKeys(selection, ["target", "selector"], `${path}.materializationConfigs.selections.${id}`);
    validateUserId(selection.target, "Selection target");
    normalizeMarkSelector(selection.selector);
  }
  resources.set("selection", new Map(Object.entries(selections)));
  for (const reference of collectAllResourceReferences(program)) {
    if (reference.kind === "data") resolveDatasetReference(program, reference.id);
    else if (!resources.get(reference.kind)?.has(reference.id)) {
      throw invalidSnapshot(`Unknown ${reference.kind} "${reference.id}" referenced by ${reference.ownerKind} "${reference.ownerId}".`, path);
    }
  }
  for (const [id, scale] of Object.entries(program.resolvedScales)) {
    requireObject(scale, `${path}.resolvedScales.${id}`);
    requireArray(scale.domain, `${path}.resolvedScales.${id}.domain`);
    requireArray(scale.range, `${path}.resolvedScales.${id}.range`);
    if (!resources.get("scale").has(id) || scale.type !== resources.get("scale").get(id).type) {
      throw invalidSnapshot(`Resolved scale "${id}" has no matching semantic owner/type.`, path);
    }
  }
  for (const id of Object.keys(program.markConfigs)) {
    if (!resources.get("mark").has(id)) throw invalidSnapshot(`Mark config "${id}" has no layer owner.`, path);
  }
  for (const kind of ["data", "mark"]) {
    const visited = new Set();
    const active = new Set();
    function visit(resource) {
      if (active.has(resource.id)) throw invalidSnapshot(`Cyclic ${kind} source "${resource.id}".`, path);
      if (visited.has(resource.id)) return;
      active.add(resource.id);
      if (resource.source !== undefined) visit(kind === "data" ? resolveDatasetReference(program, resource.source) : resources.get(kind).get(resource.source));
      active.delete(resource.id);
      visited.add(resource.id);
    }
    for (const resource of resources.get(kind).values()) visit(resource);
  }
  validateGraphic(program.graphicSpec, `${path}.graphicSpec`);
}
