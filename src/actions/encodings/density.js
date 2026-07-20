import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  findDataset,
  findLayer,
  findSemanticScale,
  hasDataset,
  resolveEligibleLayer
} from "../../selectors/index.js";
import { applyMaterializationPlan } from
  "../../materialization/dependencies.js";
import { planDensityRematerialization } from
  "../../materialization/density.js";
import { planDerivedDataRevision } from
  "../../materialization/dataProvenance.js";
import { validateOptions } from "./shared.js";
import { normalizeDensityPlacement } from "../../grammar/density.js";

const OPTIONS = Object.freeze([
  "field", "target", "source", "groupBy", "bandwidth", "extent", "steps",
  "kernel", "normalization", "as", "densityChannel", "coordinate",
  "valueScale", "densityScale", "placement"
]);
const EDIT_OPTIONS = Object.freeze([
  "target", "bandwidth", "extent", "steps", "kernel", "normalization",
  "placement"
]);
const EDITABLE = Object.freeze(EDIT_OPTIONS.filter(option => option !== "target"));

function findArea(program, requested) {
  const areas = program.semanticSpec.layers.filter(layer => layer.mark?.type === "area");
  if (requested !== undefined) {
    const id = validateUserId(requested, "Density target id");
    const selected = findLayer(program, id);
    if (selected === undefined || !areas.includes(selected)) {
      throw new Error(`Unknown density area target "${id}".`);
    }
    return selected;
  }
  const current = findLayer(program, program.context.currentMark);
  if (current !== undefined && areas.includes(current)) return current;
  if (areas.length === 1) return areas[0];
  if (areas.length === 0) {
    throw new Error("encodeDensity requires an eligible area mark.");
  }
  throw new Error("encodeDensity target is ambiguous; provide target.");
}

function requireField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function scaleOptions(value, defaults, label) {
  if (value !== undefined && !isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  return { ...defaults, ...(value ?? {}) };
}

function categoryScaleOptions(value, fallbackId) {
  const scale = scaleOptions(value, { type: "band" }, "Density placement scale");
  if ((scale.type ?? "band") !== "band") {
    throw new Error('Density category placement requires scale type "band".');
  }
  return {
    ...(fallbackId === undefined ? {} : { id: fallbackId }),
    ...scale,
    type: "band"
  };
}

const SCALE_EDIT_PROPERTIES = Object.freeze([
  "type", "domain", "range", "nice", "zero", "clamp", "reverse",
  "base", "exponent", "constant", "paddingInner", "paddingOuter",
  "padding", "align", "interpolate", "unknown"
]);

function scaleEdit(id, definition) {
  return {
    id,
    ...Object.fromEntries(SCALE_EDIT_PROPERTIES
      .filter(property => Object.hasOwn(definition, property))
      .map(property => [property, definition[property]]))
  };
}

function valueScaleForTransition(program, layer, transform) {
  const densityChannel = transform.placement?.channel ?? (
    layer.encoding.x.field === transform.as[1] ? "x" : "y"
  );
  const valueChannel = densityChannel === "x" ? "y" : "x";
  return findSemanticScale(program, layer.encoding[valueChannel].scale);
}

function transitionScaleDefinitions(program, layer, transform, placement, rawPlacement) {
  const valueScale = valueScaleForTransition(program, layer, transform);
  if (valueScale === undefined) {
    throw new Error(`Density area "${layer.id}" requires its value scale.`);
  }
  const { id: _valueId, range: _valueRange, ...valueDefinition } = valueScale;
  void _valueId;
  void _valueRange;
  const valueChannel = placement?.channel === "x" ? "y" : "x";
  const companionChannel = valueChannel === "x" ? "y" : "x";
  const companionDefinition = placement === undefined
    ? { type: "linear", domain: "auto", range: "auto", nice: true, zero: true }
    : categoryScaleOptions(rawPlacement.scale);
  return {
    [valueChannel]: {
      ...valueDefinition,
      range: "auto"
    },
    [companionChannel]: companionDefinition
  };
}

function densityPositionDefinition({
  layer,
  output,
  groupBy,
  placement,
  coordinate,
  valueScale,
  densityScale,
  placementScale
}) {
  if (placement === undefined) {
    const xIsDensity = layer.densityChannel === "x";
    return {
      x: {
        field: output[xIsDensity ? 1 : 0],
        fieldType: "quantitative",
        scale: xIsDensity ? densityScale : valueScale,
        coordinate
      },
      y: {
        field: output[xIsDensity ? 0 : 1],
        fieldType: "quantitative",
        scale: xIsDensity ? valueScale : densityScale,
        coordinate
      }
    };
  }
  const category = {
    field: placement.categoryField,
    fieldType: "nominal",
    scale: placementScale,
    coordinate
  };
  const value = {
    field: output[0],
    fieldType: "quantitative",
    scale: valueScale,
    coordinate
  };
  return placement.channel === "x"
    ? { x: category, y: value }
    : { x: value, y: category };
}

function applyDensityPosition(program, layerId, definition, groupBy) {
  const withCoordinate = value => ({
    target: layerId,
    field: value.field,
    fieldType: value.fieldType,
    scale: value.scale,
    ...(value.coordinate === undefined ? {} : { coordinate: value.coordinate })
  });
  let next = program
    .encodeX(withCoordinate(definition.x))
    .encodeY(withCoordinate(definition.y));
  if (groupBy !== undefined) {
    next = next.encodeGroup({ target: layerId, field: groupBy });
  }
  return next;
}

const encodeDensity = action(
  {
    op: "encodeDensity",
    description: "Derive and encode a baseline or categorical kernel-density area."
  },
  function (args = {}) {
    validateOptions(args, OPTIONS, "encodeDensity");
    const layer = findArea(this, args.target);
    const field = requireField(args.field, "Density field");
    const groupBy = args.groupBy === undefined
      ? undefined
      : requireField(args.groupBy, "Density groupBy");
    const source = validateUserId(
      args.source ?? layer.data,
      "Density source dataset id"
    );
    if (!hasDataset(this, source)) {
      throw new Error(`Unknown density source dataset "${source}".`);
    }
    if (["x", "y", "y2", "group"].some(channel =>
      layer.encoding?.[channel] !== undefined
    )) {
      throw new Error(
        `Density area target "${layer.id}" already has positional or group encodings.`
      );
    }
    const categoryPlacement = args.placement?.type === "category";
    const densityChannel = args.densityChannel ?? (categoryPlacement ? "x" : "y");
    if (!["x", "y"].includes(densityChannel)) {
      throw new Error(`Unsupported densityChannel "${densityChannel}".`);
    }
    const output = args.as ?? [`${field}_value`, `${field}_density`];
    if (!Array.isArray(output) || output.length !== 2) {
      throw new TypeError("Density as must contain value and density field names.");
    }
    const derivedId = `${layer.id}DensityData`;
    if (hasDataset(this, derivedId)) {
      throw new Error(`Dataset "${derivedId}" already exists.`);
    }
    const valueScale = scaleOptions(
      args.valueScale,
      { nice: false, zero: false },
      "Density valueScale"
    );
    const placement = args.placement === undefined
      ? undefined
      : normalizeDensityPlacement(args.placement, {
          densityChannel,
          groupBy,
          categoryField: groupBy ?? `${layer.id}DensityCategory`
        });
    if (placement !== undefined && args.densityScale !== undefined) {
      throw new Error(
        "Density category placement cannot be combined with densityScale."
      );
    }
    const densityScale = placement === undefined
      ? scaleOptions(
          args.densityScale,
          { nice: true, zero: true },
          "Density densityScale"
        )
      : undefined;
    const placementScale = placement === undefined
      ? undefined
      : categoryScaleOptions(args.placement.scale);

    const dataArgs = {
      id: derivedId,
      source,
      field,
      ...(groupBy === undefined ? {} : { groupBy }),
      ...(args.bandwidth === undefined ? {} : { bandwidth: args.bandwidth }),
      ...(args.extent === undefined ? {} : { extent: args.extent }),
      ...(args.steps === undefined ? {} : { steps: args.steps }),
      ...(args.kernel === undefined ? {} : { kernel: args.kernel }),
      ...(args.normalization === undefined
        ? {}
        : { normalization: args.normalization }),
      ...(args.as === undefined ? {} : { as: args.as }),
      ...(placement === undefined ? {} : { placement })
    };
    let next = placement === undefined
      ? this.createDensityData(dataArgs)
      : this.createCategoricalDensityData(dataArgs);
    next = next
      .editSemantic({
        property: `layer[${layer.id}].data`,
        value: derivedId
      });
    next = applyDensityPosition(next, layer.id, densityPositionDefinition({
      layer: { densityChannel },
      output,
      groupBy,
      placement,
      coordinate: args.coordinate,
      valueScale,
      densityScale,
      placementScale
    }), groupBy);
    return next.rematerializeAreaMark({ id: layer.id });
  }
);

function findDensityArea(program, requested) {
  const target = requested === undefined
    ? undefined
    : validateUserId(requested, "Density target id");
  return resolveEligibleLayer(program, {
    target,
    label: "density area",
    predicate(layer) {
      const dataset = findDataset(program, layer.data);
      return layer.mark?.type === "area" &&
        dataset?.transform?.length === 1 &&
        dataset.transform[0].type === "density";
    }
  });
}

const editDensity = action(
  {
    op: "editDensity",
    description: "Revise one density transform and rematerialize its consumers."
  },
  function (args = {}) {
    validateOptions(args, EDIT_OPTIONS, "editDensity");
    if (!EDITABLE.some(option => Object.hasOwn(args, option))) {
      throw new Error("editDensity requires at least one density option.");
    }
    const layer = findDensityArea(this, args.target);
    const previous = findDataset(this, layer.data);
    const transform = previous.transform[0];
    const requestedPlacement = Object.hasOwn(args, "placement")
      ? normalizeDensityPlacement(args.placement, {
          densityChannel: transform.placement?.channel ?? "x",
          groupBy: transform.groupBy,
          categoryField: transform.groupBy ??
            transform.placement?.categoryField ??
            `${layer.id}DensityCategory`
        })
      : transform.placement;
    const colorField = layer.encoding?.color?.field;
    const availableColorFields = [
      transform.groupBy,
      requestedPlacement?.split?.field
    ].filter(Boolean);
    if (colorField !== undefined && !availableColorFields.includes(colorField)) {
      throw new Error(
        `editDensity placement would remove color field "${colorField}" from the density series.`
      );
    }
    const revision = planDerivedDataRevision(this, {
      owner: layer.id,
      role: "DensityData",
      previous: previous.id,
      consumers: [layer.id]
    });
    const option = property => Object.hasOwn(args, property)
      ? args[property]
      : transform[property];

    const dataArgs = {
      id: revision.id,
      source: previous.source,
      field: transform.field,
      ...(transform.groupBy === undefined
        ? {}
        : { groupBy: transform.groupBy }),
      bandwidth: option("bandwidth"),
      extent: option("extent"),
      steps: option("steps"),
      kernel: option("kernel") ?? "gaussian",
      normalization: option("normalization") ?? "unit",
      as: transform.as,
      ...(requestedPlacement === undefined
        ? {}
        : { placement: requestedPlacement })
    };
    let next = requestedPlacement === undefined
      ? this.createDensityData(dataArgs)
      : this.createCategoricalDensityData(dataArgs);
    next = next.rebindLayerData(revision.rebinds[0])
      .releaseDerivedData(revision.release);

    const changesPlacementMode = Object.hasOwn(args, "placement") &&
      (transform.placement === undefined) !== (requestedPlacement === undefined);
    if (changesPlacementMode) {
      const xScaleId = layer.encoding?.x?.scale;
      const yScaleId = layer.encoding?.y?.scale;
      const scaleDefinitions = transitionScaleDefinitions(
        this,
        layer,
        transform,
        requestedPlacement,
        args.placement
      );
      next = next
        .editSemantic({ property: `layer[${layer.id}].encoding.x`, remove: true })
        .editSemantic({ property: `layer[${layer.id}].encoding.y`, remove: true });
      next = next
        .editScale(scaleEdit(xScaleId, scaleDefinitions.x))
        .editScale(scaleEdit(yScaleId, scaleDefinitions.y));
      const densityChannel = requestedPlacement?.channel ?? (
        layer.encoding.x.field === transform.as[1] ? "x" : "y"
      );
      const definition = densityPositionDefinition({
        layer: { densityChannel },
        output: transform.as,
        groupBy: transform.groupBy,
        placement: requestedPlacement,
        coordinate: layer.coordinate,
        valueScale: {
          id: requestedPlacement?.channel === "x" ? yScaleId : xScaleId,
          ...scaleDefinitions[requestedPlacement?.channel === "x" ? "y" : "x"]
        },
        densityScale: requestedPlacement === undefined
          ? {
              id: densityChannel === "x" ? xScaleId : yScaleId,
              ...scaleDefinitions[densityChannel]
            }
          : undefined,
        placementScale: requestedPlacement === undefined
          ? undefined
          : {
              id: requestedPlacement.channel === "x" ? xScaleId : yScaleId,
              ...scaleDefinitions[requestedPlacement.channel]
            }
      });
      next = applyDensityPosition(next, layer.id, definition);
    } else if (
      requestedPlacement !== undefined &&
      Object.hasOwn(args.placement ?? {}, "scale")
    ) {
      const channel = requestedPlacement.channel;
      const scaleId = layer.encoding[channel].scale;
      const requestedScale = categoryScaleOptions(args.placement.scale, scaleId);
      if (requestedScale.id !== scaleId) {
        throw new Error("editDensity placement scale cannot change its id.");
      }
      next = next.editScale(scaleEdit(scaleId, requestedScale));
    }

    next = applyMaterializationPlan(
      next,
      planDensityRematerialization(next, layer.id)
    );
    return next;
  }
);

export function registerDensityEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeDensity = encodeDensity;
  ProgramClass.prototype.editDensity = editDensity;
}
