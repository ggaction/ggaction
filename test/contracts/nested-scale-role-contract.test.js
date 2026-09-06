import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { chart } from "../../src/index.js";
import { buildPublicOptionInventory } from
  "../support/scenarios/coverage-inventory.js";

const actionCards = JSON.parse(readFileSync(
  new URL("../../knowledge/action-cards.json", import.meta.url),
  "utf8"
));
const declarations = readFileSync(
  new URL("../../types/program.d.ts", import.meta.url),
  "utf8"
);
const inventoryPromise = buildPublicOptionInventory(actionCards);
const rows = Object.freeze([
  Object.freeze({
    category: "A", subgroup: "one", x: 1, y: 2, value: 3,
    lower: 2, center: 3, upper: 4, time: "2020-01-01",
    opacity: null, size: 1, weight: 2
  }),
  Object.freeze({
    category: "A", subgroup: "two", x: 2, y: 4, value: 5,
    lower: 4, center: 5, upper: 6, time: "2020-02-01",
    opacity: 0.7, size: 4, weight: 2
  }),
  Object.freeze({
    category: "B", subgroup: "one", x: 4, y: 8, value: 9,
    lower: 7, center: 9, upper: 10, time: "2020-03-01",
    opacity: 0.9, size: 9, weight: 2
  }),
  Object.freeze({
    category: "B", subgroup: "two", x: 8, y: 16, value: 17,
    lower: 15, center: 17, upper: 20, time: "2020-04-01",
    opacity: 0.5, size: 16, weight: 2
  })
]);

function source() {
  return chart()
    .createCanvas({ width: 320, height: 220, margin: 20 })
    .createData({ values: rows });
}

function radarSource() {
  return chart()
    .createCanvas({ width: 320, height: 220, margin: 20 })
    .createData({ values: [
      { category: "A", value: 3, series: "one", colorValue: 1 },
      { category: "B", value: 5, series: "one", colorValue: 1 },
      { category: "C", value: 9, series: "one", colorValue: 1 }
    ] });
}

function positionScale(type) {
  return {
    type,
    ...(type === "log" ? { domain: [1, 20], base: 2 } : {}),
    ...(type === "pow" ? { exponent: 2 } : {}),
    ...(type === "symlog" ? { constant: 2 } : {})
  };
}

function colorScale(type) {
  return {
    type,
    ...(type === "threshold" ? { domain: [8] } : {}),
    ...(["quantize", "quantile", "threshold"].includes(type)
      ? { range: ["#eff6ff", "#1d4ed8"] }
      : {})
  };
}

function positionChannel(type, field = "value") {
  if (type === "time") {
    return { field: "time", fieldType: "temporal", scale: { type } };
  }
  if (type === "band" || type === "point") {
    return { field: "category", fieldType: "nominal", scale: { type } };
  }
  return { field, fieldType: "quantitative", scale: positionScale(type) };
}

function colorChannel(type) {
  return {
    field: type === "ordinal" ? "category" : "value",
    fieldType: type === "ordinal" ? "nominal" : "quantitative",
    scale: colorScale(type)
  };
}

function completePoint() {
  return source()
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

function completeLine() {
  return source()
    .createLineMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

function barPositions(path, type) {
  const aggregate = channelType => ({
    ...positionChannel(channelType),
    ...(["band", "point", "time"].includes(channelType)
      ? {}
      : { aggregate: "sum" })
  });
  const requested = aggregate(type);
  const counterpart = type === "band"
    ? positionChannel("linear")
    : type === "time"
      ? positionChannel("linear")
      : positionChannel("band");
  const aggregatedCounterpart = ["band", "point", "time"].includes(
    counterpart.scale.type
  ) ? counterpart : { ...counterpart, aggregate: "sum" };
  return path.startsWith("x.")
    ? { x: requested, y: aggregatedCounterpart }
    : { x: aggregatedCounterpart, y: requested };
}

function distributionPositions(path, type) {
  const requested = positionChannel(type);
  const counterpart = type === "band"
    ? positionChannel("linear")
    : positionChannel("band");
  return path.startsWith("x.")
    ? { x: requested, y: counterpart }
    : { x: counterpart, y: requested };
}

function intervalPositions(path, type) {
  const requested = positionChannel(type);
  const interval = {
    center: "center",
    lower: "lower",
    upper: "upper",
    scale: positionScale("linear")
  };
  return path.startsWith("x.")
    ? { x: requested, y: interval }
    : { x: interval, y: requested };
}

function errorBarPositions(path, type) {
  if (path.startsWith("xOffset.")) {
    return {
      x: positionChannel("point"),
      y: {
        center: "center",
        lower: "lower",
        upper: "upper",
        scale: positionScale("linear")
      },
      xOffset: { field: "subgroup", scale: { type } }
    };
  }
  if (path.startsWith("yOffset.")) {
    return {
      x: {
        center: "center",
        lower: "lower",
        upper: "upper",
        scale: positionScale("linear")
      },
      y: positionChannel("point"),
      yOffset: { field: "subgroup", scale: { type } }
    };
  }
  const isDimension = ["band", "point", "time"].includes(type);
  const requested = isDimension
    ? positionChannel(type)
    : {
        center: "center",
        lower: "lower",
        upper: "upper",
        scale: positionScale(type)
      };
  const counterpart = isDimension
    ? {
        center: "center",
        lower: "lower",
        upper: "upper",
        scale: positionScale("linear")
      }
    : positionChannel("band");
  return path.startsWith("x.")
    ? { x: requested, y: counterpart }
    : { x: counterpart, y: requested };
}

function nestedValue(value, path) {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

function directAction(program, action) {
  for (let index = program.trace.children.length - 1; index >= 0; index -= 1) {
    if (program.trace.children[index].op === action) return program.trace.children[index];
  }
  return undefined;
}

function buildScaleWitness(action, path, type) {
  switch (action) {
    case "encodeX":
      return source().createPointMark().encodeY({ field: "y" })
        .encodeX(positionChannel(type, "x"));
    case "encodeY":
      return source().createPointMark().encodeX({ field: "x" })
        .encodeY(positionChannel(type, "y"));
    case "encodeColor":
      return completePoint().encodeColor(colorChannel(type));
    case "encodeSize":
      return completePoint().encodeSize({ field: "size", scale: { type } });
    case "encodeShape":
      return completePoint().encodeShape({ field: "category", scale: { type } });
    case "encodeOpacity":
      return completePoint().encodeOpacity({
        field: "opacity", scale: { type, unknown: 0.25 }
      });
    case "encodeStrokeDash":
      return completeLine().encodeStrokeDash({ field: "category", scale: { type } });
    case "encodeStrokeWidth":
      return completeLine().encodeStrokeWidth({
        field: "weight", scale: positionScale(type)
      });
    case "encodeR":
      return source().createCoordinate({ id: "polar", type: "polar" })
        .createPointMark()
        .encodeTheta({ field: "category", fieldType: "nominal", coordinate: "polar" })
        .encodeR({ ...positionChannel(type), coordinate: "polar" });
    case "encodeTheta":
      return source().createCoordinate({ id: "polar", type: "polar" })
        .createPointMark()
        .encodeR({ field: "value", coordinate: "polar" })
        .encodeTheta({ ...positionChannel(type), coordinate: "polar" });
    case "encodeXOffset":
      return source().createBarMark().encodeX({ field: "category", fieldType: "nominal" })
        .encodeY({ field: "value" })
        .encodeXOffset({ field: "subgroup", scale: { type } });
    case "encodeYOffset":
      return source().createBarMark().encodeX({ field: "value", aggregate: "sum" })
        .encodeY({ field: "category", fieldType: "nominal" })
        .encodeYOffset({ field: "subgroup", scale: { type } });
    case "encodeXRange":
      if (type === "time") {
        return source().createRectMark()
          .encodeYRange({ lower: "lower", upper: "upper" })
          .encodeXRange({ lower: "time", upper: "time", fieldType: "temporal", scale: { type } });
      }
      return source().createAreaMark().encodeY({ field: "y" }).encodeXRange({
        lower: "lower", upper: "upper", scale: positionScale(type)
      });
    case "encodeYRange":
      if (type === "time") {
        return source().createRectMark()
          .encodeXRange({ lower: "lower", upper: "upper" })
          .encodeYRange({ lower: "time", upper: "time", fieldType: "temporal", scale: { type } });
      }
      return source().createAreaMark().encodeX({ field: "x" }).encodeYRange({
        lower: "lower", upper: "upper", scale: positionScale(type)
      });
    case "encodeHistogram":
      return source().createBarMark().encodeHistogram({
        field: "value",
        ...(path === "xScale.type"
          ? { xScale: positionScale(type) }
          : { yScale: positionScale(type) })
      });
    case "encodeDensity":
      return source().createAreaMark().encodeDensity({
        field: "value",
        ...(path === "valueScale.type"
          ? { valueScale: positionScale(type) }
          : path === "densityScale.type"
            ? { densityScale: positionScale(type) }
            : {
                groupBy: "category",
                placement: { type: "category", scale: { type } }
              })
      });
    case "editDensity":
      return path === "valueScale.type"
        ? source().createAreaMark().encodeDensity({ field: "value" }).editDensity({
            valueScale: positionScale(type)
          })
        : source().createAreaMark().encodeDensity({ field: "value" }).editDensity({
            groupBy: "category",
            placement: { type: "category", scale: { type } }
          });
    case "createHorizonPlot":
      return source().createHorizonPlot({
        x: path.startsWith("x.") ? positionChannel(type, "x") : "x",
        y: { field: "value", scale: { type: path.startsWith("y.") ? type : "linear" } },
        guides: false
      });
    case "encodeHorizon":
      return source().createAreaMark().encodeHorizon({
        x: path.startsWith("x.")
          ? positionChannel(type, "x")
          : positionChannel("linear", "x"),
        y: {
          field: "value",
          scale: { type: path.startsWith("y.") ? type : "linear" }
        },
        bands: 2
      });
    case "editHorizon": {
      const horizon = source().createAreaMark().encodeHorizon({
        x: { field: "x" }, y: { field: "value" }, bands: 2
      });
      return horizon.editHorizon(path.startsWith("x.")
        ? { x: positionChannel(type, "x") }
        : { y: { field: "value", scale: { type } } });
    }
    case "createScatterPlot":
      if (path === "color.scale.type") {
        return source().createScatterPlot({
          x: "x", y: "y", color: colorChannel(type), guides: false
        });
      }
      if (path === "size.scale.type") {
        return source().createScatterPlot({
          x: "x", y: "y", size: { field: "size", scale: { type } }, guides: false
        });
      }
      if (path === "shape.scale.type") {
        return source().createScatterPlot({
          x: "x", y: "y", shape: { field: "category", scale: { type } }, guides: false
        });
      }
      return source().createScatterPlot({
        ...(path.startsWith("x.")
          ? { x: positionChannel(type, "x"), y: "y" }
          : { x: "x", y: positionChannel(type, "y") }),
        guides: false
      });
    case "createIntervalPlot":
      if (path === "color.scale.type") {
        return source().createIntervalPlot({
          x: { field: "category", fieldType: "nominal" },
          y: { center: "center", lower: "lower", upper: "upper" },
          color: colorChannel(type),
          guides: false
        });
      }
      return source().createIntervalPlot({
        ...errorBarPositions(path, type),
        guides: false
      });
    case "createRegressionPlot":
      if (path === "color.scale.type") {
        return source().createRegressionPlot({
          x: "x", y: "y", color: colorChannel(type), groupBy: false,
          band: false, guides: false
        });
      }
      if (path === "size.scale.type") {
        return source().createRegressionPlot({
          x: "x", y: "y", size: { field: "size", scale: { type } },
          band: false, guides: false
        });
      }
      if (path === "shape.scale.type") {
        return source().createRegressionPlot({
          x: "x", y: "y", shape: { field: "category", scale: { type } },
          groupBy: false, band: false, guides: false
        });
      }
      return source().createRegressionPlot({
        ...(path.startsWith("x.")
          ? { x: positionChannel(type, "x"), y: "y" }
          : { x: "x", y: positionChannel(type, "y") }),
        groupBy: false,
        band: false,
        guides: false
      });
    case "createLinePlot":
      if (path === "color.scale.type") {
        return source().createLinePlot({
          x: "x", y: "y", color: colorChannel(type), guides: false
        });
      }
      if (path === "strokeDash.scale.type") {
        return source().createLinePlot({
          x: "x", y: "y", strokeDash: { field: "category", scale: { type } },
          guides: false
        });
      }
      return source().createLinePlot({
        ...(path.startsWith("x.")
          ? {
              x: positionChannel(type, "x"),
              y: type === "time" ? { field: "y", aggregate: "mean" } : "y"
            }
          : { x: "x", y: positionChannel(type, "y") }),
        guides: false
      });
    case "createPolarScatterPlot":
      if (path === "color.scale.type") {
        return source().createPolarScatterPlot({
          theta: { field: "category", fieldType: "nominal" },
          radius: "value", color: colorChannel(type), guides: false
        });
      }
      if (path === "size.scale.type") {
        return source().createPolarScatterPlot({
          theta: { field: "category", fieldType: "nominal" }, radius: "value",
          size: { field: "size", scale: { type } }, guides: false
        });
      }
      if (path === "shape.scale.type") {
        return source().createPolarScatterPlot({
          theta: { field: "category", fieldType: "nominal" }, radius: "value",
          shape: { field: "category", scale: { type } }, guides: false
        });
      }
      return source().createPolarScatterPlot({
        theta: path.startsWith("theta.")
          ? positionChannel(type)
          : { field: "category", fieldType: "nominal" },
        radius: path.startsWith("radius.") ? positionChannel(type) : "value",
        guides: false
      });
    case "createPolarLinePlot":
      if (path === "color.scale.type") {
        return source().createPolarLinePlot({
          theta: { field: "category", fieldType: "nominal" },
          radius: "value", color: colorChannel(type), guides: false
        });
      }
      if (path === "strokeDash.scale.type") {
        return source().createPolarLinePlot({
          theta: { field: "category", fieldType: "nominal" }, radius: "value",
          strokeDash: { field: "category", scale: { type } }, guides: false
        });
      }
      return source().createPolarLinePlot({
        theta: path.startsWith("theta.")
          ? positionChannel(type)
          : { field: "category", fieldType: "nominal" },
        radius: path.startsWith("radius.") ? positionChannel(type) : "value",
        guides: false
      });
    case "createRadarPlot":
      if (path === "color.scale.type") {
        return radarSource().createRadarPlot({
          category: "category", value: "value",
          color: {
            field: type === "ordinal" ? "series" : "colorValue",
            fieldType: type === "ordinal" ? "nominal" : "quantitative",
            scale: colorScale(type)
          },
          guides: false
        });
      }
      if (path === "strokeDash.scale.type") {
        return radarSource().createRadarPlot({
          category: "category", value: "value",
          strokeDash: { field: "series", scale: { type } }, guides: false
        });
      }
      return radarSource().createRadarPlot({
        category: path.startsWith("category.")
          ? { field: "category", fieldType: "nominal", scale: { type } }
          : "category",
        value: path.startsWith("value.")
          ? { field: "value", fieldType: "quantitative", scale: positionScale(type) }
          : "value",
        guides: false
      });
    case "createRugPlot":
      return path.startsWith("x.")
        ? source().createRugPlot({
            x: positionChannel(type), edge: "bottom", guides: false
          })
        : source().createRugPlot({
            y: positionChannel(type), edge: "left", guides: false
          });
    case "createStripPlot":
      if (path === "color.scale.type") {
        return source().createStripPlot({
          x: "value", color: colorChannel(type), guides: false
        });
      }
      if (path === "size.scale.type") {
        return source().createStripPlot({
          x: "value", size: { field: "size", scale: { type } }, guides: false
        });
      }
      if (path === "shape.scale.type") {
        return source().createStripPlot({
          x: "value", shape: { field: "category", scale: { type } }, guides: false
        });
      }
      if (path.startsWith("x.")) {
        return ["band", "point"].includes(type)
          ? source().createStripPlot({
              x: positionChannel(type), y: "value", guides: false
            })
          : source().createStripPlot({
              x: positionChannel(type), y: positionChannel("band"), guides: false
            });
      }
      return ["band", "point"].includes(type)
        ? source().createStripPlot({
            x: "value", y: positionChannel(type), guides: false
          })
        : source().createStripPlot({
            x: positionChannel("band"), y: positionChannel(type), guides: false
          });
    case "createBarPlot":
      return source().createBarPlot({
        ...(path === "color.scale.type"
          ? {
              x: positionChannel("band"),
              y: positionChannel("linear"),
              color: {
                ...colorChannel(type),
                ...(type === "ordinal" ? {} : { aggregate: "mean" })
              }
            }
          : barPositions(path, type)),
        guides: false
      });
    case "createAreaPlot":
      if (path === "color.scale.type") return source().createAreaPlot({ x: "x", y: "value", groupBy: "category", color: colorChannel(type), guides: false });
      if (type === "time") return source().createAreaPlot(path.startsWith("x.")
        ? { x: positionChannel(type), y: "value", guides: false }
        : { x: "value", y: positionChannel(type), valueChannel: "x", guides: false });
      return source().createAreaPlot({
        x: path.startsWith("x.") ? { field: "x", scale: positionScale(type) } : "x",
        y: path.startsWith("y.") ? { field: "value", scale: positionScale(type) } : "value",
        baseline: type === "log" && path.startsWith("y.") ? 1 : 0, guides: false
      });
    case "createDensityPlot":
      return source().createDensityPlot({ field: "value", guides: false,
        ...(path === "color.scale.type" ? { groupBy: "category", color: colorChannel(type) }
          : path === "valueScale.type" ? { valueScale: positionScale(type) }
            : { densityScale: positionScale(type) }) });
    case "createRosePlot":
    case "createRadialBarPlot":
      return source()[action]({
        category: path === "category.scale.type" ? { field: "category", scale: { type } } : "category",
        ...(path === "color.scale.type" ? { color: colorChannel(type) } : {}),
        ...(path === "radiusScale.type" ? { radiusScale: { type } } : {}), guides: false
      });
    case "createPiePlot":
      return source().createPiePlot({
        category: path === "category.scale.type" ? { field: "category", scale: { type } } : "category",
        ...(path === "color.scale.type" ? { color: colorChannel(type) } : {}), guides: false
      });
    case "createHistogram":
      return source().createHistogram({
        field: "value",
        ...(path === "color.scale.type"
          ? { color: colorChannel(type) }
          : path === "xScale.type"
            ? { xScale: positionScale(type) }
            : { yScale: positionScale(type) }),
        guides: false
      });
    case "createHeatmap":
      if (path === "color.scale.type") {
        return source().createHeatmap({
          x: "category", y: "subgroup", color: colorChannel(type), guides: false
        });
      }
      if (type === "band") {
        return source().createHeatmap({
          x: path.startsWith("x.") ? positionChannel(type) : "category",
          y: path.startsWith("y.") ? positionChannel(type) : "subgroup",
          color: colorChannel("sequential"), guides: false
        });
      }
      return source().createHeatmap({
        x: path.startsWith("x.") ? positionChannel(type, "x") : "x",
        y: path.startsWith("y.") ? positionChannel(type, "y") : "y",
        bin: { bins: 3 },
        color: { scale: colorScale("sequential") }, guides: false
      });
    case "createErrorBar":
      return source().createErrorBar({
        ...errorBarPositions(path, type), caps: false
      });
    case "editErrorBar":
      return source()
        .createErrorBar({
          x: positionChannel("point"),
          y: {
            center: "center", lower: "lower", upper: "upper",
            scale: positionScale("linear")
          },
          caps: false
        })
        .editErrorBar(errorBarPositions(path, type));
    case "createErrorBand":
      return source().createErrorBand(intervalPositions(path, type));
    case "editErrorBand":
      return source()
        .createErrorBand({
          x: positionChannel("time"),
          y: {
            center: "center", lower: "lower", upper: "upper",
            scale: positionScale("linear")
          }
        })
        .editErrorBand(intervalPositions(path, type));
    case "createBoxPlot":
      return source().createBoxPlot({ ...distributionPositions(path, type), guides: false });
    case "editBoxPlot": {
      const box = source().createBoxPlot({
        x: positionChannel("band"), y: positionChannel("linear"), guides: false
      });
      return box.editBoxPlot(distributionPositions(path, type));
    }
    case "createGradientPlot":
      return source().createGradientPlot({
        ...distributionPositions(path, type), guides: false
      });
    case "editGradientPlot": {
      const gradient = source().createGradientPlot({
        x: positionChannel("band"), y: positionChannel("linear"), guides: false
      });
      return gradient.editGradientPlot(distributionPositions(path, type));
    }
    case "createViolinPlot":
      return source().createViolinPlot({
        ...(path === "color.scale.type"
          ? {
              x: positionChannel("band"), y: positionChannel("linear"),
              color: colorChannel(type)
            }
          : distributionPositions(path, type)),
        guides: false
      });
    case "editViolinPlot":
      return source()
        .createViolinPlot({ x: "category", y: "value", guides: false })
        .editViolinPlot(distributionPositions(path, type));
    case "createParallelCoordinates":
      return source().createParallelCoordinates({
        dimensions: [
          { field: "x", fieldType: "quantitative" },
          { field: "y", fieldType: "quantitative" }
        ],
        ...(path === "color.scale.type"
          ? { color: colorChannel(type) }
          : { strokeDash: { field: "category", scale: { type } } }),
        guides: false
      });
    default:
      throw new Error(`Missing nested-scale witness builder for ${action}.${path}.`);
  }
}

test("derives only role-reachable nested scale type paths", async () => {
  const inventory = await inventoryPromise;
  const options = new Map(inventory.optionPaths.map(option => [option.id, option]));
  const scaleTypes = inventory.optionPaths.filter(option =>
    option.required &&
    /(?:^|\.)(?:xScale|yScale|valueScale|densityScale|radiusScale|scale)\.type$/u.test(option.path)
  );

  assert.equal(scaleTypes.length, 116);
  assert.equal(scaleTypes.reduce((sum, option) => sum + option.values.length, 0), 457);
  assert.doesNotMatch(declarations, /scale\?: ScaleOptions/u);
  assert.equal(options.has("option-path:createScatterPlot.x.scale.palette"), false);
  assert.equal(options.has("option-path:createScatterPlot.x.scale.interpolate"), false);
  assert.equal(options.has("option-path:encodeSize.scale.nice"), false);
  assert.equal(options.has("option-path:encodeSize.scale.palette"), false);
  assert.deepEqual(options.get("option-path:encodeSize.scale.type").values, [
    "string:linear"
  ]);
  assert.equal(
    options.get("option-path:createBarPlot.y.scale.type").values.includes("string:log"),
    false
  );
  assert.equal(
    options.get("option-path:createBarPlot.y.scale.type").values.includes("string:time"),
    true
  );
  assert.equal(
    options.get("option-path:createBoxPlot.x.scale.type").values.includes("string:time"),
    false
  );
});

test("executes every strict nested scale type path and literal", async () => {
  const inventory = await inventoryPromise;
  const scaleTypes = inventory.optionPaths.filter(option =>
    option.required &&
    /(?:^|\.)(?:xScale|yScale|valueScale|densityScale|radiusScale|scale)\.type$/u.test(option.path)
  );
  let witnesses = 0;
  for (const option of scaleTypes) {
    for (const valueKey of option.values) {
      const type = decodeURIComponent(valueKey.slice("string:".length));
      let program;
      try {
        program = buildScaleWitness(option.action, option.path, type);
      } catch (error) {
        throw new Error(`${option.id}=${type}: ${error.message}`, { cause: error });
      }
      const direct = directAction(program, option.action);
      assert.ok(direct, option.id);
      assert.equal(nestedValue(direct.args, option.path), type, option.id);
      assert.equal(
        Object.values(program.resolvedScales).some(scale => scale.type === type),
        true,
        option.id
      );
      witnesses += 1;
    }
  }
  assert.equal(witnesses, 457);
});

test("materializes every role-specific nested scale type vocabulary", () => {
  for (const type of ["linear", "log", "pow", "sqrt", "symlog"]) {
    const program = source()
      .createPointMark()
      .encodeX({ field: "x", scale: positionScale(type) });
    assert.equal(program.resolvedScales.x.type, type);
  }
  for (const type of ["linear", "pow", "sqrt", "symlog"]) {
    const program = source().createBarPlot({
      x: { field: "category", fieldType: "nominal", scale: { type: "band" } },
      y: { field: "value", aggregate: "sum", scale: positionScale(type) },
      guides: false
    });
    assert.equal(program.resolvedScales.y.type, type);
  }

  const discrete = source().createScatterPlot({
    x: { field: "category", fieldType: "nominal", scale: { type: "point" } },
    y: { field: "subgroup", fieldType: "nominal", scale: { type: "band" } },
    guides: false
  });
  assert.equal(discrete.resolvedScales.x.type, "point");
  assert.equal(discrete.resolvedScales.y.type, "band");
  const temporal = source().createLinePlot({
    x: { field: "time", fieldType: "temporal", scale: { type: "time" } },
    y: { field: "value", aggregate: "mean" },
    guides: false
  });
  assert.equal(temporal.resolvedScales.x.type, "time");

  for (const type of ["ordinal", "sequential", "quantize", "quantile", "threshold"]) {
    const categorical = type === "ordinal";
    const program = source()
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeColor({
        field: categorical ? "category" : "value",
        fieldType: categorical ? "nominal" : "quantitative",
        scale: colorScale(type)
      });
    assert.equal(program.resolvedScales.color.type, type);
  }

  for (const type of ["linear", "time", "band", "point"]) {
    const categorical = type === "band" || type === "point";
    const program = source()
      .createPointMark()
      .createCoordinate({ id: "polar", type: "polar" })
      .encodeTheta({
        field: type === "time" ? "time" : categorical ? "category" : "value",
        fieldType: type === "time" ? "temporal" : categorical ? "nominal" : "quantitative",
        coordinate: "polar",
        scale: { type }
      });
    assert.equal(program.resolvedScales.theta.type, type);
  }
});

test("rejects formerly accepted-but-ignored role combinations", () => {
  const base = source();
  assert.throws(
    () => base.createScatterPlot({
      x: { field: "x", scale: { palette: "blues" } },
      y: "y",
      guides: false
    }),
    /Unknown scale option "palette"/
  );
  assert.throws(
    () => base.createScatterPlot({
      x: "x",
      y: "y",
      size: { field: "size", scale: { nice: true } },
      guides: false
    }),
    /Unknown scale option "nice"/
  );
  assert.throws(
    () => base.createBarPlot({
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value", aggregate: "sum", scale: { type: "log" } },
      guides: false
    }),
    /does not support zero baselines/
  );
  assert.throws(
    () => base.createBoxPlot({
      x: { field: "time", fieldType: "temporal", scale: { type: "time" } },
      y: { field: "value" },
      guides: false
    }),
    /one categorical axis and one quantitative axis/
  );
  assert.throws(
    () => base.createGradientPlot({
      x: { field: "time", fieldType: "temporal", scale: { type: "time" } },
      y: { field: "value" },
      guides: false
    }),
    /one categorical axis and one quantitative axis/
  );
  assert.throws(
    () => base.createHeatmap({
      x: { field: "time", fieldType: "temporal" },
      y: "subgroup",
      color: { field: "value", fieldType: "quantitative" },
      guides: false
    }),
    /requires a categorical field/
  );
  assert.throws(
    () => base.createAreaMark().encodeHorizon({
      x: { field: "x", fieldType: "quantitative" },
      y: { field: "value", scale: { nice: true } },
      bands: 2
    }),
    /Unknown Horizon y scale option "nice"/
  );

  const heatmap = base.createHeatmap({
    x: "category",
    y: "subgroup",
    color: { field: "value", fieldType: "quantitative" },
    guides: false
  });
  const box = base.createBoxPlot({
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value", scale: { type: "log" } },
    guides: false
  });
  const horizon = base.createAreaMark().encodeHorizon({
    x: { field: "x", fieldType: "quantitative", scale: { type: "log" } },
    y: { field: "value", scale: { clamp: true } },
    bands: 2
  });
  assert.equal(heatmap.resolvedScales.x.type, "band");
  assert.equal(heatmap.resolvedScales.y.type, "band");
  assert.equal(box.resolvedScales.y.type, "log");
  assert.equal(horizon.resolvedScales.x.type, "log");
});
