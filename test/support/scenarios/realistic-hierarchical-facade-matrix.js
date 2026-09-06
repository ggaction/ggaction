const POSITION_TYPES = Object.freeze(["linear", "log", "pow", "sqrt", "symlog"]);
const THETA_TYPES = Object.freeze(["linear", "time", "band", "point"]);
const TEMPORAL_UNITS = Object.freeze(["auto", "year", "timestamp"]);
const CURVES = Object.freeze([
  "linear", "basis", "cardinal", "monotone", "natural", "step",
  "step-after", "step-before"
]);
const DASHES = Object.freeze(["solid", "dashed", "dotted", "dashdot"]);
const POINT_SHAPES = Object.freeze([
  "circle", "cross", "diamond", "hexagon", "plus", "square", "star",
  "triangle-down", "triangle-left", "triangle-right", "triangle-up", "wye"
]);
const FORMATS = Object.freeze(["auto", ".0f", ".1f", ".2f"]);
const PALETTES = Object.freeze([
  "tableau10", "set2", { name: "tableau20", count: 6 },
  { name: "viridis", extent: [0.08, 0.92] }
]);
const INTERPOLATIONS = Object.freeze([
  "rgb", "hsl", "hsl-long", "lab", "hcl", "hcl-long", "cubehelix",
  "cubehelix-long"
]);

export const REALISTIC_HIERARCHICAL_FACADE_ACTIONS = Object.freeze([
  "createAreaPlot", "createDensityPlot", "createHorizonPlot", "createPiePlot",
  "createPolarLinePlot", "createPolarScatterPlot", "createRadarPlot",
  "createRadialBarPlot", "createRosePlot", "createRugPlot", "createStripPlot"
]);

export const REALISTIC_HIERARCHICAL_FACADE_PROFILE_COUNT = 24;

function clean(value) {
  return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== undefined));
}

function numericScale(id, index, { horizon = false, measured = false } = {}) {
  if (horizon) {
    return {
      id, type: "linear", domain: [0, 1], range: "auto",
      clamp: index % 2 === 0, reverse: index % 3 === 0
    };
  }
  if (measured) {
    return {
      id, type: "linear", domain: "auto", range: "auto", zero: true,
      nice: false, clamp: index % 2 === 0, reverse: false
    };
  }
  const type = POSITION_TYPES[index % POSITION_TYPES.length];
  return clean({
    id, type, domain: "auto", range: "auto",
    nice: index % 2 === 0,
    zero: type === "log" ? undefined : index % 3 === 0,
    clamp: index % 2 === 1,
    reverse: index % 4 === 0,
    base: type === "log" ? 2 : undefined,
    exponent: type === "pow" ? 2 : undefined,
    constant: type === "symlog" ? 1 : undefined
  });
}

function densityScale(id, index) {
  const type = ["linear", "pow", "sqrt", "symlog"][index % 4];
  return clean({
    id, type, domain: "auto", range: "auto", nice: index % 2 === 0,
    zero: true, clamp: index % 2 === 1, reverse: index % 4 === 0,
    exponent: type === "pow" ? 2 : undefined,
    constant: type === "symlog" ? 1 : undefined
  });
}

function temporalScale(id, index) {
  return {
    id, type: "time", domain: "auto", range: "auto",
    nice: index % 2 === 0, clamp: index % 2 === 1, reverse: index % 3 === 0
  };
}

function temporalField(unit) {
  if (unit === "year") return "calendarYear";
  return unit === "timestamp" ? "timeTimestamp" : "timeUnique";
}

function categoryScale(id, index, requestedType) {
  const type = requestedType ?? (index % 2 === 0 ? "band" : "point");
  return type === "band"
    ? {
        id, type, domain: "auto", range: "auto", reverse: index % 2 === 1,
        paddingInner: 0.16, paddingOuter: 0.08, align: [0, 0.5, 1][index % 3]
      }
    : {
        id, type, domain: "auto", range: "auto", reverse: index % 2 === 1,
        padding: 0.24, align: [0, 0.5, 1][index % 3]
      };
}

function pieCategoryScale(id, index) {
  return {
    id, type: "band", domain: "auto", range: "auto",
    reverse: index % 2 === 1
  };
}

function thetaChannel(id, index) {
  const type = THETA_TYPES[index % THETA_TYPES.length];
  if (type === "time") {
    const temporalUnit = TEMPORAL_UNITS[Math.floor(index / THETA_TYPES.length) % 3];
    return {
      field: temporalField(temporalUnit), fieldType: "temporal", temporalUnit,
      scale: temporalScale(id, index)
    };
  }
  if (type === "band" || type === "point") {
    return {
      field: "bucket", fieldType: index % 2 === 0 ? "nominal" : "ordinal",
      scale: categoryScale(id, index, type)
    };
  }
  return {
    field: "positiveX", fieldType: "quantitative",
    scale: {
      id, type: "linear", domain: "auto", range: "auto",
      nice: index % 2 === 0, zero: index % 3 === 0,
      clamp: index % 2 === 1, reverse: index % 4 === 0
    }
  };
}

function radiusChannel(id, index) {
  return {
    field: "positiveY", fieldType: "quantitative", scale: numericScale(id, index)
  };
}

function measureChannel(id, index, { temporal = false, temporalUnit: requestedTemporalUnit } = {}) {
  if (temporal) {
    const temporalUnit = requestedTemporalUnit ?? TEMPORAL_UNITS[index % TEMPORAL_UNITS.length];
    return {
      field: temporalField(temporalUnit), fieldType: "temporal", temporalUnit,
      scale: temporalScale(id, index)
    };
  }
  return {
    field: index % 2 === 0 ? "positiveX" : "positiveY",
    fieldType: "quantitative",
    scale: numericScale(id, index)
  };
}

function areaMeasureChannel(id, index) {
  return {
    field: index % 2 === 0 ? "positiveX" : "positiveY",
    scale: numericScale(id, index)
  };
}

function areaBaseline(index) {
  return POSITION_TYPES[index % POSITION_TYPES.length] === "log" ? 1 : 0;
}

function colorScale(id, index, categorical = false) {
  if (categorical || index < 8) {
    const palette = PALETTES[index % PALETTES.length];
    if (index % 3 === 0) return { id, type: "ordinal", domain: "auto", range: "auto" };
    if (index % 3 === 1) return { id, type: "ordinal", domain: "auto", palette };
    return { id, type: "ordinal", domain: "auto" };
  }
  if (index < 16) {
    const scale = {
      id, type: "sequential", domain: "auto", range: "auto", midpoint: "auto",
      interpolate: INTERPOLATIONS[index % INTERPOLATIONS.length],
      clamp: index % 2 === 0, reverse: index % 3 === 0, unknown: "#94a3b8"
    };
    if (index % 2 === 1) {
      delete scale.range;
      scale.palette = { name: "magma", extent: [0.1, 0.9] };
    }
    return scale;
  }
  if (index === 16 || index === 20) {
    return {
      id, type: "sequential", domain: "auto", range: "auto", midpoint: "auto",
      interpolate: index === 16 ? "hcl" : "hcl-long",
      clamp: true, reverse: index === 20, unknown: "#94a3b8"
    };
  }
  const type = ["quantize", "quantile", "threshold"][index % 3];
  const scale = clean({
    id, type,
    domain: type === "threshold" ? [2, 4, 8] : "auto",
    range: index % 2 === 0 ? "auto" : undefined,
    palette: index % 2 === 1
      ? { name: ["blues", "reds", "greens"][index % 3], count: type === "threshold" ? 4 : 5 }
      : undefined,
    clamp: type === "quantize" ? true : undefined,
    reverse: index % 2 === 0,
    unknown: "#94a3b8"
  });
  return scale;
}

function colorChannel(id, index, { categorical = false, layout = false, temporal = false } = {}) {
  const temporalUnit = temporal ? TEMPORAL_UNITS[[12, 13, 15].indexOf(index)] : undefined;
  const scale = colorScale(id, index, categorical);
  if (temporal && index === 12) {
    delete scale.range;
    delete scale.palette;
  }
  if (temporal && index === 12) scale.interpolate = "lab";
  if (temporal && index === 13) scale.interpolate = "cubehelix";
  return {
    field: temporal ? temporalField(temporalUnit) : categorical || index < 8 ? "group" : "positiveY",
    fieldType: temporal ? "temporal" : categorical || index < 8
      ? index % 2 === 0 ? "nominal" : "ordinal"
      : "quantitative",
    ...(temporal ? { temporalUnit } : {}),
    scale,
    ...(layout ? { layout: "overlay" } : {}),
    ...(temporal && index === 12
      ? { palette: { name: "viridis", extent: [0.08, 0.92] } }
      : (categorical || index < 8) && index % 3 === 2
      ? { palette: PALETTES[index % PALETTES.length] }
      : {})
  };
}

function sizeChannel(id, index) {
  return {
    field: "size", fieldType: "quantitative",
    scale: {
      id, type: "linear", domain: "auto", range: "auto", unknown: 4
    }
  };
}

function shapeChannel(id, index) {
  return {
    field: "group", fieldType: "nominal",
    scale: {
      id, type: "ordinal", domain: "auto", range: "auto",
      unknown: POINT_SHAPES[index % POINT_SHAPES.length]
    }
  };
}

function horizonPalette(index, bands, negative = false) {
  const name = negative ? "reds" : "blues";
  if (index % 3 === 0) {
    return index % 6 === 0 ? name : negative ? "magma" : "viridis";
  }
  if (index % 3 === 1) return { name, count: bands };
  return { name: negative ? "magma" : "viridis", extent: [0.08, 0.92] };
}

function labelStyle(index) {
  return {
    offset: 10,
    format: "auto",
    color: "#334155",
    fontSize: 11,
    fontFamily: "sans-serif",
    fontWeight: index % 2 === 0 ? 500 : "bold",
    rotation: { value: 0, unit: index % 2 === 0 ? "degrees" : "radians" },
    maxWidth: index % 3 === 0 ? false : 160,
    ...(index % 3 === 0 ? {} : { wrap: index % 2 === 0 ? "word" : "character", lineHeight: 16 }),
    overlap: index % 2 === 0 ? "allow" : "error"
  };
}

function axisTitle(text, index, radial = false) {
  return {
    text,
    at: ["start", "center", "end"][index % 3],
    offset: 160,
    rotation: { value: 0, unit: index % 2 === 0 ? "degrees" : "radians" },
    color: "#0f172a",
    fontSize: 13,
    fontFamily: "sans-serif",
    fontWeight: 700,
    ...(radial ? { position: index % 2 === 0 ? "inside" : "outside" } : {})
  };
}

function polarTitle(text, index, radial = false) {
  return {
    text,
    offset: 54,
    color: "#0f172a",
    fontSize: 13,
    fontFamily: "sans-serif",
    fontWeight: 700,
    ...(radial ? { position: index % 2 === 0 ? "inside" : "outside" } : {})
  };
}

function ticksAndLabels(index, { polar = false } = {}) {
  return {
    count: 2,
    ticks: { length: 7, color: "#64748b", lineWidth: 1 },
    labels: polar
      ? {
          offset: 10, format: "auto", color: "#334155",
          fontSize: 11, fontFamily: "sans-serif", fontWeight: 500
        }
      : labelStyle(index)
  };
}

function polarTicksAndLabels(index, discrete) {
  const options = ticksAndLabels(index, { polar: true });
  if (!discrete) {
    return {
      ...options,
      labels: { ...options.labels, format: index % 4 === 0 ? ".1f" : "auto" }
    };
  }
  const { count, ...rest } = options;
  return { ...rest, values: [1, 2, 3] };
}

function cartesianTicksAndLabels(index, discrete, format = "auto") {
  const options = ticksAndLabels(index);
  if (!discrete) {
    return {
      ...options,
      labels: { ...options.labels, format }
    };
  }
  const { count, ...rest } = options;
  return { ...rest, values: [1, 2, 3] };
}

function ticksAndLabelsWithValues(index, values, polar = false, format = "auto") {
  const { count, ...rest } = ticksAndLabels(index, { polar });
  return {
    ...rest,
    values,
    labels: { ...rest.labels, format }
  };
}

function axis(scaleId, coordinate, index, channel, discrete = false, values, format = "auto") {
  const position = channel === "x"
    ? (index % 2 === 0 ? "bottom" : "top")
    : index % 8 === 0 ? "right" : "left";
  return {
    scale: scaleId,
    coordinate,
    position,
    line: index % 11 === 0 ? false : { color: "#475569", lineWidth: 1.2 },
    ticksAndLabels: index % 13 === 0
      ? false
      : values === undefined
        ? cartesianTicksAndLabels(index, discrete, format)
        : ticksAndLabelsWithValues(index, values, false, format),
    title: index % 17 === 0 ? false : axisTitle(`${channel.toUpperCase()} value`, index)
  };
}

function legendSymbol(index, kind) {
  switch (index % 5) {
    case 0: return "auto";
    case 1:
      if (kind === "filled") {
        return { width: 18, height: 12, stroke: "#ffffff", strokeWidth: 0.8 };
      }
      if (kind === "path") return { length: 28, lineWidth: 2.2 };
      return { layers: [
        { type: "point", size: 6, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 0.8 }
      ] };
    case 2: return { layers: [
      { type: "line", length: 28, lineWidth: 2.2 }
    ] };
    case 3: return { layers: [
      { type: "point", size: 6, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 0.8 }
    ] };
    default:
      return { layers: [
        { type: "line", length: 24, lineWidth: 2 },
        { type: "point", shape: "circle", size: 5, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 0.7 },
        { type: "swatch", width: 16, height: 11, stroke: "#ffffff", strokeWidth: 0.7 }
      ] };
  }
}

function legend(target, index, {
  orderChannel, orderValues, continuous = false, kind = "filled", temporal = false
} = {}) {
  const legacy = index === 14;
  const position = legacy
    ? "bottom"
    : index === 23
      ? "bottom"
    : index % 20 === 5
      ? "left"
      : index % 20 === 10
        ? "top"
        : index % 20 === 15 ? "bottom" : "right";
  const side = position === "right" || position === "left";
  if (continuous === "interval") {
    return {
      target,
      channels: ["color"],
      layout: "edge",
      position,
      align: side ? "center" : "left",
      direction: side ? "vertical" : "horizontal",
      columns: side ? 1 : 3,
      offset: 28,
      titlePosition: side ? "top" : "left",
      title: "Measured intervals",
      symbol: { width: 18, height: 12, stroke: "#ffffff", strokeWidth: 0.8 },
      itemGap: 20,
      labels: {
        offset: 8, format: temporal ? (index % 2 === 0 ? "%Y" : "%Y-%m") : FORMATS[index % FORMATS.length], color: "#334155",
        fontSize: 11, fontFamily: "sans-serif", fontWeight: 500
      },
      titleStyle: {
        color: "#0f172a", fontSize: 12, fontFamily: "sans-serif", fontWeight: 700
      },
      border: index % 2 === 0 ? false : true
    };
  }
  if (continuous === "gradient") {
    return {
      target,
      channels: ["color"],
      position,
      align: side ? "center" : ["left", "center", "right"][index % 3],
      offset: 28,
      titlePosition: "top",
      title: "Measured color",
      count: 5,
      gradient: { length: 140, thickness: 14 },
      labels: {
        offset: 8, format: temporal ? (index % 2 === 0 ? "%Y" : "%Y-%m") : FORMATS[index % FORMATS.length], color: "#334155",
        fontSize: 11, fontFamily: "sans-serif", fontWeight: 500
      },
      titleStyle: {
        color: "#0f172a", fontSize: 12, fontFamily: "sans-serif", fontWeight: 700
      },
      border: index % 3 === 0
        ? true
        : index % 3 === 1
          ? false
          : { color: "#cbd5e1", lineWidth: 1, padding: 8, background: "#ffffff" }
    };
  }
  const order = orderChannel !== undefined && index % 3 === 2
    ? { channel: orderChannel }
    : orderValues !== undefined && index % 2 === 1
      ? { values: orderValues }
      : "scale";
  if (legacy) {
    return {
      target,
      channels: ["color"],
      layout: "legacy-bottom",
      order,
      position: "bottom",
      align: ["left", "center", "right"][index % 3],
      title: "Source group",
      symbol: legendSymbol(index, kind),
      itemGap: 20,
      labels: {
        offset: 8, format: "auto", color: "#334155", fontSize: 11,
        fontFamily: "sans-serif", fontWeight: 500
      },
      titleStyle: {
        color: "#0f172a", fontSize: 12, fontFamily: "sans-serif", fontWeight: 700
      },
      border: index % 3 === 0
        ? true
        : index % 3 === 1
          ? false
          : { color: "#cbd5e1", lineWidth: 1, padding: 8, background: "#ffffff" }
    };
  }
  return {
    target,
    channels: ["color"],
    layout: "edge",
    order,
    position,
    align: side ? "center" : index % 20 === 10 ? "right" : "left",
    direction: side ? "vertical" : index % 2 === 0 ? "horizontal" : "vertical",
    columns: side ? 1 : 3,
    offset: 28,
    titlePosition: side ? "top" : index % 2 === 0 ? "top" : "left",
    title: "Source group",
    symbol: legendSymbol(index, kind),
    itemGap: 20,
    labels: {
      offset: 8, format: "auto",
      color: "#334155", fontSize: 11, fontFamily: "sans-serif", fontWeight: 500
    },
    titleStyle: {
      color: "#0f172a", fontSize: 12, fontFamily: "sans-serif", fontWeight: 700
    },
    border: index % 3 === 0
      ? true
      : index % 3 === 1
        ? false
        : { color: "#cbd5e1", lineWidth: 1, padding: 8, background: "#ffffff" }
  };
}

function cartesianGuides({
  id, coordinate, xScale, yScale, index, hasColor = true, horizon = false,
  rug = false, xDiscrete = false, yDiscrete = false, continuousColor = false,
  legendKind = "filled", legendOrderValues, legendOrderChannel,
  legendTemporal = false, xValues, yValues, xFormat = "auto", yFormat = "auto"
}) {
  if (index === 0) return false;
  if (index === 1) return { axes: false, grid: false, legend: false };
  if (horizon) {
    return {
      axes: index % 5 === 0 ? false : {
        coordinate: { id: coordinate, type: index % 2 === 0 ? "cartesian" : "auto" },
        x: index % 7 === 0 ? false : axis(xScale, coordinate, index, "x", false, xValues, xFormat),
        y: false
      },
      grid: index % 5 === 1 ? false : {
        horizontal: false,
        vertical: index === 9 ? false : index % 6 === 0 ? true : {
          scale: xScale, coordinate,
          ...(xValues === undefined ? { count: 4 } : { values: xValues }),
          color: "#dbeafe",
          lineWidth: 0.8, strokeDash: [2, 3]
        }
      },
      legend: false
    };
  }
  return {
    axes: index % 5 === 0 ? false : {
      coordinate: { id: coordinate, type: index % 2 === 0 ? "cartesian" : "auto" },
      x: index % 7 === 0 ? false : axis(xScale, coordinate, index, "x", xDiscrete, xValues, xFormat),
      y: index % 7 === 1 ? false : axis(yScale, coordinate, index + 1, "y", yDiscrete, yValues, yFormat)
    },
    grid: index % 5 === 1 ? false : {
      vertical: xDiscrete || index === 8 ? false : index === 4 || xValues === undefined && index % 6 === 0 ? true : {
        scale: xScale, coordinate,
        ...(xValues === undefined ? { count: 4 } : { values: xValues }),
        color: "#dbeafe",
        lineWidth: 0.8, strokeDash: [2, 3]
      },
      horizontal: yDiscrete || index === 9 ? false : yValues === undefined && index % 6 === 1 ? true : {
        scale: yScale, coordinate,
        ...(yValues === undefined ? { count: 4 } : { values: yValues }),
        color: "#e2e8f0",
        lineWidth: 0.8, strokeDash: [3, 2]
      }
    },
    legend: rug || !hasColor || index % 5 === 2
      ? false
      : legend(id, index, {
          continuous: continuousColor,
          kind: legendKind,
          orderValues: legendOrderValues,
          orderChannel: legendOrderChannel,
          temporal: legendTemporal
        })
  };
}

function polarAxis(scaleId, coordinate, index, radial = false, discrete = false, values) {
  const temporalTheta = !radial && !discrete &&
    THETA_TYPES[index % THETA_TYPES.length] === "time";
  return {
    scale: scaleId,
    coordinate,
    ...(radial ? { angle: index % 2 === 0 ? 0 : 45 } : {}),
    line: index % 11 === 0 ? false : { color: "#475569", lineWidth: 1.2 },
    ticksAndLabels: index % 13 === 0 || temporalTheta
      ? false
      : radial
        ? index % 4 === 0
          ? ticksAndLabelsWithValues(index, values, true, ".1f")
          : { ...polarTicksAndLabels(index, false), count: 2 }
        : polarTicksAndLabels(index, discrete),
    title: index % 17 === 0 ? false : polarTitle(radial ? "Radius" : "Angle", index, radial)
  };
}

function polarGuides({
  id, coordinate, thetaScale, radiusScale, index, hasColor = true,
  discreteTheta: requestedDiscreteTheta, continuousColor = false,
  legendKind = "filled", legendOrderChannel, legendOrderValues,
  legendTemporal = false, radiusValues
}) {
  if (index === 0) return false;
  if (index === 1) return { axes: false, grid: false, legend: false };
  const discreteTheta = requestedDiscreteTheta ??
    ["band", "point"].includes(THETA_TYPES[index % THETA_TYPES.length]);
  return {
    axes: index % 5 === 0 ? false : {
      coordinate: { id: coordinate, type: index % 2 === 0 ? "polar" : "auto" },
      theta: index % 7 === 0 ? false : polarAxis(thetaScale, coordinate, index, false, discreteTheta),
      radius: index % 7 === 1
        ? false
        : polarAxis(radiusScale, coordinate, index + 1, true, false, radiusValues)
    },
    grid: index % 5 === 1 ? false : {
      theta: index === 8 ? false : index % 6 === 0 ? true : {
        scale: thetaScale, coordinate,
        ...(discreteTheta ? { values: [1, 2, 3] } : { count: 4 }),
        color: "#dbeafe",
        lineWidth: 0.8, strokeDash: [2, 3]
      },
      radial: index === 9 ? false : index % 6 === 1 ? true : {
        scale: radiusScale, coordinate,
        ...(index % 4 === 0 ? { values: radiusValues } : { count: 4 }),
        color: "#e2e8f0",
        lineWidth: 0.8, strokeDash: [3, 2]
      }
    },
    legend: !hasColor || index % 5 === 2
      ? false
      : legend(id, index, {
          orderChannel: legendOrderChannel,
          orderValues: legendOrderValues,
          continuous: continuousColor,
          kind: legendKind,
          temporal: legendTemporal
        })
  };
}

function rugGuides({ coordinate, scale, horizontal, index, edge, values, format }) {
  if (index === 0) return false;
  if (index === 1) return { axes: false, grid: false, legend: false };
  return {
    axes: index % 5 === 0 ? false : {
      coordinate: { id: coordinate, type: index % 2 === 0 ? "cartesian" : "auto" },
      x: horizontal ? { ...axis(scale, coordinate, index, "x", false, values, format), position: edge } : false,
      y: horizontal ? false : { ...axis(scale, coordinate, index, "y", false, values, format), position: edge }
    },
    grid: index % 5 === 1 ? false : {
      vertical: horizontal ? index === 2 ? true : {
        scale, coordinate, ...(values === undefined ? { count: 4 } : { values }), color: "#dbeafe",
        lineWidth: 0.8, strokeDash: [2, 3]
      } : false,
      horizontal: horizontal ? false : index === 3 ? true : {
        scale, coordinate, ...(values === undefined ? { count: 4 } : { values }), color: "#e2e8f0",
        lineWidth: 0.8, strokeDash: [3, 2]
      }
    },
    legend: false
  };
}

function pieGuides(id, index, hasColor) {
  if (index === 0) return false;
  return {
    axes: false,
    grid: false,
    legend: !hasColor
      ? false
      : legend(id, index, {
          orderChannel: index % 3 === 2 ? "theta" : undefined,
          orderValues: [1, 2, 3]
        })
  };
}

function removeWitness(program, id) {
  return program.removeMark({ target: id });
}

function categoryValues(program, data, field) {
  const rows = program.semanticSpec.datasets.find(dataset => dataset.id === data)?.values ?? [];
  return [...new Set(rows.map(row => row[field]))];
}

function numericFieldValue(program, data, field) {
  const rows = program.semanticSpec.datasets.find(dataset => dataset.id === data)?.values ?? [];
  return rows.map(row => row[field]).find(Number.isFinite);
}

function fieldValue(program, data, field) {
  const rows = program.semanticSpec.datasets.find(dataset => dataset.id === data)?.values ?? [];
  return rows.find(row => row[field] !== undefined)?.[field];
}

function radialAggregateValue(program, weighted) {
  const rows = program.semanticSpec.datasets.find(dataset => dataset.id === "analysisRows")?.values ?? [];
  const bucket = rows[0]?.bucket;
  const group = rows.filter(row => row.bucket === bucket);
  return weighted
    ? group.reduce((sum, row) => sum + row.positiveY, 0)
    : group.length;
}

function appendPolarScatter(program, index) {
  const suffix = `matrix-polar-scatter-${index}`;
  const hasColor = index % 11 !== 0;
  const hasSize = index % 6 !== 0;
  const options = {
    id: suffix,
    data: "analysisRows",
    coordinate: `${suffix}-coordinate`,
    theta: thetaChannel(`${suffix}-theta`, index),
    radius: radiusChannel(`${suffix}-radius`, index),
    ...(hasColor ? {
      color: index === 14
        ? {
            ...colorChannel(`${suffix}-color`, index, { categorical: true }),
            field: "bucket", fieldType: "ordinal", palette: "tableau10"
          }
        : colorChannel(`${suffix}-color`, index, { temporal: [12, 13, 15].includes(index) })
    } : {}),
    ...(hasSize ? { size: sizeChannel(`${suffix}-size`, index) } : {}),
    shape: shapeChannel(`${suffix}-shape`, index),
    point: {
      ...(hasSize ? {} : { radius: 3 + index % 3 }),
      shape: POINT_SHAPES[index % POINT_SHAPES.length],
      ...(hasColor ? {} : { fill: "#2563eb" }),
      opacity: 0.55 + index / 100,
      stroke: index % 2 === 0 ? false : "#ffffff",
      ...(index % 2 === 0 ? {} : { strokeWidth: 0.8 })
    }
  };
  options.guides = polarGuides({
    id: suffix, coordinate: `${suffix}-coordinate`,
    thetaScale: `${suffix}-theta`, radiusScale: `${suffix}-radius`, index, hasColor,
    continuousColor: hasColor && [16, 20].includes(index)
      ? "gradient"
      : hasColor && index !== 14 && index >= 16
      ? "interval"
      : hasColor && index !== 14 && index >= 8 ? "gradient" : false,
    legendKind: "point",
    legendTemporal: [12, 13, 15].includes(index),
    legendOrderChannel: index === 14 ? "theta" : undefined,
    legendOrderValues: categoryValues(program, "analysisRows", "group"),
    radiusValues: [numericFieldValue(program, "analysisRows", "positiveY")]
  });
  return removeWitness(program.createPolarScatterPlot(options), suffix);
}

function appendPolarLine(program, index) {
  const suffix = `matrix-polar-line-${index}`;
  const hasColor = index % 11 !== 0;
  const options = {
    id: suffix,
    data: "analysisRows",
    coordinate: `${suffix}-coordinate`,
    theta: thetaChannel(`${suffix}-theta`, index),
    radius: radiusChannel(`${suffix}-radius`, index),
    groupBy: index === 14 || index % 2 === 1 ? ["group", "bucket"] : "group",
    ...(hasColor ? {
      color: {
        ...colorChannel(`${suffix}-color`, index, { categorical: true }),
        ...(index === 14 ? { field: "bucket", fieldType: "ordinal" } : {})
      }
    } : {}),
    strokeDash: index % 5 === 4
      ? { field: "group", fieldType: "nominal", scale: { id: `${suffix}-dash`, type: "ordinal", domain: "auto", range: "auto" } }
      : { value: DASHES[index % DASHES.length] },
    line: {
      strokeWidth: 1.5 + index % 3 * 0.25,
      curve: "linear",
      ...(hasColor ? {} : { stroke: "#475569" }),
      opacity: 0.5 + index / 100,
      closed: index % 2 === 0
    }
  };
  options.guides = polarGuides({
    id: suffix, coordinate: `${suffix}-coordinate`,
    thetaScale: `${suffix}-theta`, radiusScale: `${suffix}-radius`, index, hasColor,
    legendKind: "path",
    legendOrderChannel: index === 14 ? "theta" : undefined,
    legendOrderValues: categoryValues(program, "analysisRows", "group"),
    radiusValues: [numericFieldValue(program, "analysisRows", "positiveY")]
  });
  return removeWitness(program.createPolarLinePlot(options), suffix);
}

function appendRadar(program, index) {
  const suffix = `matrix-radar-${index}`;
  const source = `${suffix}-data`;
  const long = ![3, 7, 11, 19].includes(index);
  const hasColor = index % 11 !== 0;
  const next = program.createSummaryData({
    id: source,
    source: "analysisRows",
    groupBy: long ? ["group", "bucket"] : "group",
    aggregates: [
      { op: "mean", field: "positiveX", as: "positiveX" },
      { op: "mean", field: "positiveY", as: "positiveY" },
      { op: "mean", field: "size", as: "size" }
    ]
  });
  const options = {
    id: suffix,
    data: source,
    coordinate: `${suffix}-coordinate`,
    groupBy: index % 2 === 0 ? "group" : ["group"],
    order: long ? [1, 2, 3] : ["positiveX", "positiveY", "size"],
    ...(hasColor ? { color: colorChannel(`${suffix}-color`, index, { categorical: true }) } : {}),
    strokeDash: index % 5 === 4
      ? { field: "group", fieldType: "nominal", scale: { id: `${suffix}-dash`, type: "ordinal", domain: "auto", range: "auto" } }
      : { value: DASHES[index % DASHES.length] },
    line: {
      strokeWidth: 1.5, curve: "linear",
      ...(hasColor ? {} : { stroke: "#475569" }), opacity: 0.58, closed: true
    },
    ...(long
      ? {
          category: {
            field: "bucket", fieldType: index % 2 === 0 ? "nominal" : "ordinal",
            scale: categoryScale(`${suffix}-theta`, index)
          },
          value: radiusChannel(`${suffix}-radius`, index)
        }
      : {
          wide: {
            fields: ["positiveX", "positiveY", "size"],
            as: { key: "radarMeasure", value: "radarValue" }
          }
        })
  };
  options.guides = long ? polarGuides({
    id: suffix, coordinate: `${suffix}-coordinate`,
    thetaScale: `${suffix}-theta`, radiusScale: `${suffix}-radius`, index, hasColor,
    discreteTheta: true,
    legendKind: "path",
    legendOrderValues: categoryValues(next, source, "group"),
    radiusValues: [numericFieldValue(next, source, "positiveY")]
  }) : false;
  return removeWitness(next.createRadarPlot(options), suffix);
}

function appendRug(program, index) {
  const suffix = `matrix-rug-${index}`;
  const horizontal = index % 2 === 0;
  const temporal = index >= 12;
  const temporalUnit = temporal
    ? TEMPORAL_UNITS[Math.floor((index - 12) / 2) % TEMPORAL_UNITS.length]
    : undefined;
  const measure = measureChannel(`${suffix}-${horizontal ? "x" : "y"}`, index, {
    temporal,
    temporalUnit
  });
  if (index === 12) Object.assign(measure.scale, { nice: false, clamp: true });
  if (index === 13) Object.assign(measure.scale, { nice: true, clamp: false, reverse: true });
  const edge = horizontal
    ? index % 4 === 0 ? "bottom" : "top"
    : index % 4 === 1 ? "left" : "right";
  const options = {
    id: suffix,
    data: "analysisRows",
    coordinate: `${suffix}-coordinate`,
    ...(horizontal
      ? { x: measure, edge }
      : { y: measure, edge }),
    tick: {
      length: 10 + index % 4,
      stroke: "#334155",
      strokeWidth: 1 + index % 2 * 0.25,
      opacity: 0.55 + index / 100
    }
  };
  const coordinate = `${suffix}-coordinate`;
  const scale = `${suffix}-${horizontal ? "x" : "y"}`;
  const values = index === 4 || index === 7
    ? [fieldValue(program, "analysisRows", measure.field)]
    : undefined;
  options.guides = rugGuides({
    coordinate, scale, horizontal, index, edge, values,
    format: !temporal && [3, 4].includes(index) ? ".1f" : "auto"
  });
  if (options.guides !== false && options.guides.axes !== false) {
    const guide = horizontal ? options.guides.axes.x : options.guides.axes.y;
    if (horizontal && index === 12) guide.ticksAndLabels = false;
    if (horizontal && index === 14) guide.title = false;
    if (horizontal && index === 18 && guide.ticksAndLabels !== false) {
      Object.assign(guide.ticksAndLabels.labels, {
        overlap: "error", wrap: "character", maxWidth: 160, lineHeight: 16
      });
      guide.title.rotation.unit = "radians";
    }
    if (!horizontal && index === 21 && guide.ticksAndLabels !== false) {
      Object.assign(guide.ticksAndLabels.labels, {
        overlap: "allow", wrap: "word", maxWidth: 160, lineHeight: 16
      });
      guide.title.rotation.unit = "degrees";
    }
  }
  return removeWitness(program.createRugPlot(options), suffix);
}

function appendStrip(program, index) {
  const suffix = `matrix-strip-${index}`;
  const hasColor = index % 11 !== 0;
  const hasSize = index % 6 !== 0;
  const mode = [16, 17, 20, 21].includes(index) ? 2 : index % 4;
  let positions;
  let jitter;
  if (mode === 0) {
    positions = { x: measureChannel(`${suffix}-x`, index) };
    jitter = { maxOffset: { pixels: 7 + index % 3 }, seed: index, key: "id" };
  } else if (mode === 1) {
    positions = {
      x: measureChannel(`${suffix}-x`, index),
      y: { field: "bucket", fieldType: "nominal", scale: categoryScale(`${suffix}-y`, index, "band") }
    };
    jitter = { maxOffset: { band: 0.28 }, seed: `strip-${index}`, key: "id" };
  } else if (mode === 2) {
    const temporalUnit = index === 10 ? "auto" : index === 18 ? "year" : index === 22 ? "timestamp" : undefined;
    positions = {
      x: {
        field: "bucket",
        fieldType: index === 6 ? "nominal" : "ordinal",
        scale: categoryScale(`${suffix}-x`, index, index % 8 === 6 ? "band" : "point")
      },
      y: measureChannel(`${suffix}-y`, index, {
        temporal: temporalUnit !== undefined,
        temporalUnit
      })
    };
    if (index === 6) positions.x.scale.unknown = 0;
    if (index === 14) positions.y.scale.unknown = 0;
    if (index === 17) {
      positions.y.scale.type = "sqrt";
      positions.y.scale.zero = true;
      delete positions.y.scale.exponent;
    }
    jitter = { maxOffset: { band: 0.24 }, seed: index, key: "id" };
  } else {
    positions = {
      x: measureChannel(`${suffix}-x`, index, { temporal: true }),
      y: { field: "bucket", fieldType: "ordinal", scale: categoryScale(`${suffix}-y`, index) }
    };
    jitter = false;
  }
  const options = {
    id: suffix,
    data: "analysisRows",
    coordinate: `${suffix}-coordinate`,
    ...positions,
    jitter,
    ...(hasColor ? {
      color: [5, 14].includes(index)
        ? {
            ...colorChannel(`${suffix}-color`, index, { categorical: true }),
            field: "bucket", fieldType: "ordinal",
            ...(index === 14 ? { palette: "tableau10" } : {})
          }
        : colorChannel(`${suffix}-color`, index, { temporal: [12, 13, 15].includes(index) })
    } : {}),
    ...(hasSize ? { size: sizeChannel(`${suffix}-size`, index) } : {}),
    shape: shapeChannel(`${suffix}-shape`, index),
    point: {
      ...(hasSize ? {} : { radius: 3 + index % 3 }),
      shape: POINT_SHAPES[index % POINT_SHAPES.length],
      ...(hasColor ? {} : { fill: "#2563eb" }),
      opacity: 0.55 + index / 100,
      stroke: index % 2 === 0 ? false : "#ffffff",
      ...(index % 2 === 0 ? {} : { strokeWidth: 0.8 })
    }
  };
  options.guides = cartesianGuides({
    id: suffix, coordinate: `${suffix}-coordinate`, xScale: `${suffix}-x`, yScale: `${suffix}-y`, index,
    hasColor,
    continuousColor: hasColor && [16, 20].includes(index)
      ? "gradient"
      : hasColor && ![5, 14].includes(index) && index >= 16
      ? "interval"
      : hasColor && ![5, 14].includes(index) && index >= 8 ? "gradient" : false,
    xDiscrete: mode === 2,
    yDiscrete: mode === 1 || mode === 3,
    legendKind: "point",
    legendTemporal: [12, 13, 15].includes(index),
    legendOrderValues: categoryValues(program, "analysisRows", "group"),
    legendOrderChannel: index === 5 ? "y" : index === 14 ? "x" : undefined,
    xValues: index === 12
      ? [numericFieldValue(program, "analysisRows", "positiveX")]
      : undefined,
    yValues: index === 14
      ? [numericFieldValue(program, "analysisRows", "positiveX")]
      : undefined,
    xFormat: index === 4 ? ".1f" : "auto",
    yFormat: index === 14 ? ".1f" : "auto"
  });
  if (mode === 0 && options.guides !== false) {
    if (options.guides.axes !== false) options.guides.axes.y = false;
    if (options.guides.grid !== false) options.guides.grid.horizontal = false;
  }
  if (index === 18 && options.guides !== false) {
    if (options.guides.axes !== false && options.guides.axes.y !== false) {
      options.guides.axes.y.ticksAndLabels = false;
      options.guides.axes.y.title = false;
    }
    if (options.guides.grid !== false) options.guides.grid.horizontal = true;
  }
  return removeWitness(program.createStripPlot(options), suffix);
}

function appendArea(program, index) {
  const suffix = `matrix-area-${index}`;
  const branch = index % 6;
  const layout = [0, 1, 4].includes(branch)
    ? "overlay"
    : branch === 5
      ? index === 11 ? "overlay" : ["diverging", "fill", "overlay", "stack"][index % 4]
      : ["center", "diverging", "fill", "overlay", "stack"][index % 5];
  const source = `${suffix}-data`;
  let next = program.createData({
    id: source,
    values: ["A", "B"].flatMap((group, groupIndex) => [1, 2, 3].map(position => ({
      group,
      bucket: position,
      positiveX: position,
      positiveY: position + groupIndex + 1,
      lower: 0,
      upper: position + groupIndex + 1,
      timeUnique: new Date(Date.UTC(2000 + position, 0, 1)).toISOString(),
      timeTimestamp: Date.UTC(2000 + position, 0, 1),
      calendarYear: String(2000 + position)
    })))
  });
  const xScale = `${suffix}-x`;
  const yScale = `${suffix}-y`;
  let positions;
  if (branch === 0) {
    positions = {
      valueChannel: "y",
      x: measureChannel(xScale, index),
      y: areaMeasureChannel(yScale, index + 1),
      baseline: areaBaseline(index + 1)
    };
  } else if (branch === 1) {
    const temporalUnit = TEMPORAL_UNITS[Math.floor(index / 6) % TEMPORAL_UNITS.length];
    positions = {
      x: measureChannel(xScale, index, { temporal: true, temporalUnit }),
      y: areaMeasureChannel(yScale, index), baseline: areaBaseline(index)
    };
  } else if (branch === 2) {
    positions = {
      x: { field: "positiveX", fieldType: "quantitative", scale: numericScale(xScale, index) },
      y: { lower: "lower", upper: { datum: 0 }, scale: numericScale(yScale, 0) }
    };
  } else if (branch === 3) {
    positions = {
      x: { field: "positiveX", fieldType: "quantitative", scale: numericScale(xScale, index) },
      y: { lower: { datum: 0 }, upper: "upper", scale: numericScale(yScale, 0) }
    };
  } else if (branch === 4) {
    positions = {
      valueChannel: "x",
      x: areaMeasureChannel(xScale, index),
      y: measureChannel(yScale, index + 1),
      baseline: areaBaseline(index)
    };
  } else {
    const temporalUnit = TEMPORAL_UNITS[Math.floor(index / 6) % TEMPORAL_UNITS.length];
    positions = {
      valueChannel: "x",
      x: index === 11
        ? { lower: "lower", upper: { datum: 10 }, scale: numericScale(xScale, 0) }
        : { lower: { datum: 0 }, upper: "upper", scale: numericScale(xScale, 0) },
      y: measureChannel(yScale, index, { temporal: true, temporalUnit })
    };
  }
  const options = {
    id: suffix,
    data: source,
    coordinate: `${suffix}-coordinate`,
    ...positions,
    groupBy: index % 2 === 0 ? "group" : ["group"],
    layout,
    missing: index % 2 === 0 ? "break" : "error",
    color: colorChannel(`${suffix}-color`, index, { categorical: true }),
    area: {
      fill: index % 11 === 0 ? "#bfdbfe" : undefined,
      opacity: 0.2 + index / 100,
      stroke: "#2563eb",
      strokeWidth: 1,
      curve: CURVES[index % CURVES.length]
    }
  };
  if (options.area.fill !== undefined) delete options.color;
  options.guides = cartesianGuides({
    id: suffix, coordinate: `${suffix}-coordinate`, xScale, yScale, index,
    hasColor: options.color !== undefined,
    legendOrderValues: ["A", "B"],
    xValues: [12, 18].includes(index) ? [1] : undefined,
    yValues: [12, 18].includes(index) ? [2] : undefined,
    xFormat: index === 4 ? ".1f" : "auto",
    yFormat: index === 3 ? ".1f" : "auto"
  });
  return removeWitness(next.createAreaPlot(options), suffix);
}

function appendDensity(program, index) {
  const suffix = `matrix-density-${index}`;
  const grouped = index !== 0;
  const options = {
    id: suffix,
    data: "analysisRows",
    coordinate: `${suffix}-coordinate`,
    field: "positiveY",
    groupBy: grouped ? "group" : false,
    bandwidth: index % 2 === 0 ? "auto" : 0.8,
    extent: index % 3 === 0
      ? "auto"
      : [POSITION_TYPES[index % POSITION_TYPES.length] === "log" ? 1 : 0, 1000000],
    steps: 32 + index,
    kernel: ["epanechnikov", "gaussian", "triangular", "uniform"][index % 4],
    normalization: index % 2 === 0 ? "unit" : "count",
    as: ["densityValue", "densityEstimate"],
    densityChannel: index % 2 === 0 ? "x" : "y",
    valueScale: numericScale(`${suffix}-value`, index),
    densityScale: index === 13
      ? { ...densityScale(`${suffix}-density`, index + 1), domain: [0, 1], zero: false }
      : densityScale(`${suffix}-density`, index + 1),
    ...(grouped ? { color: colorChannel(`${suffix}-color`, index, { categorical: true, layout: true }) } : {}),
    area: {
      fill: grouped ? undefined : "#bfdbfe",
      opacity: 0.28,
      stroke: "#2563eb",
      strokeWidth: 1,
      curve: CURVES[index % CURVES.length]
    }
  };
  const xScale = index % 2 === 0 ? `${suffix}-density` : `${suffix}-value`;
  const yScale = index % 2 === 0 ? `${suffix}-value` : `${suffix}-density`;
  options.guides = cartesianGuides({
    id: suffix, coordinate: `${suffix}-coordinate`, xScale, yScale, index,
    hasColor: grouped,
    legendOrderValues: grouped
      ? categoryValues(program, "analysisRows", options.groupBy)
      : undefined,
    xValues: [12, 18].includes(index) ? [0] : undefined,
    yValues: [12, 18].includes(index)
      ? [numericFieldValue(program, "analysisRows", "positiveY")]
      : undefined,
    xFormat: index === 4 ? ".1f" : "auto",
    yFormat: index === 3 ? ".1f" : "auto"
  });
  return removeWitness(program.createDensityPlot(options), suffix);
}

function appendHorizon(program, index) {
  const suffix = `matrix-horizon-${index}`;
  const temporalUnit = TEMPORAL_UNITS[index % 3];
  const bands = 2 + index % 3;
  const options = {
    id: suffix,
    data: "analysisRows",
    coordinate: `${suffix}-coordinate`,
    x: {
      field: index % 4 === 0 ? "positiveX" : temporalField(temporalUnit),
      fieldType: index % 4 === 0 ? "quantitative" : "temporal",
      ...(index % 4 === 0 ? {} : { temporalUnit }),
      scale: index % 4 === 0
        ? numericScale(`${suffix}-x`, index)
        : temporalScale(`${suffix}-x`, index)
    },
    y: {
      field: "positiveY", fieldType: "quantitative",
      scale: numericScale(`${suffix}-y`, index, { horizon: true })
    },
    groupBy: index % 5 === 0 ? false : "group",
    bands,
    baseline: index % 2 === 0 ? 0 : 1,
    extent: index % 3 === 0 ? "auto" : 1000000,
    resolve: index % 2 === 0 ? "shared" : "independent",
    missing: index % 2 === 0 ? "break" : "error",
    overflow: index % 2 === 0 ? "clip" : "error",
    palette: {
      positive: horizonPalette(index, bands),
      negative: horizonPalette(index, bands, true)
    },
    area: {
      opacity: 0.45,
      stroke: "#475569",
      strokeWidth: 0.8,
      curve: CURVES[index % CURVES.length]
    }
  };
  options.guides = cartesianGuides({
    id: suffix, coordinate: `${suffix}-coordinate`,
    xScale: `${suffix}-x`, yScale: `${suffix}-y`, index,
    hasColor: false, horizon: true,
    xFormat: index === 4 ? ".1f" : "auto",
    xValues: index === 4
      ? [numericFieldValue(program, "analysisRows", "positiveX")]
      : undefined
  });
  return removeWitness(program.createHorizonPlot(options), suffix);
}

function radialOptions(program, action, index) {
  const suffix = `matrix-${action.replace("create", "").replace("Plot", "").toLowerCase()}-${index}`;
  const weighted = index % 2 === 0;
  const hasColor = index % 11 !== 0;
  const measured = action !== "createPiePlot";
  const options = {
    id: suffix,
    data: "analysisRows",
    coordinate: `${suffix}-coordinate`,
    category: {
      field: "bucket", fieldType: index % 2 === 0 ? "nominal" : "ordinal",
      scale: pieCategoryScale(`${suffix}-theta`, index)
    },
    ...(weighted ? { value: "positiveY", aggregate: "sum" } : { aggregate: "count" }),
    color: hasColor
      ? {
          ...colorChannel(`${suffix}-color`, index, { categorical: true }),
          field: "bucket",
          fieldType: index % 2 === 0 ? "nominal" : "ordinal"
        }
      : false,
    ...(measured ? { radiusScale: numericScale(`${suffix}-radius`, index, { measured: true }) } : {}),
    arc: {
      innerRadius: index % 3 * 0.15,
      padAngle: measured ? 0 : index % 3,
      ...(hasColor ? {} : { fill: "#60a5fa" }),
      opacity: 0.55 + index / 100,
      stroke: "#ffffff",
      strokeWidth: 0.8
    }
  };
  options.guides = measured
    ? polarGuides({
        id: suffix, coordinate: `${suffix}-coordinate`,
        thetaScale: `${suffix}-theta`, radiusScale: `${suffix}-radius`, index,
        hasColor, discreteTheta: true,
        legendKind: "filled", legendOrderValues: [1, 2, 3],
        legendOrderChannel: "theta",
        radiusValues: [radialAggregateValue(program, weighted)]
      })
    : pieGuides(suffix, index, hasColor);
  return { suffix, options };
}

function appendRadial(program, action, index) {
  const { suffix, options } = radialOptions(program, action, index);
  return removeWitness(program[action](options), suffix);
}

export function appendHierarchicalFacadeCoverage(program) {
  let next = program;
  for (let index = 0; index < REALISTIC_HIERARCHICAL_FACADE_PROFILE_COUNT; index += 1) {
    const steps = [
      ["createAreaPlot", appendArea],
      ["createDensityPlot", appendDensity],
      ["createHorizonPlot", appendHorizon],
      ["createPiePlot", (current, profile) => appendRadial(current, "createPiePlot", profile)],
      ["createPolarLinePlot", appendPolarLine],
      ["createPolarScatterPlot", appendPolarScatter],
      ["createRadarPlot", appendRadar],
      ["createRadialBarPlot", (current, profile) => appendRadial(current, "createRadialBarPlot", profile)],
      ["createRosePlot", (current, profile) => appendRadial(current, "createRosePlot", profile)],
      ["createRugPlot", appendRug],
      ["createStripPlot", appendStrip]
    ];
    for (const [action, append] of steps) {
      try {
        next = append(next, index);
      } catch (error) {
        error.message = `Hierarchical facade profile ${index} ${action}: ${error.message}`;
        throw error;
      }
    }
  }
  return next;
}
