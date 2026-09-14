import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validateOptionObject } from "../../../core/validation.js";
import { isSourceOwnedText } from "../../../grammar/text.js";
import { isTextSource } from "../../../materialization/marks/index.js";
import { findLayer } from "../../../selectors/layers.js";
import { markLabelPlacementLeaderId } from "../../../layout/labels.js";

const REMOVE_MARK_LABELS_OPTIONS = Object.freeze(["target", "source"]);

function compareIds(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function attachedLabels(program, source) {
  return program.semanticSpec.layers
    .filter(layer => isSourceOwnedText(layer) && layer.source === source)
    .sort((left, right) => compareIds(left.id, right.id));
}

function resolveAttachedLabelTargets(program, args) {
  const hasTarget = Object.hasOwn(args, "target");
  const hasSource = Object.hasOwn(args, "source");
  if (hasTarget === hasSource) {
    throw new Error("removeMarkLabels requires exactly one of target or source.");
  }
  if (hasTarget) {
    const target = validateUserId(args.target, "Attached label id");
    const layer = findLayer(program, target);
    if (!isSourceOwnedText(layer) || !isTextSource(findLayer(program, layer.source))) {
      throw new Error(`Unknown attached label target "${target}".`);
    }
    return [layer];
  }
  const source = validateUserId(args.source, "Label source id");
  const layer = findLayer(program, source);
  if (!isTextSource(layer)) {
    throw new Error(`Unknown label source "${source}".`);
  }
  return attachedLabels(program, source);
}

function collectAttachedLabelRemoval(program, labels) {
  const labelIds = labels.map(layer => layer.id);
  const targets = new Set(labelIds);
  const sourceByLabel = new Map(labels.map(layer => [layer.id, layer.source]));
  const leaderIds = labelIds.flatMap(id => {
    const ids = [];
    const layoutLeader = program.materializationConfigs.labelLayouts?.[id]?.leaderId;
    if (layoutLeader !== undefined) ids.push(layoutLeader);
    const placement = program.markConfigs[id]?.labelAuthoring?.placement;
    if (placement?.leader !== undefined && placement.leader !== false) {
      ids.push(markLabelPlacementLeaderId(id));
    }
    return ids;
  });
  const selectionIds = Object.entries(
    program.materializationConfigs.selections ?? {}
  ).filter(([, config]) => targets.has(config.target)).map(([id]) => id).sort();
  const selected = new Set(selectionIds);
  const highlightIds = Object.entries(
    program.materializationConfigs.highlights ?? {}
  ).filter(([, config]) =>
    targets.has(config.target) || selected.has(config.selection)
  ).map(([id]) => id).sort();
  return Object.freeze({
    sourceByLabel,
    labelIds: Object.freeze(labelIds),
    leaderIds: Object.freeze([...new Set(leaderIds)].sort()),
    selectionIds: Object.freeze(selectionIds),
    highlightIds: Object.freeze(highlightIds)
  });
}

function externalAttachedLabelReferences(program, plan) {
  const labels = new Set(plan.labelIds);
  const leaders = new Set(plan.leaderIds);
  const selections = new Set(plan.selectionIds);
  const references = [];
  for (const layer of program.semanticSpec.layers) {
    if (!labels.has(layer.id) && labels.has(layer.source)) {
      references.push(`layer[${layer.id}].source`);
    }
  }
  for (const [kind, config] of Object.entries(program.guideConfigs.legend ?? {})) {
    if (labels.has(config?.target)) references.push(`guide.legend.${kind}.target`);
  }
  for (const [id, config] of Object.entries(
    program.materializationConfigs.labelLayouts ?? {}
  )) {
    if (!labels.has(id) && leaders.has(config?.leaderId)) {
      references.push(`materialization.labelLayouts[${id}].leaderId`);
    }
  }
  for (const [id, config] of Object.entries(program.markConfigs)) {
    if (labels.has(id)) continue;
    const selection = config?.labelAuthoring?.selection;
    if (selection?.kind === "named" && selections.has(selection.id)) {
      references.push(`markConfig[${id}].labelAuthoring.selection`);
    }
  }
  return references.sort();
}

function removeLabelState(program, plan) {
  let next = program;
  for (const id of plan.highlightIds) {
    next = next._withoutMaterializationConfig(["highlights", id]);
  }
  for (const id of plan.selectionIds) {
    next = next._withoutMaterializationConfig(["selections", id]);
  }
  for (const id of plan.labelIds) {
    next = next
      ._withoutMaterializationConfig(["labelLayouts", id])
      ._withoutMaterializationConfig(["marks", id])
      ._withoutMaterializationConfig(["jitters", id])
      ._withoutMaterializationConfig(["pointPacking", id]);
  }
  for (const id of plan.leaderIds) {
    if (next.graphicSpec.objects[id] !== undefined) {
      next = next.editGraphics({ target: id, remove: true });
    }
  }
  for (const id of plan.labelIds) {
    if (next.graphicSpec.objects[id] !== undefined) {
      next = next.editGraphics({ target: id, remove: true });
    }
    if (findLayer(next, id) !== undefined) {
      next = next.editSemantic({ property: `layer[${id}]`, remove: true });
    }
  }
  const currentLabel = plan.sourceByLabel.get(program.context.currentMark);
  const context = {
    ...(currentLabel === undefined ? {} : { currentMark: currentLabel }),
    ...(plan.selectionIds.includes(program.context.currentSelection)
      ? { currentSelection: undefined }
      : {})
  };
  return Object.keys(context).length === 0 ? next : next._withContext(context);
}

export const removeMarkLabels = /* @__PURE__ */ action(
  {
    op: "removeMarkLabels",
    description: "Remove attached label layers while preserving their source mark."
  },
  function (args = {}) {
    validateOptionObject(
      args,
      REMOVE_MARK_LABELS_OPTIONS,
      "removeMarkLabels",
      {
        allowEmpty: false,
        emptyError: Error,
        emptyMessage: "removeMarkLabels requires exactly one of target or source."
      }
    );
    const labels = resolveAttachedLabelTargets(this, args);
    const plan = collectAttachedLabelRemoval(this, labels);
    const external = externalAttachedLabelReferences(this, plan);
    if (external.length > 0) {
      throw new Error(
        `removeMarkLabels cannot remove externally referenced labels: ${external.join(", ")}.`
      );
    }
    return removeLabelState(this, plan);
  }
);

export function registerTextLabelRemovalActions(ProgramClass) {
  ProgramClass.prototype.removeMarkLabels = removeMarkLabels;
}
