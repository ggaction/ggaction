import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  deriveAreaSeries,
  deriveDensityAreaSeries
} from "../../grammar/areaSeries.js";
import { mapLinearValues } from "../../grammar/scales.js";
import {
  assertMarkAvailable,
  resolveMarkData,
  validateMarkOptions
} from "./shared.js";

const CREATE_OPTIONS = Object.freeze(["id", "data", "fill", "opacity"]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);

const createAreaMark = action(
  {
    op: "createAreaMark",
    description: "Create a semantic area mark and empty path collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createAreaMark");
    const id = validateUserId(args.id, "Area mark id");
    const { data } = resolveMarkData(this, args);
    const fill = args.fill ?? "#4c78a8";
    const opacity = args.opacity ?? 0.2;
    if (typeof fill !== "string" || fill.length === 0) {
      throw new TypeError("Area fill must be a non-empty string.");
    }
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
      throw new RangeError("Area opacity must be from 0 to 1.");
    }
    assertMarkAvailable(this, id);
    return this
      .editSemantic({ property: `layer[${id}].mark.type`, value: "area" })
      .editSemantic({ property: `layer[${id}].data`, value: data })
      .createGraphics({ id, type: "path", length: 0 })
      ._withMarkConfig(id, { fill, opacity });
  }
);

const rematerializeAreaMark = action(
  {
    op: "rematerializeAreaMark",
    description: "Recompute grouped closed area paths."
  },
  function (args = {}) {
    validateMarkOptions(args, REMATERIALIZE_OPTIONS, "rematerializeAreaMark");
    const id = validateUserId(args.id, "Area mark id");
    const layer = this.semanticSpec.layers.find(item => item.id === id);
    const dataset = this.semanticSpec.datasets.find(item => item.id === layer?.data);
    if (layer?.mark?.type !== "area" || this.graphicSpec.objects[id]?.type !== "path") {
      throw new Error(`Unknown area mark "${id}".`);
    }
    if (dataset === undefined) {
      throw new Error(`Area mark "${id}" requires an existing dataset.`);
    }
    const densityTransform = dataset.transform?.length === 1 &&
      dataset.transform[0].type === "density"
      ? dataset.transform[0]
      : undefined;
    const xScaleId = layer.encoding?.x?.scale;
    const yScaleId = layer.encoding?.y?.scale;
    if (
      xScaleId === undefined ||
      yScaleId === undefined ||
      (densityTransform === undefined && layer.encoding?.y2?.scale !== yScaleId)
    ) {
      throw new Error(
        densityTransform === undefined
          ? `Area mark "${id}" requires shared x, y, and y2 scales.`
          : `Density area mark "${id}" requires x and y scales.`
      );
    }
    const derived = densityTransform === undefined
      ? deriveAreaSeries(dataset.values, layer)
      : deriveDensityAreaSeries(dataset.values, layer, densityTransform);
    const resolved = this
      .rematerializeScale({ id: xScaleId })
      .rematerializeScale({ id: yScaleId });
    const xScale = resolved.resolvedScales[xScaleId];
    const yScale = resolved.resolvedScales[yScaleId];
    const paths = derived.series.map(series => {
      const x = mapLinearValues(
        series.values.map(value => value.x),
        xScale.domain,
        xScale.range
      );
      const lower = mapLinearValues(
        series.values.map(value => value.y),
        yScale.domain,
        yScale.range
      );
      if (densityTransform !== undefined) {
        const densityScale = derived.mode === "y-density" ? yScale : xScale;
        if (densityScale.domain[0] > 0 || densityScale.domain[1] < 0) {
          throw new Error(`Density area mark "${id}" requires a scale domain containing zero.`);
        }
        const baseline = mapLinearValues(
          [0],
          densityScale.domain,
          densityScale.range
        )[0];
        return derived.mode === "y-density"
          ? [
              { x: x[0], y: baseline },
              ...x.map((value, index) => ({ x: value, y: lower[index] })),
              { x: x.at(-1), y: baseline }
            ]
          : [
              { x: baseline, y: lower[0] },
              ...x.map((value, index) => ({ x: value, y: lower[index] })),
              { x: baseline, y: lower.at(-1) }
            ];
      }
      const upper = mapLinearValues(
        series.values.map(value => value.y2),
        yScale.domain,
        yScale.range
      );
      return [
        ...x.map((value, index) => ({ x: value, y: lower[index] })),
        ...[...x].reverse().map((value, reverseIndex) => ({
          x: value,
          y: upper[upper.length - reverseIndex - 1]
        }))
      ];
    });
    const config = this.markConfigs[id];
    return resolved
      .editGraphics({ target: id, property: "length", value: paths.length })
      .editGraphics({ target: id, property: "points", value: paths })
      .editGraphics({ target: id, property: "closed", value: true })
      .editGraphics({ target: id, property: "fill", value: config.fill })
      .editGraphics({ target: id, property: "opacity", value: config.opacity });
  }
);

export function registerAreaMarkActions(ProgramClass) {
  ProgramClass.prototype.createAreaMark = createAreaMark;
  ProgramClass.prototype.rematerializeAreaMark = rematerializeAreaMark;
}
