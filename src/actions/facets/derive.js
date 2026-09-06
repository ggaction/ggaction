import { freezeOwned } from "../../core/immutable.js";
import { resolveHistogramBins } from "../../grammar/histogram.js";
import { readQuantitativeField } from "../../grammar/scales/index.js";
import { BAR_GRAINS, resolveBarGrain } from "../../grammar/bars/policy.js";
import { resolveFacetScaleDomains } from "../../grammar/facets/scales.js";
import {
  applyMaterializationPlan,
  planScaleGuideRematerialization
} from "../../materialization/dependencies.js";
import { getMarkMaterializationStep } from "../../materialization/marks/index.js";
import { buildMaterializationPlan } from "../../materialization/planner.js";
import { requireDataset } from "../../selectors/datasets.js";
import { requireLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { findTransformPolicy } from "../../grammar/transforms.js";

function sharedHistogramBoundaries(program) {
  const boundaries = new Map();
  for (const layer of program.semanticSpec.layers) {
    if (
      layer.mark?.type !== "bar" ||
      resolveBarGrain(layer) !== BAR_GRAINS.histogram
    ) {
      continue;
    }
    const x = layer.encoding.x;
    const scale = findSemanticScale(program, x.scale);
    const dataset = requireDataset(program, layer.data);
    const values = readQuantitativeField(dataset.values, x.field);
    boundaries.set(layer.id, resolveHistogramBins({
      values,
      bin: x.bin,
      domain: scale.domain,
      nice: scale.nice ?? true,
      zero: scale.zero ?? false
    }).boundaries);
  }
  return boundaries;
}

function applySharedHistogramBoundaries(program, layerId, boundaries) {
  if (boundaries === undefined) return program;
  const layer = requireLayer(program, layerId);
  let next = program;
  for (const property of ["maxBins", "step"]) {
    if (Object.hasOwn(layer.encoding.x.bin, property)) {
      next = next.editSemantic({
        property: `layer[${layerId}].encoding.x.bin.${property}`,
        remove: true
      });
    }
  }
  return next.editSemantic({
    property: `layer[${layerId}].encoding.x.bin.boundaries`,
    value: boundaries
  });
}

function deriveCellProgram(
  base,
  definition,
  cell,
  histogramBoundaries,
  scales
) {
  const filters = cell.filters ?? [{
    field: definition.field,
    value: cell.value
  }];
  let child = base;
  let source = definition.data;
  for (const [index, filter] of filters.entries()) {
    const id = index === filters.length - 1
      ? cell.data
      : `${cell.id}-partition-${index + 1}-data`;
    child = child.filterData({
      id,
      source,
      field: filter.field,
      oneOf: [filter.value]
    });
    source = id;
  }
  if (requireDataset(child, cell.data).values.length === 0) {
    while (child.semanticSpec.layers.length > 0) {
      child = child.removeMark({ target: child.semanticSpec.layers[0].id });
    }
    return child;
  }
  const datasets = new Map([[definition.data, cell.data]]);
  for (const replay of definition.dependencies.replay) {
    const source = datasets.get(replay.source);
    if (source === undefined) {
      throw new Error(
        `Facet replay source "${replay.source}" is not available in cell "${cell.id}".`
      );
    }
    const id = `${cell.id}-${replay.id}-data`;
    const policy = findTransformPolicy(replay.transform.type);
    const transform = policy?.facetReplayTransform?.(
      replay.transform,
      { scales }
    ) ?? replay.transform;
    child = child.replayDerivedData({
      id,
      source,
      transform
    });
    datasets.set(replay.id, id);
  }
  for (const layer of definition.dependencies.layers) {
    const data = datasets.get(layer.data);
    if (data === undefined) {
      throw new Error(
        `Facet layer "${layer.id}" has no replayed dataset in cell "${cell.id}".`
      );
    }
    child = child.rebindLayerData({ id: layer.id, data });
    child = applySharedHistogramBoundaries(
      child,
      layer.id,
      histogramBoundaries.get(layer.id)
    );
  }
  for (const [id, markConfig] of Object.entries(base.markConfigs)) {
    const gradientPlot = markConfig.gradientPlot;
    if (gradientPlot?.materialized !== true) continue;
    const profile = datasets.get(gradientPlot.profileId);
    const source = datasets.get(gradientPlot.source);
    if (profile === undefined || source === undefined) {
      throw new Error(
        `Facet gradient plot "${id}" is missing replayed profile dependencies.`
      );
    }
    child = child.rebindGradientPlotProfile({ id, profile, source });
  }
  const scaleIds = [...new Set(child.semanticSpec.layers.flatMap(layer =>
    Object.values(layer.encoding ?? {})
      .map(encoding => encoding?.scale)
      .filter(id => id !== undefined)
  ))];
  return applyMaterializationPlan(child, buildMaterializationPlan({
    scales: scaleIds.map(id => ({
      op: "rematerializeScale",
      args: { id, guides: false, marks: false }
    }))
  }));
}

function applyResolvedDomains(program, childId, resolution, baseResolved) {
  let next = program;
  for (const [id, scaleResolution] of Object.entries(resolution.scales)) {
    const current = next.resolvedScales[id];
    if (current === undefined) {
      throw new Error(`Facet child "${childId}" is missing resolved scale "${id}".`);
    }
    const shared = scaleResolution.policy === "shared"
      ? baseResolved?.[id]
      : undefined;
    next = next._withResolvedScale(id, {
      ...current,
      ...shared,
      domain: scaleResolution.childDomains[childId]
    });
  }
  const marks = next.semanticSpec.layers.flatMap(layer => {
    const step = getMarkMaterializationStep(next, layer);
    if (step === undefined) return [];
    return ["bar", "line", "area"].includes(layer.mark?.type)
      ? [{ ...step, args: { ...step.args, scales: false } }]
      : [step];
  });
  const guides = Object.keys(resolution.scales).flatMap(id =>
    planScaleGuideRematerialization(next, id)
  );
  return applyMaterializationPlan(
    next,
    buildMaterializationPlan({ marks, guides })
  );
}

export function deriveFacetChildren(
  base,
  definition,
  {
    closeInheritedAction = false,
    stripTitle = false,
    scales = {}
  } = {}
) {
  const template = stripTitle && base.semanticSpec.title.text !== undefined
    ? base.removeTitle()
    : base;
  scales ??= {};
  const xPolicy = scales.x ?? "shared";
  const bins = xPolicy === "shared"
    ? sharedHistogramBoundaries(template)
    : new Map();
  const independentlyResolved = Object.fromEntries(definition.cells.map(cell => [
    cell.id,
    deriveCellProgram(template, definition, cell, bins, scales)
  ]));
  return resolveFacetChildrenScales(
    template,
    definition.cells.map(cell => cell.id),
    independentlyResolved,
    scales,
    closeInheritedAction
  );
}

export function resolveFacetChildrenScales(
  template,
  cellIds,
  independentlyResolved,
  scales = {},
  closeInheritedAction = false
) {
  const populated = Object.fromEntries(cellIds.flatMap(id => {
    const child = independentlyResolved[id];
    if (child === undefined) {
      throw new Error(`Facet derivation is missing child "${id}".`);
    }
    return child.semanticSpec.layers.length > 0 ? [[id, child]] : [];
  }));
  if (Object.keys(populated).length === 0) {
    throw new Error("Facet derivation requires at least one populated cell.");
  }
  const resolution = resolveFacetScaleDomains(
    template.semanticSpec,
    Object.fromEntries(Object.entries(populated).map(([id, child]) => [
      id,
      child.resolvedScales
    ])),
    scales,
    template.resolvedScales
  );
  const resolvedChildren = Object.fromEntries(
    cellIds.map(id => {
      const child = independentlyResolved[id];
      if (child.semanticSpec.layers.length === 0) {
        return [id, closeInheritedAction ? child._exitAction() : child];
      }
      const resolved = applyResolvedDomains(
        child,
        id,
        resolution,
        template.resolvedScales
      );
      return [id, closeInheritedAction ? resolved._exitAction() : resolved];
    })
  );
  const firstPopulatedId = Object.keys(populated)[0];
  const sharedScales = Object.fromEntries(
    Object.entries(resolution.scales)
      .filter(([, value]) => value.policy === "shared")
      .map(([id]) => [id, resolvedChildren[firstPopulatedId].resolvedScales[id]])
  );
  return freezeOwned({
    children: freezeOwned(resolvedChildren),
    sharedScales: freezeOwned(sharedScales),
    resolution
  });
}
