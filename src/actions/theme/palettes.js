import { collectGraphicSubtreeIds } from "../../grammar/schemas/graphicTree.js";
import { findScaleConsumers } from "../../materialization/scales/consumers/index.js";
import { getMarkMaterializationStep } from "../../materialization/marks/index.js";
import { applyMaterializationPlan, buildMaterializationPlan } from "../../materialization/planner.js";
import { planScaleGuideRematerialization } from "../../materialization/dependencies.js";
import { resolveMarkItems, resolveMarkSourceItems } from "../../materialization/selection/policies/index.js";
import { conditionalSelectionMembership } from "../../materialization/conditionalSelection.js";
import { selectConditionalBranches } from "../../materialization/conditionalBranches.js";
import { materializeFillItems } from "../../materialization/fillPaint.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { mapOrdinalValues } from "../../grammar/scales/index.js";
import { resolveEffectiveThemeTokens, resolveEffectiveThemeFrame } from "./state.js";

const FILL_MARKS = new Set(["point", "bar", "area", "arc", "rect", "text", "table"]);
export function themePatternForValues(program, layer, values, scaleId = layer?.encoding?.color?.scale) {
  const state = program.materializationConfigs.theme;
  if (resolveEffectiveThemeFrame(state) === undefined || !FILL_MARKS.has(layer?.mark?.type) ||
      state.overrides?.includes(`g:${layer.id}.fill`) ||
      layer?.mark?.type === "table" && state.overrides?.includes(`c:marks.${layer.id}.tablePlot.cells.fill`)) return undefined;
  const palette = resolveEffectiveThemeTokens(state).patternPalette;
  const scale = findSemanticScale(program, scaleId), resolved = program.resolvedScales[scaleId];
  if (!palette || scale?.type !== "ordinal" || scale.range !== "auto" || !resolved) return undefined;
  return mapOrdinalValues(values, resolved.domain, palette, { unknown: undefined });
}

export function applyThemePatternPalette(program, target) {
  const state = program.materializationConfigs.theme;
  if (resolveEffectiveThemeFrame(state) === undefined || resolveEffectiveThemeTokens(state).patternPalette === undefined) return program;
  let next = program;
  for (const layer of program.semanticSpec.layers) {
    if ((target !== undefined && layer.id !== target) || !FILL_MARKS.has(layer.mark.type) ||
        (!layer.encoding?.color && !layer.conditionals?.color) || !getMarkMaterializationStep(program, layer)) continue;
    const items = resolveMarkItems(program, layer.id);
    let selected;
    if (layer.conditionals?.color) {
      const membership = conditionalSelectionMembership(program, layer, layer.conditionals.color, items, { resolveMarkItems, resolveMarkSourceItems });
      selected = selectConditionalBranches(program, layer, "color", items, membership);
    }
    const fills = new Map();
    items.forEach((item, index) => {
      const branch = selected ? selected.branches[selected.indices[index] === -1 ? selected.branches.length - 1 : selected.indices[index]] : layer.encoding.color;
      if (branch.field === undefined) return;
      const fill = themePatternForValues(program, layer, [item.channels.color], branch.scale)?.[0];
      if (fill !== undefined) for (const id of item.graphicIds) fills.set(id, fill);
    });
    if (!fills.size) continue;
    for (const owner of collectGraphicSubtreeIds(next.graphicSpec, layer.id)) {
      const graphic = next.graphicSpec.objects[owner];
      if (!graphic.items?.length) continue;
      const painted = graphic.items.map(item => ({ ...item, type: item.type ?? graphic.type,
        properties: fills.has(item.id) && Object.hasOwn(item.properties, "fill") &&
          (layer.mark.type !== "table" || item.identity?.role === "body")
          ? { ...item.properties, fill: fills.get(item.id) } : item.properties }));
      const concrete = materializeFillItems(next, layer, painted);
      const changed = concrete.some((item, index) => JSON.stringify(item.properties.fill) !== JSON.stringify(graphic.items[index].properties.fill));
      if (changed) next = next.editGraphics({ target: owner, property: "items", value: graphic.items.map((item, index) => ({ type: item.type ?? graphic.type, properties: concrete[index].properties, ...(item.identity === undefined ? {} : { identity: item.identity }) })) });
    }
  }
  return next;
}

export function rematerializeThemePalettes(program, before, after) {
  if (JSON.stringify([before.palette, before.patternPalette]) === JSON.stringify([after.palette, after.patternPalette])) return program;
  const scales = program.semanticSpec.scales.filter(scale => scale.type === "ordinal" && scale.range === "auto")
    .map(scale => ({ scale, consumers: findScaleConsumers(program, scale.id) }))
    .filter(({ consumers }) => consumers.length && consumers.every(consumer => ["color", "stroke"].includes(consumer.channel)));
  if (!scales.length) return program;
  const layers = new Map(scales.flatMap(({ consumers }) => consumers.map(({ layer }) => [layer.id, layer])));
  let next = program;
  for (const { scale } of scales) next = next.rematerializeScale({ id: scale.id, guides: false, marks: false });
  return applyMaterializationPlan(next, buildMaterializationPlan({
    marks: [...layers.values()].map(layer => getMarkMaterializationStep(next, layer)).filter(Boolean),
    guides: scales.flatMap(({ scale }) => planScaleGuideRematerialization(next, scale.id))
  }));
}
