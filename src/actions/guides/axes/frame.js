import { assertProgramSingleY } from "../../../materialization/frameState.js";
import { positionGuideLayers } from "../../../materialization/positionGuides.js";
import { isSourceOwnedText } from "../../../grammar/text.js";
import { selectCartesianAxis } from "../../../selectors/axes.js";
import { splitGuideVisibility } from "../../../materialization/guides/visibility.js";
import { AXIS_COMPONENTS, axisComponentDisabled } from "./components.js";

// This proposal stores only the same axis meaning and component presence that
// the axis owner will commit. It neither runs children nor creates graphics.
export function previewAxisFrame(program, channel, id, binding, parts, visibility) {
  const axis = { ...program.semanticSpec.guides.axis };
  const configs = { ...program.guideConfigs.axis };
  const semantic = { ...axis[id], ...(id === channel ? {} : { channel }), ...binding };
  const config = { ...configs[id] };
  for (const [part, enabled] of Object.entries(parts)) {
    if (enabled) config[part] ??= {};
    else delete config[part];
  }
  if (visibility !== undefined) config.visibility = { ...config.visibility, ...visibility };
  axis[id] = semantic;
  configs[id] = config;
  return { ...program, markConfigs: program.markConfigs,
    semanticSpec: { ...program.semanticSpec, guides: { ...program.semanticSpec.guides, axis } },
    guideConfigs: { ...program.guideConfigs, axis: configs }
  };
}

export function resolveCreateAxisBinding(program, channel, args) {
  const id = args.id ?? channel;
  let scale = args.scale, coordinate = args.coordinate;
  if (id !== channel) {
    const layers = positionGuideLayers(program, [channel]).filter(layer => !isSourceOwnedText(layer) &&
      layer.encoding?.[channel]?.scale !== undefined &&
      (coordinate === undefined || layer.coordinate === coordinate) &&
      (scale === undefined || layer.encoding[channel].scale === scale));
    const scales = [...new Set(layers.map(layer => layer.encoding[channel].scale))];
    const coordinates = [...new Set(layers.map(layer => layer.coordinate))];
    if (scale === undefined && scales.length !== 1) throw new Error("Named axes require an explicit scale when the channel binding is ambiguous.");
    if (coordinate === undefined && coordinates.length !== 1) throw new Error("Named axes require an explicit coordinate when the binding is ambiguous.");
    scale ??= scales[0];
    coordinate ??= coordinates[0];
  }
  return { scale: scale ?? channel, ...(coordinate === undefined ? {} : { coordinate }) };
}

export function previewCreateAxisFrame(program, channel, args) {
  const id = args.id ?? channel;
  return previewAxisFrame(program, channel, id, resolveCreateAxisBinding(program, channel, args), Object.fromEntries(AXIS_COMPONENTS.filter(part => !axisComponentDisabled(args, part)).map(part => [part, true])));
}

export function previewEditAxisFrame(program, channel, options) {
  const { args, visibility } = splitGuideVisibility(options);
  const selected = selectCartesianAxis(program, channel, args, { whole: true });
  const parts = {};
  for (const part of AXIS_COMPONENTS) {
    if (args[part] === false || ["ticks", "labels"].includes(part) && args.ticksAndLabels === false) parts[part] = false;
  }
  const next = previewAxisFrame(program, channel, selected.id, {}, parts, visibility);
  if (!AXIS_COMPONENTS.some(part => next.guideConfigs.axis[selected.id][part] !== undefined)) {
    delete next.semanticSpec.guides.axis[selected.id];
    delete next.guideConfigs.axis[selected.id];
  }
  return next;
}

export function assertAxisFrame(program) {
  assertProgramSingleY(program, { allowIncomplete: true });
}
