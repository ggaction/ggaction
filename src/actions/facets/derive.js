import { freezeOwned } from "../../core/immutable.js";
import { resolveHistogramBins } from "../../grammar/histogram.js";
import { readQuantitativeField } from "../../grammar/scales/index.js";
import { BAR_GRAINS, resolveBarGrain } from "../../grammar/bars/policy.js";
import { resolveFacetScaleDomains } from "../../grammar/facets/scales.js";
import {
  applyLayerEmptyDataView,
  applyMaterializationPlan,
  planScaleGuideRematerialization
} from "../../materialization/dependencies.js";
import {
  getLayerScaleIds,
  getMarkMaterializationStep
} from "../../materialization/marks/index.js";
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

function buildFacetCellCandidate(
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
  const reboundData = new Map();
  for (const layer of definition.dependencies.layers) {
    const data = datasets.get(layer.data);
    if (data === undefined) {
      throw new Error(
        `Facet layer "${layer.id}" has no replayed dataset in cell "${cell.id}".`
      );
    }
    reboundData.set(layer.id, data);
    const statistical = child.markConfigs[layer.id]?.statisticalReference;
    if (statistical !== undefined) {
      child = child._withMarkConfig(layer.id, {
        ...child.markConfigs[layer.id],
        statisticalReference: { ...statistical, dataId: data }
      });
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
  const primaryLayers = definition.dependencies.primaryLayers ??
    definition.dependencies.layers.map(layer => layer.id);
  const populated = primaryLayers.some(id => {
    const data = reboundData.get(id);
    return data !== undefined && requireDataset(child, data).values.length > 0;
  });
  if (!populated) {
    for (const layer of definition.dependencies.layers) {
      child = applyLayerEmptyDataView(child, layer.id);
    }
    return { program: child, populated: false };
  }
  const scaleIds = [...new Set(child.semanticSpec.layers.flatMap(getLayerScaleIds))];
  const program = applyMaterializationPlan(child, buildMaterializationPlan({
    scales: scaleIds.map(id => ({
      op: "rematerializeScale",
      args: { id, guides: false, marks: false }
    }))
  }));
  return { program, populated: true };
}

function applyResolvedDomains(
  program,
  childId,
  resolution,
  baseResolved,
  { marks: materializeMarks = true } = {}
) {
  let next = program;
  for (const [id, scaleResolution] of Object.entries(resolution.scales)) {
    const current = next.resolvedScales[id];
    if (current === undefined) {
      throw new Error(`Facet child "${childId}" is missing resolved scale "${id}".`);
    }
    const shared = scaleResolution.policy === "shared"
      ? baseResolved?.[id]
      : undefined;
    const semanticDomain = findSemanticScale(next, id)?.domain;
    const domain = scaleResolution.childDomains[childId] ??
      scaleResolution.domain ?? semanticDomain;
    next = next._withResolvedScale(id, {
      ...current,
      ...shared,
      domain
    });
  }
  const marks = materializeMarks ? next.semanticSpec.layers.flatMap(layer => {
    const step = getMarkMaterializationStep(next, layer);
    if (step === undefined) return [];
    return ["bar", "line", "area", "arc"].includes(layer.mark?.type)
      ? [{ ...step, args: { ...step.args, scales: false } }]
      : [step];
  }) : [];
  const guides = Object.keys(resolution.scales).flatMap(id =>
    planScaleGuideRematerialization(next, id)
  );
  return applyMaterializationPlan(
    next,
    buildMaterializationPlan({ marks, guides })
  );
}

function materializeFacetCell(
  child,
  childId,
  resolution,
  baseResolved,
  populated
) {
  return applyResolvedDomains(
    child,
    childId,
    resolution,
    baseResolved,
    { marks: populated }
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
  const candidates = Object.fromEntries(definition.cells.map(cell => [
    cell.id,
    buildFacetCellCandidate(template, definition, cell, bins, scales)
  ]));
  const independentlyResolved = Object.fromEntries(Object.entries(candidates).map(
    ([id, candidate]) => [id, candidate.program]
  ));
  const populatedIds = new Set(Object.entries(candidates).flatMap(
    ([id, candidate]) => candidate.populated ? [id] : []
  ));
  return resolveFacetChildrenScales(
    template,
    definition.cells.map(cell => cell.id),
    independentlyResolved,
    scales,
    closeInheritedAction,
    populatedIds
  );
}

function closeInheritedActions(program) {
  let closed = program;
  while (closed.actionStack.length > 0) closed = closed._exitAction();
  return closed;
}

export function resolveFacetChildrenScales(
  template,
  cellIds,
  independentlyResolved,
  scales = {},
  closeInheritedAction = false,
  populatedIds = undefined
) {
  const populated = Object.fromEntries(cellIds.flatMap(id => {
    const child = independentlyResolved[id];
    if (child === undefined) {
      throw new Error(`Facet derivation is missing child "${id}".`);
    }
    const populated = populatedIds === undefined
      ? child.semanticSpec.layers.length > 0
      : populatedIds.has(id);
    return populated ? [[id, child]] : [];
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
  const emptyIds = cellIds.filter(id => !Object.hasOwn(populated, id));
  const scalesById = new Map(template.semanticSpec.scales.map(scale => [scale.id, scale]));
  for (const childId of emptyIds) {
    const unresolved = Object.entries(resolution.scales).find(([id, value]) =>
      value.policy === "independent" && scalesById.get(id)?.domain === "auto"
    );
    if (unresolved !== undefined) {
      throw new Error(
        `Facet child "${childId}" cannot resolve independent scale "${unresolved[0]}" from an empty partition.`
      );
    }
  }
  const resolvedChildren = Object.fromEntries(
    cellIds.map(id => {
      const child = independentlyResolved[id];
      if (child.semanticSpec.layers.length === 0) {
        return [id, closeInheritedAction ? closeInheritedActions(child) : child];
      }
      const resolved = materializeFacetCell(
        child,
        id,
        resolution,
        template.resolvedScales,
        Object.hasOwn(populated, id)
      );
      return [id, closeInheritedAction ? closeInheritedActions(resolved) : resolved];
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
