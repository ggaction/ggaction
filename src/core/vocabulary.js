export const MARK_TYPES = Object.freeze([
  "point",
  "line",
  "bar",
  "area",
  "arc",
  "rule",
  "tick",
  "text",
  "rect"
]);

export const MARK_GRAPHIC_TYPES = Object.freeze({
  point: Object.freeze(["circle", "rect", "path", "collection"]),
  line: Object.freeze(["path"]),
  bar: Object.freeze(["rect", "collection"]),
  area: Object.freeze(["path"]),
  arc: Object.freeze(["path"]),
  rule: Object.freeze(["line"]),
  tick: Object.freeze(["line"]),
  text: Object.freeze(["text"]),
  rect: Object.freeze(["rect", "collection"])
});

export const ENCODING_CHANNELS = Object.freeze([
  "x",
  "y",
  "x2",
  "y2",
  "xOffset",
  "yOffset",
  "theta",
  "radius",
  "color",
  "stroke",
  "strokeDash",
  "strokeWidth",
  "size",
  "shape",
  "angle",
  "group",
  "pathOrder",
  "opacity",
  "text",
  "dx",
  "dy"
]);

const CARTESIAN_MARK_TYPES = Object.freeze([
  "point", "line", "bar", "area", "rule", "tick", "text", "rect"
]);
const POLAR_MARK_TYPES = Object.freeze(["point", "line", "arc"]);

export const POSITION_CHANNEL_DEFINITIONS = Object.freeze({
  x: Object.freeze({
    family: "cartesian",
    role: "primary",
    scaleChannel: "x",
    coordinate: Object.freeze({ id: "main", type: "cartesian" }),
    guideChannel: "x",
    gridDirection: "vertical",
    markTypes: CARTESIAN_MARK_TYPES
  }),
  y: Object.freeze({
    family: "cartesian",
    role: "primary",
    scaleChannel: "y",
    coordinate: Object.freeze({ id: "main", type: "cartesian" }),
    guideChannel: "y",
    gridDirection: "horizontal",
    markTypes: CARTESIAN_MARK_TYPES
  }),
  x2: Object.freeze({
    family: "cartesian",
    role: "secondary",
    scaleChannel: "x",
    coordinate: Object.freeze({ id: "main", type: "cartesian" }),
    markTypes: Object.freeze(["area", "rule", "rect"])
  }),
  y2: Object.freeze({
    family: "cartesian",
    role: "secondary",
    scaleChannel: "y",
    coordinate: Object.freeze({ id: "main", type: "cartesian" }),
    markTypes: Object.freeze(["area", "rule", "rect"])
  }),
  xOffset: Object.freeze({
    family: "cartesian",
    role: "offset",
    scaleChannel: "xOffset",
    coordinate: Object.freeze({ id: "main", type: "cartesian" }),
    markTypes: Object.freeze(["bar", "point", "rule"])
  }),
  yOffset: Object.freeze({
    family: "cartesian",
    role: "offset",
    scaleChannel: "yOffset",
    coordinate: Object.freeze({ id: "main", type: "cartesian" }),
    markTypes: Object.freeze(["bar", "point", "rule"])
  }),
  theta: Object.freeze({
    family: "polar",
    role: "primary",
    scaleChannel: "theta",
    coordinate: Object.freeze({ id: "polar", type: "polar" }),
    guideChannel: "theta",
    gridDirection: "theta",
    markTypes: POLAR_MARK_TYPES
  }),
  radius: Object.freeze({
    family: "polar",
    role: "primary",
    scaleChannel: "radius",
    coordinate: Object.freeze({ id: "polar", type: "polar" }),
    guideChannel: "radius",
    gridDirection: "radial",
    markTypes: POLAR_MARK_TYPES
  })
});

export const SCALED_ENCODING_CHANNELS = Object.freeze(
  ENCODING_CHANNELS.filter(channel =>
    !["angle", "group", "pathOrder", "text", "dx", "dy"].includes(channel)
  )
);

export const POSITION_ENCODING_CHANNELS = Object.freeze(
  Object.keys(POSITION_CHANNEL_DEFINITIONS)
);

export const OFFSET_POSITION_CHANNELS = Object.freeze(
  POSITION_ENCODING_CHANNELS.filter(channel =>
    POSITION_CHANNEL_DEFINITIONS[channel].role === "offset"
  )
);

export const CARTESIAN_POSITION_CHANNELS = Object.freeze(
  POSITION_ENCODING_CHANNELS.filter(channel =>
    POSITION_CHANNEL_DEFINITIONS[channel].family === "cartesian" &&
    POSITION_CHANNEL_DEFINITIONS[channel].role === "primary"
  )
);

export const POLAR_POSITION_CHANNELS = Object.freeze(
  POSITION_ENCODING_CHANNELS.filter(channel =>
    POSITION_CHANNEL_DEFINITIONS[channel].family === "polar" &&
    POSITION_CHANNEL_DEFINITIONS[channel].role === "primary"
  )
);

export const POSITION_CHANNELS = Object.freeze([
  ...CARTESIAN_POSITION_CHANNELS,
  ...POLAR_POSITION_CHANNELS
]);

export const FACET_SCALE_CHANNELS = Object.freeze([
  "x",
  "y",
  "xOffset",
  "yOffset",
  "theta",
  "r",
  "color",
  "stroke",
  "size",
  "shape",
  "opacity",
  "strokeDash",
  "parallelDimensions"
]);

export function facetSemanticChannel(channel) {
  return channel === "r" ? "radius" : channel;
}

export const FACET_SCALE_RESOLUTIONS = Object.freeze([
  "shared",
  "independent"
]);

export const FACET_TOP_LANE_MODES = Object.freeze(["stacked", "shared"]);
export const DEFAULT_FACET_TOP_LANE = "stacked";

export function getPositionChannelDefinition(channel) {
  return POSITION_CHANNEL_DEFINITIONS[channel];
}

export function normalizePositionScaleChannel(channel) {
  return POSITION_CHANNEL_DEFINITIONS[channel]?.scaleChannel ?? channel;
}

export function positionChannelsForFamily(family) {
  return POSITION_CHANNELS.filter(channel =>
    POSITION_CHANNEL_DEFINITIONS[channel].family === family
  );
}

export function getMarkGraphicTypes(markType) {
  return MARK_GRAPHIC_TYPES[markType];
}

export const COLOR_LAYOUTS = Object.freeze([
  "stack",
  "fill",
  "center",
  "group",
  "overlay",
  "diverging"
]);

export const STACK_MODES = Object.freeze(["zero", "normalize", "center"]);

export const CATEGORICAL_LEGEND_CHANNELS = Object.freeze([
  "color",
  "stroke",
  "strokeDash",
  "shape"
]);

export const LEGEND_CHANNELS = Object.freeze([
  ...CATEGORICAL_LEGEND_CHANNELS,
  "strokeWidth",
  "size",
  "opacity"
]);

export const LEGEND_CONFIG_KINDS = Object.freeze([
  "colorSize",
  "series",
  "color",
  "stroke",
  "size",
  "gradient",
  "interval",
  "strokeGradient",
  "strokeInterval",
  "opacity",
  "strokeWidth"
]);

export function includesVocabulary(vocabulary, value) {
  return vocabulary.includes(value);
}

export const PLOT_LEGEND_POSITIONS = Object.freeze(["top-left", "top-right", "bottom-left", "bottom-right"]);
export const LEGEND_POSITIONS = Object.freeze(["left", "right", "top", "bottom", ...PLOT_LEGEND_POSITIONS]);
export const LEGEND_BLOCK_LAYOUTS = Object.freeze(["row", "column", "wrap"]);

export const AXIS_RESOURCE_CHANNELS = Object.freeze(["x", "y", "theta", "radius", "parallel"]);

// Shared target policy for authoring and read-only action inspection.
const marks = (...types) => Object.freeze(types);
export const APPEARANCE_MARK_TYPES = Object.freeze({
  encodeColor: marks('point', 'line', 'bar', 'area', 'arc', 'rect', 'text'),
  encodeStroke: marks('point', 'line', 'area', 'bar', 'rect', 'arc', 'rule', 'tick'),
  encodeOpacity: marks('point', 'rule', 'line', 'area', 'bar', 'rect'),
  encodeStrokeWidth: marks('rule', 'line', 'rect'),
  encodeStrokeDash: marks('line', 'rule'),
  encodeSize: marks('point'),
  encodeShape: marks('point'),
  encodeAngle: marks('point', 'tick')
});

// Constant appearance can support more marks than field mapping. Inspection
// and execution share this distinction instead of advertising unusable fields.
export const FIXED_APPEARANCE_MARK_TYPES = Object.freeze({
  encodeStrokeWidth: marks('rule', 'line', 'rect', 'point', 'bar', 'area', 'arc', 'tick')
});

// Generated default action methods: start
export const DEFAULT_ACTION_METHODS = /* @__PURE__ */ Object.freeze(["createCanvas","editCanvas","fitCanvas","applyTextMetrics","removeTextMetrics","applyTheme","removeTheme","createData","applyDataUpdate","reviseData","removeData","removeScale","removeCoordinate","bindMarkData","filterData","createSummaryData","createBinData","createLookupData","createFlattenData","createFoldData","createParameter","editParameter","removeParameter","createComputedData","createNormalizedData","createSortedData","createCompleteData","createImputedData","createStackData","createDensityData","createRegressionData","createRegressionStatisticsData","createWindowData","createTimeUnitData","createBin2DData","editBin2DData","editDerivedData","editComputedData","editFilteredData","editLookupData","editFlattenData","editFoldData","editSummaryData","editBinData","editTimeUnitData","editWindowData","editDensityData","editStackData","editRegressionData","editRegressionStatisticsData","editIntervalData","editECDFData","editNormalizedData","editSortedData","editCompleteData","editImputedData","createIntervalData","createECDFData","createPointMark","createTickMark","createStatisticalReference","createReferenceLine","createReferenceBand","createMarkLabels","editMarkLabelSelection","editMarkLabelPlacement","removeMarkLabels","createAnnotation","createTextMark","editTextMark","layoutLabels","removeLabelLayout","editPointMark","editTickMark","jitterPoints","removeJitter","packPoints","removePointPacking","removeMark","createLineMark","editLineMark","createBarMark","editBarMark","createAreaMark","createRuleMark","editRuleMark","editAreaMark","encodeX","encodeY","encodeChannels","encodeX2","encodeColor","encodeStrokeDash","encodeStroke","encodeStrokeWidth","encodeSize","encodeShape","encodeAngle","encodeOpacity","encodeRadius","encodeTheta","encodeR","encodePointRadius","removePointRadius","encodeXOffset","encodeYOffset","encodeY2","encodeYRange","encodeXRange","encodeGroup","encodePathOrder","encodeParallelCoordinates","removePathOrder","orderCategories","removeCategoryOrder","removeEncoding","encodeText","encodeDx","encodeDy","encodeHistogram","encodeDensity","editDensity","encodeHorizon","editHorizon","encodeBarWidth","createRegression","editRegression","createErrorBar","editErrorBar","createErrorBand","editErrorBand","editErrorBandBoundary","createBoxPlot","editBoxPlot","createGradientPlot","editGradientPlot","createViolinPlot","editViolinPlot","createParallelAxes","createParallelAxis","editParallelAxis","removeParallelAxis","removeParallelAxes","createAxes","createXAxis","createYAxis","createXAxisLine","createYAxisLine","editXAxisLine","editYAxisLine","createXAxisTicks","createYAxisTicks","editXAxisTicks","editYAxisTicks","createXAxisLabels","createYAxisLabels","editXAxisLabels","editYAxisLabels","createXAxisTicksAndLabels","createYAxisTicksAndLabels","editXAxisTicksAndLabels","editYAxisTicksAndLabels","createXAxisTitle","createYAxisTitle","editXAxisTitle","editYAxisTitle","editAxes","editXAxis","editYAxis","removeXAxis","removeYAxis","createGrid","createHorizontalGrid","createVerticalGrid","editHorizontalGrid","editVerticalGrid","editGrid","removeGrid","createLegend","editLegend","editLegendBlock","editLegendLayout","editLegendLabels","editLegendTitle","editLegendSymbols","editLegendBorder","createGuides","removeLegend","createTitle","editTitle","removeTitle","createCoordinate","editCoordinate","createScale","editScale","editXScale","editYScale","editXOffsetScale","editYOffsetScale","editParallelScale","editThetaScale","editRScale","editColorScale","editStrokeScale","editSizeScale","editOpacityScale","editShapeScale","editStrokeWidthScale","editStrokeDashScale","createDerivedData","createRegressionBand","editRegressionBand","createRegressionLine","editRegressionLine","filterMarks","removeMarkFilter","selectMarks","editMarkSelection","removeMarkHighlight","removeMarkSelection","highlightMarks","editSemantic","createGraphics","editGraphics","createArcMark","editArcMark","createThetaAxis","createRadialAxis","editThetaAxis","editRadialAxis","removeThetaAxis","removeRadialAxis","createThetaAxisLine","editThetaAxisLine","createRadialAxisLine","editRadialAxisLine","createThetaAxisTicks","editThetaAxisTicks","createRadialAxisTicks","editRadialAxisTicks","createThetaAxisLabels","editThetaAxisLabels","createRadialAxisLabels","editRadialAxisLabels","createThetaAxisTitle","editThetaAxisTitle","createRadialAxisTitle","editRadialAxisTitle","createThetaGrid","createRadialGrid","editThetaGrid","editRadialGrid","editCompositionLayout","replaceCompositionChild","insertCompositionChild","removeCompositionChild","reorderCompositionChildren","facet","facetGrid","repeatCharts","editFacetSource","editFacetHeaders","editFacetScales","editFacetGuides","createScatterPlot","createTextPlot","createDotPlot","createLollipopPlot","createDumbbellPlot","editEndpointPlot","createECDFPlot","editECDFPlot","createIntervalPlot","createRegressionPlot","createLinePlot","createPolarScatterPlot","createPolarLinePlot","createRadarPlot","editRadarPlot","createRugPlot","createStripPlot","createBeeswarmPlot","createRaincloudPlot","editRaincloudPlot","createBarPlot","createHistogram","createHeatmap","createParallelCoordinates","createRectMark","editRectMark","createPiePlot","createRosePlot","createRadialBarPlot","createDensityPlot","createHorizonPlot","createAreaPlot","layoutSeries","createOverlay","editOverlay","createLayerPlot","createAdjacentPlot","editCompositionScales"]);
// Generated default action methods: end
