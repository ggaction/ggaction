import { closedAction } from "../../core/action.js";
import { normalizeOverlayBinding, overlayGroupFields, overlayPositionEncoding } from "../../grammar/overlay.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { overlaySegments } from "../../materialization/overlayItems.js";
import { resolveOverlayGeometry } from "../../materialization/overlayGeometry.js";
import { resolveFacadeId } from "../charts/shared.js";
import { buildCurvePathCommands } from "../../grammar/curveCommands.js";
import { mapScaleConsumerValues } from "../../materialization/scales/map.js";
import { createPointShapeGraphic } from "../../grammar/pointShapes.js";
import { editMarkGraphic } from "../marks/shared.js";
import { rematerializeHighlightBaseline } from "../marks/lifecycle.js";
import { detachOverlay } from "./snapshot.js";
import { validateOptionObject } from "../../core/validation.js";
import { requestedStrokeDetails, STROKE_STYLE_PROPERTIES } from "../../grammar/strokeStyle.js";
import { resolveDirectionValues } from "../../grammar/direction.js";
import { resolveConditionalValues } from "../../materialization/conditionalValues.js";
import { resolveMarkSourceItems } from "../../materialization/selection/policies/index.js";
import { getLayerScaleIds } from "../../materialization/marks/index.js";

function positionBindings(program, id, source) {
  let next = program.editSemantic({ property: `layer[${id}].data`, value: source.data });
  next = next.editSemantic({ property: `layer[${id}].coordinate`, value: source.coordinate });
  for (const channel of ["x", "y"]) {
    const encoding = overlayPositionEncoding(source, channel);
    if (requireLayer(next, id).encoding?.[channel]) {
      next = next.editSemantic({ property: `layer[${id}].encoding.${channel}`, remove: true });
    }
    for (const property of ["field", "fieldType", "scale", "temporalUnit"]) {
      if (encoding?.[property] !== undefined) next = next.editSemantic({
        property: `layer[${id}].encoding.${channel}.${property}`, value: encoding[property]
      });
    }
  }
  return next;
}

function mappedAppearance(program, layer, channel, members, fallback) {
  const encoding = layer.encoding?.[channel];
  if (!encoding?.scale) return fallback;
  const values = [...new Set(members.map(row => row[encoding.field]).filter(value => value != null))];
  if (!values.length) return fallback;
  if (values.length > 1) {
    throw new Error(`Overlay ${channel} requires one value per visible item or series; choose a grouping field.`);
  }
  return mapScaleConsumerValues([values[0]], program.resolvedScales[encoding.scale], channel)[0];
}

function synchronizeSourceAppearance(program, id, source, binding) {
  let next = program;
  const fields = binding.series === "source" ? overlayGroupFields(source) : [];
  if (requireLayer(next, id).encoding?.group) next = next.editSemantic({ property: `layer[${id}].encoding.group`, remove: true });
  if (fields.length) next = next.editSemantic({ property: `layer[${id}].encoding.group.fields`, value: fields })
    .editSemantic({ property: `layer[${id}].encoding.group.fieldType`, value: "nominal" });
  if (!binding.inheritColor) return next;
  if (requireLayer(next, id).encoding?.color) next = next.editSemantic({ property: `layer[${id}].encoding.color`, remove: true });
  const color = source.encoding?.color;
  if (binding.series === "source" && color?.scale &&
      (requireLayer(next, id).mark.type === "point" || fields.includes(color.field))) {
    for (const key of ["field", "fieldType", "scale", "temporalUnit"]) {
      if (color[key] !== undefined) next = next.editSemantic({ property: `layer[${id}].encoding.color.${key}`, value: color[key] });
    }
  }
  return next;
}

export const rematerializeOverlay = /* @__PURE__ */ closedAction({
  op: "rematerializeOverlay", description: "Rebuild an overlay from its source's final visible items."
}, ["id"], function ({ id } = {}) {
  const highlighted = rematerializeHighlightBaseline(this, { target: id,
    operation: "rematerializeOverlay", resetProperty: "items", resetValue: [] });
  if (highlighted !== undefined) return highlighted;
  const previous = requireLayer(this, id);
  const binding = normalizeOverlayBinding(previous.derivedBindings?.overlay);
  const source = requireLayer(this, binding.source);
  const series = resolveOverlayGeometry(this, binding);
  let next = synchronizeSourceAppearance(positionBindings(this, id, source), id, source, binding);
  for (const [channel, encoding] of Object.entries(requireLayer(next, id).encoding)) {
    if (["x", "y"].includes(channel) || channel === "color" && binding.inheritColor || !encoding.scale) continue;
    next = next.rematerializeScale({ id: encoding.scale, marks: false, guides: false });
  }
  for (const scale of getLayerScaleIds(requireLayer(next, id))) {
    if (Object.values(requireLayer(next, id).encoding).some(encoding => encoding?.scale === scale)) continue;
    next = next.rematerializeScale({ id: scale, marks: false, guides: false });
  }
  const layer = requireLayer(next, id), config = next.markConfigs[id];
  const color = (members, fallback) => mappedAppearance(next, layer, "color", members, fallback);
  if (layer.mark.type === "line") {
    const entries = series.flatMap(group => {
      return overlaySegments(group, binding).map(points => {
        const positions = points.map(({ x, y }) => ({ x, y }));
        return { type: "path", properties: {
          commands: [...(positions.length === 1 ? [{ op: "M", ...positions[0] }]
            : buildCurvePathCommands(positions, config.curve ?? "linear", config.tension)),
            ...(config.closed ? [{ op: "Z" }] : [])],
          stroke: mappedAppearance(next, layer, "stroke", group.members,
            config.stroke ?? color(group.members, "#4c78a8")),
          strokeWidth: mappedAppearance(next, layer, "strokeWidth", group.members, config.strokeWidth ?? 2),
          strokeDash: mappedAppearance(next, layer, "strokeDash", group.members, config.strokeDash ?? []),
          ...requestedStrokeDetails(config, "Overlay line"),
          ...(config.opacity === undefined && !layer.encoding.opacity ? {} : {
            opacity: mappedAppearance(next, layer, "opacity", group.members, config.opacity ?? 1) })
        } };
      });
    });
    next = next.editGraphics({ target: id, property: "items", value: entries });
  } else {
    const sourceItems = resolveMarkSourceItems(next, id);
    const shape = resolveConditionalValues(next, layer, "shape", sourceItems);
    const angle = resolveConditionalValues(next, layer, "angle", sourceItems);
    const size = resolveConditionalValues(next, layer, "size", sourceItems);
    const appearance = new Map(sourceItems.map((item, index) => [item.semanticIdentity[1], { shape: shape?.[index], angle: angle?.[index], size: size?.[index] }]));
    const items = series.flatMap(group => group.points.map(point => ({
      ...createPointShapeGraphic({
        shape: appearance.get(point.key)?.shape ?? mappedAppearance(next, layer, "shape", [point.fields], config.shape ?? "circle"),
        x: point.x, y: point.y,
        angle: appearance.get(point.key)?.angle ?? resolveDirectionValues([point.fields], layer.encoding.angle)?.[0],
        area: appearance.get(point.key)?.size ?? mappedAppearance(next, layer, "size", [point.fields], Math.PI * (config.radius ?? 3) ** 2),
        fill: color([point.fields], config.fill ?? "#4c78a8"),
        stroke: mappedAppearance(next, layer, "stroke", [point.fields], config.stroke === false ? "transparent" : config.stroke),
        strokeWidth: mappedAppearance(next, layer, "strokeWidth", [point.fields], config.stroke === false ? 0 : config.strokeWidth),
        opacity: mappedAppearance(next, layer, "opacity", [point.fields], config.opacity),
        ...requestedStrokeDetails(config, "Overlay point")
      })
    })));
    next = next.editGraphics({ target: id, property: "items", value: items });
  }
  return editMarkGraphic(next, id, {});
});

const createOverlay = /* @__PURE__ */ closedAction({
  op: "createOverlay", description: "Add a line or points that follow another mark's visible results."
}, ["id", "source", "type", "basis", "series", "missing", "orderBy", "line", "point"], function (args = {}) {
  if (!["line", "point"].includes(args.type ?? "line")) throw new Error("Overlay type must be line or point.");
  const type = args.type ?? "line";
  if (args[type] !== undefined) validateOptionObject(args[type], ["clip", "opacity", "stroke", "strokeWidth", ...STROKE_STYLE_PROPERTIES,
    ...(type === "line" ? ["curve", "tension", "closed"] : ["shape", "fill"])], `createOverlay ${type}`);
  if (type === "line" && args.point !== undefined || type === "point" && args.line !== undefined) {
    throw new Error("Overlay appearance must match its type.");
  }
  const source = resolveEligibleLayer(this, { target: args.source,
    predicate: layer => ["bar", "line", "area", "point"].includes(layer.mark?.type) && !layer.derivedBindings?.overlay,
    label: "overlay source", targetOption: "source" });
  const binding = normalizeOverlayBinding({ source: source.id, basis: args.basis ?? "visibleItems", mode: "follow",
    series: args.series ?? "source", missing: args.missing ?? "break",
    inheritColor: args[type]?.[type === "line" ? "stroke" : "fill"] === undefined,
    ...(args.orderBy === undefined ? type === "point" && source.mark.type === "point" ? { orderBy: "x" } : {} : { orderBy: args.orderBy }) });
  resolveOverlayGeometry(this, binding);
  const id = resolveFacadeId(this, args.id, { defaultId: "overlay", operation: "createOverlay" });
  let next = this[type === "line" ? "createLineMark" : "createPointMark"]({
    ...(args[type] ?? {}), id, data: source.data
  });
  next = positionBindings(next, id, source).editSemantic({
    property: `layer[${id}].derivedBindings.overlay`, value: binding
  });
  return next.rematerializeOverlay({ id });
});

const editOverlay = /* @__PURE__ */ closedAction({
  op: "editOverlay", description: "Edit the source, series, ordering, or gaps of a linked overlay."
}, ["target", "source", "series", "missing", "orderBy", "follow"], function (args = {}) {
  const layer = resolveEligibleLayer(this, { target: args.target,
    predicate: layer => Boolean(layer.derivedBindings?.overlay), label: "overlay" });
  if (!Object.keys(args).some(key => key !== "target")) throw new Error("editOverlay requires an edit.");
  if (args.follow !== undefined && typeof args.follow !== "boolean") throw new TypeError("Overlay follow must be boolean.");
  if (args.follow === false) {
    if (Object.keys(args).some(key => !["target", "follow"].includes(key))) throw new Error("Detach cannot be combined with source edits.");
    return detachOverlay(this, layer);
  }
  const { target, follow, ...patch } = args;
  const binding = normalizeOverlayBinding({ ...layer.derivedBindings.overlay, ...patch });
  if (binding.source === layer.id) throw new Error("An overlay cannot follow itself.");
  resolveOverlayGeometry(this, binding);
  return this.editSemantic({ property: `layer[${layer.id}].derivedBindings.overlay`, value: binding })
    .rematerializeOverlay({ id: layer.id });
});

export function registerOverlayActions(ProgramClass) {
  ProgramClass.prototype.createOverlay = createOverlay;
  ProgramClass.prototype.editOverlay = editOverlay;
  ProgramClass.prototype.rematerializeOverlay = rematerializeOverlay;
}
