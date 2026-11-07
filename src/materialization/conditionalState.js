import { geoLabelDataset } from "./geo/labels.js";
import { normalizeMarkLabelContent } from "../grammar/markLabels.js";
import { geoFeatureDataset } from "./geo/featureDataset.js";
import { validateGeoEncodingChannel, validateGeoEncodingScale } from "../grammar/geo/encoding.js";
import { conditionalPositionTemplate, commonPositionBinding } from "../core/encodingBindings.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { resolveMarkPositionPolicy } from "./positionPolicy.js";
import { validatePositionSource } from "../grammar/positionPolicies/source.js";
import { resolveSecondaryPositionPolicy } from "../grammar/positionPolicies/secondary.js";
import { findLayer } from "../selectors/layers.js";
import { getPositionChannelDefinition } from "../core/vocabulary.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { annotateError } from "../core/diagnostics.js";
import { normalizeConditionalEncoding } from "../grammar/conditionalEncoding.js";
import { conditionalValues, validateConditionalScale, validateStoredConditional } from "../grammar/conditionalState.js";
import { EXPRESSION_LIMITS, limit } from "../grammar/expressionValues.js";
import { APPEARANCE_MARK_TYPES, FIXED_APPEARANCE_MARK_TYPES } from "../core/vocabulary.js";
import { validateCategoricalColorConsumer, validateContinuousColorConsumer } from "../grammar/scales/colorConsumers.js";
import { expressionEnvironment } from "./expressionInputs.js";
import { requireDataset } from "../selectors/datasets.js";
import { requireStoredResource } from "../selectors/resources.js";
import { requireSemanticScale } from "../selectors/scales.js";
import { storedSelectionSelector } from "../selectors/selectionResources.js";

export function conditionalSelectionInput(program, id) {
  const selection = program.materializationConfigs.selections?.[id];
  if (selection === undefined) throw new Error(`Unknown conditional selection "${id}".`);
  requireStoredResource(program, selection.resource);
  return { selection: id, ...selection.resource };
}

export function resolveConditionalEnvironment(program, layer, channel, definition = layer.conditionals[channel]) {
  const normalized = validateStoredConditional(channel, definition);
  if (layer.encoding?.[channel] !== undefined) throw new Error("Conditional and ordinary encodings cannot own the same channel.");
  const property = channel === "color" ? (["line", "rule", "tick"].includes(layer.mark.type) ? "stroke" : "fill") : ["size", "pointRadius"].includes(channel) ? "radius" : channel;
  const config = program.materializationConfigs.marks[layer.id];
  if (!["text", "dx", "dy"].includes(channel) && getPositionChannelDefinition(channel) === undefined && (config?.[property] !== undefined || config?.barAppearance?.[property] !== undefined)) throw new Error("Conditional encoding cannot duplicate a constant mark configuration.");
  if (["dx", "dy"].includes(channel) && layer.source !== undefined) throw new Error("Numeric text offsets require independent Text marks.");
  if (channel === "pointRadius" && (layer.encoding?.size !== undefined || layer.conditionals?.size !== undefined)) throw new Error("Conditional point radius cannot be combined with a size encoding.");
  if (layer.mark.type === "geo") validateGeoEncodingChannel(layer, channel);
  const source = layer.mark.type === "geo" ? geoFeatureDataset(program, layer) : geoLabelDataset(program, layer) ?? requireDataset(program, layer.data);
  const environment = expressionEnvironment(program, source, definition.parameterInputs);
  normalizeConditionalEncoding(normalized.definition, { environment });
  limit(source.values.length * (normalized.nodes + definition.conditions.length + 1), EXPRESSION_LIMITS.rowWork, "conditionalWork");
  for (const value of conditionalValues(definition)) {
    const method = `encode${channel[0].toUpperCase()}${channel.slice(1)}`;
    const position = getPositionChannelDefinition(channel);
    const types = ["text", "dx", "dy"].includes(channel) ? ["text"] : channel === "pointRadius" ? ["point"] : position?.markTypes ?? (value.field === undefined ? [...(APPEARANCE_MARK_TYPES[method] ?? []), ...(FIXED_APPEARANCE_MARK_TYPES[method] ?? [])] : APPEARANCE_MARK_TYPES[method] ?? []);
    const continuousTick = channel === "color" && layer.mark.type === "tick" && ["quantitative", "temporal"].includes(value.fieldType);
    if (!continuousTick && !types.includes(layer.mark.type)) throw new Error(`Conditional ${channel} is incompatible with mark "${layer.id}".`);
    if (channel === "text" && value.content !== undefined) normalizeMarkLabelContent(findLayer(program, layer.source), value);
    if (value.field !== undefined && !Object.hasOwn(environment.fields, value.field) &&
        !(layer.mark.type === "geo" && source.values.length === 0)) throw new Error(`Unknown conditional field "${value.field}".`);
    if (value.scale !== undefined) {
      const scale = requireSemanticScale(program, value.scale);
      validateConditionalScale(channel, value, scale);
      if (layer.mark.type === "geo") validateGeoEncodingScale(layer, channel, value, scale);
      if (position !== undefined && ["x", "y", "theta", "radius"].includes(channel)) {
        validatePositionSource(layer, value, `Conditional ${channel}`);
        const template = conditionalPositionTemplate(layer, ["x", "y", "x2", "y2", "theta", "radius"]);
        const policy = resolveMarkPositionPolicy({ program, layer: template, dataset: source, channel,
          args: { ...value, ...(scale.radialMapping === undefined ? {} : { mapping: scale.radialMapping }) }, fieldType: value.fieldType, field: value.field });
        for (const property of ["aggregate", "bin", "stack", "weight"]) if (Object.hasOwn(value, property) && canonicalJSON(value[property]) !== canonicalJSON(policy[property])) {
          throw new Error(`Conditional ${channel} has incompatible ${property} for ${layer.mark.type}.`);
        }
      }
      if (["x2", "y2"].includes(channel)) {
        const primary = commonPositionBinding(layer, channel[0]);
        if (primary?.scale === undefined || primary.scale !== value.scale) throw new Error("Conditional endpoints must share one primary scale.");
        resolveSecondaryPositionPolicy(layer, primary, channel[0], value, `Conditional ${channel}`);
        for (const property of ["aggregate", "bin", "stack", "weight", "categoryOrder"]) if (Object.hasOwn(value, property)) throw new Error(`Conditional ${channel} does not support ${property}.`);
      }
      if (["xOffset", "yOffset"].includes(channel)) {
        if (value.field === undefined || !["nominal", "ordinal"].includes(value.fieldType)) throw new Error("Conditional offset requires a categorical field.");
        for (const property of ["aggregate", "bin", "stack", "weight", "categoryOrder", "temporalUnit"]) if (Object.hasOwn(value, property)) throw new Error(`Conditional ${channel} does not support ${property}.`);
      }
      if (["color", "stroke", "strokeDash"].includes(channel)) {
        if (["nominal", "ordinal"].includes(value.fieldType)) validateCategoricalColorConsumer(layer, value, scale, channel);
        else validateContinuousColorConsumer(layer, value, scale, { channel });
      }
    }
  }
  for (const input of definition.selectionInputs) {
    const current = conditionalSelectionInput(program, input.selection);
    if (current.kind !== input.kind || current.id !== input.id || current.revision !== input.revision) throw new Error("Conditional selection reference is stale.");
  }
  return environment;
}

const APPEARANCE_PROPERTIES = Object.freeze({ fill: ["color"], stroke: ["color", "stroke"], opacity: ["opacity"], strokeWidth: ["strokeWidth"] });
const CARTESIAN_CHANNELS = Object.freeze(["x", "y", "x2", "y2", "xOffset", "yOffset"]);
const POLAR_CHANNELS = Object.freeze(["theta", "radius"]);
const POINT_SHAPE_CHANNELS = Object.freeze(["size", "pointRadius", "shape", "angle"]);

function propertyChannels(program, layer, property) {
  if (APPEARANCE_PROPERTIES[property] !== undefined) return APPEARANCE_PROPERTIES[property];
  const type = layer.mark.type;
  if (type === "geo" && ["radius", "width", "height"].includes(property)) return ["size"];
  if (["line", "area"].includes(type) && ["x", "y", "width", "height"].includes(property)) {
    return [...CARTESIAN_CHANNELS, ...POLAR_CHANNELS, "strokeWidth"];
  }
  if (type === "arc" && ["x", "y", "width", "height", "radius"].includes(property)) return POLAR_CHANNELS;
  if (["bar", "rect"].includes(type)) {
    if (["x", "width"].includes(property)) return ["x", "x2", "xOffset"];
    if (["y", "height"].includes(property)) return ["y", "y2", "yOffset"];
  }
  if (type === "point") {
    if (property === "radius") return ["size", "pointRadius"];
    if (["width", "height"].includes(property)) return POINT_SHAPE_CHANNELS;
    const packing = program.materializationConfigs.pointPacking?.[layer.id];
    const jitter = program.materializationConfigs.jitters?.[layer.id];
    if (["x", "y"].includes(property) && packing?.channel === property) {
      return [...CARTESIAN_CHANNELS, ...POINT_SHAPE_CHANNELS, "stroke", "strokeWidth"];
    }
    if (["x", "y"].includes(property) && [property, "both"].includes(jitter?.channel)) {
      return [property, ...POINT_SHAPE_CHANNELS, "stroke", "strokeWidth"];
    }
  }
  if (type === "text") {
    if (["width", "height"].includes(property)) return [];
    if (["x", "y"].includes(property)) {
      const positioned = program.markConfigs[layer.id]?.labelAuthoring?.placement !== undefined || program.materializationConfigs.labelLayouts?.[layer.id] !== undefined;
      return [property, property === "x" ? "dx" : "dy", ...(positioned ? ["text"] : [])];
    }
  }
  return ({ x: ["x", "xOffset", ...POLAR_CHANNELS], y: ["y", "yOffset", ...POLAR_CHANNELS],
    x1: ["x"], y1: ["y"], x2: ["x2"], y2: ["y2"] })[property] ?? [];
}

function selectionDependencies(program, selection, predicate) {
  const layer = findLayer(program, selection.target);
  const channels = predicate.channel === undefined ? propertyChannels(program, layer, predicate.property) : [predicate.channel];
  const dependencies = channels.map(channel => `${layer.id}:${channel}`);
  if (layer.mark.type === "text" && predicate.property !== undefined) dependencies.push(`${layer.id}:text`);
  // Label contents and anchors read the chosen source bindings even when the
  // label's own encoding is ordinary. Trace those implicit read dependencies.
  if (layer.mark.type === "text" && layer.source !== undefined &&
      (predicate.channel === "text" || ["x", "y", "width", "height"].includes(predicate.property))) {
    const source = findLayer(program, layer.source);
    const sourceChannels = predicate.channel === "text" ? [...CARTESIAN_CHANNELS, ...POLAR_CHANNELS]
      : [...propertyChannels(program, source, predicate.property)];
    if (predicate.property !== undefined && program.markConfigs[layer.id]?.labelAuthoring?.placement !== undefined) {
      sourceChannels.push(...POINT_SHAPE_CHANNELS, "strokeWidth");
    }
    dependencies.push(...sourceChannels.map(channel => `${source.id}:${channel}`));
  }
  // Native interval inspection exposes the selected measure endpoint on its
  // secondary channel, including aggregate bars without an explicit binding.
  if (layer.mark.type === "bar" && ["x2", "y2"].includes(predicate.channel)) dependencies.push(`${layer.id}:${predicate.channel[0]}`);
  return dependencies;
}

// A selector reading a conditional property creates a mark-to-mark dependency.
// Validate every branch, including inactive selectors, before materialization.
export function validateConditionalDependencies(program, { environment = true } = {}) {
  const edges = new Map();
  let work = 0;
  for (const layer of program.semanticSpec.layers) {
    for (const [channel, definition] of Object.entries(layer.conditionals ?? {})) {
      if (environment) resolveConditionalEnvironment(program, layer, channel, definition);
      const key = `${layer.id}:${channel}`, targets = [];
      limit(++work, EXPRESSION_LIMITS.nodes, "conditionalGraph");
      for (const input of definition.selectionInputs) {
        limit(++work, EXPRESSION_LIMITS.nodes, "conditionalGraph");
        let selection = program.materializationConfigs.selections[input.selection];
        if (selection.sourceSelection) selection = program.materializationConfigs.selections[selection.sourceSelection];
        const predicate = storedSelectionSelector(program, selection);
        targets.push(...selectionDependencies(program, selection, predicate));
      }
      edges.set(key, targets);
    }
  }
  const visited = new Set(), active = new Set();
  for (const root of edges.keys()) {
    const stack = [[root, false]];
    while (stack.length) {
      const [key, done] = stack.pop();
      if (visited.has(key)) continue;
      if (done) { active.delete(key); visited.add(key); continue; }
      if (active.has(key)) throw annotateError(new Error("Cyclic conditional selection dependency."), { code: "cyclic-dependency" });
      active.add(key);
      limit(active.size, EXPRESSION_LIMITS.depth, "conditionalDepth");
      stack.push([key, true]);
      for (const dependency of edges.get(key) ?? []) if (edges.has(dependency)) stack.push([dependency, false]);
    }
  }
}

export function rebindConditionalInputs(program, { parameter, selection, selections = [] } = {}) {
  let next = program;
  const targets = [];
  const selectionIds = new Set([...selections, selection]);
  for (const layer of program.semanticSpec.layers) {
    for (const [channel, definition] of Object.entries(layer.conditionals ?? {})) {
      const parameters = definition.parameterInputs.some(input => input.id === parameter);
      const selectionChanged = definition.selectionInputs.some(input => selectionIds.has(input.id));
      if (!parameters && !selectionChanged) continue;
      const revised = cloneAndFreeze({ ...definition,
        parameterInputs: definition.parameterInputs.map(input => input.id !== parameter ? input : (() => {
          const resource = requireStoredResource(next, { kind: "parameter", id: input.id });
          return { kind: resource.kind, id: resource.id, revision: resource.revision };
        })()),
        selectionInputs: definition.selectionInputs.map(input => !selectionIds.has(input.id) ? input : conditionalSelectionInput(next, input.selection))
      });
      next = next.editSemantic({ property: `layer[${layer.id}].conditionals.${channel}`, value: revised });
      targets.push(layer.id);
    }
  }
  validateConditionalDependencies(next);
  return { program: next, targets: [...new Set(targets)] };
}

export function conditionalReadTargets(program, layer) {
  const targets = new Set();
  for (const definition of Object.values(layer.conditionals ?? {})) {
    for (const input of definition.selectionInputs) {
      const selection = program.materializationConfigs.selections?.[input.selection];
      if (selection !== undefined) {
        targets.add(selection.target);
        if (selection.sourceSelection) targets.add(program.materializationConfigs.selections[selection.sourceSelection].target);
      }
    }
  }
  targets.delete(layer.id);
  return [...targets];
}

export function conditionalDependentMarkIds(program, sources) {
  const reverse = new Map();
  let work = 0;
  for (const layer of program.semanticSpec.layers) for (const source of conditionalReadTargets(program, layer)) {
    limit(++work, EXPRESSION_LIMITS.nodes, "conditionalGraph");
    if (!reverse.has(source)) reverse.set(source, []);
    reverse.get(source).push(layer.id);
  }
  const visited = new Set(sources), pending = [...sources], result = [];
  for (let index = 0; index < pending.length; index++) {
    for (const target of reverse.get(pending[index]) ?? []) {
      if (visited.has(target)) continue;
      visited.add(target); pending.push(target); result.push(target);
    }
  }
  return orderConditionalMarkIds(program, result);
}

export function orderConditionalMarkIds(program, ids) {
  const included = new Set(ids), byId = new Map(program.semanticSpec.layers.map(layer => [layer.id, layer]));
  const result = [], visited = new Set(), active = new Set();
  for (const id of ids) {
    const pending = [[id, false]];
    while (pending.length) {
      const [target, done] = pending.pop();
      if (visited.has(target)) continue;
      if (done) { active.delete(target); visited.add(target); result.push(target); continue; }
      // Conditional property cycles are rejected by the channel dependency validator.
      // Reciprocal raw-field selections do not depend on each other's appearance.
      if (active.has(target)) continue;
      active.add(target); pending.push([target, true]);
      for (const source of conditionalReadTargets(program, byId.get(target))) {
        if (included.has(source)) pending.push([source, false]);
      }
    }
  }
  return result;
}
