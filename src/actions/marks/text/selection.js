import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validateOptionObject } from "../../../core/validation.js";
import { normalizeLabelSelectionEdit } from
  "../../../grammar/markLabelSelection.js";
import { isSourceOwnedText } from "../../../grammar/text.js";
import { isTextSource } from "../../../materialization/marks/index.js";
import { resolveMarkSelection } from
  "../../../materialization/selection/state.js";
import { findLayer } from "../../../selectors/layers.js";
import { rematerializeLabelsBeforeHighlights } from
  "../../selection/actions.js";

const OPTIONS = Object.freeze(["target", "select", "selection", "all"]);

function requireAttachedLabel(program, target) {
  const id = validateUserId(target, "Attached label id");
  const layer = findLayer(program, id);
  if (!isSourceOwnedText(layer) || !isTextSource(findLayer(program, layer.source))) {
    throw new Error(`Unknown attached label target "${id}".`);
  }
  return layer;
}

function validateSelectionSource(program, source, requested) {
  if (requested.kind === "all") return;
  if (requested.kind === "inline") {
    resolveMarkSelection(program, source, requested.selector);
    return;
  }
  const definition = program.materializationConfigs.selections?.[requested.id];
  if (definition === undefined) {
    throw new Error(`Unknown label selection "${requested.id}".`);
  }
  if (definition.target !== source) {
    throw new Error(
      `Label selection "${requested.id}" must target source mark "${source}".`
    );
  }
  resolveMarkSelection(program, source, definition.selector);
}

const editMarkLabelSelection = action(
  {
    op: "editMarkLabelSelection",
    description: "Replace the final-item membership requested by an attached label."
  },
  function (args = {}) {
    validateOptionObject(args, OPTIONS, "editMarkLabelSelection");
    if (!Object.hasOwn(args, "target")) {
      throw new Error("editMarkLabelSelection requires target.");
    }
    const layer = requireAttachedLabel(this, args.target);
    const selection = normalizeLabelSelectionEdit(args);
    validateSelectionSource(this, layer.source, selection);
    const next = this._withMarkConfig(layer.id, {
      ...this.markConfigs[layer.id],
      labelAuthoring: {
        ...this.markConfigs[layer.id]?.labelAuthoring,
        selection
      }
    });
    return rematerializeLabelsBeforeHighlights(
      next,
      layer.source,
      [layer.id]
    );
  }
);

export function registerTextLabelSelectionActions(ProgramClass) {
  ProgramClass.prototype.editMarkLabelSelection = editMarkLabelSelection;
}
