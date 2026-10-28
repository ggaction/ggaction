import {
      chart,
      hconcat,
      render,
      vconcat,
      type ChartProgram,
      type ApplyThemeOptions,
      type AxisLabelLayoutOptions,
      type DisplayLabelMap,
      type EditFacetHeadersOptions,
      type Bin2DDataOptions,
      type BinDataOptions,
      type EditBin2DDataOptions,
      type CreateBarPlotOptions,
      type CreateHeatmapOptions,
      type CreateHistogramOptions,
      type CreateLinePlotOptions,
      type CreatePolarLinePlotOptions,
      type CreatePolarScatterPlotOptions,
      type CreateRadarPlotOptions,
      type CreateRugPlotOptions,
      type CreateStripPlotOptions,
      type CreateBeeswarmPlotOptions,
      type CreateRaincloudPlotOptions,
      type EditRaincloudPlotOptions,
      type CreateECDFPlotOptions,
      type EditECDFPlotOptions,
      type ECDFDataOptions,
      type EncodeChannelsOptions,
      type EditCoordinateOptions,
      type PolarFrameOptions,
      type ColorLayout,
      type CompleteDataOptions,
      type ComputedDataOptions,
      type ComputedExpression,
      type DatasetCompleteTransform,
      type DatasetImputedTransform,
      type DatasetNormalizedTransform,
      type DerivedDataDependents,
      type EditComputedDataOptions,
      type EditDerivedDataOptions,
      type CreateParallelCoordinatesOptions,
      type OrderCategoriesOptions,
      type GradientPlotOptions,
      type HorizonEncodingOptions,
      type HistogramEncodingOptions,
      type EditHorizonOptions,
      type EditParallelScaleOptions,
      type EditXOffsetScaleOptions,
      type EditYOffsetScaleOptions,
      type FitCanvasOptions,
      type FacetGridOptions,
      type FacetScaleResolutions,
      type FoldDataOptions,
      type EditAxisOptions,
      type EditFacetSourceOptions,
      type CreateDerivedDataOptions,
      type CreateScatterPlotOptions,
      type CreateReferenceBandOptions,
      type CreateReferenceLineOptions,
      type DatasetTransform,
      type JitterMaxOffset,
      type JitterPointsOptions,
      type InsertCompositionChildOptions,
      type ImputedDataOptions,
      type PackPointsOptions,
      type PointPackingMaxOffset,
      type RequestedDatasetTransform,
      type NonPointQuantitativePositionScaleOptions,
      type NormalizedDataOptions,
      type OpacityScaleOptions,
      type ParallelCoordinatesEncodingOptions,
      type RemoveJitterOptions,
      type RemoveCompositionChildOptions,
      type RemovePointPackingOptions,
      type RemoveResourceOptions,
      type ReorderCompositionChildrenOptions,
      type RepeatChartsOptions,
      type ShapeScaleOptions,
      type SizeScaleOptions,
      type StrokeEncodingOptions,
      type EditStrokeScaleOptions,
      type StrokeWidthEncodingOptions,
      type ThetaEncodingOptions,
      type ThetaScaleOptions,
      type ThemeName,
      type SummaryDataOptions,
      type StackDataOptions,
      type StatisticalWeight,
      type ReferenceStatistic,
      type TimeUnitDataOptions,
      type ViolinPlotOptions,
      type WindowDataOptions,
      type YStackMode,
      type LinearNiceCountOptions,
      type AxisTickRounding
    } from "ggaction";
    import { action, ChartProgram as ExtensionProgram } from "ggaction/extension";
    import {
      renderToPDF, renderToPDFBuffer, type PDFBufferResult,
      type PDFMetadata,
      type PDFRenderResult
    } from "ggaction/pdf";
    import { renderToPNG, renderToPNGBuffer, type PNGBufferResult, type PNGRenderResult } from "ggaction/png";
    import {
      renderToSVG,
      type SVGRenderOptions
    } from "ggaction/svg";
    import {
      chart as basicChart,
      render as basicRender,
      type BasicChartProgram
    } from "ggaction/basic";
    import {
      comparePrograms,
      describeAction,
      getDatasetSchema,
      getMarkItems,
      inspectProgram,
      type ActionDescription,
      type ProgramComparison,
      type ProgramInspection
    } from "ggaction/inspection";

    const pickedRows = getMarkItems(chart(), { target: { childPath: ["left"], id: "points" } });
    const sourceRow: number | undefined = pickedRows[0]?.rows[0]?.index;
    chart().highlightMarks({ target: "labels", select: { rows: { data: "rows", indices: [0, 2] } }, fontSize: 24 });
    chart().selectMarks({ rows: { data: "rows", indices: [0] } }).editMarkSelection({ rows: { data: "rows", indices: [] } });
    // @ts-expect-error row positions are numeric
    chart().highlightMarks({ select: { rows: { data: "rows", indices: ["0"] } } });
    // @ts-expect-error inspection grain is closed
    getMarkItems(chart(), { grain: "series" });

    chart().editBarMark({blend:"difference"}).editBarMark({blend:"multiply"}).editBarMark({blend:"screen"}).editBarMark({blend:"normal"});
    // @ts-expect-error only the bar editor owns blend
    chart().createBarMark({blend:"difference"});
    // @ts-expect-error blend is a closed vocabulary
    chart().editBarMark({blend:"overlay"});
    // @ts-expect-error Basic does not expose appearance editing
    basicChart().editBarMark({blend:"difference"});

    chart().createCanvas({ plot: { width: 30, height: 30 } })
      .editCanvas({ plot: { width: 60, height: 45 } })
      .editCanvas({ plot: false, width: 300 });
    chart().facet({ field: "group", spacing: "plot", gap: 5 })
      .editCompositionLayout({ spacing: "canvas" });
    chart().repeatCharts({ channel: "y", fields: ["a", "b"], spacing: "plot" });
    chart().facetGrid({ rows: { field: "r" }, columns: { field: "c" }, spacing: "plot" });

    chart().createBoxPlot({ x: { field: "group", fieldType: "nominal" },
      summary: { min: "min", q1: "q1", median: "median", q3: "q3", max: "max" },
      width: { pixels: 30 }, median: { width: { pixels: 18 } }, whisker: { caps: false, stroke: "black" } })
      .editBoxPlot({ summary: false, width: { band: 0.6 }, median: { width: "auto" } });
    // @ts-expect-error fixed pixels and category fraction are mutually exclusive
    chart().createBoxPlot({ width: { pixels: 30, band: 0.6 } });
    // @ts-expect-error all five summary fields are required
    chart().createBoxPlot({ summary: { median: "median" } });

    chart().createTextPlot({ x: "x", y: "y", text: "label" });
    chart().createTextPlot({ x: { field: "x", scale: { type: "log" } }, y: { datum: 2 },
      text: { field: "value", format: ".1f" }, color: "group", style: { lineHeight: 18 } });
    // @ts-expect-error independent text has no source appearance inheritance
    chart().createTextPlot({ x: "x", y: "y", text: "label", style: { inheritColor: "fill" } });
    // @ts-expect-error positions are owned by the facade
    chart().createTextPlot({ x: { field: "x", coordinate: "other" }, y: "y", text: "label" });
    // @ts-expect-error source-owned content belongs to attached labels
    chart().createTextPlot({ x: "x", y: "y", text: { content: "share" } });
    // @ts-expect-error Full entry only
    basicChart().createTextPlot({ x: "x", y: "y", text: "label" });

    chart().createScatterPlot({ x: "x", y: "y", stroke: "group", point: { strokeWidth: 2 } });
    const linearNice: LinearNiceCountOptions = {count:10};
    const tickRounding: AxisTickRounding = "nearest";
    chart().createYAxis({ticksAndLabels:{rounding:tickRounding}});
    chart().editYAxisTicksAndLabels({rounding:tickRounding});
    basicChart().createYAxis({ticksAndLabels:{rounding:tickRounding}});
    // @ts-expect-error Cartesian rounding is not a Polar option
    chart().createThetaAxisTicks({rounding:tickRounding});
    chart().createLinePlot({x:"x",y:{field:"y",scale:{nice:linearNice}}});
    basicChart().createLinePlot({x:"x",y:{field:"y",scale:{nice:linearNice}}});
    chart().editYScale({nice:linearNice});
    // @ts-expect-error temporal position scales retain boolean nice
    chart().encodeX({field:"date",fieldType:"temporal",scale:{nice:linearNice}});
    // @ts-expect-error transformed position scales retain boolean nice
    chart().editYScale({type:"sqrt",nice:linearNice});
    chart().encodeYRange({ lower: { datum: 45000 }, upper: { datum: 0 }, scale: { domain: [0, 45000], nice: false } });
    chart().encodeXRange({ lower: { datum: 1 }, upper: "high" });
    // @ts-expect-error numeric range constants remain numeric
    chart().encodeXRange({ lower: { datum: "1" }, upper: "high" });
    // @ts-expect-error temporal datum ranges are not added by numeric wrapper support
    chart().encodeXRange({ lower: { datum: 1 }, upper: { datum: 2 }, fieldType: "temporal" });
    // @ts-expect-error Basic retains individual endpoint actions
    basicChart().encodeYRange({ lower: { datum: 1 }, upper: { datum: 2 } });
    const sampledPalette = { name: "turbo", count: 64, extent: [0.1, 0.9] } as const;
    for (const scale of [{ type: "sequential", palette: sampledPalette },
      { type: "sequential", range: { palette: sampledPalette } }] as const) {
      chart().encodeColor({ field: "value", fieldType: "quantitative", scale });
      basicChart().encodeColor({ field: "value", fieldType: "quantitative", scale });
      chart().encodeStroke({ field: "value", fieldType: "quantitative", scale });
      chart().encodeChannels({ target: "points", channels: {
        color: { field: "value", fieldType: "quantitative", scale },
        stroke: { field: "value", fieldType: "quantitative", scale }
      } });
      basicChart().createScatterPlot({ x: "x", y: "y", stroke: { field: "value", fieldType: "quantitative", scale } });
    }
    // @ts-expect-error palette counts remain numeric
    chart().encodeStroke({ field: "v", fieldType: "quantitative", scale: { palette: { name: "turbo", count: "64" } } });
    // @ts-expect-error nested palette names remain closed
    chart().encodeColor({ field: "v", fieldType: "quantitative", scale: { range: { palette: { name: "unknown" } } } });
    // @ts-expect-error range wrappers do not accept sampling keys directly
    chart().encodeColor({ field: "v", fieldType: "quantitative", scale: { range: { palette: "turbo", count: 64 } } });
    basicChart().createScatterPlot({ x: "x", y: "y", stroke: { field: "amount", fieldType: "quantitative" } });
    // @ts-expect-error Basic authors stroke through the facade
    basicChart().encodeStroke({ field: "group" });
    chart().createScatterPlot({ x: "x", y: "y", stroke: { field: "amount", fieldType: "quantitative" } });
    // @ts-expect-error constant stroke belongs in point
    chart().createScatterPlot({ x: "x", y: "y", stroke: { value: "red" } });

    chart().createLegend({ title: false });
    basicChart().createScatterPlot({ x: "x", y: "y", color: "group", guides: { legend: { title: false } } });
    // @ts-expect-error only false is a title visibility option
    chart().createLegend({ title: true });

    const program: ChartProgram = chart().createCanvas({ width: 100, height: 100 });
    const themeName: ThemeName = "dark";
    chart().facet({ field: "group", headers: { fontSize: 14, column: { side: "right", color: "red" } } });
    chart().facetGrid({ rows: { field: "row" }, columns: { field: "column" },
      headers: { row: { side: "left" }, column: { fontFamily: "serif" } } });
    // @ts-expect-error side belongs to a row/column role
    chart().facet({ field: "group", headers: { side: "right" } });
    basicChart().applyTheme({ theme: { base: "light", tokens: {
      fontSize: 14, fontWeight: 0, axisLabel: "red", axisLabelFontSize: 6, axisTitleFontSize: 18,
      axisLabelFontFamily: "serif", axisTitleFontFamily: "monospace"
    } } });
    chart().applyTheme({ theme: { base: "dark", tokens: { fontWeight: "bold" } } });
    // @ts-expect-error font weight is a string or number
    chart().applyTheme({ theme: { base: "dark", tokens: { fontWeight: false } } });
    // @ts-expect-error font size is numeric
    chart().applyTheme({ theme: { base: "light", tokens: { axisLabelFontSize: "large" } } });
    chart().createLegend({ position: "top-left", overflow: { maxItems: 29, summary: "ellipsis-count" } });
    chart().editLegend({ position: "bottom-right", overflow: false });
    basicChart().createScatterPlot({ x: "x", y: "y", color: "group",
      guides: { legend: { position: "top-right", overflow: { maxItems: 3 } } } });
    // @ts-expect-error categorical summary vocabulary is closed
    chart().createLegend({ overflow: { maxItems: 3, summary: "truncate" } });
    const themeOptions: ApplyThemeOptions = { theme: themeName };
    const themedProgram: ChartProgram = program.applyTheme(themeOptions).removeTheme();
    const transitionScene: import("ggaction/scene").TransitionScene = (await import("ggaction/scene")).createTransitionScene(program);
    void transitionScene;
    const inspection: ProgramInspection = inspectProgram(program);
    const description: ActionDescription = describeAction(program, {
      action: "createData",
      options: { id: "typedRows", values: [] }
    });
    const comparison: ProgramComparison = comparePrograms(program, themedProgram);
    const typedSchema = getDatasetSchema(
      chart().createData({ id: "typedRows", values: [{ x: 1 }] }),
      { data: "typedRows" }
    );
    void [inspection, description, comparison, typedSchema];
    const basicThemedProgram: BasicChartProgram = basicChart().applyTheme(themeOptions);
    const removeResourceOptions: RemoveResourceOptions = { id: "unused" };
    program.removeData(removeResourceOptions);
    program.removeScale(removeResourceOptions);
    program.removeCoordinate(removeResourceOptions);
    // @ts-expect-error Safe named-resource removal is Full only.
    basicChart().removeData(removeResourceOptions);
    // @ts-expect-error Safe removal requires one explicit string ID.
    program.removeScale({ id: ["x"] });
    const atomicOptions: EncodeChannelsOptions = {
      target: "point",
      channels: { x: { field: "y" }, y: { field: "x" } }
    };
    program.encodeChannels(atomicOptions);
    // @ts-expect-error Atomic multi-channel encoding is Full only.
    basicChart().encodeChannels(atomicOptions);
    const referenceStatistic: ReferenceStatistic = { op: "quantile", p: 0.5 };
    const referenceLineOptions: CreateReferenceLineOptions = {
      source: "point", axis: "y", statistic: referenceStatistic
    };
    const referenceBandOptions: CreateReferenceBandOptions = {
      source: "point", axis: "y",
      statistics: [{ op: "min" }, { op: "max" }]
    };
    program.createReferenceLine(referenceLineOptions);
    program.createReferenceBand(referenceBandOptions);
    // @ts-expect-error Dynamic reference lines use singular statistic.
    program.createReferenceLine({ source: "point", axis: "y", statistics: [{ op: "mean" }] });
    // @ts-expect-error Dynamic reference bands require exactly two statistics.
    program.createReferenceBand({ source: "point", axis: "y", statistics: [{ op: "mean" }] });
    const coordinateOptions: EditCoordinateOptions = {
      target: "main",
      aspect: { mode: "frame", ratio: 1, alignX: "center" }
    };
    program.editCoordinate(coordinateOptions);
    const polarFrameOptions: PolarFrameOptions = {
      center: { x: 0.25, y: 0.5 },
      radius: { unit: "fraction", value: 0.8 }
    };
    program.editCoordinate({ target: "polar", polarFrame: polarFrameOptions });
    // @ts-expect-error Coordinate editing is Full only.
    basicChart().editCoordinate(coordinateOptions);
    const polarScatterOptions: CreatePolarScatterPlotOptions = {
      theta: "angle", radius: "distance", point: { radius: 4 }, guides: false
    };
    const polarLineOptions: CreatePolarLinePlotOptions = {
      theta: "angle", radius: "distance", groupBy: "series",
      line: { closed: true }, guides: false
    };
    const radarOptions: CreateRadarPlotOptions = {
      category: "category", value: "value", groupBy: "series",
      order: ["speed", "quality", "cost"], guides: false
    };
    const radarWideOptions: CreateRadarPlotOptions = {
      wide: { fields: ["speed", "quality", "cost"] }, guides: false
    };
    const rugOptions: CreateRugPlotOptions = {
      x: "value", edge: "bottom", tick: { length: 10 }, guides: false
    };
    const stripOptions: CreateStripPlotOptions = {
      x: "value", y: { field: "category", fieldType: "nominal" },
      jitter: { maxOffset: { band: 0.1 }, seed: "typed-strip" }, guides: false
    };
    const beeswarmOptions: CreateBeeswarmPlotOptions = {
      x: { field: "category", fieldType: "nominal" }, y: "value",
      packing: { key: "id", padding: 1 }, guides: false
    };
    const raincloudOptions: CreateRaincloudPlotOptions = {
      color:{field:"category",fieldType:"nominal",scale:{id:"typedRaincloudColor",type:"ordinal",range:{palette:{name:"viridis",count:5,extent:[0.1,0.9]}}}},
      category: { field: "category", fieldType: "nominal" },
      value: { field: "value", fieldType: "quantitative" },
      density: { steps: 16 },
      summary: { type: "box", width: { band: 0.2 } },
      points: { type: "beeswarm", packing: { key: "id", overflow: "overlap" } },
      guides: false
    };
    const raincloudEditOptions: EditRaincloudPlotOptions = {
      color:{field:"category",fieldType:"nominal",scale:{id:"typedRaincloudColor",type:"ordinal",range:{palette:{name:"magma",count:7,extent:[0.08,0.92]}}}},
      side: "after", points: { type: "strip", jitter: { maxOffset: { band: 0.1 } } }
    };
    const ecdfDataOptions: ECDFDataOptions = {
      id: "typedECDFData", field: "value", groupBy: "category", weight: "weight"
    };
    const ecdfOptions: CreateECDFPlotOptions = {
      field: "value", groupBy: "category", color: "category",
      labels: { format: ".0%" }, guides: false
    };
    const ecdfEditOptions: EditECDFPlotOptions = {
      groupBy: false, weight: false, color: false
    };
    program.createPolarScatterPlot(polarScatterOptions);
    program.createPolarLinePlot(polarLineOptions);
    program.createRadarPlot(radarOptions);
    program.createRadarPlot(radarWideOptions);
    program.createRugPlot(rugOptions);
    program.createStripPlot(stripOptions);
    program.createBeeswarmPlot(beeswarmOptions);
    program.createRaincloudPlot(raincloudOptions).editRaincloudPlot(raincloudEditOptions);
    program.createECDFData(ecdfDataOptions);
    program.createECDFPlot(ecdfOptions).editECDFPlot(ecdfEditOptions);
    // @ts-expect-error Polar facades are Full only.
    basicChart().createPolarScatterPlot(polarScatterOptions);
    // @ts-expect-error Polar facades are Full only.
    basicChart().createPolarLinePlot(polarLineOptions);
    // @ts-expect-error Radar facade is Full only.
    basicChart().createRadarPlot(radarOptions);
    // @ts-expect-error Radar facade is Full only.
    basicChart().createRadarPlot(radarWideOptions);
    // @ts-expect-error Rug facade is Full only.
    basicChart().createRugPlot(rugOptions);
    // @ts-expect-error Strip facade is Full only.
    basicChart().createStripPlot(stripOptions);
    // @ts-expect-error Beeswarm facade is Full only.
    basicChart().createBeeswarmPlot(beeswarmOptions);
    // @ts-expect-error Raincloud facade is Full only.
    basicChart().createRaincloudPlot(raincloudOptions);
    // @ts-expect-error Raincloud editing is Full only.
    basicChart().editRaincloudPlot(raincloudEditOptions);
    // @ts-expect-error ECDF data is Full only.
    basicChart().createECDFData(ecdfDataOptions);
    // @ts-expect-error ECDF facade is Full only.
    basicChart().createECDFPlot(ecdfOptions);
    const fitOptions: FitCanvasOptions = { padding: 4, overflow: "report" };
    const labelLayout: AxisLabelLayoutOptions = {
      rotation: { value: -30, unit: "degrees" },
      maxWidth: 60,
      wrap: "word",
      overlap: "error"
    };
    program.fitCanvas(fitOptions);
    program.createXAxisLabels(labelLayout);
    const displayLabels: DisplayLabelMap = [
      { value: 1, label: "One" },
      { value: "1", label: "String one" }
    ];
    program.createXAxisLabels({ labelMap: displayLabels });
    const facetHeaderOptions: EditFacetHeadersOptions = {
      role: "column",
      labelMap: displayLabels,
      side: "bottom",
      align: "start"
    };
    program.editFacetHeaders(facetHeaderOptions);
    program.editFacetHeaders({role:"column",title:{text:"Region",rotation:{value:-90,unit:"degrees"}}});
    program.editFacetHeaders({role:"column",title:false});
    // @ts-expect-error Field-title options are closed.
    program.editFacetHeaders({role:"column",title:{padding:1}});
    // @ts-expect-error Canvas fitting is Full only
    basicChart().fitCanvas(fitOptions);
    program.createCanvas({ plotBorder: {} });
    program.editCanvas({ plotBorder: { color: "#ddd", lineWidth: 1 } });
    program.editCanvas({ plotBorder: false });
    basicChart().createCanvas({ plotBorder: { lineWidth: 2 } });
    // @ts-expect-error The border switch accepts false or a style object.
    program.editCanvas({ plotBorder: true });
    // @ts-expect-error Border line width is numeric.
    program.editCanvas({ plotBorder: { lineWidth: "1" } });
    // @ts-expect-error The border style vocabulary is closed.
    program.editCanvas({ plotBorder: { opacity: 0.5 } });
    const roseOptions: import("ggaction").CreateRosePlotOptions = { category: "category", radiusScale: { range: [70, 140] } };
    program.createScale({ id: "midpoint", type: "sequential", midpoint: 0 });
    program.editScale({ id: "midpoint", midpoint: "auto" });
    program.encodeColor({ field: "value", fieldType: "quantitative", scale: { midpoint: 0 } });
    // @ts-expect-error temporal color cannot carry a numeric midpoint
    program.encodeColor({ field: "date", fieldType: "temporal", scale: { midpoint: 0 } });
    program.createRosePlot(roseOptions);
    const radialOptions: import("ggaction").CreateRadialBarPlotOptions = { category: "category", value: "value", aggregate: "sum" };
    program.createRadialBarPlot(radialOptions);
    // @ts-expect-error measured facades are Full only
    basicChart().createRosePlot(roseOptions);
    // A supplied radial value infers sum.
    program.createRadialBarPlot({ category: "category", value: "value" });
    // @ts-expect-error measured padding is zero
    program.createRosePlot({ category: "category", arc: { padAngle: 1 } });
    program.createPiePlot({ category: "category" });
    program.createPiePlot({ category: { field: "category", scale: { domain: ["B", "A"], reverse: true } },
      value: "value", aggregate: "sum", arc: { innerRadius: 0.55, padAngle: 2 }, guides: { axes: false, grid: false } });
    const pieOptions: import("ggaction").CreatePiePlotOptions = { category: "category", color: false, arc: { fill: "red" } };
    program.createPiePlot(pieOptions).editArcMark({ target: "piePlot", innerRadius: 0.2 });
    program.createPiePlot({ category: "category", arc: { innerRadius: { unit: "px", value: 30 } } })
      .editCoordinate({ target: "polar", polarFrame: { radius: { unit: "px", value: 120 }, overflow: "allow" } });

    // @ts-expect-error Pie is full-only.
    basicChart().createPiePlot({ category: "category" });
    // @ts-expect-error A pie requires its category role.
    program.createPiePlot({});
    // A supplied pie value infers sum.
    program.createPiePlot({ category: "category", value: "value" });
    // @ts-expect-error Count cannot receive a weight field.
    program.createPiePlot({ category: "category", value: "value", aggregate: "count" });
    // @ts-expect-error Sum requires a weight field.
    program.createPiePlot({ category: "category", aggregate: "sum" });
    // @ts-expect-error Category theta has a band scale.
    program.createPiePlot({ category: { field: "category", scale: { type: "linear" } } });
    // @ts-expect-error Pie guides cannot create axes.
    program.createPiePlot({ category: "category", guides: { axes: {} } });
    // @ts-expect-error Pie legends describe categorical color.
    program.createPiePlot({ category: "category", guides: { legend: { channels: ["size"] } } });
    // @ts-expect-error Pie color has no area layout option.
    program.createPiePlot({ category: "category", color: { field: "category", layout: "stack" } });
    const sharedAreaPaint: import("ggaction").FillPaint = {
      type: "linear-gradient", from: { x: 0, y: 1 }, to: { x: 0, y: 0 },
      stops: [{ offset: 0, color: "white" }, { offset: 1, color: "orange" }]
    };
    program.createAreaMark({ fill: sharedAreaPaint }).editAreaMark({ fill: sharedAreaPaint });
    program.createAreaPlot({ x: "x", y: "value", area: { fill: sharedAreaPaint } });
    program.createAreaPlot({ x: { field: "group", fieldType: "nominal", scale: { type: "band" } }, y: "value", guides: { grid: { vertical: { bandPosition: "center" } } } });
    program.createAreaPlot({ valueChannel: "x", x: "value", y: { field: "group", fieldType: "nominal", scale: { type: "band" } }, guides: { grid: { horizontal: { bandPosition: "boundary" } } } });
    program.createDensityPlot({ field: "value", area: { fill: sharedAreaPaint } });
    // @ts-expect-error Density value and density scales are continuous.
    program.createDensityPlot({ field: "value", guides: { grid: { vertical: { bandPosition: "center" } } } });
    // @ts-expect-error Density has no horizontal band role either.
    program.createDensityPlot({ field: "value", guides: { grid: { horizontal: { bandPosition: "boundary" } } } });
    // @ts-expect-error Rug quantitative/temporal measure scales have no band edges.
    program.createRugPlot({ x: "x", edge: "bottom", guides: { grid: { vertical: { bandPosition: "center" } } } });
    // @ts-expect-error Rug's other orientation also has a continuous measure scale.
    program.createRugPlot({ y: "value", edge: "left", guides: { grid: { horizontal: { bandPosition: "boundary" } } } });
    // @ts-expect-error Horizon original x is continuous.
    program.createHorizonPlot({ x: "x", y: "value", guides: { grid: { vertical: { bandPosition: "center" } } } });
    program.createViolinPlot({ x: "group", y: "value", area: { fill: sharedAreaPaint, stroke: "black" } });
    program.createErrorBand({ x: { field: "x" }, y: { center: "value", lower: "low", upper: "high" }, fill: sharedAreaPaint })
      .editErrorBand({ fill: sharedAreaPaint }).editErrorBand({ fill: false });
    // @ts-expect-error Area outlines remain solid colors.
    program.editAreaMark({ stroke: sharedAreaPaint });
    const densityOptions: import("ggaction").CreateDensityPlotOptions = { field: "value", groupBy: false, guides: false };
    program.createDensityPlot(densityOptions).editDensity({ target: "densityPlot", bandwidth: 1 });
    program.createDensityPlot({ field: "value", groupBy: "group", color: { field: "group", layout: "overlay" },
      densityChannel: "x", valueScale: { type: "log" }, densityScale: { type: "linear", domain: [0, 1] } });
    // @ts-expect-error Density is full-only.
    basicChart().createDensityPlot({ field: "value" });
    // @ts-expect-error Density requires its field.
    program.createDensityPlot({});
    // @ts-expect-error Density placement belongs to its lower encoding action.
    program.createDensityPlot({ field: "value", placement: { type: "category" } });
    // @ts-expect-error Density only supports scalar group fields.
    program.createDensityPlot({ field: "value", groupBy: ["group"] });
    // @ts-expect-error Density color is an explicit field, not an opt-out sentinel.
    program.createDensityPlot({ field: "value", color: false });
    // @ts-expect-error Density paths overlay instead of stacking.
    program.createDensityPlot({ field: "value", color: { field: "group", layout: "stack" } });
    // @ts-expect-error Density baseline scale must support zero.
    program.createDensityPlot({ field: "value", densityScale: { type: "log" } });
    // @ts-expect-error Density cannot create a continuous color legend.
    program.createDensityPlot({ field: "value", guides: { legend: { gradient: {} } } });
    const completeHorizonOptions: import("ggaction").CreateHorizonPlotOptions = { x: "time", y: "value", guides: false };
    program.createHorizonPlot(completeHorizonOptions).editHorizon({ target: "horizonPlot", bands: 4 });
    program.createHorizonPlot({ x: { field: "time", fieldType: "temporal", temporalUnit: "timestamp" },
      y: { field: "value", scale: { type: "linear", domain: [0, 1] } }, groupBy: false,
      area: { opacity: 0.6 }, guides: { axes: { y: false }, grid: { horizontal: false, vertical: {} }, legend: false } });
    // @ts-expect-error Horizon is full-only.
    basicChart().createHorizonPlot({ x: "time", y: "value" });
    // @ts-expect-error Horizon requires explicit y.
    program.createHorizonPlot({ x: "time" });
    // @ts-expect-error Folded y only supports linear.
    program.createHorizonPlot({ x: "time", y: { field: "value", scale: { type: "log" } } });
    // @ts-expect-error Palette owns Horizon fill.
    program.createHorizonPlot({ x: "time", y: "value", area: { fill: "red" } });
    // @ts-expect-error Generic field color is not a Horizon facade role.
    program.createHorizonPlot({ x: "time", y: "value", color: "group" });
    // @ts-expect-error A folded y axis is an explicit lower action.
    program.createHorizonPlot({ x: "time", y: "value", guides: { axes: { y: {} } } });
    // @ts-expect-error The facade cannot create a folded horizontal grid.
    program.createHorizonPlot({ x: "time", y: "value", guides: { grid: { horizontal: {} } } });
    // @ts-expect-error Internal band colors are not an automatic amplitude legend.
    program.createHorizonPlot({ x: "time", y: "value", guides: { legend: {} } });
    program.createPointMark({ stroke: false });
    program.createBarMark({ stroke: false });
    program.createRectMark({ stroke: false });
    program.createScatterPlot({ x: "x", y: "y", point: { stroke: false } });
    const ruleStyle: import("ggaction").RuleStyleOptions = {
      stroke: "red", strokeWidth: 0, strokeDash: "dashed", opacity: 0
    };
    program.createRuleMark(ruleStyle).editRuleMark({ ...ruleStyle, target: "rule" });
    program.editErrorBand({ fill: false });
    basicChart().createScatterPlot({ x: "x", y: "y", point: { radius: 0 } })
      .encodePointRadius({ value: 3 });
    const inputUnit: import("ggaction").TemporalInputUnit = "timestamp";
    const basicUnit: import("ggaction/basic").TemporalInputUnit = inputUnit;
    program.encodeX({ datum: 1000, fieldType: "temporal", temporalUnit: inputUnit });
    program.encodeX2({ field: "time", fieldType: "temporal", temporalUnit: inputUnit });
    program.encodeTheta({ field: "time", fieldType: "temporal", temporalUnit: inputUnit });
    program.encodeColor({ field: "time", fieldType: "temporal", temporalUnit: inputUnit });
    program.encodeYRange({ lower: "start", upper: "end", fieldType: "temporal", temporalUnit: inputUnit });
    program.createTimeUnitData({ id: "seconds", field: "time", unit: "second", as: "bucket", temporalUnit: inputUnit });
    program.createRegression({ groupBy: false, confidenceMethod: "normal", level: 0.9 });
    program.createRegressionData({ id: "typedFit", x: "x", y: "y", confidenceMethod: "normal", level: 0.9 });
    program.createRegressionData({id:"typedExponentialFit",x:"x",y:"y",method:"exp"});
    program.createRegressionStatisticsData({id:"typedFitStatistics",source:"typedFit"})
      .editRegressionStatisticsData({source:"typedFit"});
    const typedStatistics: import("ggaction").RegressionStatisticsDataOptions = {id:"typedStats",source:"typedFit"};
    void typedStatistics;
    // @ts-expect-error statistics require an explicit fitted source
    program.createRegressionStatisticsData({id:"invalidStats"});
    program.createRegressionPlot({x:"x",y:"y",method:"exp",band:false});
    // @ts-expect-error exponential fits have no confidence level
    program.createRegressionData({id:"invalidExponentialFit",x:"x",y:"y",method:"exp",level:.95});
    program.createIntervalData({ id: "typedInterval", field: "y", method: "normal", level: 0.9 });
    program.encodeY({ field: "y", aggregate: { op: "ciUpper", method: "student-t", level: 0.95 } });
    program.encodeDensity({ field: "y", groupBy: false });
    program.encodeHorizon({ groupBy: false, x: { field: "time", fieldType: "temporal", temporalUnit: inputUnit } });
    basicChart().createScatterPlot({ x: { field: "time", fieldType: "temporal", temporalUnit: basicUnit }, y: "y" });
    program.createScatterPlot({ x: "x", y: "y", guides: { axes: { coordinate: { type: "cartesian" } } } });
    program.createLinePlot({ x: "x", y: "y", guides: { legend: { symbol: { length: 20 } } } });
    program.createHistogram({ field: "x", guides: { legend: { symbol: { width: 20 } } } });
    // @ts-expect-error Cartesian facades cannot create Polar axes.
    program.createScatterPlot({ x: "x", y: "y", guides: { axes: { theta: {} } } });
    // @ts-expect-error Basic has the same owned Cartesian guide contract.
    basicChart().createBarPlot({ x: "x", y: "y", guides: { axes: { coordinate: { type: "polar" } } } });
    // @ts-expect-error Line legends use line symbols or explicit layers.
    program.createLinePlot({ x: "x", y: "y", guides: { legend: { symbol: { width: 20 } } } });
    // @ts-expect-error Box plots have no appearance encoding for an owned legend.
    program.createBoxPlot({ x: "x", y: "y", guides: { legend: { title: "Group" } } });
    program.createLegend({titleStyle: {align: "left"}}).editLegend({titleStyle: {align: "auto"}}).editLegendTitle({align: "right"});
    // @ts-expect-error auto resets only an existing title style.
    program.createLegend({titleStyle: {align: "auto"}});
    // @ts-expect-error Histogram legends are categorical.
    program.createHistogram({ field: "x", guides: { legend: { gradient: { length: 100 } } } });
    // @ts-expect-error Non-temporal inputs do not accept temporal units.
    program.encodeX({ field: "time", fieldType: "quantitative", temporalUnit: inputUnit });
    // @ts-expect-error Unit vocabulary excludes seconds inference.
    program.encodeY({ field: "time", fieldType: "temporal", temporalUnit: "seconds" });
    // @ts-expect-error Non-temporal secondary endpoints reject units.
    program.encodeX2({ field: "time", fieldType: "quantitative", temporalUnit: inputUnit });
    // @ts-expect-error Non-temporal Theta rejects units.
    program.encodeTheta({ field: "time", fieldType: "quantitative", temporalUnit: inputUnit });
    // @ts-expect-error Nominal colors do not accept temporal units.
    program.encodeColor({ field: "time", fieldType: "nominal", temporalUnit: inputUnit });
    // @ts-expect-error Data-only Regression grouping did not gain the opt-out sentinel.
    program.createRegressionData({ id: "fit", x: "x", y: "y", groupBy: false });
    // @ts-expect-error Confidence methods use a closed vocabulary.
    program.createIntervalData({ id: "badInterval", field: "y", method: "bootstrap" });
    // @ts-expect-error Regression confidence methods use a closed vocabulary.
    program.createRegression({ confidenceMethod: "bootstrap" });
    // @ts-expect-error Data-only Density grouping did not gain the opt-out sentinel.
    program.createDensityData({ id: "kde", field: "y", groupBy: false });
    // @ts-expect-error Rule constant stroke does not accept false.
    program.editRuleMark({ stroke: false });
    // @ts-expect-error ErrorBand reset is edit-only.
    program.createErrorBand({ fill: false });
    // @ts-expect-error Basic keeps the older alias internal.
    basicChart().encodeRadius({ value: 3 });
    // @ts-expect-error Basic does not add the default-entry radius remover.
    basicChart().removePointRadius();
    // @ts-expect-error Basic does not add Rule editing.
    basicChart().editRuleMark({ opacity: 0.5 });
    program.createBarPlot({ x: "category", y: "y", bar: { stroke: false } });
    program.createHistogram({ field: "x", bar: { stroke: false } });
    basicChart().createPointMark({ stroke: false });
    basicChart().createBarMark({ stroke: false });
    // @ts-expect-error true is not a stroke color or the false opt-out.
    program.createPointMark({ stroke: true });
    // @ts-expect-error numeric stroke is not supported.
    program.createBarMark({ stroke: 0 });
    // @ts-expect-error unknown appearance options are rejected.
    program.createScatterPlot({ x: "x", y: "y", point: { outline: false } });
    // @ts-expect-error Area creation still requires a string stroke.
    program.createAreaMark({ stroke: false });
    // @ts-expect-error Arc creation still requires a string stroke.
    program.createArcMark({ stroke: false });
    const centerLayout: ColorLayout = "center";
    const centerStack: YStackMode = "center";
    const invalidYBin: Parameters<ChartProgram["encodeY"]>[0] = {
      field: "value",
      // @ts-expect-error Direct y encodings do not support binning.
      bin: { maxBins: 10 }
    };
    void invalidYBin;
    const centeredArea: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { x: 0, group: "A", value: 1 },
        { x: 1, group: "A", value: 2 }
      ] })
      .createAreaMark()
      .encodeGroup({ field: "group" })
      .encodeX({ field: "x" })
      .encodeY({ field: "value", stack: centerStack })
      .encodeColor({ field: "group", layout: centerLayout });
    void centeredArea;
    const invalidCenteredHistogram: HistogramEncodingOptions = {
      field: "value",
      // @ts-expect-error Histogram stacking excludes the area-only center mode.
      stack: "center"
    };
    void invalidCenteredHistogram;
    const axisRemovalOptions: EditAxisOptions<"bottom" | "top"> = {
      line: false,
      ticksAndLabels: false,
      title: false
    };
    const scatterOptions: CreateScatterPlotOptions = {
      x: "x",
      y: { field: "y", scale: { zero: false } },
      guides: false
    };
    const invalidScatterPolicies: CreateScatterPlotOptions = {
      x: {
        field: "x",
        // @ts-expect-error Point-facade positions do not aggregate, bin, or stack.
        aggregate: "mean"
      },
      y: "y",
      color: {
        field: "group",
        // @ts-expect-error Point-facade color does not author series layouts.
        layout: "group"
      }
    };
    void invalidScatterPolicies;
    const opacityScale: OpacityScaleOptions = {
      type: "linear", zero: false, unknown: 0.25
    };
    const linePositionScale: NonPointQuantitativePositionScaleOptions = {
      type: "log", domain: [1, 100], base: 10
    };
    const pointSizeScale: SizeScaleOptions = {
      type: "linear", domain: [0, 10], range: [2, 20], unknown: 5
    };
    const pointShapeScale: ShapeScaleOptions = {
      type: "ordinal", unknown: "diamond"
    };
    void [opacityScale, linePositionScale, pointSizeScale, pointShapeScale];
    const invalidOpacityPadding: OpacityScaleOptions = {
      // @ts-expect-error Opacity scales do not accept band padding.
      padding: 0.2
    };
    void invalidOpacityPadding;
    const invalidPositionPalette: CreateScatterPlotOptions = {
      x: { field: "x", scale: {
        // @ts-expect-error Position scales do not accept color palettes.
        palette: "blues"
      } },
      y: "y"
    };
    const invalidSizeNice: CreateScatterPlotOptions = {
      x: "x",
      y: "y",
      size: { field: "size", scale: {
        // @ts-expect-error Size scales do not expose ignored position options.
        nice: true
      } }
    };
    const invalidZeroSupportingLog: CreateBarPlotOptions = {
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value", aggregate: "sum", scale: {
        // @ts-expect-error Zero-baseline bars cannot use logarithmic scales.
        type: "log"
      } }
    };
    const invalidBarYBin: CreateBarPlotOptions = {
      x: { field: "category", fieldType: "nominal" },
      y: {
        field: "value",
        // @ts-expect-error Bar y positions do not support binning.
        bin: { maxBins: 10 }
      }
    };
    const horizontalTemporalBar: CreateBarPlotOptions = {
      x: { field: "value", aggregate: "sum" },
      y: {
        field: "time",
        fieldType: "temporal",
        scale: { type: "time", nice: true }
      }
    };
    const invalidTemporalBarCategory: CreateBarPlotOptions = {
      x: { field: "value", aggregate: "sum" },
      // @ts-expect-error Temporal categories cannot aggregate or use band scales.
      y: { field: "time", fieldType: "temporal", aggregate: "sum", scale: { type: "band" } }
    };
    void invalidTemporalBarCategory;
    const invalidCenteredBars: CreateBarPlotOptions = {
      x: { field: "category", fieldType: "nominal" },
      y: { field: "value", aggregate: "sum" },
      color: {
        field: "group",
        // @ts-expect-error Bar layouts do not support centered areas.
        layout: "center"
      }
    };
    const invalidHorizonYScale: HorizonEncodingOptions = {
      x: "x",
      y: { field: "value", scale: {
        // @ts-expect-error Folded horizon amplitude cannot be made nice.
        nice: true
      } }
    };
    void [
      invalidPositionPalette,
      invalidSizeNice,
      invalidZeroSupportingLog,
      invalidBarYBin,
      horizontalTemporalBar,
      invalidCenteredBars,
      invalidHorizonYScale
    ];
    const scatterFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2 }] })
      .createScatterPlot(scatterOptions);
    const basicScatter: BasicChartProgram = basicChart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2 }] })
      .createScatterPlot(scatterOptions);
    const basicDraw: typeof basicRender = basicRender;
    const axisTextFlow: ChartProgram = chart().createCanvas()
      .createData({ values: [{ x: 0, y: 0 }, { x: 1, y: 1 }] })
      .createScatterPlot({ x: "x", y: "y", guides: false })
      .createXAxis({ offset: 20, title: { offset: -30, alongOffset: 10, align: "right", baseline: "bottom" },
        ticksAndLabels: { labels: { align: "left" }, ticks: {
          strokeDash: [2, 2], strokeDashMap: [{ value: 0, strokeDash: [] }]
        } } })
      .editXAxis({ offset: 0, title: { baseline: "alphabetic" } })
      .editXAxisLabels({ align: "center" })
      .editXAxisTicks({ strokeDashMap: "auto" });
    // @ts-expect-error Axis title baselines use the closed text-baseline vocabulary.
    axisTextFlow.editXAxisTitle({ baseline: "center" });
    const basicAxisTextFlow: BasicChartProgram = basicChart().createCanvas()
      .createData({ values: [{ x: 0, y: 0 }, { x: 1, y: 1 }] })
      .createScatterPlot({ x: "x", y: "y", guides: false })
      .createXAxis({ offset: 20, title: { offset: -30, alongOffset: 10, align: "left", baseline: "top" },
        ticksAndLabels: { labels: { align: "right" } } });
    void [axisTextFlow, basicAxisTextFlow];
    const namedAxes: ChartProgram = chart().createCanvas().createData({ values: [{ x: 1, y: 2 }] })
      .createScatterPlot({ x: "x", y: "y", guides: false })
      .createAxes({ y: [{ id: "left", position: "left" }, { id: "right", position: "right" }] })
      .editYAxis({ target: "right", offset: 2 }).editYAxisLabels({ target: "right", align: "right" })
      .removeYAxis({ target: "left" });
    const basicNamedAxes: BasicChartProgram = basicChart().createCanvas()
      .createData({ values: [{ x: 1, y: 2 }] }).createScatterPlot({ x: "x", y: "y", guides: false })
      .createYAxis({ id: "share", position: "right" });
    // @ts-expect-error A complete creator names its axis with id, not target.
    chart().createYAxis({ target: "share" });
    // @ts-expect-error Polar axis removal does not select named Cartesian resources.
    chart().removeThetaAxis({ target: "share" });
    void [namedAxes, basicNamedAxes];
    const parentLegend: ChartProgram = chart().createCanvas().createData({values:[{x:1,y:2,panel:"A",g:"B"}]})
      .createScatterPlot({x:"x",y:"y",color:"g",guides:false})
      .facet({field:"panel",guides:{legend:{position:"top-left",target:"scatterPlot"}}})
      .editLegendTitle({channel:"color",fontSize:11})
      .editFacetGuides({legend:{at:{x:10,y:20}}}).removeLegend({channels:["color"]});
    // @ts-expect-error Parent declarations do not accept private persisted intent tags.
    chart().editFacetGuides({legend:{type:"authored-legend",blocks:{},groups:{}}});
    void parentLegend;
    const horizonOptions: HorizonEncodingOptions = {
      x: { field: "time", fieldType: "temporal" },
      y: "value",
      bands: 3,
      resolve: "shared",
      palette: { positive: "blues", negative: "reds" }
    };
    const horizonEdit: EditHorizonOptions = {
      bands: 4,
      groupBy: false,
      overflow: "clip"
    };
    const horizonFacade = chart()
      .createCanvas()
      .createData({ values: [{ time: "2000-01-01", value: 2 }] })
      .createAreaMark()
      .encodeHorizon(horizonOptions)
      .editHorizon(horizonEdit);
    const lineOptions: CreateLinePlotOptions = {
      x: "x",
      y: "y",
      groupBy: ["group", "scenario"],
      line: { curve: "linear", strokeWidth: 2 },
      guides: false
    };
    const typedGroups = chart().createLineMark()
      .encodeGroup({ field: "country" })
      .encodeGroup({ fields: ["country", "scenario"] as const })
      .encodeStrokeWidth({ value: 3 })
      .encodeOpacity({ field: "quality" });
    typedGroups.selectMarks({ channel: "strokeWidth", op: "eq", value: 2 });
    typedGroups.filterMarks({ field: "country", op: "eq", value: "Japan" })
      .filterMarks({ mode: "compose", field: "quality", op: "gt", value: 0.5 })
      .removeMarkFilter();
    // @ts-expect-error Mark filter mode is a closed lifecycle vocabulary.
    typedGroups.filterMarks({ mode: "append", field: "country", op: "eq", value: "Japan" });
    // @ts-expect-error A tuple must contain at least one identity field.
    typedGroups.encodeGroup({ fields: [] });
    // @ts-expect-error Scalar and tuple identity are mutually exclusive.
    typedGroups.encodeGroup({ field: "country", fields: ["scenario"] });
    // @ts-expect-error Constant opacity has no field scale.
    typedGroups.encodeOpacity({ value: 0.5, scale: { domain: [0, 1] } });
    const invalidClosedLineOptions: CreateLinePlotOptions = {
      x: "x",
      y: "y",
      line: {
        // @ts-expect-error Cartesian line facades cannot author closed Polar paths.
        closed: true
      }
    };
    void invalidClosedLineOptions;
    const invalidLineColorLayout: CreateLinePlotOptions = {
      x: "x",
      y: "y",
      color: {
        field: "group",
        // @ts-expect-error Line color cannot use categorical fill-layout policies.
        layout: "overlay"
      }
    };
    const horizontalNumericAggregateLine: CreateLinePlotOptions = {
      x: {
        field: "x",
        aggregate: "mean"
      },
      y: { field: "y", fieldType: "quantitative" }
    };
    // @ts-expect-error A Line needs an independent position; both axes cannot aggregate.
    const invalidBothLineAggregates: CreateLinePlotOptions = {
      x: { field: "x", aggregate: "mean" },
      y: { field: "y", aggregate: "sum" }
    };
    const invalidLineYPolicies: CreateLinePlotOptions = {
      x: "x",
      y: {
        field: "y",
        // @ts-expect-error Line y positions cannot bin or stack.
        bin: { maxBins: 10 }
      }
    };
    void [invalidLineColorLayout, horizontalNumericAggregateLine, invalidBothLineAggregates, invalidLineYPolicies];
    chart().createAreaPlot({ x: "time", y: "value", baseline: 0, missing: "break" }).layoutSeries({ mode: "center" });
    chart().createAreaPlot({ x: "time", y: { lower: "lo", upper: "hi" } });
    basicChart().encodeGroup({ fields: ["series", "region"] }).layoutSeries({ mode: "stack" });
    // @ts-expect-error Area facade is full-only.
    basicChart().createAreaPlot({ x: "time", y: "value" });
    // @ts-expect-error Basic Bar cannot center.
    basicChart().layoutSeries({ mode: "center" });
    // @ts-expect-error layout mode is required.
    chart().layoutSeries({});
    // @ts-expect-error range and baseline cannot both own the endpoints.
    chart().createAreaPlot({ x: "time", y: { lower: "lo", upper: "hi" }, baseline: 0 });
    const lineFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2, group: "A" }] })
      .createLinePlot(lineOptions);
    const parallelOptions: CreateParallelCoordinatesOptions = {
      dimensions: [
        { field: "first", scale: { zero: false } },
        {
          field: "second",
          fieldType: "ordinal",
          title: "Second",
          scale: { type: "band", paddingInner: 0.1 }
        }
      ],
      key: "row key",
      missing: "break",
      color: "group",
      line: { curve: "linear", closed: false },
      guides: false
    };
    const invalidParallelColorLayout: CreateParallelCoordinatesOptions = {
      dimensions: ["first", "second"],
      color: {
        field: "group",
        // @ts-expect-error Parallel line color cannot use categorical fill-layout policies.
        layout: "overlay"
      }
    };
    void invalidParallelColorLayout;
    const parallelEncoding: ParallelCoordinatesEncodingOptions = {
      dimensions: ["first", "second"],
      key: "row key"
    };
    const parallelFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { "row key": "a", first: 1, second: 4, group: "A" },
        { "row key": "b", first: 2, second: 3, group: "B" }
      ] })
      .createParallelCoordinates(parallelOptions);
    const parallelScaleEdit: EditParallelScaleOptions = {
      target: "parallelCoordinates", dimension: "first", reverse: true
    };
    const parallelScaleEdited: ChartProgram = parallelFacade.editParallelScale(
      parallelScaleEdit
    );
    void parallelScaleEdited;
    const parallelAxisOptions: import("ggaction").CreateParallelAxisOptions = {
      field: "first", line: false, labels: false, title: false, ticks: { values: [1, 2] }
    };
    parallelFacade.removeParallelAxes().createParallelAxes()
      .editParallelAxis({ field: "first", ticks: false }).createParallelAxis(parallelAxisOptions)
      .removeParallelAxis({ field: "first" });
    // @ts-expect-error field is required
    parallelFacade.createParallelAxis({});
    // @ts-expect-error grouped and independent tick modes conflict
    parallelFacade.editParallelAxis({ field: "first", ticksAndLabels: {}, labels: {} });
    const parallelAdvanced: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ first: 1, second: 2 }] })
      .createLineMark()
      .encodeParallelCoordinates(parallelEncoding);
    const orderedLineFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { x: 2, y: 4, order: 2 },
        { x: 1, y: 2, order: 1 }
      ] })
      .createLineMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodePathOrder({ field: "order", order: "descending" })
      .removePathOrder();
    const categoryOrderOptions: OrderCategoriesOptions = {
      channel: "x",
      by: { field: "value", aggregate: "sum" },
      direction: "descending"
    };
    const orderedCategoryBars: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { category: "Beta", value: 2 },
        { category: "Alpha", value: 7 }
      ] })
      .createBarMark()
      .encodeX({ field: "category", fieldType: "nominal" })
      .encodeY({ field: "value", aggregate: "sum" })
      .orderCategories(categoryOrderOptions)
      .removeCategoryOrder({ channel: "x" });
    program.orderCategories({ channel: "theta", values: ["C"] }).removeCategoryOrder({ channel: "theta" });
    program.createLegend({ order: { channel: "theta" } }).editLegend({ order: "scale" });
    program.editLegend({ order: { values: ["C", 1, false] } });
    program.createLegend({ channels: ["size"], values: [1, 2, 3] });
    program.createLegend({ channels: ["color"], gradient: { opacity: 0.7 } })
      .editLegend({ gradient: { opacity: 0 } }).editLegendSymbols({ gradient: { opacity: 1 } });
    basicChart().createGuides({ axes: false, grid: false, legend: { channels: ["color"], gradient: { opacity: 0.7 } } });
    // @ts-expect-error Gradient opacity must be numeric.
    program.createLegend({ gradient: { opacity: "half" } });
    program.editLegend({ values: [1, 2, 3] }).editLegend({ values: "auto", count: 4 });
    program.editLegend({ channels: ["color", "shape", "size"], count: 3 });
    program.editLegendLayout({ position: "top", layout: "edge", direction: "horizontal", columns: 2, titlePosition: "left" });
    program.editLegend({ channels: ["size"], position: "top", columns: 2, border: true, count: 3, title: "Mass", labels: { offset: 12, fontWeight: 700 }, titleStyle: { color: "red" } })
      .editLegendTitle({ title: false }).editLegendTitle({ title: "auto" }).editLegendSymbols({ count: 4 });
    program.createLegend({ channels: ["color", "shape", "size"], count: 3 });
    basicChart().createLegend({ channels: ["color", "size"], position: "top", columns: 2, count: 3, border: true });
    program.createLegend({ position: "bottom", layout: "legacy-bottom" })
      .editLegend({ layout: "edge" }).editLegendLayout({ layout: "legacy-bottom" });
    basicChart().createGuides({ axes: false, grid: false,
      legend: { position: "bottom", layout: "legacy-bottom" } });
    // @ts-expect-error Closed categorical layout vocabulary.
    program.editLegendLayout({ layout: "automatic" });
    // @ts-expect-error sampled title style has no label offset
    program.editLegend({ titleStyle: { offset: 20 } });

    // @ts-expect-error legend order policies are exclusive
    program.editLegend({ order: { channel: "theta", values: ["C"] } });
    // @ts-expect-error Creation does not accept the edit-only exact-value reset.
    program.createLegend({ channels: ["size"], values: "auto" });
    // @ts-expect-error Exact legend samples must be numeric.
    program.editLegend({ values: ["1", "2"] });
    // @ts-expect-error radius is not a categorical order channel
    program.orderCategories({ channel: "radius", values: [1] });
    const barOptions: CreateBarPlotOptions = {
      x: { field: "category", fieldType: "ordinal" },
      y: { field: "value", aggregate: "mean" },
      width: { band: 0.7 },
      guides: false
    };
    const barFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ category: "A", value: 2 }] })
      .createBarPlot(barOptions);
    const typedOffsetBars: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { category: "A", subgroup: "u", value: 2 },
        { category: "A", subgroup: "v", value: 4 }
      ] })
      .createBarMark({ id: "offsetBars" })
      .encodeX({ target: "offsetBars", field: "category", fieldType: "nominal" })
      .encodeY({ target: "offsetBars", field: "value" })
      .encodeXOffset({ target: "offsetBars", field: "subgroup" });
    const xOffsetScaleEdit: EditXOffsetScaleOptions = {
      target: "offsetBars",
      paddingInner: 0.2,
      paddingOuter: 0.1,
      align: 0.5
    };
    const editedXOffsetBars: ChartProgram = typedOffsetBars
      .editXOffsetScale(xOffsetScaleEdit);
    const yOffsetScaleEdit: EditYOffsetScaleOptions = {
      target: "offsetBars",
      reverse: true
    };
    typedOffsetBars.editYOffsetScale(yOffsetScaleEdit);
    // @ts-expect-error Offset ranges are derived from the parent categorical slot.
    typedOffsetBars.editXOffsetScale({ target: "offsetBars", range: [0, 20] });
    const histogramOptions: CreateHistogramOptions = {
      field: "value",
      maxBins: 5,
      guides: false
    };
    const invalidCenteredHistogramFacade: CreateHistogramOptions = {
      field: "value",
      // @ts-expect-error Histogram facades do not support centered area layouts.
      stack: "center"
    };
    void invalidCenteredHistogramFacade;
    const histogramFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ value: 2 }] })
      .createHistogram(histogramOptions);
    const heatmapOptions: CreateHeatmapOptions = {
      x: { field: "x", fieldType: "ordinal" },
      y: { field: "y", fieldType: "nominal" },
      color: { field: "value", fieldType: "quantitative" },
      rect: { stroke: false, opacity: 0.8 },
      guides: false
    };
    const invalidHeatmapColorPolicy: CreateHeatmapOptions = {
      x: "x",
      y: "y",
      color: {
        field: "value",
        fieldType: "quantitative",
        // @ts-expect-error Pre-gridded rect color does not aggregate or lay out series.
        aggregate: "mean"
      }
    };
    void invalidHeatmapColorPolicy;
    const heatmapFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ x: "A", y: "one", value: 2 }] })
      .createHeatmap(heatmapOptions);
    const binnedHeatmapOptions: CreateHeatmapOptions = {
      x: "x",
      y: { field: "y", scale: { reverse: true } },
      bin: {
        bins: { x: 4, y: 3 },
        extent: { x: [0, 4], y: [0, 3] },
        includeEmpty: true
      },
      color: { scale: { palette: "blues", domain: [0, 3] } },
      guides: false
    };
    const binnedHeatmapFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ x: 0, y: 0 }, { x: 4, y: 3 }] })
      .createHeatmap(binnedHeatmapOptions);
    const gradientOptions: GradientPlotOptions = {
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" },
      density: { bandwidth: 0.5, steps: 8 },
      guides: false
    };
    const invalidGradientGuides: GradientPlotOptions = {
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value" },
      guides: {
        axes: { coordinate: {
          // @ts-expect-error Gradient facades own Cartesian axes.
          type: "polar"
        } },
        legend: {
          // @ts-expect-error Density legends are currently right-positioned.
          position: "top"
        }
      }
    };
    void invalidGradientGuides;
    const gradientFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { group: "A", value: 1 },
        { group: "A", value: 2 }
      ] })
      .createGradientPlot(gradientOptions)
      .editGradientPlot({ width: { band: 0.5 } });
    const violinOptions: ViolinPlotOptions = {
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value", fieldType: "quantitative" },
      density: {
        bandwidth: 0.5,
        steps: 8,
        width: { band: 0.8, resolve: "shared" }
      },
      guides: false
    };
    const weightedViolinOptions: ViolinPlotOptions = {
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value", fieldType: "quantitative" },
      density: {
        weight: { field: "weight", kind: "reliability" }
      }
    };
    const invalidGradientWeight: GradientPlotOptions = {
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value", fieldType: "quantitative" },
      density: {
        // @ts-expect-error Statistical weight is owned by violin, not gradient plots.
        weight: { field: "weight", kind: "reliability" }
      }
    };
    void weightedViolinOptions;
    void invalidGradientWeight;
    const invalidViolinLayout: ViolinPlotOptions = {
      x: { field: "group", fieldType: "nominal" },
      y: { field: "value", fieldType: "quantitative" },
      color: {
        field: "group",
        // @ts-expect-error Category-density violin color only supports overlay.
        layout: "stack"
      }
    };
    void invalidViolinLayout;
    const violinFacade: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { group: "A", value: 1 },
        { group: "A", value: 2 }
      ] })
      .createViolinPlot(violinOptions);
    const seededMeanCI: ChartProgram = chart().createData({values:[{y:1},{y:2}]}).createSummaryData({id:"ci",aggregates:[
      {field:"y",op:{op:"ciLower",method:{type:"bootstrap",seed:1,samples:10}},as:"lower"}
    ]});
    const seededInterval: ChartProgram = chart().createData({values:[{y:1},{y:2}]}).createIntervalData({id:"ci",field:"y",method:{type:"bootstrap",seed:1}});
    // @ts-expect-error Regression retains its normal/student-t confidence vocabulary.
    chart().createRegressionData({id:"reg",x:"x",y:"y",confidenceMethod:{type:"bootstrap",seed:1}});
    const quantitativeArea: ChartProgram = chart().createCanvas()
      .createData({ values: [{ x: 0, y: 1, level: 10 }, { x: 1, y: 2, level: 10 }] })
      .createAreaPlot({ x: "x", y: "y", guides: false })
      .encodeColor({ field: "level", fieldType: "quantitative", scale: { type: "sqrt", range: ["red", "blue"] } });
    const composed: ChartProgram = hconcat({
      programs: [program, program]
    })
      .editCompositionLayout({ gap: 8, padding: { left: 4 } })
      .replaceCompositionChild({ target: "view-2", program });
    const nested: ChartProgram = vconcat({ programs: [composed, program] });
    const facetPolicyEdited: ChartProgram = chart()
      .createCanvas({ width: 240, height: 180 })
      .createData({ values: [
        { group: "A", x: 1, y: 2 },
        { group: "B", x: 3, y: 4 }
      ] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .facet({ field: "group", columns: 1 })
      .editCompositionLayout({ columns: 2 })
      .editFacetScales({ x: "independent" })
      .editFacetGuides({ axes: "outer" });
    const comparisonUnit: ChartProgram = chart()
      .createCanvas({ width: 180, height: 140 })
      .createData({ values: [
        { row: "A", column: "X", x: 1, y: 10, z: 100 },
        { row: "B", column: "Y", x: 2, y: 20, z: 200 }
      ] })
      .createPointMark({ id: "metric" })
      .encodeX({ target: "metric", field: "x" })
      .encodeY({ target: "metric", field: "y" });
    const gridOptions: FacetGridOptions = {
      id: "typedGrid",
      rows: { field: "row", values: ["A", "B"] },
      columns: { field: "column", values: ["X", "Y"] },
      combinations: "full"
    };
    const repeatOptions: RepeatChartsOptions = {
      id: "typedRepeat", target: "metric", channel: "x", fields: ["x", "y", "z"]
    };
    const polarRepeatOptions: RepeatChartsOptions = {
      id: "typedPolarRepeat", target: "polarPoints", channel: "r",
      fields: ["radius", "distance"]
    };
    const parallelRepeatOptions: RepeatChartsOptions = {
      id: "typedParallelRepeat", target: "parallelCoordinates",
      channel: { parallelDimension: "first" }, fields: ["first", "third"]
    };
    const nonCartesianFacetScales: FacetScaleResolutions = {
      theta: "shared", r: "independent", parallelDimensions: "shared"
    };
    const typedGrid: ChartProgram = comparisonUnit.facetGrid(gridOptions);
    const typedRepeat: ChartProgram = comparisonUnit.repeatCharts(repeatOptions);
    comparisonUnit.repeatCharts(polarRepeatOptions);
    comparisonUnit.repeatCharts(parallelRepeatOptions);
    comparisonUnit.editFacetScales(nonCartesianFacetScales);
    const invalidFacetScales: FacetScaleResolutions = {
      // @ts-expect-error Semantic radius is exposed as r, never radius.
      radius: "shared"
    };
    void invalidFacetScales;
    const sourceEditOptions: EditFacetSourceOptions = { program: comparisonUnit };
    const typedRevisedGrid: ChartProgram = typedGrid.editFacetSource(sourceEditOptions);
    const insertOptions: InsertCompositionChildOptions = {
      id: "third", program, after: "view-1"
    };
    const typedInserted: ChartProgram = composed.insertCompositionChild(insertOptions);
    const reorderOptions: ReorderCompositionChildrenOptions = {
      order: ["third", "view-2", "view-1"]
    };
    const typedReordered: ChartProgram = typedInserted.reorderCompositionChildren(reorderOptions);
    const removeOptions: RemoveCompositionChildOptions = { target: "view-2" };
    const typedRemoved: ChartProgram = typedReordered.removeCompositionChild(removeOptions);
    const draw: typeof render = render;
    const accessibility = await import("ggaction/accessibility");
    const alternative: import("ggaction/accessibility").AccessibleData = accessibility.exportAccessibleData(program);
    accessibility.exportAccessibleData(basicChart());
    // @ts-expect-error Output is deeply readonly.
    alternative.views.push({});
    // @ts-expect-error Unknown options are rejected.
    accessibility.exportAccessibleData(program, { unknown: true });
    // @ts-expect-error Render-only data is insufficient.
    accessibility.exportAccessibleData({graphicSpec:program.graphicSpec});
    const persistence = await import("ggaction/persistence");
    const restored: ChartProgram = persistence.deserializeProgram(persistence.serializeProgram(program));
    persistence.serializeProgram(basicChart());
    renderToSVG(persistence.deserializeGraphic(persistence.serializeGraphic(program)));
    // @ts-expect-error Graphics snapshots are render-only.
    persistence.deserializeGraphic(persistence.serializeGraphic(program)).createData({ values: [] });
    // @ts-expect-error Snapshot restore requires JSON text.
    persistence.deserializeProgram({});
    void restored;
    const textProfile: import("ggaction").TextMetricsProfile = { schemaVersion: 1, id: "host", measurements: [
      { text: "Title", fontFamily: "sans-serif", fontSize: 20, fontWeight: 400, width: 40 }
    ] };
    const withMetrics: ChartProgram = program.applyTextMetrics({ profile: textProfile }).removeTextMetrics();
    void withMetrics;
    // @ts-expect-error Measured weights must already be normalized.
    program.applyTextMetrics({ profile: { ...textProfile, measurements: [{ ...textProfile.measurements[0], fontWeight: 150 }] } });
    // @ts-expect-error Profiles require schema version 1.
    program.applyTextMetrics({ profile: { ...textProfile, schemaVersion: 2 } });
    const diagnostics = await import("ggaction/diagnostics");
    const details = diagnostics.getErrorDetails(new Error());
    const code: import("ggaction/diagnostics").ErrorCode | undefined = details?.code;
    void code;
    const pngMemory: Promise<PNGBufferResult> = renderToPNGBuffer(program, { pixelRatio: 2 });
    const pdfMemory: Promise<PDFBufferResult> = renderToPDFBuffer(program);
    // @ts-expect-error Memory output does not accept filesystem options.
    renderToPNGBuffer(program, { output: "chart.png" });
    // @ts-expect-error PDF memory output does not accept raster density.
    renderToPDFBuffer(program, { pixelRatio: 2 });
    void pngMemory; void pdfMemory;
    const png: Promise<PNGRenderResult> = renderToPNG(program, { output: "chart.png" });
    const pdfMetadata: PDFMetadata = {
      title: "Typed PDF",
      keywords: ["typed", "pdf"]
    };
    const pdf: Promise<PDFRenderResult> = renderToPDF(program, {
      output: "chart.pdf",
      metadata: pdfMetadata
    });
    const svgOptions: SVGRenderOptions = {
      title: "Typed SVG",
      resourceNamespace: "typedSvg"
    };
    const svg: string = renderToSVG(program, svgOptions);
    renderToPDF(program, {
      output: "chart.pdf",
      // @ts-expect-error PDF is vector output and has no pixelRatio option.
      pixelRatio: 2
    });
    renderToSVG(program, {
      // @ts-expect-error SVG is vector output and has no pixelRatio option.
      pixelRatio: 2
    });
    const wrapped = action(
      { op: "typed", description: "Compile one extension action." },
      function () { return this; }
    );
    const extensionProgram: ExtensionProgram = wrapped.call(new ExtensionProgram());
    const filterTransform: DatasetTransform = {
      type: "filter",
      field: "group",
      oneOf: ["A"]
    };
    const derivedOptions: CreateDerivedDataOptions = {
      id: "filtered",
      source: "source",
      transform: [filterTransform]
    };
    const derived = chart()
      .createData({ id: "source", values: [{ group: "A" }] })
      .createDerivedData(derivedOptions);
    const timeUnitOptions: TimeUnitDataOptions = {
      id: "monthlyEvents",
      field: "date",
      unit: "month",
      as: "month"
    };
    const monthlyEvents: ChartProgram = chart()
      .createData({ id: "events", values: [{ date: "2024-05-17", value: 2 }] })
      .createTimeUnitData(timeUnitOptions);
    const summaryOptions: SummaryDataOptions = {
      id: "summary",
      groupBy: "group",
      aggregates: [{ op: "sum", field: "value", as: "total" }],
      weight: { field: "weight", kind: "frequency" }
    };
    const summary: ChartProgram = chart()
      .createData({ id: "summarySource", values: [{ group: "A", value: 2 }] })
      .createSummaryData(summaryOptions);
    const reusableBinOptions: BinDataOptions = {
      id: "bins",
      field: "value",
      boundaries: [0, 1, 2],
      includeEmpty: false,
      weight: { field: "weight", kind: "reliability" }
    };
    const statisticalWeight: StatisticalWeight = {
      field: "weight",
      kind: "frequency"
    };
    void statisticalWeight;
    const reusableBins: ChartProgram = chart()
      .createData({ id: "reusableBinSource", values: [{ value: 1 }] })
      .createBinData(reusableBinOptions);
    const reusableBinTransform: DatasetTransform = {
      type: "bin",
      field: "value",
      bin: { boundaries: [0, 1, 2] },
      extent: "auto",
      nice: true,
      zero: false,
      includeEmpty: true,
      members: false,
      as: { lower: "value_start", upper: "value_end", count: "count" }
    };
    const foldOptions: FoldDataOptions = {
      id: "long",
      fields: ["apples", "pears"],
      as: { key: "fruit", value: "amount" }
    };
    const folded: ChartProgram = chart()
      .createData({ id: "wide", values: [{ apples: 1, pears: 2 }] })
      .createFoldData(foldOptions);
    const foldTransform: DatasetTransform = {
      type: "fold",
      fields: ["apples", "pears"],
      as: { key: "fruit", value: "amount" }
    };
    const ratioExpression: ComputedExpression = {
      op: "divide",
      left: { field: "part" },
      right: { field: "whole" }
    };
    const calendarYearExpression: ComputedExpression = {
      op: "datePart", part: "year", timeZone: "UTC",
      operand: { op: "parseTime", operand: { field: "date" } }
    };
    const floorExpression: ComputedExpression = { op: "floor", operand: { field: "measurement" } };
    chart().createData({values:[{x:1,y:2,v:3}]})
      .createScatterPlot({x:"x",y:"y",guides:false})
      .encodeColor({field:"v",fieldType:"quantitative",scale:{interpolate:"lab",whitePoint:"d50"}})
      .editColorScale({whitePoint:"auto"})
      .editColorScale({type:"pow",exponent:3})
      .editColorScale({type:"sequential",interpolate:"cubehelix",gamma:2.2})
      .editColorScale({gamma:"auto"});
    const computedOptions: ComputedDataOptions = {
      id: "shares",
      as: "share",
      expression: ratioExpression
    };
    const computed: ChartProgram = chart()
      .createData({ id: "parts", values: [{ part: 1, whole: 4 }] })
      .createComputedData(computedOptions);
    const computedTransform: DatasetTransform = {
      type: "computed",
      as: "share",
      expression: ratioExpression
    };
    const derivedDependents: DerivedDataDependents = "recompute";
    const requestedComputedTransform: RequestedDatasetTransform = {
      type: "computed",
      as: "share",
      expression: ratioExpression
    };
    const editComputedOptions: EditComputedDataOptions = {
      target: "shares",
      dependents: derivedDependents,
      expression: ratioExpression
    };
    const editDerivedOptions: EditDerivedDataOptions = {
      target: "shares",
      definition: requestedComputedTransform,
      dependents: derivedDependents
    };
    const editedComputed: ChartProgram = computed.editComputedData(editComputedOptions);
    const genericallyEditedComputed: ChartProgram = computed.editDerivedData(editDerivedOptions);
    void editedComputed;
    void genericallyEditedComputed;
    const normalizedOptions: NormalizedDataOptions = {
      id: "normalized",
      field: "value",
      as: "z",
      method: "zscore",
      variance: "population"
    };
    const normalized: ChartProgram = chart()
      .createData({ id: "normalizedSource", values: [{ value: 2 }, { value: 4 }] })
      .createNormalizedData(normalizedOptions);
    const normalizedTransform: DatasetNormalizedTransform = {
      type: "normalize",
      field: "value",
      as: "z",
      groupBy: [],
      method: "zscore",
      variance: "population",
      zeroDenominator: "error"
    };
    const completeOptions: CompleteDataOptions = {
      id: "completed",
      key: "period",
      groupBy: "series",
      values: [1, 2, 3],
      members: "sourceRows"
    };
    const completedData: ChartProgram = chart()
      .createData({ id: "sparse", values: [
        { series: "A", period: 1, amount: 2 },
        { series: "A", period: 3, amount: 6 }
      ] })
      .createCompleteData(completeOptions);
    const completeTransform: DatasetCompleteTransform = {
      type: "complete",
      key: "period",
      groupBy: ["series"],
      values: [1, 2, 3],
      fill: {},
      members: "sourceRows"
    };
    const imputedOptions: ImputedDataOptions = {
      id: "imputed",
      fields: "amount",
      groupBy: "series",
      sortBy: [{ field: "period" }],
      method: "linear"
    };
    const imputedData: ChartProgram = completedData.createImputedData(imputedOptions);
    const imputedTransform: DatasetImputedTransform = {
      type: "impute",
      fields: ["amount"],
      groupBy: ["series"],
      sortBy: [{ field: "period", order: "ascending" }],
      method: "linear",
      edges: "keep"
    };
    void completeTransform;
    void imputedTransform;
    void imputedData;
    // @ts-expect-error Complete domains cannot use values and sequence together.
    const invalidComplete: CompleteDataOptions = {
      id: "invalidComplete",
      key: "period",
      values: [1, 2],
      sequence: { start: 1, end: 2, step: 1 }
    };
    void invalidComplete;
    // @ts-expect-error Linear imputation does not accept a constant value.
    const invalidLinearImpute: ImputedDataOptions = {
      id: "invalidImpute",
      fields: "amount",
      method: "linear",
      sortBy: [{ field: "period" }],
      value: 0
    };
    void invalidLinearImpute;
    const stackOptions: StackDataOptions = {
      id: "stacked",
      category: "category",
      group: "series",
      value: "amount",
      mode: "fill"
    };
    const stacked: ChartProgram = chart()
      .createData({
        id: "stackSource",
        values: [{ category: "A", series: "one", amount: 1 }]
      })
      .createStackData(stackOptions);
    const stackTransform: DatasetTransform = {
      type: "stack",
      category: "category",
      group: "series",
      value: "amount",
      mode: "stack",
      as: {
        start: "amount_start",
        end: "amount_end",
        value: "amount_value",
        share: "amount_share"
      }
    };
    const summaryTransform: DatasetTransform = {
      type: "summary",
      groupBy: ["group"],
      aggregates: [{ op: "count", as: "rows" }]
    };
    const timeUnitTransform: DatasetTransform = {
      type: "timeUnit",
      field: "date",
      unit: "month",
      as: "month"
    };
    const weeklyOptions: TimeUnitDataOptions = {
      id: "weeklyEvents",
      field: "date",
      unit: "week",
      as: "week",
      timeZone: "Asia/Seoul",
      weekRule: "iso",
      weekStartsOn: 1
    };
    const weeklyEvents: ChartProgram = chart()
      .createData({ id: "weekSource", values: [{ date: "2024-01-03" }] })
      .createTimeUnitData(weeklyOptions);
    void weeklyEvents;
    // @ts-expect-error ISO weeks always start on Monday.
    const invalidIsoWeek: TimeUnitDataOptions = {
      id: "invalidWeek",
      field: "date",
      unit: "week",
      as: "week",
      weekRule: "iso",
      weekStartsOn: 0
    };
    void invalidIsoWeek;
    const windowOptions: WindowDataOptions = {
      id: "ordered",
      partitionBy: "group",
      sortBy: [{ field: "order", order: "descending" }],
      operations: [
        { op: "rowNumber", as: "rowNumber" },
        { op: "lag", field: "value", as: "previousValue" },
        {
          op: "movingSum",
          field: "value",
          as: "movingValue",
          frame: { preceding: 2, following: 1 }
        }
      ]
    };
    const windowed: ChartProgram = chart()
      .createData({
        id: "events",
        values: [{ group: "A", order: 1, value: 2 }]
      })
      .createWindowData(windowOptions);
    const windowTransform: DatasetTransform = {
      type: "window",
      partitionBy: ["group"],
      sortBy: [{ field: "order", order: "ascending" }],
      operations: [{
        op: "movingMean",
        field: "value",
        as: "movingValue",
        frame: { preceding: 2, following: 0 },
        minPeriods: 1,
        missing: "error"
      }]
    };
    const durationWindowOptions: WindowDataOptions = {
      id: "elapsed",
      temporalUnit: "timestamp",
      sortBy: [{ field: "time" }],
      operations: [{
        op: "movingMean",
        field: "value",
        as: "mean",
        frame: { duration: { preceding: 7, unit: "day" } },
        minPeriods: 2,
        missing: "skip"
      }]
    };
    const durationWindowed: ChartProgram = chart()
      .createData({ id: "durationSource", values: [
        { time: 0, value: 2 }, { time: 86_400_000, value: 4 }
      ] })
      .createWindowData(durationWindowOptions);
    void durationWindowed;
    const invalidDurationFrame: WindowDataOptions = {
      id: "invalidDuration",
      temporalUnit: "timestamp",
      sortBy: [{ field: "time" }],
      operations: [{
        op: "movingSum",
        field: "value",
        as: "sum",
        // @ts-expect-error Row and duration frame modes are mutually exclusive.
        frame: { preceding: 1, duration: { preceding: 1, unit: "day" } }
      }]
    };
    void invalidDurationFrame;
    const binOptions: Bin2DDataOptions = {
      id: "cells",
      x: "x",
      y: "y",
      bins: { x: 2, y: 2 },
      extent: { x: [0, 2] },
      includeEmpty: true,
      members: true,
      as: { count: "count", members: "members" }
    };
    const binTransform: DatasetTransform = {
      type: "bin2d",
      x: "x",
      y: "y",
      bins: { x: 2, y: 2 },
      extent: { x: "auto", y: "auto" },
      includeEmpty: false,
      members: false,
      as: { x0: "x0", x1: "x1", y0: "y0", y1: "y1", count: "count" }
    };
    const binned: ChartProgram = chart()
      .createData({ id: "binSource", values: [{ x: 0, y: 0 }, { x: 2, y: 2 }] })
      .createBin2DData(binOptions);
    const binEdit: EditBin2DDataOptions = {
      target: "cells",
      bins: 1,
      includeEmpty: false
    };
    const editedBinned: ChartProgram = binned.editBin2DData(binEdit);
    const clippingTypes: ChartProgram = chart();
    clippingTypes.createPointMark({clip:true}); clippingTypes.editPointMark({clip:false});
    clippingTypes.createLineMark({clip:true}); clippingTypes.editLineMark({clip:false});
    clippingTypes.createAreaMark({clip:true}); clippingTypes.editAreaMark({clip:false});
    clippingTypes.createBarMark({clip:true}); clippingTypes.editBarMark({clip:false});
    clippingTypes.createRectMark({clip:true}); clippingTypes.editRectMark({clip:false});
    clippingTypes.createRuleMark({clip:true}); clippingTypes.editRuleMark({clip:false});
    clippingTypes.createTextMark({clip:true}); clippingTypes.editTextMark({clip:false});
    clippingTypes.createTickMark({clip:true}); clippingTypes.editTickMark({clip:false});
    clippingTypes.createScatterPlot({x:"x",y:"y",point:{clip:true}});
    clippingTypes.createLinePlot({x:"x",y:"y",line:{clip:true}});
    // @ts-expect-error clip uses a boolean
    clippingTypes.editPointMark({clip:"true"});
    // @ts-expect-error Cartesian clip is not part of Polar facade styles
    clippingTypes.createPolarScatterPlot({theta:"x",radius:"y",point:{clip:true}});
    // @ts-expect-error Arc does not use Cartesian clipping
    clippingTypes.createArcMark({clip:true});

    const inspected = chart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2 }] })
      .createPointMark({ id: "points" })
      .encodeX({ field: "x" })
      .encodeY({ field: "y" });
    const withoutXAxis: ChartProgram = inspected
      .createXAxis()
      .editXAxis(axisRemovalOptions);
    const faceted: ChartProgram = inspected.facet({ field: "x", columns: 1 });
    const polar: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ angle: 0, distance: 1 }] })
      .createPointMark()
      .encodeTheta({ field: "angle", scale: { range: [0, 360] } })
      .encodeR({ field: "distance", scale: { type: "sqrt" } })
      .encodePointRadius({ value: 2 });
    polar.encodeR({ field: "distance", aggregate: "sum", mapping: "area", scale: { zero: true, nice: false } });
    polar.encodeR({ aggregate: "count", mapping: "radius-length" });
    polar.editScale({ radialMapping: "area" });
    const componentOptions: import("ggaction").CreateRadialAxisLabelsOptions = {
      angle: 135, values: [0, 1], fontWeight: 600
    };
    polar.createThetaAxisLine().createThetaAxisTicks({ count: 3 })
      .createThetaAxisLabels({ values: [0, 1] }).createThetaAxisTitle({ text: "Angle" });
    polar.createRadialAxisLine({ angle: 135 }).createRadialAxisTicks({ count: 3 })
      .createRadialAxisLabels(componentOptions).createRadialAxisTitle({ position: "outside" });
    program.createXAxis({ title: false, ticksAndLabels: false });
    polar.createRadialAxis({ angle: 180, line: false, ticksAndLabels: false });
    polar.editRadialAxis({ angle: 45, title: false, ticksAndLabels: false });
    polar.editThetaAxis({ line: false, ticks: false, labels: false, title: false });
    // @ts-expect-error Theta complete creation has no radial angle
    polar.createThetaAxis({ angle: 90 });
    // @ts-expect-error Theta component has no radial angle
    polar.createThetaAxisTitle({ angle: 90 });
    // @ts-expect-error Tick selection policies are exclusive
    polar.createRadialAxisLabels({ count: 3, values: [0, 1] });

    // @ts-expect-error measured count has no field
    polar.encodeR({ field: "distance", aggregate: "count", mapping: "area" });
    // @ts-expect-error measured scale cannot reverse
    polar.encodeR({ aggregate: "count", mapping: "area", scale: { reverse: true } });
    const arcs: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ group: "A" }, { group: "B" }] })
      .createArcMark({ innerRadius: 0.4 })
      .encodeTheta({ field: "group", aggregate: "count" })
      .encodeColor({ field: "group" })
      .editArcMark({ padAngle: 2 });
    const thetaScale: ThetaScaleOptions = {
      type: "band",
      domain: ["A", "B"],
      range: [0, 360]
    };
    const weightedTheta: ThetaEncodingOptions = {
      field: "group",
      fieldType: "nominal",
      aggregate: "sum",
      weight: "weight",
      scale: thetaScale
    };
    const weightedArcs: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { group: "A", weight: 1 },
        { group: "B", weight: 2 }
      ] })
      .createArcMark()
      .encodeTheta(weightedTheta);
    const strokeWidthOptions: StrokeWidthEncodingOptions = {
      field: "weight",
      scale: { domain: [0, 10], range: [1, 6] }
    };
    const weightedRules: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { x: 1, x2: 2, y: 3, weight: 0 },
        { x: 2, x2: 3, y: 4, weight: 10 }
      ] })
      .createRuleMark()
      .encodeX({ field: "x", fieldType: "quantitative" })
      .encodeX2({ field: "x2", fieldType: "quantitative" })
      .encodeY({ field: "y", fieldType: "quantitative" })
      .encodeStrokeWidth(strokeWidthOptions)
      .createLegend({ channels: ["strokeWidth"] });
    const strokeOptions: StrokeEncodingOptions = {
      field: "outline",
      scale: { domain: ["A", "B"], range: ["red", "blue"] }
    };
    const strokeEdit: EditStrokeScaleOptions = {
      target: "typedStroke",
      palette: "set2"
    };
    const typedStroke: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [
        { x: 0, y: 0, outline: "A" },
        { x: 1, y: 1, outline: "B" }
      ] })
      .createPointMark({ id: "typedStroke" })
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeStroke(strokeOptions)
      .editStrokeScale(strokeEdit)
      .createLegend({ channels: ["stroke"] });
    // @ts-expect-error stroke scale editing requires a mark target
    typedStroke.editStrokeScale({ palette: "set1" });
    // @ts-expect-error stroke scale editing rejects raw scale ids
    typedStroke.editStrokeScale({ target: "typedStroke", id: "stroke", palette: "set1" });
    weightedRules.editLegendLayout({ position: "top", layout: "edge", columns: 3, direction: "vertical", titlePosition: "left" })
      .editLegend({ border: { padding: 8 }, title: false });
    const jitterOffset: JitterMaxOffset = { pixels: 2 };
    const jitterOptions: JitterPointsOptions = {
      channel: "both",
      maxOffset: jitterOffset,
      key: "x"
    };
    const removeJitterOptions: RemoveJitterOptions = {};
    const jittered: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .jitterPoints(jitterOptions)
      .removeJitter(removeJitterOptions);
    const pointPackingOffset: PointPackingMaxOffset = { band: 0.4 };
    const pointPackingOptions: PackPointsOptions = {
      channel: "x", maxOffset: pointPackingOffset, key: "id", overflow: "overlap"
    };
    const removePointPackingOptions: RemovePointPackingOptions = {};
    const packed: ChartProgram = chart()
      .createCanvas()
      .createData({ values: [{ id: "a", c: "A", v: 2 }, { id: "b", c: "A", v: 2 }] })
      .createPointMark()
      .encodeX({ field: "c", fieldType: "nominal" })
      .encodeY({ field: "v" })
      .packPoints(pointPackingOptions)
      .removePointPacking(removePointPackingOptions);
    const pointLayer = inspected.semanticSpec.layers.find(
      layer => layer.id === "points"
    );
    const pointItems = inspected.graphicSpec.objects.points?.items ?? [];
    const lastAction = inspected.trace.children.at(-1)?.op;
    // @ts-expect-error DatasetTransform is a closed discriminated union.
    const invalidTransform: DatasetTransform = { type: "unknown" };
    void draw;
    void themedProgram;
    void basicThemedProgram;
    void scatterFacade;
    void basicScatter;
    void basicDraw;
    void horizonFacade;
    void lineFacade;
    void orderedLineFacade;
    void barFacade;
    void typedOffsetBars;
    void editedXOffsetBars;
    void histogramFacade;
    void heatmapFacade;
    void gradientFacade;
    void violinFacade;
    void png;
    void extensionProgram;
    void composed;
    void nested;
    void facetPolicyEdited;
    void typedRepeat;
    void typedRevisedGrid;
    void typedRemoved;
    void faceted;
    void derived;
    void windowed;
    void windowTransform;
    void polar;
    void arcs;
    void weightedArcs;
    void weightedRules;
    void typedStroke;
    void jittered;
    void packed;
    void pointLayer;
    void pointItems;
    void lastAction;
    void withoutXAxis;
    void invalidTransform;

    chart().createRectMark().encodeX({ datum: 2 }).encodeX2({ datum: 6 });
    chart().createRectMark().encodeY({ datum: "2020-01-01", fieldType: "temporal" }).encodeY2({ datum: "2020-01-03" });
    chart().createTextMark({ data: "data", text: "note", rotation: { value: 90, unit: "degrees" } })
      .encodeX({ datum: 8 }).encodeY({ datum: "B", fieldType: "nominal" })
      .editTextMark({ rotation: { value: Math.PI / 4, unit: "radians" } });
    chart().createAnnotation({ text: "Peak", x: 8, y: 9, rotation: { value: -45, unit: "degrees" } });
    chart().createAnnotation({ text: "Point", source: "points" });
    chart().createBarMark({ orientation: "horizontal" }).encodeBarWidth({ pixels: 12 });
    basicChart().createBarPlot({ x: "x", y: "y", orientation: "horizontal", width: { pixels: 12 } });
    // @ts-expect-error Bar orientation is a closed vocabulary.
    chart().createBarPlot({ x: "x", y: "y", orientation: "diagonal" });
    chart().createAnnotation({ text: "Total", anchor: "plot-center", fontSize: 24 });
    // @ts-expect-error The named anchor owns alignment.
    chart().createAnnotation({ text: "Total", anchor: "plot-center", align: "left" });
    // @ts-expect-error The named anchor owns coordinates.
    chart().createAnnotation({ text: "Total", anchor: "plot-center", x: 0.5, y: 0.5 });
    chart().createAnnotation({ text: "Plot", space: "plot", x: 0.5, y: 0.75, data: "data" });
    chart().createXAxisTitle({ text: "X", rotation: { value: 180, unit: "degrees" } })
      .editXAxisTitle({ rotation: { value: Math.PI, unit: "radians" } });
    // @ts-expect-error Rotation units are a closed vocabulary.
    chart().createTextMark({ rotation: { value: 1, unit: "turns" } });
    // @ts-expect-error Structured rotation requires a finite value.
    chart().createXAxisTitle({ rotation: { unit: "degrees" } });
    // @ts-expect-error Annotation coordinate anchors require both axes.
    chart().createAnnotation({ text: "x only", x: 1 });
    // @ts-expect-error Plot annotation fractions are numeric.
    chart().createAnnotation({ text: "plot", space: "plot", x: "0.5", y: 0.5 });
    chart().createReferenceLine({ y: 5 });
    chart().createReferenceBand({ space: "plot", x: [0.2, 0.6] });
    // @ts-expect-error Plot reference coordinates are numeric.
    chart().createReferenceLine({ space: "plot", x: "0.5" });
    const polygonShape: import("ggaction").PointPolygonShape = {
      polygon: [{x:0,y:0},{x:1,y:0},{x:0,y:1}], normalization: "radius"
    };
    const basicPolygonShape: import("ggaction/basic").PointPolygonShape = polygonShape;
    program.createPointMark({shape:polygonShape});
    basicChart().createPointMark({shape:basicPolygonShape});
    program.encodeShape({field:"category",scale:{range:[polygonShape,"circle"],unknown:polygonShape}});
    // @ts-expect-error polygon normalization is a closed vocabulary.
    program.editPointMark({shape:{polygon:[],normalization:"automatic"}});
    chart().encodeSize({ field: "m", scale: { type: "log", domain: [1, 100], base: 10 } });
    chart().encodeSize({ field: "m", scale: { type: "pow", domain: [0, 100], exponent: 2 } });
    chart().encodeSize({ field: "m", scale: { type: "threshold", domain: [10], range: [20, 80] } });
    chart().editSizeScale({ type: "quantile", domain: "auto", range: [20, 40, 80] });
    program.encodeStrokeDash({ field: "level", fieldType: "ordinal", scale: { domain: [1, 2], range: [[1, 0], [4, 2]], unknown: [] } });
    program.editStrokeDashScale({ unknown: "dotted" });
    program.editStrokeDashScale({ unknown: undefined });
    basicChart().encodeStrokeDash({ field: "level", fieldType: "ordinal" });
    chart().createLinePlot({ x: "x", y: "y", strokeDash: { field: "level", fieldType: "ordinal" } });
    program.encodeChannels({ target: "paths", channels: { strokeDash: { field: "level", fieldType: "ordinal" } } });
    // @ts-expect-error Stroke dash does not become a continuous channel.
    program.encodeStrokeDash({ field: "level", fieldType: "quantitative" });
    // @ts-expect-error Constant dash still rejects fieldType.
    program.encodeStrokeDash({ value: "solid", fieldType: "ordinal" });
    program.encodeSize({ field: "category", fieldType: "nominal", scale: { domain: [10, "10", false], range: [9, 81, 25] } });
    program.editSizeScale({ type: "ordinal", domain: [false, "10", 10], range: [25] });
    basicChart().createScatterPlot({ x: "x", y: "y", size: { field: "group", fieldType: "ordinal" } });
    // @ts-expect-error Categorical size must use ordinal scales.
    program.encodeSize({ field: "group", fieldType: "nominal", scale: { type: "linear" } });
    // @ts-expect-error Quantitative size must use numeric scales.
    program.encodeSize({ field: "value", fieldType: "quantitative", scale: { type: "ordinal" } });
    // @ts-expect-error Categorical size areas must be numbers.
    program.encodeSize({ field: "group", fieldType: "nominal", scale: { range: ["red"] } });
    // @ts-expect-error Power size scales require an exponent during encoding.
    chart().encodeSize({ field: "m", scale: { type: "pow", domain: [0, 100] } });
    // @ts-expect-error Threshold size scales require one more range area than the type can infer.
    chart().encodeSize({ field: "m", scale: { type: "threshold", domain: [10], range: [20] } });
    // @ts-expect-error Discrete size scales do not support clamp.
    chart().editSizeScale({ type: "quantize", domain: [0, 100], range: [20, 80], clamp: true });
    chart().createMarkLabels();
    chart().createMarkLabels({ source: "bars", content: "share", format: ".0%", layout: { axis: "y" } });
    chart().createMarkLabels({ source: "bars", select: { field: "value", op: "max", count: 2 } });
    chart().createMarkLabels({ source: "bars", selection: "focus" });
    chart().editMarkLabelSelection({ target: "bars-labels", select: { field: "value", op: "gt", value: 2 } });
    chart().editMarkLabelSelection({ target: "bars-labels", selection: "focus" });
    chart().editMarkLabelSelection({ target: "bars-labels", all: true });
    chart().editMarkLabelPlacement({ target: "bars-labels", placement: "auto" });
    chart().editMarkLabelPlacement({
      target: "bars-labels",
      placement: {
        anchor: "outsideEnd",
        gap: 8,
        overflow: "outside",
        leader: { stroke: "#475569", strokeWidth: 2 }
      }
    });
    // @ts-expect-error Semantic placement requires a supported anchor.
    chart().editMarkLabelPlacement({ target: "bars-labels", placement: { anchor: "baseline" } });
    // @ts-expect-error Semantic placement gaps must be numeric.
    chart().createMarkLabels({ placement: { anchor: "center", gap: "-1" } });
    // @ts-expect-error Label creation selection branches are exclusive.
    chart().createMarkLabels({ select: { field: "value", op: "max" }, selection: "focus" });
    // @ts-expect-error Label selection editing requires a replacement branch.
    chart().editMarkLabelSelection({ target: "bars-labels" });
    // @ts-expect-error all is true-only.
    chart().editMarkLabelSelection({ target: "bars-labels", all: false });
    chart().removeMarkLabels({ target: "bars-labels" });
    chart().removeMarkLabels({ source: "bars" });
    // @ts-expect-error Label removal requires exactly one selector.
    chart().removeMarkLabels({});
    // @ts-expect-error Label target and source are exclusive.
    chart().removeMarkLabels({ target: "bars-labels", source: "bars" });
    // @ts-expect-error The facade retains exclusive text branches.
    chart().createMarkLabels({ field: "x", content: "value" });
    // @ts-expect-error Layout target is facade-owned.
    chart().createMarkLabels({ layout: { target: "other" } });
    chart().encodeText({ content: "share", normalizeBy: "category", format: ".12%" });
    chart().encodeText({ content: "category" });
    chart().encodeText({ value: 0.5, format: ".01%" });
    chart().encodeText({ value: 1250, format: ".2e" });
    chart().encodeText({ value: "2024-03-05T00:00:00Z", format: "%Y-%m-%d" });
    // @ts-expect-error Precision cannot exceed twelve.
    chart().encodeText({ value: 1, format: ".13f" });
    // @ts-expect-error Precision cannot be negative.
    chart().encodeText({ value: 1, format: ".-1%" });
    // @ts-expect-error Precision must be an integer.
    chart().encodeText({ value: 1, format: ".1.5f" });
    chart().encodeText({ content: "value", format: ".2f" });
    // @ts-expect-error Semantic content and raw field are exclusive.
    chart().encodeText({ content: "value", field: "value" });
    // @ts-expect-error Normalization only applies to share content.
    chart().encodeText({ content: "category", normalizeBy: "source" });
    // @ts-expect-error Normalization scope is closed.
    chart().encodeText({ content: "share", normalizeBy: "rows" });
    // @ts-expect-error Content vocabulary is closed.
    chart().encodeText({ content: "total" });
    chart().createTextMark({ source: "points", text: "Label" }).editTextMark({ dx: 2 });
    // @ts-expect-error Source is a mark ID.
    chart().createTextMark({ source: 1 });
    // @ts-expect-error Source is a creation option, not an appearance edit.
    chart().editTextMark({ source: "points", dx: 2 });

    chart().editLegendBlock({
      target: "points",
      channel: "size",
      title: "Magnitude",
      values: [4, 9],
      gap: 0,
      text: {},
      symbol: { fill: "orange", strokeWidth: 2, opacity: 1 }
    });
    // @ts-expect-error Block editing is Full-only.
    basicChart().editLegendBlock({ target: "points", channel: "color", title: "Group" });
    chart().editLegendBlock({ target: "points", channel: "color", labelMap: [] });
    // @ts-expect-error Display labels must be strings.
    chart().editLegendBlock({ target: "points", channel: "color", labelMap: [{ value: "A", label: 1 }] });
    // @ts-expect-error Explicit block samples are non-empty.
    chart().editLegendBlock({ target: "points", channel: "size", values: [] });

    const opacityLegendTypes = chart().createCanvas({ width: 1200, height: 1000, margin: 300 })
      .createData({ values: [{ x: 0, y: 0, m: 0 }, { x: 1, y: 1, m: 1 }] })
      .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeOpacity({ field: "m" });
    opacityLegendTypes.createLegend({ channels: ["opacity"], symbol: { type: "point", radius: 9, fill: "red", stroke: "black", strokeWidth: 2 } })
      .editLegend({ symbol: { radius: 11 }, labels: { format: ".1%" } })
      .editLegendSymbols({ symbol: { type: "point", radius: 13 } })
      .editLegendLabels({ offset: 10, format: ".2e" });
    opacityLegendTypes.createGuides({ legend: { channels: ["opacity"], symbol: { radius: 9 }, clipHeight: 12 } });
    opacityLegendTypes.editLegendSymbols({clipHeight:"auto"});
    opacityLegendTypes.editLegendBlock({target:"points",channel:"opacity",clipHeight:8});
    const legendSpacingCreate: import("ggaction").LegendOptions = {rowPadding:0,titlePadding:20};
    chart().createLegend(legendSpacingCreate).editLegend({rowPadding:"auto",titlePadding:7});
    chart().editLegendLayout({channel:"size",rowPadding:7,titlePadding:"auto"});
    basicChart().createLegend(legendSpacingCreate);
    // @ts-expect-error Creation accepts numbers only.
    chart().createLegend({rowPadding:"auto"});
    // @ts-expect-error A focused layout edit does not accept false as reset.
    chart().editLegendLayout({titlePadding:false});
    // @ts-expect-error Basic keeps its creation-only lifecycle.
    basicChart().editLegendLayout({rowPadding:7});
    // @ts-expect-error Title style edits do not own layout spacing.
    chart().editLegendTitle({titlePadding:20});
    // @ts-expect-error Creation does not accept edit-only auto.
    opacityLegendTypes.createLegend({clipHeight:"auto"});
    // @ts-expect-error Opacity symbol radius must be numeric.
    opacityLegendTypes.createLegend({ channels: ["opacity"], symbol: { radius: "9" } });
    // @ts-expect-error Legend precision cannot exceed twelve.
    opacityLegendTypes.createLegend({ channels: ["opacity"], labels: { format: ".13e" } });

const subtitleSpacing = chart().createCanvas().createTitle({
  text: "Heading", subtitle: "First\nSecond", subtitleLineHeight: 16
});
subtitleSpacing.editTitle({ subtitleLineHeight: 18 });
// @ts-expect-error Subtitle spacing is numeric; reset strings are not public options.
subtitleSpacing.editTitle({ subtitleLineHeight: "auto" });

const keyedSource = chart().createData({ id: "keyed", values: [{ id: "a", x: 1 }], keyField: "id" });
keyedSource.reviseData({ source: "keyed", id: "nextKeyed", values: [{ id: "a", x: 2 }] });
chart().createData({ id: "generated", values: [{}] }).reviseData({ source: "generated", id: "nextGenerated", values: [{}, {}], rowMap: [0, null] });
chart().createData({ values: [{}, {}], keys: [new Date(0), [1n, true, "a"]] });
// @ts-expect-error source key modes are mutually exclusive
chart().createData({ values: [{ id: "a" }], keyField: "id", keys: ["a"] });
// @ts-expect-error revision mappings cannot be mixed
keyedSource.reviseData({ source: "keyed", id: "invalid", values: [{}], keys: ["a"], rowMap: [0] });

const compoundClip: import("ggaction").GraphicClipPath = {type:"path",commands:[{op:"M",x:0,y:0},{op:"Z"}],fillRule:"evenodd"};
const clipUnion: import("ggaction").GraphicClip = compoundClip;
const fillRule: import("ggaction").PathFillRule = "nonzero";
const compoundOwner: import("ggaction").GraphicObject = {type:"path",clip:clipUnion,properties:{fillRule}};
// @ts-expect-error unknown fill rules are rejected
const invalidClip: import("ggaction").GraphicClipPath = {...compoundClip,fillRule:"alternate"};
const compoundSceneClip: NonNullable<import("ggaction/scene").CanvasTransitionNode["clips"]>[number] = compoundClip;

// Expression filters reuse the closed v2 AST and exclude legacy field options.
const predicateFilter = chart().createData({ id: "predicate-input", values: [{ x: 1 }] })
  .createParameter({ id: "threshold", value: 0 })
  .filterData({ id: "predicate-output", where: { version: 2, registry: "standard@1", root: {
    type: "binary", op: "gte", left: { type: "field", name: "x" }, right: { type: "parameter", id: "threshold" }
  } } });
predicateFilter.editFilteredData({ target: "predicate-output", where: { version: 2, registry: "standard@1", root: { type: "literal", value: false } } });
// @ts-expect-error Expression filters cannot combine legacy field options.
predicateFilter.filterData({ id: "mixed-predicate", field: "x", where: { version: 2, registry: "standard@1", root: { type: "literal", value: true } } });
// @ts-expect-error Filter predicates require the closed v2 AST, not callbacks.
predicateFilter.filterData({ id: "callback-predicate", where: () => true });
const pivotConsumer = chart().createData({ id: "pivotRaw", values: [{ key: "a", value: 2 }] })
  .createPivotData({ id: "pivotWide", field: "key", value: "value" })
  .editPivotData({ target: "pivotWide", op: "count" });
// @ts-expect-error count has no numeric value input
chart().createPivotData({id:"badPivot",field:"key",op:"count",value:"amount"});

chart().createRegressionPlot({ x: "x", y: "y", method: "loess", degree: 2, robustIterations: 2 });
chart().createRegressionData({ id: "fit", x: "x", y: "y", method: "loess", degree: 1 });
chart().editRegression({ method: "loess", degree: 2 });
// @ts-expect-error local polynomial degree is bounded
chart().createRegression({ method: "loess", degree: 3 });
// @ts-expect-error local quadratic fits do not produce intervals
chart().createRegressionData({ id: "fit", x: "x", y: "y", method: "loess", degree: 2, interval: false });

const calendarDomain: import("ggaction").CalendarDayDomain = {unit:"day",start:"2024-01-01",end:"2024-12-31",timeZone:"UTC"};
chart().createCompleteData({id:"days",key:"day",calendar:calendarDomain}).editCompleteData({target:"days",calendar:calendarDomain});
// @ts-expect-error calendar and sequence are mutually exclusive
chart().createCompleteData({id:"days",key:"day",calendar:calendarDomain,sequence:{start:0,end:1,step:1}});
// @ts-expect-error named time zone is required
chart().editCompleteData({target:"days",calendar:{unit:"day",start:"2024-01-01",end:"2024-12-31"}});

// Shared pre-fill outline and actual Text glyph style on the installed surface.
const outlineProgram = chart().createCanvas({width:240,height:180}).createData({values:[{x:1,y:2}]})
  .createPointMark({outline:{color:"white",width:8}}).encodeX({field:"x"}).encodeY({field:"y"})
  .editPointMark({outline:false});
outlineProgram.createTextMark({outline:{color:"white",width:4},lineJoin:"round",miterLimit:2});
// @ts-expect-error outline replacement requires a color
outlineProgram.editPointMark({outline:{width:8}});
// Embedded image preparations retain their package-only opaque authority.
async function imageConsumer() {
  const {prepareImageResource, prepareImageRendering} = await import("ggaction");
  const {prepareImageRendering: prepareBasicImages} = await import("ggaction/basic");
  const {createTransitionScene, renderTransitionScene} = await import("ggaction/scene");
  const base = chart().createCanvas();
  const source = {uri: "fixture:logo", expectedHash: "a".repeat(64), mimeType: "image/png" as const};
  const host = {requestToken: "now", load: () => ({bytes: new Uint8Array(), mimeType: source.mimeType}), decode: () => ({width: 20, height: 10, originClean: true as const})};
  const prepared = await prepareImageResource(base, {kind: "create", id: "logo", ...source}, host);
  const program = base.createImageResource({prepared, requestToken: "now"})
    .createImageMark({image: "logo", fit: "contain", alt: "Logo"}).editImageMark({opacity: 0.5});
  const decode = () => ({image: {}, width: 20, height: 10, originClean: true as const});
  const images = await prepareImageRendering(program, {decode});
  render(program, {} as CanvasRenderingContext2D, {images});
  const scene = createTransitionScene(program, {format: "canvas"});
  renderTransitionScene(scene, {} as CanvasRenderingContext2D, {images: await prepareBasicImages(scene, {decode})});
  program.removeResource({kind: "image", id: "logo", cascade: true});
  // @ts-expect-error resource authoring requires authentic preparation
  base.createImageResource({prepared: {kind: "image-resource", request: {kind: "create", id: "logo"}}, requestToken: "now"});
}

import { prepareFontResource, prepareTextMetrics, prepareFontRendering, type FontResourceHost,
  type TextMetricsHost, type FontRenderingHost, type PreparedFontResource, type PreparedTextMetrics } from "ggaction";
import { prepareFontRendering as prepareBasicFonts } from "ggaction/basic";
declare const fontHost: FontResourceHost;
declare const fontMetricsHost: TextMetricsHost;
declare const fontRenderHost: FontRenderingHost;
const fontBase = chart();
const fontSource = { uri: "fixture:font", expectedHash: "a".repeat(64), mimeType: "font/ttf" as const,
  family: "Fixture", style: "normal" as const, weight: 400 as const, metricsProviderVersion: "fixture@1" };
const fontCreate = await prepareFontResource(fontBase, { kind: "create", id: "font", ...fontSource }, fontHost);
const withFont = fontBase.createFontResource({ prepared: fontCreate, requestToken: "current" });
const fontReplace = await prepareFontResource(withFont, { kind: "replace", target: "font", ...fontSource }, fontHost);
withFont.replaceFontResource({ prepared: fontReplace, requestToken: "current" });
const fontMetrics = await prepareTextMetrics(withFont, { id: "measured", fonts: ["font"] }, fontMetricsHost);
const exactFontProgram = withFont.applyTextMetrics({ prepared: fontMetrics, requestToken: "current" });
const preparedFonts = await prepareFontRendering(exactFontProgram, fontRenderHost);
render(exactFontProgram, {} as CanvasRenderingContext2D, { fonts: preparedFonts });
preparedFonts.dispose();
await prepareBasicFonts(basicChart(), fontRenderHost);
exactFontProgram.removeResource({ kind: "font", id: "font", cascade: true });
// @ts-expect-error resource preparation handles are opaque
const forgedFont: PreparedFontResource = { kind: "font-resource", request: { kind: "create", id: "font" } };
// @ts-expect-error metric preparation handles are opaque
const forgedFontMetrics: PreparedTextMetrics = { kind: "text-metrics", request: { id: "m", fonts: ["font"] } };
// @ts-expect-error prepared metrics apply to their exact receiver only
withFont.applyTextMetrics({ prepared: fontMetrics, requestToken: "current", target: { childPath: ["a"] } });
// @ts-expect-error Basic has no font resource authoring
basicChart().createFontResource({ prepared: fontCreate, requestToken: "current" });
// @ts-expect-error create cannot consume replacement evidence
fontBase.createFontResource({ prepared: fontReplace, requestToken: "current" });
