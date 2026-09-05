import { chart } from "../../../src/index.js";
import { areaReference, barReference, defaultColors, layout } from "./reference-values.js";

function verticalArea(reference) {
  let program = chart()
    .createCanvas(layout)
    .createData({ id: "data", values: reference.rows })
    .createAreaMark({ id: "m", data: "data" })
    .createCoordinate({ id: "main", type: "cartesian" })
    .editSemantic({ property: "layer[m].coordinate", value: "main" })
    .editSemantic({ property: "layer[m].mark.missing", value: reference.options.missing ?? "error" })
    .editSemantic({ property: "layer[m].layout.mode", value: reference.mode })
    .editSemantic({ property: "layer[m].encoding.x.field", value: reference.independentField })
    .editSemantic({ property: "layer[m].encoding.x.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[m].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[m].encoding.y.field", value: reference.primary })
    .editSemantic({ property: "layer[m].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[m].encoding.y.scale", value: "y" })
    .editSemantic({ property: typeof reference.secondary === "string"
      ? "layer[m].encoding.y2.field" : "layer[m].encoding.y2.datum",
      value: typeof reference.secondary === "string" ? reference.secondary : reference.secondary.datum })
    .editSemantic({ property: "layer[m].encoding.y2.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[m].encoding.y2.scale", value: "y" });
  if (reference.options.groupBy) {
    program = program
      .editSemantic({ property: "layer[m].encoding.group.field", value: reference.options.groupBy })
      .editSemantic({ property: "layer[m].encoding.group.fieldType", value: "nominal" });
  }
  if (reference.options.missing === "break") {
    // Resolve the oracle's explicit domain through the constant baseline consumer.
    // The current strict field reader cannot yet consume missing area endpoints.
    program = program.editSemantic({ property: "layer[m].encoding.y.scale", remove: true });
  }
  program = program
    .createScale({ id: "x", type: "linear", domain: reference.xDomain, range: "auto", nice: true, zero: false })
    .createScale({ id: "y", type: "linear", domain: reference.yDomain, range: "auto",
      nice: reference.options.y?.scale?.nice ?? true, zero: false })
    .rematerializeScale({ id: "x" })
    .rematerializeScale({ id: "y" })
    // The current domain resolver does not yet consume the planned endpoint/layout policies.
    // Resolve the independent oracle's domain, then record the target automatic-domain intent.
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[y].domain", value: "auto" });
  if (reference.options.missing === "break") {
    program = program.editSemantic({ property: "layer[m].encoding.y.scale", value: "y" });
  }
  if (reference.options.color) {
    program = program
      .editSemantic({ property: "layer[m].encoding.color.field", value: reference.options.color })
      .editSemantic({ property: "layer[m].encoding.color.fieldType", value: "nominal" })
      .editSemantic({ property: "layer[m].encoding.color.scale", value: "color" })
      .createScale({ id: "color", type: "ordinal", domain: "auto", range: defaultColors })
      .rematerializeScale({ id: "color" })
      .editSemantic({ property: "scale[color].range", value: "auto" });
  }
  return program
    .editGraphics({ target: "m", property: "length", value: reference.segments.length })
    .editGraphics({ target: "m", property: "commands", value: reference.segments.map(s => s.commands) })
    .editGraphics({ target: "m", property: "fill", value: reference.segments.map(s => s.fill) })
    .editGraphics({ target: "m", property: "opacity", value: 0.2 })
    .createGuides();
}

function horizontalArea(reference) {
  return chart()
    .createCanvas(layout)
    .createData({ id: "data", values: reference.rows })
    .createAreaMark({ id: "m", data: "data" })
    .createCoordinate({ id: "main", type: "cartesian" })
    .editSemantic({ property: "layer[m].coordinate", value: "main" })
    .editSemantic({ property: "layer[m].mark.missing", value: "error" })
    .editSemantic({ property: "layer[m].layout.mode", value: "overlay" })
    .editSemantic({ property: "layer[m].encoding.y.field", value: reference.independentField })
    .editSemantic({ property: "layer[m].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[m].encoding.y.scale", value: "y" })
    .editSemantic({ property: "layer[m].encoding.x.field", value: reference.primary })
    .editSemantic({ property: "layer[m].encoding.x.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[m].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[m].encoding.x2.datum", value: reference.secondary.datum })
    .editSemantic({ property: "layer[m].encoding.x2.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[m].encoding.x2.scale", value: "x" })
    .createScale({ id: "x", type: "log", domain: reference.xDomain, range: "auto", nice: false })
    .createScale({ id: "y", type: "linear", domain: reference.yDomain, range: "auto", nice: true, zero: false })
    .rematerializeScale({ id: "x" })
    .rematerializeScale({ id: "y" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[y].domain", value: "auto" })
    .editGraphics({ target: "m", property: "length", value: reference.segments.length })
    .editGraphics({ target: "m", property: "commands", value: reference.segments.map(s => s.commands) })
    .editGraphics({ target: "m", property: "fill", value: "#4c78a8" })
    .editGraphics({ target: "m", property: "opacity", value: 0.2 })
    .createGuides();
}

export function createAreaPrimitive(id) {
  const reference = areaReference(id);
  return reference.horizontal ? horizontalArea(reference) : verticalArea(reference);
}

export function createBarPrimitive(id) {
  const reference = barReference(id);
  let program = chart()
    .createCanvas(layout)
    .createData({ id: "data", values: reference.rows })
    .createBarMark({ id: "m", data: "data" })
    .createCoordinate({ id: "main", type: "cartesian" })
    .editSemantic({ property: "layer[m].coordinate", value: "main" })
    .editSemantic({ property: "layer[m].layout.mode", value: reference.mode })
    .editSemantic({ property: "layer[m].encoding.group.field", value: "series" })
    .editSemantic({ property: "layer[m].encoding.group.fieldType", value: "nominal" })
    .editSemantic({ property: "layer[m].encoding.x.field", value: "category" })
    .editSemantic({ property: "layer[m].encoding.x.fieldType", value: "nominal" })
    .editSemantic({ property: "layer[m].encoding.x.scale", value: "x" })
    .editSemantic({ property: "layer[m].encoding.y.field", value: "value" })
    .editSemantic({ property: "layer[m].encoding.y.fieldType", value: "quantitative" })
    .editSemantic({ property: "layer[m].encoding.y.aggregate", value: "sum" })
    .editSemantic({ property: "layer[m].encoding.y.scale", value: "y" })
    .createScale({ id: "x", type: "band", domain: reference.categories, range: "auto",
      paddingInner: 0, paddingOuter: 0, align: 0.5 })
    .createScale({ id: "y", type: "linear", domain: reference.domain, range: "auto", nice: true, zero: false })
    .rematerializeScale({ id: "x" })
    .rematerializeScale({ id: "y" })
    .editSemantic({ property: "scale[x].domain", value: "auto" })
    .editSemantic({ property: "scale[y].domain", value: "auto" });
  if (reference.mode === "group") {
    program = program
      .editSemantic({ property: "layer[m].encoding.xOffset.field", value: "series" })
      .editSemantic({ property: "layer[m].encoding.xOffset.fieldType", value: "nominal" })
      .editSemantic({ property: "layer[m].encoding.xOffset.scale", value: "xOffset" })
      .createScale({ id: "xOffset", type: "ordinal", domain: "auto", range: "auto" })
      .rematerializeScale({ id: "xOffset" });
  }
  // For the roundtrip target this authors the final expected group state.
  // The future public group -> stack -> group transitions are not executed here.
  return program
    .editGraphics({ target: "m", property: "length", value: reference.items.length })
    .editGraphics({ target: "m", property: "x", value: reference.items.map(item => item.x) })
    .editGraphics({ target: "m", property: "y", value: reference.items.map(item => item.y) })
    .editGraphics({ target: "m", property: "width", value: reference.items.map(item => item.width) })
    .editGraphics({ target: "m", property: "height", value: reference.items.map(item => item.height) })
    .editGraphics({ target: "m", property: "fill", value: "#4c78a8" })
    .editGraphics({ target: "m", property: "stroke", value: "white" })
    .editGraphics({ target: "m", property: "strokeWidth", value: 0.5 })
    .createGuides();
}
