import { selectConditionalBranches, uniqueConditionalItemField } from "./conditionalBranches.js";
import { resolveTextSourceBindings, textEncodingValues } from "./textContent.js";
import { normalizePositionDatum } from "../grammar/positionDatum.js";
import { mapOrdinalOffsetValues, mapOrdinalPositionValues } from "../grammar/scales/index.js";
import { OFFSET_POSITION_CHANNELS, POSITION_ENCODING_CHANNELS } from "../core/vocabulary.js";
import { requireSemanticScale } from "../selectors/scales.js";
import { aggregateRows } from "../grammar/aggregate.js";
import { readScaleField } from "../grammar/scales/index.js";
import { mapScaleConsumerValues } from "./scales/map.js";

export function conditionalFieldRows(items, encoding) {
  return items.map(item => {
    if (encoding.aggregate !== undefined) return { [encoding.field]: aggregateRows(item.members, encoding.field, encoding.aggregate) };
    if (!uniqueConditionalItemField(item, encoding.field)) throw new Error(`Conditional field "${encoding.field}" is not uniquely defined at the final item grain.`);
    return item.fields;
  });
}

export function mapConditionalValues(program, layer, channel, items, membership, { mapped = true, includeScale = false, includeBinding = false, allowMissing = false, branchValues, resolvers } = {}) {
  const selected = selectConditionalBranches(program, layer, channel, items, membership);
  if (selected === undefined) return undefined;
  const { branches, indices } = selected;
  const textSources = channel === "text" ? resolveTextSourceBindings(program, layer, items, resolvers) : undefined;
  const textValues = channel === "text" ? branches.map(branch => textEncodingValues(program, layer, branch, items, textSources, { mapped, resolvers })) : undefined;
  // Validation remains eager. Mapping only runs for chosen branch rows.
  for (const [branchIndex, branch] of branches.entries()) if (branch.field !== undefined && channel !== "text") {
    const scale = branch.scale === undefined ? {} : (program.resolvedScales[branch.scale] ?? (!mapped ? requireSemanticScale(program, branch.scale) : undefined));
    if (scale === undefined) throw new Error(`Conditional encoding requires resolved scale "${branch.scale}".`);
    readScaleField(branchValues === undefined ? conditionalFieldRows(items, branch) : branchValues[branchIndex].filter(value => !allowMissing || value != null).map(value => ({ value })), branchValues === undefined ? branch.field : "value", branch.fieldType, {
      allowUnknown: Object.hasOwn(scale, "unknown"), temporalUnit: branch.temporalUnit
    });
  }
  const values = Array(items.length);
  branches.forEach((branch, index) => {
    const indexes = indices.flatMap((selected, row) => (selected === index || (selected === -1 && index === branches.length - 1)) ? [row] : []);
    if (!indexes.length) return;
    if (textValues !== undefined) indexes.forEach(row => { values[row] = textValues[index][row]; });
    else if (Object.hasOwn(branch, "value")) indexes.forEach(row => { values[row] = branch.value; });
    else {
      const raw = branchValues !== undefined ? indexes.map(row => branchValues[index][row]) : Object.hasOwn(branch, "datum") ? Array(indexes.length).fill(["dx", "dy"].includes(channel) ? branch.datum : normalizePositionDatum(branch.datum, branch.fieldType, channel, branch.temporalUnit)) : readScaleField(conditionalFieldRows(indexes.map(row => items[row]), branch), branch.field, branch.fieldType, {
        allowUnknown: branch.scale !== undefined && Object.hasOwn(program.resolvedScales[branch.scale] ?? requireSemanticScale(program, branch.scale), "unknown"), temporalUnit: branch.temporalUnit
      });
      const output = !mapped || branch.scale === undefined ? raw : mapConditionalBranchValues(raw, branch, program.resolvedScales[branch.scale], channel);
      indexes.forEach((row, offset) => { values[row] = includeScale || includeBinding ? { value: output[offset], ...(includeScale ? { scale: program.resolvedScales[branch.scale] } : {}), ...(includeBinding ? { binding: branch } : {}) } : output[offset]; });
    }
  });
  return values;
}

export function mapConditionalBranchValues(values, encoding, scale, channel) {
  if (["nominal", "ordinal"].includes(encoding.fieldType) && POSITION_ENCODING_CHANNELS.includes(channel)) {
    return OFFSET_POSITION_CHANNELS.includes(channel) ? mapOrdinalOffsetValues(values, scale) : mapOrdinalPositionValues(values, scale);
  }
  return mapScaleConsumerValues(values, scale, channel);
}
