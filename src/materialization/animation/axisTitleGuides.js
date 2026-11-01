import { cartesianAxisOwners, axisGraphicIds } from "../../selectors/axes.js";
import { cartesianPosition } from "../../grammar/animation/cartesianPosition.js";
import { guideAnimationKey } from "../../grammar/animation/guideState.js";
import { axisThemeOffset } from "../../theme/definition.js";
import { resolveCartesianAxisFrameBounds } from "../coordinateBounds.js";
import { findCanvasGraphic } from "../graphicHierarchy.js";
import { axisGuideItems } from "../guides/axisItems.js";
import { valuesFromTickConfig } from "../guides/tickValues.js";
import { prepareAxisAnimationLayout } from "./axisLabelState.js";
import { prepareAxisTitleAnimationLayout, normalizeAxisTitleAnimationState, axisTitleAnimationLabels } from "./axisTitleState.js";

// Build from native authoring policy, never the final numeric title offset.
export function axisTitleAnimationItems(program, namespaces, spend) {
  const result = [], objects = program.graphicSpec.objects;
  const axisItems = axisGuideItems(program, spend), profile = program.materializationConfigs.textMetrics, labelItems = new Map();
  for (const item of axisItems) {
    if (item.component !== "labels") continue;
    if (!labelItems.has(item.ownerId)) labelItems.set(item.ownerId, []);
    labelItems.get(item.ownerId).push(item);
  }
  for (const owner of cartesianAxisOwners(program)) {
    const config = owner.config?.title, ids = axisGraphicIds(owner.channel, owner.id);
    if (config === undefined || objects[ids[3]] === undefined || typeof config.offset === "number" && config.inferredOffset !== true) continue;
    const identity = { namespaces, owner: owner.id, component: "title", value: null, line: 0 };
    const fail = reason => result.push({ graphicId: ids[3], state: { identity, reason } });
    const labelConfig = owner.config?.labels;
    if (labelConfig !== undefined && (labelConfig.maxWidth !== undefined || labelConfig.responsive !== undefined || labelConfig.responsiveResult !== undefined ||
        labelConfig.lineHeight !== undefined && labelConfig.lineHeight !== labelConfig.fontSize * 1.2)) { fail("guide-layout"); continue; }
    if ((labelConfig === undefined) !== (objects[ids[2]] === undefined)) { fail("guide-edited"); continue; }
    const frame = resolveCartesianAxisFrameBounds(program, owner.channel, config.position, config.scale, owner.id);
    const { width, height } = findCanvasGraphic(program).properties, canvas = { width, height };
    const edgeAligned = program.materializationConfigs.canvas?.plot !== undefined || program.materializationConfigs.canvas?.responsive !== undefined;
    const values = labelConfig === undefined ? null : valuesFromTickConfig(program, labelConfig);
    if (values?.length === 0) { fail("guide-layout"); continue; }
    spend(1 + (values?.length ?? 0));
    const labels = labelConfig === undefined ? null : prepareAxisAnimationLayout({ values, config: labelConfig,
      scale: program.resolvedScales[labelConfig.scale], channel: owner.channel,
      frame: resolveCartesianAxisFrameBounds(program, owner.channel, labelConfig.position, labelConfig.scale, owner.id), canvas, profile, edgeAligned });
    const scale = program.resolvedScales[config.scale];
    const anchor = { kind: "title", channel: owner.channel, frame,
      anchor: typeof config.at === "number" ? { kind: "value", mapping: cartesianPosition(config.at, scale), alongOffset: config.alongOffset ?? 0 }
        : { kind: "range", range: scale.range, at: config.at, alongOffset: config.alongOffset ?? 0 },
      policy: { side: config.position, offset: 0, align: config.align ?? null, baseline: config.baseline ?? "middle" } };
    const state = normalizeAxisTitleAnimationState({ identity, kind: "title-layout", layout: prepareAxisTitleAnimationLayout({ anchor,
      canvas, config, text: program.semanticSpec.guides.axis[owner.id].title, profile, labels,
      preferred: axisThemeOffset(program.materializationConfigs.theme, "title") ?? (owner.channel === "x" ? 42 : 52), unclamped: edgeAligned }) });
    const expected = axisTitleAnimationLabels(state), items = labelItems.get(owner.id) ?? [];
    const keyed = new Map(items.map(item => [guideAnimationKey({ ...identity, component: "labels", value: item.rawValue, line: item.line }), item]));
    if (keyed.size !== items.length || expected.length !== items.length) { fail("guide-layout"); continue; }
    result.push({ graphicId: ids[3], state });
    for (const label of expected) {
      const item = keyed.get(guideAnimationKey(label.identity));
      if (item === undefined) throw new TypeError("Dependent title labels differ from native correspondence.");
      result.push({ graphicId: item.graphicId, state: label });
    }
  }
  return result;
}
