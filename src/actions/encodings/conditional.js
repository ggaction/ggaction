import { conditionalBranchRequest } from "./conditionalRequest.js";
import { clearPlotPositionChannel } from "./position/apply.js";
import { assertPositionEncodingFrame, isPositionEncodingEntry, resolvePositionEncoding } from "./position/resolve.js";
import { getPositionChannelDefinition } from "../../core/vocabulary.js";
import { findCoordinate } from "../../selectors/coordinates.js";
import { positionBindings, uniquePositionBinding, commonPositionBinding } from "../../core/encodingBindings.js";
import { isConditionalPositionChannel } from "../../grammar/conditionalPosition.js";
import { createDeferredEncodingProgram } from "./channels.js";
import { conditionalLegendLayer } from "../../materialization/legendEncodings.js";
import { legendBlockChannels } from "../../grammar/legendBlocks.js";
import { EXPRESSION_LIMITS, limit } from "../../grammar/expressionValues.js";
import { action, getWrappedActionMetadata, invokeWrappedActionImplementation } from "../../core/action.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { validateOptionObject } from "../../core/validation.js";
import { APPEARANCE_MARK_TYPES, FIXED_APPEARANCE_MARK_TYPES } from "../../core/vocabulary.js";
import { normalizeConditionalEncoding } from "../../grammar/conditionalEncoding.js";
import { CONDITIONAL_CHANNELS, normalizeStoredConditionalValue } from "../../grammar/conditionalState.js";
import { expressionEnvironment } from "../../materialization/expressionInputs.js";
import { conditionalSelectionInput, validateConditionalDependencies } from "../../materialization/conditionalState.js";
import { applyDetachedScaleRematerialization, applyLayerDataRematerialization } from "../../materialization/dependencies.js";
import { requireStoredResource } from "../../selectors/resources.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { findSemanticScale, requireSemanticScale } from "../../selectors/scales.js";
import { applyEncodingScale, resolveTarget, rebindPositionGuides } from "./shared.js";
import { withPreviewLayerEncodings, withoutPreviewLayerEncodings } from "../primitives/semanticAction.js";

function method(channel) { if (channel === "radius") return "encodeR"; return `encode${channel[0].toUpperCase()}${channel.slice(1)}`; }
function markTypes(channel) {
  if (isConditionalPositionChannel(channel)) return getPositionChannelDefinition(channel).markTypes;
  if (["text", "dx", "dy"].includes(channel)) return ["text"];
  if (channel === "pointRadius") return ["point"];
  return [...new Set([...(APPEARANCE_MARK_TYPES[method(channel)] ?? []), ...(FIXED_APPEARANCE_MARK_TYPES[method(channel)] ?? []), ...(channel === "color" ? ["tick"] : [])])];
}

function withoutConditional(program, target, channel) {
  return requireLayer(program, target).conditionals?.[channel] === undefined ? program
    : program.editSemantic({ property: `layer[${target}].conditionals.${channel}`, remove: true });
}

function clearAssignment(program, layer, channel) {
  let next = withoutConditional(clearPlotPositionChannel(program, layer, channel), layer.id, channel);
  if (layer.encoding?.[channel] !== undefined) next = next.editSemantic({ property: `layer[${layer.id}].encoding.${channel}`, remove: true });
  if (isConditionalPositionChannel(channel) || ["text", "dx", "dy"].includes(channel)) return next;
  if (channel === "size") next = withoutConditional(next, layer.id, "pointRadius");
  const property = channel === "color" ? (["line", "rule", "tick"].includes(layer.mark.type) ? "stroke" : "fill")
    : ["size", "pointRadius"].includes(channel) ? "radius" : channel;
  next = next._withoutMaterializationConfig(["marks", layer.id, property]);
  if (layer.mark.type === "bar") next = next._withoutMaterializationConfig(["marks", layer.id, "barAppearance", property]);
  return next;
}

function topology(layer, channel) {
  const { conditionals: _conditionals, encoding = {}, ...rest } = layer;
  const { [channel]: _value, ...other } = encoding;
  if (isConditionalPositionChannel(channel)) delete rest.coordinate;
  return canonicalJSON({ ...rest, encoding: other });
}

function encodeConditional(program, original, channel, args) {
  validateOptionObject(args, ["target", "conditions", "otherwise"], method(channel));
  if (!Object.hasOwn(args, "otherwise") || args.otherwise === undefined) throw new TypeError("Conditional encoding requires otherwise.");
  const types = markTypes(channel);
  const { id: target, layer, dataset } = resolveTarget(program, args.target, types, "conditional mark");
  const inspected = normalizeConditionalEncoding({ conditions: args.conditions, otherwise: args.otherwise });
  limit(dataset.values.length * (inspected.nodes + inspected.definition.conditions.length + 1), EXPRESSION_LIMITS.rowWork, "conditionalWork");
  const parameterInputs = inspected.parameters.map(id => {
    const resource = requireStoredResource(program, { kind: "parameter", id });
    return { kind: resource.kind, id: resource.id, revision: resource.revision };
  });
  const selectionInputs = inspected.selections.map(id => conditionalSelectionInput(program, id));
  const scales = new Map();
  const positional = isConditionalPositionChannel(channel);
  const textChannel = ["text", "dx", "dy"].includes(channel);
  const branchRequest = conditionalBranchRequest(layer, channel, inspected.definition);
  if (["x", "y"].includes(channel) && isPositionEncodingEntry(program)) {
    const pureBaseline = withoutPreviewLayerEncodings(program, { id: target, channels: [channel], conditionals: true });
    const branches = [...inspected.definition.conditions.map((condition, index) => [condition.value, ["conditions", index]]),
      [inspected.definition.otherwise, ["otherwise"]]];
    const plans = branches.map(([value, path]) => {
      const { previous, payload } = branchRequest(value, path);
      const view = previous === undefined ? pureBaseline : withPreviewLayerEncodings(pureBaseline, { id: target, encodings: { [channel]: previous } });
      return { ...resolvePositionEncoding(view, channel, { ...payload, target }, method(channel)), layer };
    });
    assertPositionEncodingFrame(program, channel, plans);
  }
  let baseline = clearAssignment(program, layer, channel);
  if (channel === "color" && layer.derivedBindings?.overlay?.inheritColor) baseline = baseline.editSemantic({
    property: `layer[${target}].derivedBindings.overlay`, value: { ...layer.derivedBindings.overlay, inheritColor: false }
  });
  const previewBaseline = createDeferredEncodingProgram(baseline)
    ._withoutMaterializationConfig(["selections"])
    ._withoutMaterializationConfig(["highlights"]);
  let coordinate;
  let enabledStroke;
  const normalized = normalizeConditionalEncoding(inspected.definition, {
    environment: expressionEnvironment(program, dataset, parameterInputs),
    selections: Object.keys(program.materializationConfigs.selections ?? {}),
    normalizeValue(value, path) {
      const { field, previous, payload } = branchRequest(value, path);
      const branchBaseline = previous === undefined || (!textChannel && previous.scale === undefined && previous.field === undefined) ? previewBaseline
        : withPreviewLayerEncodings(previewBaseline, { id: target, encodings: { ...requireLayer(previewBaseline, target).encoding, [channel]: previous } });
      const preview = invokeWrappedActionImplementation(original, branchBaseline, { ...payload, target });
      const previewLayer = requireLayer(preview, target);
      if (positional) {
        const candidate = findCoordinate(preview, previewLayer.coordinate);
        if (coordinate !== undefined && canonicalJSON(coordinate) !== canonicalJSON(candidate)) throw new Error("Conditional positions must share one coordinate.");
        coordinate = candidate;
      }
      if (channel === "strokeWidth") {
        const config = layer.mark.type === "bar" ? preview.markConfigs[target]?.barAppearance : preview.markConfigs[target];
        if (config?.stroke !== undefined) enabledStroke = config.stroke;
      }
      if (topology(previewLayer, channel) !== topology(requireLayer(baseline, target), channel)) throw new Error("Conditional branches cannot change mark topology; author grouping, layout or stacking before the conditional encoding.");
      const resolved = field || positional || textChannel ? previewLayer.encoding[channel] : { value: value.value };
      const branch = normalizeStoredConditionalValue(channel, resolved);
      if (branch.scale !== undefined) {
        const scale = requireSemanticScale(preview, branch.scale);
        if (scales.has(scale.id) && canonicalJSON(scales.get(scale.id).definition) !== canonicalJSON(scale)) throw new Error(`Conditional branches have conflicting definitions for scale "${scale.id}".`);
        scales.set(scale.id, { definition: scale, reassignment: scales.get(scale.id)?.reassignment || previous?.scale === scale.id });
      }
      return branch;
    }
  });
  let next = baseline;
  if (coordinate !== undefined) next = next.createCoordinate({ id: coordinate.id, type: coordinate.type, layers: [target] });
  if (enabledStroke !== undefined) next = layer.mark.type === "bar"
    ? next._withMarkConfig(target, { ...next.markConfigs[target], barAppearance: { ...next.markConfigs[target]?.barAppearance, stroke: enabledStroke } })
    : next._withMarkConfig(target, { ...next.markConfigs[target], stroke: enabledStroke });
  // Scale normalization reads its semantic consumer role (including numeric
  // discretized size). Install the sole binding first, then every new scale,
  // before editing existing scales can invoke graphical materialization.
  next = next.editSemantic({ property: `layer[${target}].conditionals.${channel}`,
    value: cloneAndFreeze({ ...normalized.definition, parameterInputs, selectionInputs }) });
  // Reject graphical feedback before scale domains can evaluate selected items.
  // New branch scale definitions are installed and validated immediately below.
  validateConditionalDependencies(next, { environment: false });
  let positionGuide;
  if (positional) {
    const oldScales = new Set(positionBindings(layer, channel).map(binding => binding.scale));
    const definition = getPositionChannelDefinition(channel);
    const guide = [...Object.entries(program.semanticSpec.guides.axis ?? {}).filter(([id, value]) =>
      (value.channel ?? id) === definition.guideChannel).map(([, value]) => value),
      program.semanticSpec.guides.grid?.[definition.gridDirection]].filter(Boolean);
    if (guide.some(value => oldScales.has(value.scale))) positionGuide = uniquePositionBinding(requireLayer(next, target), channel);
  }
  for (const { definition } of scales.values()) if (findSemanticScale(baseline, definition.id) === undefined) next = next.createScale(definition);
  for (const { definition } of scales.values()) if (findSemanticScale(baseline, definition.id) === undefined) {
    next = next.rematerializeScale({ id: definition.id, guides: false, marks: false });
  }
  for (const { definition, reassignment } of scales.values()) if (findSemanticScale(baseline, definition.id) !== undefined) {
    const requested = ["xOffset", "yOffset"].includes(channel) ? Object.fromEntries(Object.entries(definition).filter(([key]) => key !== "range")) : definition;
    next = applyEncodingScale(next, definition, requested, { reassignment, allowTypeChange: true });
  }
  if (positionGuide !== undefined) {
    for (const previousScale of new Set(positionBindings(layer, channel).map(binding => binding.scale))) {
      next = rebindPositionGuides(next, channel, previousScale, positionGuide.scale, target);
    }
  }
  validateConditionalDependencies(next);
  const guides = Object.entries(program.guideConfigs.legend ?? {}).some(([kind, config]) =>
    config.target === target && legendBlockChannels(kind, config).includes(channel));
  if (guides && conditionalLegendLayer(requireLayer(next, target), [channel]).encoding?.[channel]?.scale === undefined) {
    throw new Error("Remove the existing legend before replacing its encoding with constant conditional branches.");
  }
  next = applyLayerDataRematerialization(next, target);
  next = applyDetachedScaleRematerialization(next, [layer]);
  return guides ? next.rematerializeLegend() : next;
}

export function registerConditionalEncodingActions(ProgramClass) {
  for (const kind of ["Point", "Line", "Area", "Bar", "Arc", "Rect", "Rule", "Tick", "Text"]) {
    const name = `edit${kind}Mark`, original = ProgramClass.prototype[name];
    if (original === undefined) continue;
    ProgramClass.prototype[name] = action(getWrappedActionMetadata(original), function (args = {}) {
      if (this.semanticSpec.layers.some(layer => layer.conditionals !== undefined)) {
        const layer = resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === kind.toLowerCase(), label: `${kind} mark` });
        for (const channel of Object.keys(layer.conditionals ?? {})) {
          if (["text", "dx", "dy"].includes(channel)) continue;
          const property = channel === "color" ? (kind === "Line" || kind === "Tick" ? "stroke" : "fill") : channel === "pointRadius" ? "radius" : channel;
          if (Object.hasOwn(args, property)) throw new Error(`Mark ${property} conflicts with conditional ${channel}; replace or remove that encoding first.`);
        }
      }
      return invokeWrappedActionImplementation(original, this, args);
    });
  }
  for (const [channel, name] of CONDITIONAL_CHANNELS.flatMap(channel => channel === "pointRadius"
    ? [[channel, "encodePointRadius"], [channel, "encodeRadius"]] : [[channel, method(channel)]])) {
    const original = ProgramClass.prototype[name];
    if (original === undefined) continue;
    ProgramClass.prototype[name] = action(getWrappedActionMetadata(original), function (args = {}) {
      if (Object.hasOwn(args, "conditions") || Object.hasOwn(args, "otherwise")) return encodeConditional(this, original, channel, args);
      if (!this.semanticSpec.layers.some(layer => layer.conditionals?.[channel] !== undefined)) return invokeWrappedActionImplementation(original, this, args);
      const types = markTypes(channel);
      const { id, layer } = resolveTarget(this, args.target, types, "encoding mark");
      const previous = isConditionalPositionChannel(channel) ? commonPositionBinding(layer, channel) : undefined;
      if (["x", "y"].includes(channel) && isPositionEncodingEntry(this)) {
        let view = withoutPreviewLayerEncodings(this, { id, channels: [channel], conditionals: true });
        if (previous !== undefined) view = withPreviewLayerEncodings(view, { id, encodings: { [channel]: previous } });
        assertPositionEncodingFrame(this, channel, [{ ...resolvePositionEncoding(view, channel, args, name), layer }]);
      }
      let baseline = withoutConditional(this, id, channel);
      if (previous !== undefined) baseline = withPreviewLayerEncodings(baseline, { id, encodings: { [channel]: previous } });
      const next = invokeWrappedActionImplementation(original, baseline, args);
      return applyDetachedScaleRematerialization(next, [layer]);
    });
  }
}
