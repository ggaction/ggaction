import { freezeOwned } from "../../core/immutable.js";
import { resolveHistogramBins } from "../../grammar/histogram.js";
import { readQuantitativeField } from "../../grammar/scales.js";
import { BAR_GRAINS, resolveBarGrain } from "../../grammar/bars/policy.js";
import {
  applyLayerDataRematerialization,
  applyMaterializationPlan,
  planScaleGuideRematerialization
} from "../../materialization/dependencies.js";
import { getMarkMaterializationStep } from "../../materialization/marks.js";
import { buildMaterializationPlan } from "../../materialization/planner.js";
import { requireDataset } from "../../selectors/datasets.js";
import { requireLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";

const DISCRETE_SCALE_TYPES = new Set(["ordinal", "band", "point"]);

function sharedScaleIds(program) {
  return [...new Set(program.semanticSpec.layers.flatMap(layer =>
    Object.values(layer.encoding ?? {})
      .map(encoding => encoding?.scale)
      .filter(id => id !== undefined)
  ))];
}

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

function deriveCellProgram(base, definition, cell, histogramBoundaries) {
  let child = base.filterData({
    id: cell.data,
    source: definition.data,
    field: definition.field,
    oneOf: [cell.value]
  });
  for (const layer of base.semanticSpec.layers) {
    child = child.editSemantic({
      property: `layer[${layer.id}].data`,
      value: cell.data
    });
    child = applySharedHistogramBoundaries(
      child,
      layer.id,
      histogramBoundaries.get(layer.id)
    );
  }
  for (const layer of base.semanticSpec.layers) {
    child = applyLayerDataRematerialization(child, layer.id);
  }
  return child;
}

function continuousUnion(domains, id) {
  if (!domains.every(domain =>
    Array.isArray(domain) &&
    domain.length === 2 &&
    domain.every(Number.isFinite)
  )) {
    throw new Error(`Facet shared scale "${id}" requires numeric pair domains.`);
  }
  return freezeOwned([
    Math.min(...domains.map(domain => Math.min(...domain))),
    Math.max(...domains.map(domain => Math.max(...domain)))
  ]);
}

export function resolveFacetSharedScales(base, children) {
  const entries = Object.values(children);
  if (entries.length === 0) {
    throw new Error("Facet shared scales require at least one child.");
  }
  const resolved = {};
  for (const id of sharedScaleIds(base)) {
    const scale = findSemanticScale(base, id);
    const baseResolved = base.resolvedScales[id];
    if (scale === undefined || baseResolved === undefined) {
      throw new Error(`Facet shared scale "${id}" is not fully resolved.`);
    }
    const childScales = entries.map(child => child.resolvedScales[id]);
    if (childScales.some(childScale => childScale === undefined)) {
      throw new Error(`Facet child is missing resolved scale "${id}".`);
    }
    const domain = scale.domain !== "auto" || DISCRETE_SCALE_TYPES.has(scale.type)
      ? baseResolved.domain
      : continuousUnion(childScales.map(childScale => childScale.domain), id);
    resolved[id] = freezeOwned({ ...baseResolved, domain });
  }
  return freezeOwned(resolved);
}

function applySharedScales(program, sharedScales) {
  let next = program;
  for (const [id, scale] of Object.entries(sharedScales)) {
    next = next._withResolvedScale(id, scale);
  }
  const marks = next.semanticSpec.layers.flatMap(layer => {
    const step = getMarkMaterializationStep(next, layer);
    if (step === undefined) return [];
    return layer.mark?.type === "bar"
      ? [{ ...step, args: { ...step.args, scales: false } }]
      : [step];
  });
  const guides = Object.keys(sharedScales).flatMap(id =>
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
  { closeInheritedAction = false, stripTitle = false } = {}
) {
  const template = stripTitle && base.semanticSpec.title.text !== undefined
    ? base.removeTitle()
    : base;
  const bins = sharedHistogramBoundaries(template);
  const independentlyResolved = Object.fromEntries(definition.cells.map(cell => [
    cell.id,
    deriveCellProgram(template, definition, cell, bins)
  ]));
  const sharedScales = resolveFacetSharedScales(template, independentlyResolved);
  return freezeOwned({
    children: freezeOwned(Object.fromEntries(
      Object.entries(independentlyResolved).map(([id, child]) => [
        id,
        closeInheritedAction
          ? applySharedScales(child, sharedScales)._exitAction()
          : applySharedScales(child, sharedScales)
      ])
    )),
    sharedScales
  });
}
