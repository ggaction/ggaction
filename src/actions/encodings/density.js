import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  findDataset,
  findLayer,
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
import { scaleEditPatch } from "../scales/patch.js";
import { removeLegendKinds } from "../guides/legends/remove.js";
import {
  requireDensityField,
  resolveDensityCategoryScaleOptions,
  resolveDensityPositionDefinition,
  resolveDensityScaleOptions,
  resolveDensityTransitionScaleDefinitions
} from "./density/resolve.js";

const OPTIONS = Object.freeze([
  "field", "target", "source", "groupBy", "bandwidth", "extent", "steps",
  "kernel", "normalization", "as", "densityChannel", "coordinate",
  "valueScale", "densityScale", "placement"
]);
const EDIT_OPTIONS = Object.freeze([
  "target", "source", "field", "groupBy", "bandwidth", "extent", "steps",
  "kernel", "normalization", "placement"
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
    const field = requireDensityField(args.field, "Density field");
    const groupBy = args.groupBy === undefined
      ? undefined
      : requireDensityField(args.groupBy, "Density groupBy");
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
    const valueScale = resolveDensityScaleOptions(
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
      ? resolveDensityScaleOptions(
          args.densityScale,
          { nice: true, zero: true },
          "Density densityScale"
        )
      : undefined;
    const placementScale = placement === undefined
      ? undefined
      : resolveDensityCategoryScaleOptions(args.placement.scale);

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
    next = applyDensityPosition(next, layer.id, resolveDensityPositionDefinition({
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

function densityCategoryField(layer, transform, groupBy) {
  if (transform.placement === undefined) return undefined;
  if (transform.placement.categoryField !== transform.groupBy) {
    return transform.placement.categoryField;
  }
  return groupBy ?? `${layer.id}DensityCategory`;
}

function assertGroupingSelectionCompatibility(program, layer, changesGroup) {
  if (!changesGroup) return;
  const referenced = Object.entries(
    program.materializationConfigs.selections ?? {}
  ).find(([, selection]) =>
    selection.target === layer.id &&
    ["group", "color"].includes(selection.selector?.channel)
  );
  if (referenced !== undefined) {
    throw new Error(
      `editDensity cannot change groupBy while selection "${referenced[0]}" ` +
      `references ${referenced[1].selector.channel}.`
    );
  }
}

function removeOwnedColorLegends(program, target) {
  const kinds = Object.entries(program.guideConfigs.legend ?? {})
    .filter(([kind, config]) =>
      config?.target === target &&
      (
        config.channels?.includes("color") ||
        ["gradient", "interval"].includes(kind)
      )
    )
    .map(([kind]) => kind);
  return kinds.length === 0 ? program : removeLegendKinds(program, kinds);
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
    const source = Object.hasOwn(args, "source")
      ? validateUserId(args.source, "Density source dataset id")
      : previous.source;
    const field = Object.hasOwn(args, "field")
      ? requireDensityField(args.field, "Density field")
      : transform.field;
    const groupBy = Object.hasOwn(args, "groupBy")
      ? args.groupBy === false
        ? undefined
        : requireDensityField(args.groupBy, "Density groupBy")
      : transform.groupBy;
    const changesGroup = groupBy !== transform.groupBy;
    assertGroupingSelectionCompatibility(this, layer, changesGroup);
    const categoryField = densityCategoryField(layer, transform, groupBy);
    const requestedPlacement = Object.hasOwn(args, "placement")
      ? normalizeDensityPlacement(args.placement, {
          densityChannel: transform.placement?.channel ?? "x",
          groupBy,
          categoryField: categoryField ?? groupBy ??
            `${layer.id}DensityCategory`
        })
      : transform.placement === undefined || !changesGroup
        ? transform.placement
        : normalizeDensityPlacement({
            type: "category",
            ...(transform.placement.side === undefined
              ? {}
              : { side: transform.placement.side }),
            width: transform.placement.width,
            ...(transform.placement.split === undefined
              ? {}
              : { split: transform.placement.split })
          }, {
            densityChannel: transform.placement.channel,
            groupBy,
            categoryField
          });
    const colorField = layer.encoding?.color?.field;
    const colorFollowsGroup = transform.groupBy !== undefined &&
      colorField === transform.groupBy;
    const availableColorFields = [
      groupBy,
      requestedPlacement?.split?.field
    ].filter(Boolean);
    if (
      colorField !== undefined &&
      !colorFollowsGroup &&
      !availableColorFields.includes(colorField)
    ) {
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
      source,
      field,
      ...(groupBy === undefined
        ? {}
        : { groupBy }),
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
    const changesPlacementMode = Object.hasOwn(args, "placement") &&
      (transform.placement === undefined) !== (requestedPlacement === undefined);
    const applyEdit = program => {
      let next = requestedPlacement === undefined
        ? program.createDensityData(dataArgs)
        : program.createCategoricalDensityData(dataArgs);
      next = next.rebindLayerData(revision.rebinds[0])
        .releaseDerivedData(revision.release);

      if (changesGroup) {
        if (groupBy === undefined) {
          if (next.semanticSpec.layers.find(
            candidate => candidate.id === layer.id
          ).encoding?.group !== undefined) {
            next = next.editSemantic({
              property: `layer[${layer.id}].encoding.group`,
              remove: true
            });
          }
          if (colorFollowsGroup) {
            next = next.editSemantic({
              property: `layer[${layer.id}].encoding.color`,
              remove: true
            });
            next = removeOwnedColorLegends(next, layer.id);
          }
        } else {
          next = next
            .editSemantic({
              property: `layer[${layer.id}].encoding.group.field`,
              value: groupBy
            })
            .editSemantic({
              property: `layer[${layer.id}].encoding.group.fieldType`,
              value: "nominal"
            });
          if (colorFollowsGroup) {
            next = next.editSemantic({
              property: `layer[${layer.id}].encoding.color.field`,
              value: groupBy
            });
          }
        }
        if (
          requestedPlacement !== undefined &&
          transform.placement?.categoryField !== requestedPlacement.categoryField
        ) {
          next = next.editSemantic({
            property: `layer[${layer.id}].encoding.${requestedPlacement.channel}.field`,
            value: requestedPlacement.categoryField
          });
        }
      }

      if (changesPlacementMode) {
        const xScaleId = layer.encoding?.x?.scale;
        const yScaleId = layer.encoding?.y?.scale;
        const scaleDefinitions = resolveDensityTransitionScaleDefinitions(
          program,
          layer,
          transform,
          requestedPlacement,
          args.placement
        );
        next = next
          .editSemantic({
            property: `layer[${layer.id}].encoding.x`,
            remove: true
          })
          .editSemantic({
            property: `layer[${layer.id}].encoding.y`,
            remove: true
          });
        next = next
          .editScale(scaleEditPatch(xScaleId, scaleDefinitions.x))
          .editScale(scaleEditPatch(yScaleId, scaleDefinitions.y));
        const densityChannel = requestedPlacement?.channel ?? (
          layer.encoding.x.field === transform.as[1] ? "x" : "y"
        );
        const valueChannel = requestedPlacement?.channel === "x" ? "y" : "x";
        const definition = resolveDensityPositionDefinition({
          layer: { densityChannel },
          output: transform.as,
          groupBy,
          placement: requestedPlacement,
          coordinate: layer.coordinate,
          valueScale: {
            id: valueChannel === "y" ? yScaleId : xScaleId,
            ...scaleDefinitions[valueChannel]
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
        next = applyDensityPosition(next, layer.id, definition, groupBy);
      } else if (
        requestedPlacement !== undefined &&
        Object.hasOwn(args.placement ?? {}, "scale")
      ) {
        const channel = requestedPlacement.channel;
        const scaleId = layer.encoding[channel].scale;
        const requestedScale = resolveDensityCategoryScaleOptions(
          args.placement.scale,
          scaleId
        );
        if (requestedScale.id !== scaleId) {
          throw new Error("editDensity placement scale cannot change its id.");
        }
        next = next.editScale(scaleEditPatch(scaleId, requestedScale));
      }

      next = applyMaterializationPlan(
        next,
        planDensityRematerialization(next, layer.id)
      );
      if (
        changesGroup &&
        colorFollowsGroup &&
        groupBy !== undefined &&
        Object.values(next.guideConfigs.legend ?? {})
          .some(config => config?.target === layer.id)
      ) {
        next = next.rematerializeLegend();
      }
      return next;
    };
    applyEdit(this);
    return applyEdit(this);
  }
);

export function registerDensityEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeDensity = encodeDensity;
  ProgramClass.prototype.editDensity = editDensity;
}
