import { validateUserId } from "../../core/identifiers.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { validateKeys } from "../../core/validation.js";

export function validateOptions(args, supported, operation) {
  validateKeys(args, supported, operation);
}

export function rematerializeExistingLegend(program) {
  if (
    (program.semanticSpec.guides.legend?.series === undefined ||
      program.guideConfigs.legend?.series === undefined) &&
    (program.semanticSpec.guides.legend?.color === undefined ||
      program.guideConfigs.legend?.color === undefined) &&
    program.guideConfigs.legend?.point === undefined &&
    program.guideConfigs.legend?.size === undefined
  ) {
    return program;
  }

  return program.rematerializeLegend();
}

export function resolveTarget(
  program,
  target,
  supportedTypes = ["point", "line"],
  label = "position mark"
) {
  const id = validateUserId(target ?? program.context.currentMark, "Mark id");
  const layer = findLayer(program, id);

  if (layer === undefined || !supportedTypes.includes(layer.mark?.type)) {
    throw new Error(`Unknown ${label} "${id}".`);
  }

  const dataset = findDataset(program, layer.data);

  if (dataset === undefined) {
    throw new Error(`Mark "${id}" requires an existing dataset.`);
  }

  const expectedGraphic = {
    point: ["circle", "rect", "collection"],
    line: "path",
    bar: "rect",
    area: "path"
  }[layer.mark.type];

  const graphicType = program.graphicSpec.objects[id]?.type;
  const matches = Array.isArray(expectedGraphic)
    ? expectedGraphic.includes(graphicType)
    : graphicType === expectedGraphic;
  if (!matches) {
    const label = Array.isArray(expectedGraphic)
      ? expectedGraphic.join(" or ")
      : expectedGraphic;
    throw new Error(`Mark "${id}" requires ${label} graphics.`);
  }

  return { id, dataset, layer };
}
