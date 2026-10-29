import { geoFeatureDataset } from "../../materialization/geo/appearance.js";
import { editScaleForEncoding } from "../scales/edit.js";
import { collectResourceReferences } from "../../core/resourceReferences.js";
import { removeScale } from "../resources/remove.js";
import { cartesianAxisOwners } from "../../selectors/axes.js";
import { isSourceOwnedText } from "../../grammar/text.js";
import { validateUserId } from "../../core/identifiers.js";
import { findDataset } from "../../selectors/datasets.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";
import { hasMaterializedLegend } from "../../materialization/legends.js";
import { applyDetachedScaleRematerialization, applyMaterializationPlan } from "../../materialization/dependencies.js";
import { planEncodingRematerialization } from "../../materialization/encodings.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { validateOptionObject } from "../../core/validation.js";
import { getMarkGraphicTypes, getPositionChannelDefinition } from "../../core/vocabulary.js";
import { DEFAULT_TICK_COUNT } from "../guides/tickValues.js";

export function validateOptions(args, supported, operation) {
  validateOptionObject(args, supported, operation);
}

export function setEncodingProperties(
  program,
  target,
  channel,
  properties
) {
  let next = program;
  for (const [property, value] of Object.entries(properties)) {
    next = next.editSemantic({
      property: `layer[${target}].encoding.${channel}.${property}`,
      value
    });
  }
  return next;
}

export { applyDetachedScaleRematerialization };

export function rematerializeEncoding(program, target, channel, scale, previousLayer) {
  const next = applyMaterializationPlan(
    program,
    planEncodingRematerialization(program, { target, channel, scale })
  );
  return previousLayer === undefined
    ? next
    : applyDetachedScaleRematerialization(next, [previousLayer]);
}

export function clearMarkGraphic(program, target) {
  const graphic = program.graphicSpec.objects[target];
  if (graphic === undefined) return program;
  const collection = graphic.type === "collection";
  return program.editGraphics({
    target,
    property: collection ? "items" : "length",
    value: collection ? [] : 0
  });
}


export function resolveReassignmentScaleOptions(encoding, options) {
  if (encoding?.scale === undefined || options?.id !== undefined) return options;
  return { ...options, id: encoding.scale };
}

// A fixed-to-field transition may reuse a detached named channel scale with
// changed options. Recreate it through the existing resource owner, preserving
// the resolved definition's omitted defaults and never touching live consumers.
export function releaseDetachedEncodingScale(program, id) {
  if (findSemanticScale(program, id) === undefined ||
      collectResourceReferences(program, { kind: "scale", id }).some(ref => ref.strength === "live")) return program;
  return removeScale.call(program, { id });
}

export function applyEncodingScale(
  program,
  definition,
  options = {},
  { reassignment = false, allowTypeChange = false } = {}
) {
  const existing = findSemanticScale(program, definition.id);
  if (existing === undefined) {
    return program.createScale(definition);
  }
  if (existing.type !== definition.type) {
    if (reassignment && allowTypeChange) return editScaleForEncoding(program, { ...definition });
    throw new Error(
      `Scale "${definition.id}" cannot change type from "${existing.type}" to "${definition.type}".`
    );
  }

  const patch = { id: definition.id };
  for (const property of [
    "domain", "range", "emptyDomain", "nice", "zero", "clamp", "reverse",
    "base", "exponent", "constant", "paddingInner", "paddingOuter",
    "padding", "align", "unknown", "interpolate", "whitePoint", "gamma", "radialMapping"
  ]) {
    if (Object.hasOwn(options, property)) patch[property] = definition[property];
  }
  if (Object.hasOwn(options, "palette")) patch.range = definition.range;

  return Object.keys(patch).length === 1 || !reassignment
    ? program.createScale(definition)
    : editScaleForEncoding(program, patch);
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

  const owners = ["x", "y"].includes(definition.guideChannel)
    ? cartesianAxisOwners(program).filter(owner => owner.channel === definition.guideChannel)
    : [{ id: definition.guideChannel, semantic: program.semanticSpec.guides.axis?.[definition.guideChannel] }];
  const direction = definition.gridDirection;
  const grid = program.semanticSpec.guides.grid?.[direction];
  const ownsGrid = grid?.scale === previousScale;
  const affected = owners.filter(owner => [previousScale, nextScale].includes(owner.semantic?.scale));
  if (!affected.length && !ownsGrid) return program;
  const remaining = program.semanticSpec.layers.some(layer => layer.id !== target &&
    !isSourceOwnedText(layer) && layer.encoding?.[channel]?.scale === previousScale);
  if ((affected.some(owner => owner.semantic?.scale === previousScale) || ownsGrid) && remaining) {
    throw new Error(`Cannot rebind ${channel} guides from shared scale "${previousScale}" while it has other consumers.`);
  }
  let next = program;
  for (const owner of affected) {
    const axisId = owner.id;
    const ownsAxis = owner.semantic?.scale === previousScale;
    const refreshesReboundAxis = owner.semantic?.scale === nextScale;
  if (ownsAxis || refreshesReboundAxis) {
    const previousAxisConfig = next.guideConfigs.axis?.[axisId];
    const previousTicks = previousAxisConfig?.ticks;
    const previousLabels = previousAxisConfig?.labels;
    const labelsFollowTicks = previousTicks !== undefined &&
      previousLabels !== undefined &&
      previousTicks.mode === previousLabels.mode &&
      (previousTicks.mode === "count"
        ? previousTicks.count === previousLabels.count
        : previousTicks.values?.length === previousLabels.values?.length &&
          previousTicks.values.every(
            (value, index) => Object.is(value, previousLabels.values[index])
          ));
    if (ownsAxis) {
      next = next.editSemantic({
        property: `guide.axis.${axisId}.scale`,
        value: nextScale
      });
      for (const component of ["line", "ticks", "labels", "title"]) {
        const config = next.guideConfigs.axis?.[axisId]?.[component];
        if (config?.scale === previousScale) {
          next = next._withGuideConfig(axisId, component, {
            ...config,
            scale: nextScale
          });
        }
      }
    }
    const resolved = next.resolvedScales[nextScale] ??
      findSemanticScale(next, nextScale);
    const discrete = ["ordinal", "band", "point"].includes(resolved?.type);
    let ticks = next.guideConfigs.axis?.[axisId]?.ticks;
    if (ticks !== undefined && discrete && ticks.mode !== "values") {
      ticks = {
        ...ticks,
        mode: "values",
        values: resolved.domain,
        inferredValues: true
      };
      delete ticks.count;
      next = next._withGuideConfig(axisId, "ticks", ticks);
    } else if (
      ticks !== undefined &&
      !discrete &&
      ticks.mode === "values" &&
      ticks.inferredValues === true
    ) {
      ticks = {
        ...ticks,
        mode: "count",
        count: DEFAULT_TICK_COUNT,
        inferredValues: true
      };
      delete ticks.values;
      next = next._withGuideConfig(axisId, "ticks", ticks);
    } else if (
      ticks !== undefined &&
      discrete &&
      ticks.inferredValues === true
    ) {
      ticks = { ...ticks, values: resolved.domain };
      next = next._withGuideConfig(axisId, "ticks", ticks);
    }
    if (previousLabels !== undefined && labelsFollowTicks && ticks !== undefined) {
      const labels = {
        ...next.guideConfigs.axis[axisId].labels,
        mode: ticks.mode,
        inferredValues: ticks.inferredValues === true,
        ...(ticks.mode === "values"
          ? { values: ticks.values }
          : { count: ticks.count })
      };
      if (ticks.mode === "values") delete labels.count;
      else delete labels.values;
      next = next._withGuideConfig(
        axisId,
        "labels",
        labels
      );
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
  if (program.materializationConfigs.canvas?.responsive !== undefined) {
    // Appearance can change occupied stroke/effect bounds even without a
    // legend. The explicit dependency executor owns the resulting layout pass.
    return applyMaterializationPlan(program, []);
  }
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

  const dataset = layer.mark.type === "geo" ? geoFeatureDataset(program, layer) : findDataset(program, layer.data);

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

export function inferSeriesGroup(program, layer, field, origin) {
  const group = layer.encoding?.group;
  if (group !== undefined && group.inferredFrom !== origin) {
    if (origin === "offset" && (group.fields !== undefined || group.field !== field)) {
      throw new Error("Offset field conflicts with the stored series group.");
    }
    return program;
  }
  return setEncodingProperties(program, layer.id, "group", { field, fieldType: "nominal", inferredFrom: origin });
}
