import { validateUserId } from "../../core/identifiers.js";
import { findDataset } from "../../selectors/datasets.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";
import { hasMaterializedLegend } from "../../materialization/legends.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { validateKeys } from "../../core/validation.js";

export function validateOptions(args, supported, operation) {
  validateKeys(args, supported, operation);
}

export function validateLineSeriesCompatibility(layer, channel, field) {
  if (layer.mark?.type !== "line") return;
  for (const companion of ["group", "color", "strokeDash"]) {
    if (companion === channel) continue;
    const companionField = layer.encoding?.[companion]?.field;
    if (companionField !== undefined && companionField !== field) {
      throw new Error(
        `Line ${channel} field "${field}" must match ${companion} field "${companionField}".`
      );
    }
  }
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
  if (existing === undefined) {
    return program.createScale(definition);
  }
  if (existing.type !== definition.type) {
    throw new Error(
      `Scale "${definition.id}" cannot change type from "${existing.type}" to "${definition.type}".`
    );
  }

  const patch = { id: definition.id };
  for (const property of [
    "domain", "range", "nice", "zero", "clamp", "reverse",
    "base", "exponent", "constant", "paddingInner", "paddingOuter",
    "padding", "align"
  ]) {
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
  return hasMaterializedLegend(program)
    ? program.rematerializeLegend()
    : program;
}

export function resolveTarget(
  program,
  target,
  supportedTypes = ["point", "line"],
  label = "position mark"
) {
  const requested = target === undefined
    ? undefined
    : validateUserId(target, "Mark id");
  const layer = resolveEligibleLayer(program, {
    target: requested,
    predicate: candidate => supportedTypes.includes(candidate.mark?.type),
    label
  });
  const id = layer.id;

  const dataset = findDataset(program, layer.data);

  if (dataset === undefined) {
    throw new Error(`Mark "${id}" requires an existing dataset.`);
  }

  const expectedGraphic = {
    point: ["circle", "rect", "collection"],
    line: "path",
    bar: "rect",
    area: "path",
    rule: "line"
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
