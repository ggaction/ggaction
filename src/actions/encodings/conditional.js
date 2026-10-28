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
import { applyEncodingScale, resolveTarget } from "./shared.js";
import { withPreviewLayerEncodings } from "../primitives/semanticAction.js";

function method(channel) { return `encode${channel[0].toUpperCase()}${channel.slice(1)}`; }
function markTypes(channel) {
  return [...new Set([...(APPEARANCE_MARK_TYPES[method(channel)] ?? []), ...(FIXED_APPEARANCE_MARK_TYPES[method(channel)] ?? []), ...(channel === "color" ? ["tick"] : [])])];
}

function withoutConditional(program, target, channel) {
  return requireLayer(program, target).conditionals?.[channel] === undefined ? program
    : program.editSemantic({ property: `layer[${target}].conditionals.${channel}`, remove: true });
}

function clearAssignment(program, layer, channel) {
  let next = withoutConditional(program, layer.id, channel);
  if (layer.encoding?.[channel] !== undefined) next = next.editSemantic({ property: `layer[${layer.id}].encoding.${channel}`, remove: true });
  const property = channel === "color" ? (["line", "rule", "tick"].includes(layer.mark.type) ? "stroke" : "fill")
    : channel === "size" ? "radius" : channel;
  next = next._withoutMaterializationConfig(["marks", layer.id, property]);
  if (layer.mark.type === "bar") next = next._withoutMaterializationConfig(["marks", layer.id, "barAppearance", property]);
  return next;
}

function topology(layer, channel) {
  const { conditionals: _conditionals, encoding = {}, ...rest } = layer;
  const { [channel]: _value, ...other } = encoding;
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
  let baseline = clearAssignment(program, layer, channel);
  if (channel === "color" && layer.derivedBindings?.overlay?.inheritColor) baseline = baseline.editSemantic({
    property: `layer[${target}].derivedBindings.overlay`, value: { ...layer.derivedBindings.overlay, inheritColor: false }
  });
  const previewBaseline = createDeferredEncodingProgram(baseline)
    ._withoutMaterializationConfig(["selections"])
    ._withoutMaterializationConfig(["highlights"]);
  const scales = new Map();
  let enabledStroke;
  const normalized = normalizeConditionalEncoding(inspected.definition, {
    environment: expressionEnvironment(program, dataset, parameterInputs),
    selections: Object.keys(program.materializationConfigs.selections ?? {}),
    normalizeValue(value, path) {
      if (value === null || typeof value !== "object" || Array.isArray(value) || Object.hasOwn(value, "target")) throw new TypeError("Conditional values require an encoder payload without target.");
      const field = Object.hasOwn(value, "field");
      const previous = path[0] === "otherwise" ? layer.conditionals?.[channel]?.otherwise : layer.conditionals?.[channel]?.conditions[path[1]]?.value;
      const payload = field && channel !== "angle" ? { ...value, scale: { ...value.scale,
        id: value.scale?.id ?? previous?.scale ?? `${target}-${channel}-${path[0] === "otherwise" ? "otherwise" : `condition-${path[1]}`}` } } : value;
      const branchBaseline = previous?.field === undefined ? previewBaseline
        : withPreviewLayerEncodings(previewBaseline, { id: target, encodings: { ...requireLayer(previewBaseline, target).encoding, [channel]: previous } });
      const preview = invokeWrappedActionImplementation(original, branchBaseline, { ...payload, target });
      const previewLayer = requireLayer(preview, target);
      if (channel === "strokeWidth") {
        const config = layer.mark.type === "bar" ? preview.markConfigs[target]?.barAppearance : preview.markConfigs[target];
        if (config?.stroke !== undefined) enabledStroke = config.stroke;
      }
      if (topology(previewLayer, channel) !== topology(requireLayer(baseline, target), channel)) throw new Error("Conditional branches cannot change mark topology; author grouping, layout or stacking before the conditional encoding.");
      const resolved = field ? previewLayer.encoding[channel] : { value: value.value };
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
  if (enabledStroke !== undefined) next = layer.mark.type === "bar"
    ? next._withMarkConfig(target, { ...next.markConfigs[target], barAppearance: { ...next.markConfigs[target]?.barAppearance, stroke: enabledStroke } })
    : next._withMarkConfig(target, { ...next.markConfigs[target], stroke: enabledStroke });
  // Scale normalization reads its semantic consumer role (including numeric
  // discretized size). Install the sole binding first, then every new scale,
  // before editing existing scales can invoke graphical materialization.
  next = next.editSemantic({ property: `layer[${target}].conditionals.${channel}`,
    value: cloneAndFreeze({ ...normalized.definition, parameterInputs, selectionInputs }) });
  for (const { definition } of scales.values()) if (findSemanticScale(baseline, definition.id) === undefined) next = next.createScale(definition);
  for (const { definition } of scales.values()) if (findSemanticScale(baseline, definition.id) === undefined) {
    next = next.rematerializeScale({ id: definition.id, guides: false, marks: false });
  }
  for (const { definition, reassignment } of scales.values()) if (findSemanticScale(baseline, definition.id) !== undefined) {
    next = applyEncodingScale(next, definition, definition, { reassignment, allowTypeChange: true });
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
          const property = channel === "color" ? (kind === "Line" || kind === "Tick" ? "stroke" : "fill") : channel;
          if (Object.hasOwn(args, property)) throw new Error(`Mark ${property} conflicts with conditional ${channel}; replace or remove that encoding first.`);
        }
      }
      return invokeWrappedActionImplementation(original, this, args);
    });
  }
  for (const channel of CONDITIONAL_CHANNELS) {
    const name = method(channel), original = ProgramClass.prototype[name];
    if (original === undefined) continue;
    ProgramClass.prototype[name] = action(getWrappedActionMetadata(original), function (args = {}) {
      if (Object.hasOwn(args, "conditions") || Object.hasOwn(args, "otherwise")) return encodeConditional(this, original, channel, args);
      if (!this.semanticSpec.layers.some(layer => layer.conditionals?.[channel] !== undefined)) return invokeWrappedActionImplementation(original, this, args);
      const types = markTypes(channel);
      const { id, layer } = resolveTarget(this, args.target, types, "encoding mark");
      const next = invokeWrappedActionImplementation(original, withoutConditional(this, id, channel), args);
      return applyDetachedScaleRematerialization(next, [layer]);
    });
  }
}
