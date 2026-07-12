import { action } from "../../core/action.js";
import {
  countHistogramBins,
  findHistogramBinIndex,
  resolveHistogramBins
} from "../../core/histogram.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  mapLinearValues,
  mapOrdinalValues,
  readNominalField,
  readQuantitativeField
} from "../../core/scale.js";
import {
  assertMarkAvailable,
  resolveMarkData,
  validateMarkOptions
} from "./shared.js";

const CREATE_OPTIONS = Object.freeze(["id", "data"]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);
const DEFAULT_BAR_FILL = "#4c78a8";
const DEFAULT_BAR_STROKE = "white";
const DEFAULT_BAR_STROKE_WIDTH = 0.5;

const createBarMark = action(
  {
    op: "createBarMark",
    description: "Create a semantic bar mark and empty rect collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createBarMark");
    const id = validateUserId(args.id, "Bar mark id");
    const { data } = resolveMarkData(this, args);

    assertMarkAvailable(this, id);

    return this
      .editSemantic({
        property: `layer[${id}].mark.type`,
        value: "bar"
      })
      .editSemantic({
        property: `layer[${id}].data`,
        value: data
      })
      .createGraphics({
        id,
        type: "rect",
        length: 0
      });
  }
);

function requireCompleteBar(program, id) {
  const layer = program.semanticSpec.layers.find(item => item.id === id);

  if (layer?.mark?.type !== "bar") {
    throw new Error(`Unknown bar mark "${id}".`);
  }
  const dataset = program.semanticSpec.datasets.find(
    item => item.id === layer.data
  );
  if (dataset === undefined) {
    throw new Error(`Bar mark "${id}" requires an existing dataset.`);
  }
  if (program.graphicSpec.objects[id]?.type !== "rect") {
    throw new Error(`Bar mark "${id}" requires rect graphics.`);
  }

  const xEncoding = layer.encoding?.x;
  const yEncoding = layer.encoding?.y;
  if (
    xEncoding?.bin === undefined ||
    xEncoding.scale === undefined ||
    yEncoding?.aggregate !== "count" ||
    yEncoding.stack !== "zero" ||
    yEncoding.scale === undefined
  ) {
    throw new Error(
      `Bar mark "${id}" requires binned x and count/zero-stack y encodings.`
    );
  }
  const xScale = program.semanticSpec.scales.find(
    item => item.id === xEncoding.scale
  );
  const yScale = program.semanticSpec.scales.find(
    item => item.id === yEncoding.scale
  );
  if (xScale === undefined || yScale === undefined) {
    throw new Error(`Bar mark "${id}" requires x and y scales.`);
  }

  return { dataset, layer, xEncoding, yEncoding, xScale, yScale };
}

function deriveSegments({
  dataset,
  layer,
  xEncoding,
  xScale,
  resolvedScales
}) {
  const xValues = readQuantitativeField(dataset.values, xEncoding.field);
  const bins = resolveHistogramBins({
    values: xValues,
    maxBins: xEncoding.bin.maxBins,
    domain: xScale.domain,
    nice: xScale.nice ?? true,
    zero: xScale.zero ?? false
  });
  const colorEncoding = layer.encoding?.color;

  if (colorEncoding?.scale === undefined) {
    return countHistogramBins(xValues, bins.boundaries)
      .map((count, index) => ({
        bin: index,
        start: bins.boundaries[index],
        end: bins.boundaries[index + 1],
        stackStart: 0,
        stackEnd: count
      }))
      .filter(segment => segment.stackEnd > 0);
  }

  const colorScale = resolvedScales[colorEncoding.scale];
  if (colorScale === undefined) {
    throw new Error(
      `Bar mark "${layer.id}" requires a resolved color scale.`
    );
  }
  const colorValues = readNominalField(dataset.values, colorEncoding.field);
  mapOrdinalValues(colorValues, colorScale.domain, colorScale.range);
  const categoryIndex = new Map(
    colorScale.domain.map((value, index) => [value, index])
  );
  const counts = bins.boundaries.slice(0, -1).map(() =>
    colorScale.domain.map(() => 0)
  );

  for (let index = 0; index < xValues.length; index += 1) {
    const bin = findHistogramBinIndex(xValues[index], bins.boundaries);
    const category = categoryIndex.get(colorValues[index]);
    if (bin !== -1 && category !== undefined) counts[bin][category] += 1;
  }

  const segments = [];
  for (let bin = 0; bin < counts.length; bin += 1) {
    let stackStart = 0;
    for (let category = 0; category < counts[bin].length; category += 1) {
      const count = counts[bin][category];
      if (count === 0) continue;
      const stackEnd = stackStart + count;
      segments.push({
        bin,
        start: bins.boundaries[bin],
        end: bins.boundaries[bin + 1],
        stackStart,
        stackEnd,
        color: mapOrdinalValues(
          [colorScale.domain[category]],
          colorScale.domain,
          colorScale.range
        )[0]
      });
      stackStart = stackEnd;
    }
  }
  return segments;
}

const rematerializeBarMark = action(
  {
    op: "rematerializeBarMark",
    description: "Recompute concrete histogram rectangles."
  },
  function (args = {}) {
    validateMarkOptions(
      args,
      REMATERIALIZE_OPTIONS,
      "rematerializeBarMark"
    );
    const id = validateUserId(args.id, "Bar mark id");
    const required = requireCompleteBar(this, id);
    let resolved = this
      .rematerializeScale({ id: required.xEncoding.scale })
      .rematerializeScale({ id: required.yEncoding.scale });
    const colorScaleId = required.layer.encoding?.color?.scale;
    if (colorScaleId !== undefined) {
      resolved = resolved.rematerializeScale({ id: colorScaleId });
    }

    const xScale = resolved.resolvedScales[required.xEncoding.scale];
    const yScale = resolved.resolvedScales[required.yEncoding.scale];
    const segments = deriveSegments({
      ...required,
      resolvedScales: resolved.resolvedScales
    });
    const existing = resolved.graphicSpec.objects[id].children;
    const rectangles = segments.map((segment, index) => {
      const [x1, x2] = mapLinearValues(
        [segment.start, segment.end],
        xScale.domain,
        xScale.range
      );
      const [y1, y2] = mapLinearValues(
        [segment.stackStart, segment.stackEnd],
        yScale.domain,
        yScale.range
      );
      return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
        fill:
          segment.color ??
          existing[index]?.properties.fill ??
          DEFAULT_BAR_FILL,
        stroke:
          existing[index]?.properties.stroke ?? DEFAULT_BAR_STROKE,
        strokeWidth:
          existing[index]?.properties.strokeWidth ?? DEFAULT_BAR_STROKE_WIDTH
      };
    });

    return resolved
      .editGraphics({ target: id, property: "length", value: rectangles.length })
      .editGraphics({
        target: id,
        property: "x",
        value: rectangles.map(rect => rect.x)
      })
      .editGraphics({
        target: id,
        property: "y",
        value: rectangles.map(rect => rect.y)
      })
      .editGraphics({
        target: id,
        property: "width",
        value: rectangles.map(rect => rect.width)
      })
      .editGraphics({
        target: id,
        property: "height",
        value: rectangles.map(rect => rect.height)
      })
      .editGraphics({
        target: id,
        property: "fill",
        value: rectangles.map(rect => rect.fill)
      })
      .editGraphics({
        target: id,
        property: "stroke",
        value: rectangles.map(rect => rect.stroke)
      })
      .editGraphics({
        target: id,
        property: "strokeWidth",
        value: rectangles.map(rect => rect.strokeWidth)
      });
  }
);

export function registerBarMarkActions(ProgramClass) {
  ProgramClass.prototype.createBarMark = createBarMark;
  ProgramClass.prototype.rematerializeBarMark = rematerializeBarMark;
}
