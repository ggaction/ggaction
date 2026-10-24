import { normalizeCompositionShares } from "../core/compositionScales.js";
import { findSemanticScale } from "../selectors/scales.js";
import { ownership } from "../selectors/markOwners.js";
import { findCoordinate } from "../selectors/coordinates.js";
import { hasOrdinalDomain } from "../grammar/scales/types.js";

function bindings(program, channel, path = []) {
  if (program.compositionSpec && program.compositionSpec.type !== "facet") return Object.entries(program.children).flatMap(([id, child]) => bindings(child, channel, [...path, id]));
  const owners = ownership(program);
  const entries = new Map();
  for (const layer of program.semanticSpec.layers) {
    if (owners.has(layer.id) || layer.derivedBindings?.overlay || program.markConfigs[layer.id]?.statisticalReference) continue;
    const encoding = layer.encoding?.[channel];
    if (!encoding?.scale) continue;
    if (["x", "y"].includes(channel) && findCoordinate(program, layer.coordinate)?.type !== "cartesian") {
      throw new Error(`Shared ${channel} requires Cartesian positions.`);
    }
    const scale = findSemanticScale(program, encoding.scale);
    if (!scale || !program.resolvedScales[scale.id]) throw new Error(`Shared ${channel} requires a materialized scale.`);
    const meaning = { field: encoding.field, fieldType: encoding.fieldType,
      aggregateUnit: ["count", "distinct", "valid", "missing"].includes(encoding.aggregate) ? "count"
        : ["variance", "variancep"].includes(encoding.aggregate) ? "squared" : "value", temporalUnit: encoding.temporalUnit };
    const previous = entries.get(scale.id);
    if (previous && JSON.stringify(previous.meaning) !== JSON.stringify(meaning)) {
      throw new Error(`Shared ${channel} has ambiguous field meaning inside a view.`);
    }
    entries.set(scale.id, { path, program, scale, meaning, domain: program.resolvedScales[scale.id].domain });
  }
  if (!entries.size) throw new Error(`Shared ${channel} is not encoded in view "${path.join("/") || "root"}".`);
  return [...entries.values()];
}

function compatibleDefinition(scale, channel) {
  const omitted = new Set(["id", "domain", "emptyDomain", "nice", "zero"]);
  if (["x", "y"].includes(channel)) omitted.add("range");
  return Object.fromEntries(Object.entries(scale).filter(([key]) => !omitted.has(key)).sort(([a], [b]) => a.localeCompare(b)));
}

function unionDomain(entries, channel) {
  const first = entries[0];
  const meaning = JSON.stringify(first.meaning);
  const definition = JSON.stringify(compatibleDefinition(first.scale, channel));
  for (const entry of entries) {
    if (JSON.stringify(entry.meaning) !== meaning || JSON.stringify(compatibleDefinition(entry.scale, channel)) !== definition) {
      throw new Error(`Cannot share ${channel}: field meaning and scale mapping must be compatible across views.`);
    }
  }
  const explicit = entries.filter(entry => Array.isArray(entry.scale.domain)).map(entry => entry.scale.domain);
  if (explicit.some(domain => JSON.stringify(domain) !== JSON.stringify(explicit[0]))) {
    throw new Error(`Cannot share ${channel}: explicit domains conflict.`);
  }
  // An explicit common domain is intentional. Otherwise derive a fresh union on
  // each composition edit; never feed yesterday's union back into inference.
  if (explicit.length) return explicit[0];
  const domains = entries.map(entry => entry.domain);
  if (hasOrdinalDomain(first.scale.type)) return [...new Set(domains.flat())];
  if (first.scale.type === "quantile") return domains.flat().toSorted((a, b) => a - b);
  if (domains.some(domain => domain.length !== 2 || domain.some(value => !Number.isFinite(value)))) {
    throw new Error(`Shared ${channel} requires finite domains or compatible ordinal categories.`);
  }
  return [Math.min(...domains.flat()), Math.max(...domains.flat())];
}

function updatePath(program, path, callback) {
  if (!path.length) return callback(program);
  const [id, ...rest] = path;
  const children = { ...program.children, [id]: updatePath(program.children[id], rest, callback) };
  return program._withCompositionState({ compositionSpec: program.compositionSpec, children });
}

function materializeChangedAncestors(original, revised) {
  if (original === revised || !revised.compositionSpec || revised.compositionSpec.type === "facet") return revised;
  const children = Object.fromEntries(Object.entries(revised.children).map(([id, child]) =>
    [id, materializeChangedAncestors(original.children[id], child)]));
  return revised._withCompositionState({ compositionSpec: revised.compositionSpec, children }).materializeComposition();
}

// Canonical children retain authored domains. Only render snapshots receive a
// shared resolved domain, just as concat's automatic sizing derives snapshots.
export function resolveSharedCompositionChildren(children, requested) {
  const share = normalizeCompositionShares(requested);
  const plans = [];
  for (const [channel, enabled] of Object.entries(share)) {
    if (!enabled) continue;
    const entries = Object.entries(children).flatMap(([id, child]) => bindings(child, channel, [id]));
    const domain = unionDomain(entries, channel);
    for (const entry of entries) plans.push({ ...entry, domain });
  }
  let result = children;
  const seen = new Map();
  for (const { path: [id, ...path], scale, domain } of plans) {
    const key = JSON.stringify([id, path, scale.id]);
    if (seen.has(key)) {
      if (JSON.stringify(seen.get(key)) !== JSON.stringify(domain)) throw new Error("Shared channels require incompatible domains on the same scale.");
      continue;
    }
    seen.set(key, domain);
    result = { ...result, [id]: updatePath(result[id], path, child => {
      if (JSON.stringify(child.resolvedScales[scale.id]?.domain) === JSON.stringify(domain)) return child;
      return child.compositionSpec?.type === "facet"
        ? child.editFacetSource({ action: { method: "editScale", options: { id: scale.id, domain } } })
        : child.editScale({ id: scale.id, domain });
    }) };
  }
  return Object.fromEntries(Object.entries(result).map(([id, child]) => [id, materializeChangedAncestors(children[id], child)]));
}
