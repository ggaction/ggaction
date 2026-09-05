import { chart } from "../../src/index.js";
import targets from "./targets.json" with { type: "json" };

export function createAreaSimple() {
  const target = targets[0];
  return chart()
    .createCanvas(target.dimensions)
    .createData(target.publicCalls[1].args)
    .createAreaPlot({"id": "m", "x": "time", "y": "value"});
}

export function createAreaSignedBaseline() {
  const target = targets[1];
  return chart()
    .createCanvas(target.dimensions)
    .createData(target.publicCalls[1].args)
    .createAreaPlot({"id": "m", "x": "time", "y": {"field": "value", "scale": {"nice": false}}, "baseline": 1});
}

export function createAreaHorizontalLog() {
  const target = targets[2];
  return chart()
    .createCanvas(target.dimensions)
    .createData(target.publicCalls[1].args)
    .createAreaPlot({"id": "m", "x": {"field": "value", "scale": {"type": "log", "nice": false}}, "y": "time", "valueChannel": "x", "baseline": 1});
}

export function createRibbonCrossing() {
  const target = targets[3];
  return chart()
    .createCanvas(target.dimensions)
    .createData(target.publicCalls[1].args)
    .createAreaPlot({"id": "m", "x": "time", "y": {"lower": "low", "upper": "high"}});
}

export function createAreaMissingBreak() {
  const target = targets[4];
  return chart()
    .createCanvas(target.dimensions)
    .createData(target.publicCalls[1].args)
    .createAreaPlot({"id": "m", "x": "x", "y": "value", "missing": "break"});
}

export function createAreaStack() {
  const target = targets[5];
  return chart()
    .createCanvas(target.dimensions)
    .createData(target.publicCalls[1].args)
    .createAreaPlot({"id": "m", "x": "x", "y": "value", "groupBy": "series", "layout": "stack", "color": "region"});
}

export function createAreaFill() {
  const target = targets[6];
  return chart()
    .createCanvas(target.dimensions)
    .createData(target.publicCalls[1].args)
    .createAreaPlot({"id": "m", "x": "x", "y": "value", "groupBy": "series", "layout": "fill", "color": "region"});
}

export function createAreaDiverging() {
  const target = targets[7];
  return chart()
    .createCanvas(target.dimensions)
    .createData(target.publicCalls[1].args)
    .createAreaPlot({"id": "m", "x": "x", "y": "value", "groupBy": "series", "layout": "diverging", "color": "region"});
}

export function createAreaCenter() {
  const target = targets[8];
  return chart()
    .createCanvas(target.dimensions)
    .createData(target.publicCalls[1].args)
    .createAreaPlot({"id": "m", "x": "x", "y": "value", "groupBy": "series", "layout": "center", "color": "region"});
}

export function createBarIndependentStack() {
  const target = targets[9];
  return chart()
    .createCanvas(target.dimensions)
    .createData(target.publicCalls[1].args)
    .createBarPlot({"id": "m", "x": "category", "y": {"field": "value", "aggregate": "sum"}})
    .encodeGroup({"target": "m", "field": "series"})
    .layoutSeries({"target": "m", "mode": "stack"});
}

export function createBarLayoutRoundtrip() {
  const target = targets[10];
  return chart()
    .createCanvas(target.dimensions)
    .createData(target.publicCalls[1].args)
    .createBarPlot({"id": "m", "x": "category", "y": {"field": "value", "aggregate": "sum"}})
    .encodeGroup({"target": "m", "field": "series"})
    .layoutSeries({"target": "m", "mode": "group"})
    .layoutSeries({"target": "m", "mode": "stack"})
    .layoutSeries({"target": "m", "mode": "group"});
}

export const areaLayoutExamples = Object.freeze({
  "area-simple": createAreaSimple,
  "area-signed-baseline": createAreaSignedBaseline,
  "area-horizontal-log": createAreaHorizontalLog,
  "ribbon-crossing": createRibbonCrossing,
  "area-missing-break": createAreaMissingBreak,
  "area-stack": createAreaStack,
  "area-fill": createAreaFill,
  "area-diverging": createAreaDiverging,
  "area-center": createAreaCenter,
  "bar-independent-stack": createBarIndependentStack,
  "bar-layout-roundtrip": createBarLayoutRoundtrip
});
