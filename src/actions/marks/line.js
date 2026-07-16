import { action } from "../../core/action.js";
import { deriveLineSeries } from "../../grammar/lineSeries.js";
import { mapContinuousScaleValues, mapOrdinalValues } from "../../grammar/scales.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateNonNegativeFinite } from "../../core/validation.js";
import {
  assertMarkAvailable,
  resolveMarkId,
  resolveMarkData,
  validateMarkOptions
} from "./shared.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import {
  buildCurvePathCommands,
  validateCurveInterpolation
} from "../../grammar/curveCommands.js";
import { normalizeStrokeDashPattern } from "../../grammar/scales.js";
import { canMaterializeLine } from "../../materialization/marks.js";

const DEFAULT_LINE_STROKE = DEFAULT_COLORS.mark;
const DEFAULT_LINE_WIDTH = 2;
const CREATE_OPTIONS = Object.freeze(["id", "data", "strokeWidth", "curve"]);
const EDIT_OPTIONS = Object.freeze(["target", "strokeWidth", "curve"]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);

const createLineMark = action(
  {
    op: "createLineMark",
    description: "Create a semantic line mark and empty path collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createLineMark");
    const id = resolveMarkId(this, args.id, {
      defaultId: "line",
      label: "Line mark id",
      markType: "line",
      operation: "createLineMark"
    });
    const { data } = resolveMarkData(this, args);
    const strokeWidth = validateNonNegativeFinite(
      args.strokeWidth ?? DEFAULT_LINE_WIDTH,
      "Line strokeWidth"
    );
    const curve = validateCurveInterpolation(args.curve ?? "linear");
    assertMarkAvailable(this, id);

    return this
      .editSemantic({
        property: `layer[${id}].mark.type`,
        value: "line"
      })
      .editSemantic({
        property: `layer[${id}].data`,
        value: data
      })
      .createGraphics({
        id,
        type: "path",
        length: 0
      })
      ._withMarkConfig(
        id,
        {
          ...(Object.hasOwn(args, "strokeWidth") ? { strokeWidth } : {}),
          ...(Object.hasOwn(args, "curve") ? { curve } : {})
        }
      );
  }
);

function requireLine(program, id) {
  const layer = findLayer(program, id);

  if (layer?.mark?.type !== "line") {
    throw new Error(`Unknown line mark "${id}".`);
  }

  const dataset = findDataset(program, layer.data);

  if (dataset === undefined) {
    throw new Error(`Line mark "${id}" requires an existing dataset.`);
  }

  if (program.graphicSpec.objects[id]?.type !== "path") {
    throw new Error(`Line mark "${id}" requires path graphics.`);
  }

  return { dataset, layer };
}

const rematerializeLineMark = action(
  {
    op: "rematerializeLineMark",
    description: "Recompute aggregate series and concrete line paths."
  },
  function (args = {}) {
    validateMarkOptions(
      args,
      REMATERIALIZE_OPTIONS,
      "rematerializeLineMark"
    );
    const id = validateUserId(args.id, "Line mark id");
    const highlights = Object.entries(
      this.materializationConfigs.highlights ?? {}
    ).filter(([, config]) => config.target === id);
    if (highlights.length > 0) {
      let baseline = this;
      for (const [highlightId] of highlights) {
        baseline = baseline._withoutMaterializationConfig(["highlights", highlightId]);
      }
      return baseline
        .editGraphics({ target: id, property: "length", value: 0 })
        .rematerializeLineMark({ id })
        .rematerializeMarkHighlights({ target: id, highlights });
    }
    const { dataset, layer } = requireLine(this, id);
    const existingChildren = this.graphicSpec.objects[id].items;
    const xScaleId = layer.encoding?.x?.scale;
    const yScaleId = layer.encoding?.y?.scale;
    const derived = deriveLineSeries(dataset.values, layer);

    if (xScaleId === undefined || yScaleId === undefined) {
      throw new Error(`Line mark "${id}" requires x and y scales.`);
    }

    let resolved = this
      .rematerializeScale({ id: xScaleId })
      .rematerializeScale({ id: yScaleId });

    for (const channel of ["color", "strokeDash"]) {
      const scaleId = layer.encoding?.[channel]?.scale;
      if (scaleId !== undefined) {
        resolved = resolved.rematerializeScale({ id: scaleId });
      }
    }

    const xScale = resolved.resolvedScales[xScaleId];
    const yScale = resolved.resolvedScales[yScaleId];
    const commands = derived.series.map(series => {
      const x = mapContinuousScaleValues(
        series.values.map(value => value.x),
        xScale
      );
      const y = mapContinuousScaleValues(
        series.values.map(value => value.y),
        yScale
      );

      return buildCurvePathCommands(
        series.values.map((_, index) => ({ x: x[index], y: y[index] })),
        this.markConfigs[id]?.curve ?? "linear"
      );
    });
    const colorEncoding = layer.encoding?.color;
    const dashEncoding = layer.encoding?.strokeDash;
    const strokes = colorEncoding?.scale === undefined
      ? commands.map(
          (_, index) =>
            existingChildren[index]?.properties.stroke ?? DEFAULT_LINE_STROKE
        )
      : mapOrdinalValues(
          derived.series.map(series => series.key[colorEncoding.field]),
          resolved.resolvedScales[colorEncoding.scale].domain,
          resolved.resolvedScales[colorEncoding.scale].range
        );
    const strokeWidths = commands.map(
      (_, index) =>
        this.markConfigs[id]?.strokeWidth ??
        existingChildren[index]?.properties.strokeWidth ??
        DEFAULT_LINE_WIDTH
    );
    const strokeDashes = dashEncoding?.datum !== undefined
      ? commands.map(() => normalizeStrokeDashPattern(dashEncoding.datum))
      : dashEncoding?.scale === undefined
      ? commands.map(
          (_, index) => existingChildren[index]?.properties.strokeDash ?? []
        )
      : mapOrdinalValues(
          derived.series.map(series => series.key[dashEncoding.field]),
          resolved.resolvedScales[dashEncoding.scale].domain,
          resolved.resolvedScales[dashEncoding.scale].range
        );

    return resolved
      .editGraphics({ target: id, property: "length", value: commands.length })
      .editGraphics({ target: id, property: "commands", value: commands })
      .editGraphics({ target: id, property: "stroke", value: strokes })
      .editGraphics({ target: id, property: "strokeWidth", value: strokeWidths })
      .editGraphics({
        target: id,
        property: "strokeDash",
        value: strokeDashes
      });
  }
);

const editLineMark = action(
  {
    op: "editLineMark",
    description: "Edit line-mark curve and stroke width."
  },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editLineMark");
    if (
      !Object.hasOwn(args, "strokeWidth") &&
      !Object.hasOwn(args, "curve")
    ) {
      throw new Error("editLineMark requires strokeWidth or curve.");
    }
    const target = Object.hasOwn(args, "target")
      ? validateUserId(args.target, "Line mark id")
      : undefined;
    const layer = resolveEligibleLayer(this, {
      target,
      predicate: candidate => candidate.mark?.type === "line",
      label: "line mark"
    });
    const config = {
      ...this.markConfigs[layer.id],
      ...(Object.hasOwn(args, "strokeWidth")
        ? {
            strokeWidth: validateNonNegativeFinite(
              args.strokeWidth,
              "Line strokeWidth"
            )
          }
        : {}),
      ...(Object.hasOwn(args, "curve")
        ? { curve: validateCurveInterpolation(args.curve) }
        : {})
    };
    const next = this._withMarkConfig(layer.id, config);
    return canMaterializeLine(next, layer)
      ? next.rematerializeLineMark({ id: layer.id })
      : next;
  }
);

export function registerLineMarkActions(ProgramClass) {
  ProgramClass.prototype.createLineMark = createLineMark;
  ProgramClass.prototype.editLineMark = editLineMark;
  ProgramClass.prototype.rematerializeLineMark = rematerializeLineMark;
}
