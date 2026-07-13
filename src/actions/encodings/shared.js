import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";

export function validateOptions(args, supported, operation) {
  validateKeys(args, supported, operation);
}

export function rematerializeExistingLegend(program) {
  if (
    (program.semanticSpec.guides.legend?.series === undefined ||
      program.guideConfigs.legend?.series === undefined) &&
    (program.semanticSpec.guides.legend?.color === undefined ||
      program.guideConfigs.legend?.color === undefined)
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
  const layer = program.semanticSpec.layers.find(item => item.id === id);

  if (layer === undefined || !supportedTypes.includes(layer.mark?.type)) {
    throw new Error(`Unknown ${label} "${id}".`);
  }

  const dataset = program.semanticSpec.datasets.find(item => item.id === layer.data);

  if (dataset === undefined) {
    throw new Error(`Mark "${id}" requires an existing dataset.`);
  }

  const expectedGraphic = {
    point: "circle",
    line: "path",
    bar: "rect"
  }[layer.mark.type];

  if (program.graphicSpec.objects[id]?.type !== expectedGraphic) {
    throw new Error(`Mark "${id}" requires ${expectedGraphic} graphics.`);
  }

  return { id, dataset, layer };
}
