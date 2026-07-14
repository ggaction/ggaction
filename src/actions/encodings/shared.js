import { validateUserId } from "../../core/identifiers.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { validateKeys } from "../../core/validation.js";

export function validateOptions(args, supported, operation) {
  validateKeys(args, supported, operation);
}

export function resolveReassignmentScaleOptions(encoding, options) {
  if (encoding?.scale === undefined || options?.id !== undefined) return options;
  return { ...options, id: encoding.scale };
}

export function applyEncodingScale(
  program,
  definition,
  options = {},
  { reassignment = false } = {}
) {
  const existing = findSemanticScale(program, definition.id);
  if (existing === undefined) return program.createScale(definition);
  if (existing.type !== definition.type) {
    throw new Error(
      `Scale "${definition.id}" cannot change type from "${existing.type}" to "${definition.type}".`
    );
  }

  const patch = { id: definition.id };
  for (const property of ["domain", "range", "nice", "zero"]) {
    if (Object.hasOwn(options, property)) patch[property] = definition[property];
  }
  if (Object.hasOwn(options, "palette")) patch.range = definition.range;

  return Object.keys(patch).length === 1 || !reassignment
    ? program.createScale(definition)
    : program.editScale(patch);
}

export function rebindPositionGuides(
  program,
  channel,
  previousScale,
  nextScale,
  target
) {
  if (previousScale === undefined || previousScale === nextScale) return program;

  const axis = program.semanticSpec.guides.axis?.[channel];
  const direction = channel === "x" ? "vertical" : "horizontal";
  const grid = program.semanticSpec.guides.grid?.[direction];
  const ownsAxis = axis?.scale === previousScale;
  const ownsGrid = grid?.scale === previousScale;
  if (!ownsAxis && !ownsGrid) return program;

  const remaining = program.semanticSpec.layers.some(layer =>
    layer.id !== target && layer.encoding?.[channel]?.scale === previousScale
  );
  if (remaining) {
    throw new Error(
      `Cannot rebind ${channel} guides from shared scale "${previousScale}" while it has other consumers.`
    );
  }

  let next = program;
  if (ownsAxis) {
    next = next.editSemantic({
      property: `guide.axis.${channel}.scale`,
      value: nextScale
    });
    for (const component of ["ticks", "labels", "title"]) {
      const config = next.guideConfigs.axis?.[channel]?.[component];
      if (config?.scale === previousScale) {
        next = next._withGuideConfig(channel, component, {
          ...config,
          scale: nextScale
        });
      }
    }
  }
  if (ownsGrid) {
    next = next
      .editSemantic({
        property: `guide.grid.${direction}.scale`,
        value: nextScale
      })
      ._withGridConfig(direction, {
        ...next.guideConfigs.grid[direction],
        scale: nextScale
      });
  }
  return next;
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
