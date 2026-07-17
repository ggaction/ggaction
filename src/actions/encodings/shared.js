import { validateUserId } from "../../core/identifiers.js";
import { findDataset } from "../../selectors/datasets.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";
import { hasMaterializedLegend } from "../../materialization/legends.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { validateOptionObject } from "../../core/validation.js";
import {
  getMarkGraphicTypes,
  getPositionChannelDefinition
} from "../../core/vocabulary.js";

export function validateOptions(args, supported, operation) {
  validateOptionObject(args, supported, operation);
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
    "padding", "align", "unknown", "interpolate"
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
  const definition = getPositionChannelDefinition(channel);
  if (definition?.guideChannel === undefined) return program;
  if (previousScale === undefined || previousScale === nextScale) return program;

  const axis = program.semanticSpec.guides.axis?.[definition.guideChannel];
  const direction = definition.gridDirection;
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
      property: `guide.axis.${definition.guideChannel}.scale`,
      value: nextScale
    });
    for (const component of ["line", "ticks", "labels", "title"]) {
      const config = next.guideConfigs.axis?.[definition.guideChannel]?.[component];
      if (config?.scale === previousScale) {
        next = next._withGuideConfig(definition.guideChannel, component, {
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

  const expectedGraphic = getMarkGraphicTypes(layer.mark.type);

  const graphicType = program.graphicSpec.objects[id]?.type;
  const matches = expectedGraphic?.includes(graphicType) === true;
  if (!matches) {
    const label = expectedGraphic?.join(" or ") ?? "supported";
    throw new Error(`Mark "${id}" requires ${label} graphics.`);
  }

  return { id, dataset, layer };
}
