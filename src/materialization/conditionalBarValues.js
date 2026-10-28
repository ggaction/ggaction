import { deriveHistogramSegmentsFromCells } from "./bars/histogram.js";
import { resolveBarColorLayout, resolveBarOffsetChannel } from "../grammar/bars/policy.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { positionBindings } from "../core/encodingBindings.js";
import { deriveSeriesBarCells } from "../grammar/bars/aggregate.js";
import { conditionalBarStructure } from "./conditionalBarStructure.js";
import { mapConditionalValues } from "./conditionalMapping.js";
import { conditionalSelectionMembership } from "./conditionalSelection.js";
import { identifyItems, uniqueFields } from "./selection/items/common.js";
import { memberRowReferences } from "./selection/rows.js";

export function conditionalAggregateBarValues(program, layer, dataset, resolvers) {
  const structure = conditionalBarStructure(program, layer, dataset);
  const items = identifyItems(program, layer, "aggregate", structure.derived.values.map(cell => {
    const members = cell.sourceIndices.map(index => dataset.values[index]);
    const memberKeys = cell.sourceIndices.map(index => dataset.rowKeys[index]);
    return { fields: uniqueFields(members), members, memberKeys, rows: memberRowReferences(program, members, layer.data, memberKeys) };
  }));
  const selected = {};
  for (const channel of ["x", "y", "xOffset", "yOffset"]) {
    const bindings = positionBindings(layer, channel);
    if (!bindings.length) continue;
    const definition = layer.conditionals?.[channel];
    if (definition === undefined) {
      if (["x", "y"].includes(channel)) selected[channel] = structure.derived.values.map(cell => ({ value: cell[channel], binding: bindings[0] }));
      continue;
    }
    const membership = conditionalSelectionMembership(program, layer, definition, items, resolvers, { rowMembership: true });
    const branchValues = structure.branches[channel]?.[0] === undefined ? undefined : structure.branches[channel].map(branch => branch.values.map(cell => cell[channel]));
    selected[channel] = mapConditionalValues(program, layer, channel, items, membership, { mapped: false, includeBinding: true, branchValues });
  }
  const cells = structure.derived.values.map((cell, index) => ({ ...cell, x: selected.x[index].value, y: selected.y[index].value }));
  const identity = new Set();
  for (const cell of cells) {
    const key = canonicalJSON([cell[structure.channels.category], cell.series ?? cell.color]);
    if (identity.has(key)) throw new Error("Conditional bar positions merge distinct aggregate cells.");
    identity.add(key);
  }
  const bindings = new Map(cells.map((cell, index) => [canonicalJSON(cell.sourceIndices), Object.fromEntries(Object.entries(selected).map(([channel, values]) => [channel, values[index]]))]));
  const color = structure.template.encoding.color;
  const categoryScale = program.resolvedScales[structure.template.encoding[structure.channels.category].scale];
  const categories = categoryScale?.type === "time" || categoryScale?.domain === undefined ? undefined
    : [...new Set([...categoryScale.domain, ...cells.map(cell => cell[structure.channels.category])])];
  const seriesDomain = resolveBarColorLayout(structure.template) === "group"
    ? program.resolvedScales[structure.template.encoding[resolveBarOffsetChannel(structure.template)]?.scale]?.domain
    : structure.template.encoding.group === undefined && color?.fieldType !== "quantitative" ? program.resolvedScales[color?.scale]?.domain : undefined;
  const segments = deriveSeriesBarCells(dataset.values, structure.template, categories, seriesDomain, cells);
  return { ...structure, cells, bindings, segments };
}

export function conditionalHistogramBarValues(program, layer, dataset, resolvers, { mapColor = true } = {}) {
  const structure = conditionalBarStructure(program, layer, dataset);
  const occupied = structure.derived.values.map((cell, index) => ({ cell, index })).filter(({ cell }) => cell.members.length > 0);
  const items = identifyItems(program, layer, "histogram", occupied.map(({ cell }) => {
    const memberKeys = cell.sourceIndices.map(index => dataset.rowKeys[index]);
    return { fields: uniqueFields(cell.members), members: cell.members, memberKeys,
      rows: memberRowReferences(program, cell.members, layer.data, memberKeys) };
  }));
  const selected = {};
  for (const channel of ["x", "y"]) {
    const bindings = positionBindings(layer, channel), definition = layer.conditionals?.[channel];
    const raw = cell => channel === "x" ? cell.start : cell.mass;
    if (definition === undefined) selected[channel] = occupied.map(({ cell }) => ({ value: raw(cell), binding: bindings[0] }));
    else {
      const membership = conditionalSelectionMembership(program, layer, definition, items, resolvers, { rowMembership: true });
      const branchValues = structure.branches[channel].map(branch => occupied.map(({ index }) => raw(branch.values[index])));
      selected[channel] = mapConditionalValues(program, layer, channel, items, membership, { mapped: false, includeBinding: true, branchValues });
    }
  }
  const byIndex = new Map(occupied.map(({ index }, selectedIndex) => [index, selectedIndex]));
  const cells = structure.derived.values.map((cell, index) => {
    const selectedIndex = byIndex.get(index);
    if (selectedIndex === undefined) return cell;
    const x = selected.x[selectedIndex], y = selected.y[selectedIndex];
    const branchIndex = positionBindings(layer, "x").indexOf(x.binding);
    return { ...cell, start: x.value, end: structure.branches.x?.[branchIndex]?.values[index].end ?? cell.end, mass: y.value };
  });
  const bindings = new Map(occupied.map(({ cell }, index) => [canonicalJSON([cell.bin, cell.category]), { x: selected.x[index], y: selected.y[index] }]));
  const segments = deriveHistogramSegmentsFromCells(cells, structure.template, program.resolvedScales, { mapColor });
  return { ...structure, cells, bindings, segments };
}
