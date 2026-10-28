import { ARC_POSITION_CHANNELS, hasConditionalArcPosition, deriveConditionalArcBranch } from "./conditionalArcStructure.js";
import { canMaterializeArc, canMaterializeBar } from "./marks/capabilities.js";
import { applyItemMissingPolicy } from "../grammar/itemMissing.js";
import { deriveBarAggregates, deriveSeriesBarCells } from "../grammar/bars/aggregate.js";
import { BAR_GRAINS, resolveBarGrain, resolveBarColorLayout } from "../grammar/bars/policy.js";
import { hasConditionalBarPosition, deriveConditionalHistogramCells } from "./conditionalBarStructure.js";
import { deriveHistogramSegmentsFromCells, resolveHistogramInput } from "./bars/histogram.js";
import { conditionalAggregateBarValues, conditionalHistogramBarValues } from "./conditionalBarValues.js";
import { canMaterializeArea } from "./marks/capabilities.js";
import { AREA_POSITION_CHANNELS, hasConditionalAreaPosition, deriveConditionalAreaBranch, areaMeasureChannel } from "./conditionalAreaStructure.js";
import { conditionalAreaValues } from "./conditionalAreaValues.js";
import { requireDataset } from "../selectors/datasets.js";
import { conditionalPositionTemplate } from "../core/encodingBindings.js";
import { deriveConditionalLineBranch, LINE_POSITION_CHANNELS } from "./conditionalLineStructure.js";
import { normalizePositionDatum } from "../grammar/positionDatum.js";
import { readScaleField } from "../grammar/scales/index.js";
import { conditionalFieldRows, mapConditionalValues } from "./conditionalMapping.js";
import { resolveMarkItems, resolveMarkSourceItems } from "./selection/policies/index.js";
import { conditionalSelectionMembership } from "./conditionalSelection.js";

export function readConditionalConsumerValues(program, layer, encoding, scale, channel) {
  const arc = resolveConditionalArcConsumer(program, layer, encoding, channel);
  if (arc !== undefined) return arc;
  const bar = resolveConditionalBarConsumer(program, layer, encoding, channel);
  if (bar !== undefined) return bar.values;
  const area = resolveConditionalAreaConsumer(program, layer, encoding, channel);
  if (area !== undefined) return area.values;
  if (hasConditionalAreaPosition(layer) && AREA_POSITION_CHANNELS.includes(channel)) return Object.hasOwn(encoding, "datum") ? [encoding.datum] : readScaleField(requireDataset(program, layer.data).values, encoding.field, encoding.fieldType, { temporalUnit: encoding.temporalUnit });
  if (Object.hasOwn(encoding, "datum")) return [normalizePositionDatum(encoding.datum, encoding.fieldType, channel, encoding.temporalUnit)];
  if ((layer.mark.type === "bar" && !canMaterializeBar(program, layer)) || (layer.mark.type === "arc" && !canMaterializeArc(program, layer))) {
    if (encoding.field === undefined && encoding.aggregate === "count") return [];
    const dataset = applyItemMissingPolicy(layer, requireDataset(program, layer.data));
    return readScaleField(dataset.values, encoding.field, encoding.fieldType, { temporalUnit: encoding.temporalUnit });
  }
  if (layer.mark.type === "line" && LINE_POSITION_CHANNELS.includes(channel)) {
    const template = conditionalPositionTemplate(layer, LINE_POSITION_CHANNELS);
    template.encoding[channel] = encoding;
    if ((template.encoding.x && template.encoding.y) || (template.encoding.theta && template.encoding.radius)) {
      const dataset = requireDataset(program, layer.data);
      return deriveConditionalLineBranch(program, template, dataset).series.flatMap(series => series.values.map(value => value[channel]));
    }
    return readScaleField(requireDataset(program, layer.data).values, encoding.field, encoding.fieldType, { temporalUnit: encoding.temporalUnit });
  }
  const items = resolveMarkSourceItems(program, layer.id);
  return readScaleField(conditionalFieldRows(items, encoding), encoding.field, encoding.fieldType, {
    allowUnknown: Object.hasOwn(scale, "unknown"), temporalUnit: encoding.temporalUnit
  });
}

export function resolveConditionalValues(program, layer, channel, items) {
  const definition = layer.conditionals?.[channel];
  if (definition === undefined) return undefined;
  items ??= resolveMarkSourceItems(program, layer.id);
  const membership = conditionalSelectionMembership(program, layer, definition, items, { resolveMarkItems, resolveMarkSourceItems });
  return mapConditionalValues(program, layer, channel, items, membership);
}

function areaChannelValues(result, channel) {
  const primary = channel[0];
  if (result.transform?.placement?.type === "category") return primary === result.transform.placement.channel ? result.derived.series.map(series => series.category) : result.derived.series.flatMap(series => series.values.map(value => value.value));
  if (result.derived[`${primary}Values`] !== undefined) return result.derived[`${primary}Values`].filter(value => value != null);
  const measure = areaMeasureChannel(result.raw);
  return result.derived.series.flatMap(series => series.values.flatMap(value => primary === measure
    ? [value.lower ?? 0, value.upper ?? value[measure]] : [value[primary]])).filter(value => value != null);
}

export function resolveConditionalAreaConsumer(program, layer, encoding, channel) {
  if (!hasConditionalAreaPosition(layer) || !AREA_POSITION_CHANNELS.includes(channel) || !canMaterializeArea(program, layer)) return undefined;
  const dataset = requireDataset(program, layer.data);
  const result = conditionalAreaValues(program, layer, dataset, { resolveMarkItems, resolveMarkSourceItems }, { mapped: false });
  const measure = areaMeasureChannel(result.raw);
  const branch = deriveConditionalAreaBranch(program, { ...result.template, encoding: { ...result.template.encoding, [channel]: encoding } }, dataset);
  return { layout: result.template.layout?.mode ?? (result.template.encoding.y?.stack === "center" ? "center" : result.template.encoding.color?.layout ?? "overlay"),
    measure, values: [...areaChannelValues(branch, channel), ...(channel[0] === measure ? areaChannelValues(result, channel) : [])] };
}

export function resolveConditionalBarConsumer(program, layer, encoding, channel) {
  if (!hasConditionalBarPosition(layer) || !["x", "y"].includes(channel) || ![BAR_GRAINS.aggregate, BAR_GRAINS.histogram].includes(resolveBarGrain(layer))) return undefined;
  const dataset = applyItemMissingPolicy(layer, requireDataset(program, layer.data));
  const histogram = resolveBarGrain(layer) === BAR_GRAINS.histogram;
  const result = histogram ? conditionalHistogramBarValues(program, layer, dataset, { resolveMarkItems, resolveMarkSourceItems }, { mapColor: false })
    : conditionalAggregateBarValues(program, layer, dataset, { resolveMarkItems, resolveMarkSourceItems });
  const candidate = { ...result.template, encoding: { ...result.template.encoding, [channel]: encoding } };
  const measure = result.channels.measure, layout = resolveBarColorLayout(candidate);
  const nativeCells = histogram ? deriveConditionalHistogramCells(program, candidate, dataset) : undefined;
  const nativeSegments = histogram ? deriveHistogramSegmentsFromCells(nativeCells, candidate, program.resolvedScales, { mapColor: false }) : deriveSeriesBarCells(dataset.values, candidate);
  const endpoints = segment => histogram ? [segment.stackStart, segment.stackEnd] : [segment.start, segment.end];
  const values = channel === measure ? [...nativeSegments.flatMap(endpoints), ...result.segments.flatMap(endpoints)]
    : histogram ? resolveHistogramInput(dataset, candidate.encoding.x, candidate.encoding.y).values : deriveBarAggregates(dataset.values, candidate).values.map(cell => cell[channel]);
  return { layout, measure, values: layout === "fill" && channel === measure ? [0, 1] : values };
}

export function resolveConditionalArcConsumer(program, layer, encoding, channel) {
  if (!hasConditionalArcPosition(layer) || !ARC_POSITION_CHANNELS.includes(channel) || !canMaterializeArc(program, layer)) return undefined;
  const template = conditionalPositionTemplate(layer, ARC_POSITION_CHANNELS);
  const result = deriveConditionalArcBranch(program, { ...template, encoding: { ...template.encoding, [channel]: encoding } }, requireDataset(program, layer.data));
  return result.values.map(value => value[channel]);
}
