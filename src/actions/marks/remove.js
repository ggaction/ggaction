import { isSourceOwnedText } from "../../grammar/text.js";
import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";

import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { applyDetachedScaleRematerialization } from "../../materialization/dependencies.js";
import { markLabelPlacementLeaderId } from "../../layout/labels.js";
import {
  getPositionChannelDefinition,
  POSITION_CHANNELS
} from "../../core/vocabulary.js";
import {
  canonicalResourcePath,
  collectResourceReferences
} from "../../core/resourceReferences.js";

const OPTIONS = Object.freeze(["target"]);
const REMOVE_AXIS = Object.freeze({
  x: "removeXAxis",
  y: "removeYAxis",
  theta: "removeThetaAxis",
  radius: "removeRadialAxis"
});

function ownedChildren(program, id) {
  const config = program.markConfigs[id] ?? {};
  return [
    config.errorBar?.lowerCapId,
    config.errorBar?.upperCapId,
    config.errorBand?.lowerBoundaryId,
    config.errorBand?.upperBoundaryId,
    config.regression?.bandId,
    config.regression?.lineId,
    config.boxPlot?.whiskerId,
    config.boxPlot?.medianId,
    config.boxPlot?.outlierId,
    config.gradientPlot?.centerId,
    config.intervalPlot?.intervalId,
    config.endpointPlot?.roles?.stemId,
    config.endpointPlot?.roles?.startId,
    config.endpointPlot?.roles?.connectorId,
    ...(config.raincloudPlot?.ownedChildIds ?? [])
  ].concat(
    program.semanticSpec.layers
      .filter(layer => layer.source === id)
      .map(layer => layer.id)
  ).concat(
    program.semanticSpec.layers
      .filter(layer =>
        program.markConfigs[layer.id]?.statisticalReference?.source === id
      )
      .map(layer => layer.id)
  ).filter(child => child !== undefined && child !== id && findLayer(program, child) !== undefined);
}

function ownership(program) {
  const ownerByChild = new Map();
  for (const layer of program.semanticSpec.layers) {
    for (const child of ownedChildren(program, layer.id)) {
      if (program.markConfigs[child]?.statisticalReference !== undefined) {
        continue;
      }
      ownerByChild.set(child, layer.id);
    }
  }
  return ownerByChild;
}

function resolveOwner(program, requested) {
  const ownerByChild = ownership(program);
  const stable = program.semanticSpec.layers.filter(
    layer => !ownerByChild.has(layer.id)
  );
  if (requested !== undefined) {
    const id = validateUserId(requested, "Mark owner id");
    const layer = findLayer(program, id);
    if (layer === undefined) throw new Error(`Unknown mark target "${id}".`);
    if (ownerByChild.has(id)) {
      throw new Error(
        `Mark "${id}" is owned by "${ownerByChild.get(id)}"; remove its stable owner.`
      );
    }
    return layer;
  }
  const current = findLayer(program, program.context.currentMark);
  if (current !== undefined && stable.includes(current)) return current;
  if (stable.length === 1) return stable[0];
  if (stable.length === 0) throw new Error("removeMark requires an existing mark.");
  throw new Error("removeMark target is ambiguous; provide target.");
}

function collectClosure(program, root) {
  const result = [];
  const visit = id => {
    for (const child of ownedChildren(program, id)) visit(child);
    if (!result.includes(id)) result.push(id);
  };
  visit(root);
  return result;
}

function externalMarkReferences(program, ids) {
  const closure = new Set(ids);
  const references = ids.flatMap(id => collectResourceReferences(program, {
    kind: "mark",
    id
  })).filter(reference => {
    if (reference.strength === "context") return false;
    if (["layer", "markConfig"].includes(reference.ownerKind)) {
      return !closure.has(reference.ownerId);
    }
    if (["selection", "highlight", "legend"].includes(reference.ownerKind)) {
      return false;
    }
    if (
      reference.ownerKind === "axis" &&
      reference.ownerId === "parallel.axes"
    ) {
      return false;
    }
    return true;
  });
  const unique = new Map(references.map(reference => [[
    reference.ownerKind,
    reference.ownerId,
    canonicalResourcePath(reference.path)
  ].join("\u0000"), reference]));
  return [...unique.entries()]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([, reference]) => reference);
}

function ownedDerivedData(program, ids) {
  const candidates = new Set();
  for (const id of ids) {
    const layer = findLayer(program, id);
    const config = program.markConfigs[id] ?? {};
    for (const candidate of [
      config.errorBar?.data,
      config.errorBand?.data,
      config.regression?.dataId,
      config.boxPlot?.summaryId,
      config.boxPlot?.outlierDataId,
      config.gradientPlot?.profileId,
      config.violinPlot?.materialized === true ? layer?.data : undefined,
      config.ecdfPlot?.data,
      config.endpointPlot?.data,
      config.statisticalReference?.dataId
    ]) {
      if (candidate !== undefined) candidates.add(candidate);
    }
    const dataset = findDataset(program, layer?.data);
    if (dataset?.transform?.[0]?.type === "markFilter") {
      candidates.add(dataset.id);
    }
  }
  return candidates;
}

function usedPositionScales(program, ids) {
  const scales = Object.fromEntries(
    POSITION_CHANNELS.map(channel => [channel, new Set()])
  );
  for (const id of ids) {
    const layer = findLayer(program, id);
    for (const channel of POSITION_CHANNELS) {
      const scale = layer?.encoding?.[channel]?.scale;
      if (scale !== undefined) scales[channel].add(scale);
    }
  }
  return scales;
}

function cleanupSelectionState(program, ids) {
  const targets = new Set(ids);
  const selectionIds = Object.entries(program.materializationConfigs.selections ?? {})
    .filter(([, config]) => targets.has(config.target))
    .map(([id]) => id);
  let next = program;
  for (const [id, config] of Object.entries(
    program.materializationConfigs.highlights ?? {}
  )) {
    if (targets.has(config.target) || selectionIds.includes(config.selection)) {
      next = next._withoutMaterializationConfig(["highlights", id]);
    }
  }
  for (const id of selectionIds) {
    next = next._withoutMaterializationConfig(["selections", id]);
  }
  return {
    program: next,
    selectionIds
  };
}

export function removeOwnedMark(program, id, partial = false) {
  const layer = findLayer(program, id);
  if (!partial && layer === undefined) return program;
  const cleaned = cleanupSelectionState(program, [id]);
  let next = cleaned.program;
  if (layer !== undefined) {
    next = next.editSemantic({ property: `layer[${id}]`, remove: true });
  }
  if (next.graphicSpec.objects[id] !== undefined) {
    next = next.editGraphics({ target: id, remove: true });
  }
  return next
    ._withoutMaterializationConfig(["marks", id])
    ._withContext({
      ...(program.context.currentMark === id ? { currentMark: undefined } : {}),
      ...(cleaned.selectionIds.includes(program.context.currentSelection)
        ? { currentSelection: undefined }
        : {})
    });
}

function hasScaleConsumer(program, channel, scale) {
  return program.semanticSpec.layers.some(
    layer => !isSourceOwnedText(layer) && layer.encoding?.[channel]?.scale === scale
  );
}

function cleanupPositionGuides(program, scales) {
  let next = program;
  for (const channel of POSITION_CHANNELS) {
    const definition = getPositionChannelDefinition(channel);
    const axis = next.semanticSpec.guides.axis?.[channel];
    if (
      axis !== undefined &&
      scales[channel].has(axis.scale) &&
      !hasScaleConsumer(next, channel, axis.scale)
    ) {
      next = next[REMOVE_AXIS[channel]]({
        scale: axis.scale,
        ...(axis.coordinate === undefined ? {} : { coordinate: axis.coordinate })
      });
    }
    const grid = next.semanticSpec.guides.grid?.[definition.gridDirection];
    if (
      grid !== undefined &&
      scales[channel].has(grid.scale) &&
      !hasScaleConsumer(next, channel, grid.scale)
    ) {
      next = next.removeGrid({ [definition.gridDirection]: true });
    }
  }
  return next;
}

export const removeMark = /* @__PURE__ */ closedAction(
  { op: "removeMark", description: "Remove one stable mark owner and owned state." }, OPTIONS,
  function (args = {}) {
    const owner = resolveOwner(this, args.target);
    const ids = collectClosure(this, owner.id);
    const external = externalMarkReferences(this, ids);
    if (external.length > 0) {
      throw new Error(
        `removeMark cannot remove externally referenced marks: ${external.map(
          reference => `${reference.ownerKind} "${reference.ownerId}" at ` +
            canonicalResourcePath(reference.path)
        ).join("; ")}.`
      );
    }
    const previousLayers = ids.map(id => findLayer(this, id));
    const derived = ownedDerivedData(this, ids);
    const positionScales = usedPositionScales(this, ids);
    let next = this;

    if (ids.includes(next.guideConfigs.axis?.parallel?.axes?.target)) {
      next = next.removeParallelAxes({
        target: next.guideConfigs.axis.parallel.axes.target
      });
    }

    const legendTargets = [...new Set(Object.values(next.guideConfigs.legend ?? {})
      .filter(config => ids.includes(config?.target))
      .map(config => config.target))];
    for (const target of legendTargets) {
      next = next.removeLegend({ target });
    }

    const selectionCleanup = cleanupSelectionState(next, ids);
    next = selectionCleanup.program;
    for (const id of ids) {
      const labelLayout = next.materializationConfigs.labelLayouts?.[id];
      if (
        labelLayout?.leaderId !== undefined &&
        next.graphicSpec.objects[labelLayout.leaderId] !== undefined
      ) {
        next = next.editGraphics({ target: labelLayout.leaderId, remove: true });
      }
      const placement = next.markConfigs[id]?.labelAuthoring?.placement;
      const placementLeaderId = markLabelPlacementLeaderId(id);
      if (
        placement?.leader !== undefined &&
        placement.leader !== false &&
        next.graphicSpec.objects[placementLeaderId] !== undefined
      ) {
        next = next.editGraphics({ target: placementLeaderId, remove: true });
      }
      if (findLayer(next, id) !== undefined) {
        next = next.editSemantic({ property: `layer[${id}]`, remove: true });
      }
      if (next.graphicSpec.objects[id] !== undefined) {
        next = next.editGraphics({ target: id, remove: true });
      }
      next = next._withoutMaterializationConfig(["marks", id]);
      next = next._withoutMaterializationConfig(["jitters", id]);
      next = next._withoutMaterializationConfig(["pointPacking", id]);
      next = next._withoutMaterializationConfig(["labelLayouts", id]);
    }

    next = cleanupPositionGuides(next, positionScales);
    for (const id of derived) {
      if (findDataset(next, id)?.source !== undefined) {
        next = next.releaseDerivedData({ id });
      }
    }
    next = applyDetachedScaleRematerialization(next, previousLayers);
    return next._withContext({
      ...(ids.includes(this.context.currentMark) ? { currentMark: undefined } : {}),
      ...(selectionCleanup.selectionIds.includes(this.context.currentSelection)
        ? { currentSelection: undefined }
        : {})
    });
  }
);
