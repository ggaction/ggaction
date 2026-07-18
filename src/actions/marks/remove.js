import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import {
  getPositionChannelDefinition,
  POSITION_CHANNELS
} from "../../core/vocabulary.js";

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
    config.boxPlot?.outlierId
  ].concat(
    program.semanticSpec.layers
      .filter(layer => layer.source === id)
      .map(layer => layer.id)
  ).filter(child => child !== undefined && findLayer(program, child) !== undefined);
}

function ownership(program) {
  const ownerByChild = new Map();
  for (const layer of program.semanticSpec.layers) {
    for (const child of ownedChildren(program, layer.id)) {
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
      config.boxPlot?.outlierDataId
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

function hasScaleConsumer(program, channel, scale) {
  return program.semanticSpec.layers.some(
    layer => layer.encoding?.[channel]?.scale === scale
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

export const removeMark = action(
  { op: "removeMark", description: "Remove one stable mark owner and owned state." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "removeMark");
    const owner = resolveOwner(this, args.target);
    const ids = collectClosure(this, owner.id);
    const derived = ownedDerivedData(this, ids);
    const positionScales = usedPositionScales(this, ids);
    let next = this;

    const legendTargets = [...new Set(Object.values(next.guideConfigs.legend ?? {})
      .filter(config => ids.includes(config?.target))
      .map(config => config.target))];
    for (const target of legendTargets) {
      next = next.removeLegend({ target });
    }

    const selectionCleanup = cleanupSelectionState(next, ids);
    next = selectionCleanup.program;
    for (const id of ids) {
      if (findLayer(next, id) !== undefined) {
        next = next.editSemantic({ property: `layer[${id}]`, remove: true });
      }
      if (next.graphicSpec.objects[id] !== undefined) {
        next = next.editGraphics({ target: id, remove: true });
      }
      next = next._withoutMaterializationConfig(["marks", id]);
    }

    next = cleanupPositionGuides(next, positionScales);
    for (const id of derived) {
      if (findDataset(next, id)?.source !== undefined) {
        next = next.releaseDerivedData({ id });
      }
    }
    return next._withContext({
      ...(ids.includes(this.context.currentMark) ? { currentMark: undefined } : {}),
      ...(selectionCleanup.selectionIds.includes(this.context.currentSelection)
        ? { currentSelection: undefined }
        : {})
    });
  }
);
