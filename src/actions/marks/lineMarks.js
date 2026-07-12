import { action } from "../../core/action.js";
import { deriveLineSeries } from "../../core/lineSeries.js";
import { mapLinearValues, mapOrdinalValues } from "../../core/scale.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  assertMarkAvailable,
  resolveMarkData,
  validateMarkOptions
} from "./shared.js";

const DEFAULT_LINE_STROKE = "#4c78a8";
const DEFAULT_LINE_WIDTH = 2;
const CREATE_OPTIONS = Object.freeze(["id", "data"]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);

const createLineMark = action(
  {
    op: "createLineMark",
    description: "Create a semantic line mark and empty path collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createLineMark");
    const id = validateUserId(args.id, "Line mark id");
    const { data } = resolveMarkData(this, args);
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
      });
  }
);

function requireLine(program, id) {
  const layer = program.semanticSpec.layers.find(item => item.id === id);

  if (layer?.mark?.type !== "line") {
    throw new Error(`Unknown line mark "${id}".`);
  }

  const dataset = program.semanticSpec.datasets.find(item => item.id === layer.data);

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
    const { dataset, layer } = requireLine(this, id);
    const existingChildren = this.graphicSpec.objects[id].children;
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
    const points = derived.series.map(series => {
      const x = mapLinearValues(
        series.values.map(value => value.x),
        xScale.domain,
        xScale.range
      );
      const y = mapLinearValues(
        series.values.map(value => value.y),
        yScale.domain,
        yScale.range
      );

      return series.values.map((_, index) => ({ x: x[index], y: y[index] }));
    });
    const colorEncoding = layer.encoding?.color;
    const dashEncoding = layer.encoding?.strokeDash;
    const strokes = colorEncoding?.scale === undefined
      ? points.map(
          (_, index) =>
            existingChildren[index]?.properties.stroke ?? DEFAULT_LINE_STROKE
        )
      : mapOrdinalValues(
          derived.series.map(series => series.key[colorEncoding.field]),
          resolved.resolvedScales[colorEncoding.scale].domain,
          resolved.resolvedScales[colorEncoding.scale].range
        );
    const strokeWidths = points.map(
      (_, index) =>
        existingChildren[index]?.properties.strokeWidth ?? DEFAULT_LINE_WIDTH
    );
    const strokeDashes = dashEncoding?.scale === undefined
      ? points.map(
          (_, index) => existingChildren[index]?.properties.strokeDash ?? []
        )
      : mapOrdinalValues(
          derived.series.map(series => series.key[dashEncoding.field]),
          resolved.resolvedScales[dashEncoding.scale].domain,
          resolved.resolvedScales[dashEncoding.scale].range
        );

    return resolved
      .editGraphics({ target: id, property: "length", value: points.length })
      .editGraphics({ target: id, property: "points", value: points })
      .editGraphics({ target: id, property: "stroke", value: strokes })
      .editGraphics({ target: id, property: "strokeWidth", value: strokeWidths })
      .editGraphics({
        target: id,
        property: "strokeDash",
        value: strokeDashes
      });
  }
);

export function registerLineMarkActions(ProgramClass) {
  ProgramClass.prototype.createLineMark = createLineMark;
  ProgramClass.prototype.rematerializeLineMark = rematerializeLineMark;
}
