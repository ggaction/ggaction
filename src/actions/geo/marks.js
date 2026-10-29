import { preflightGeoConsumers } from "./closure.js";
import { getLayerScaleIds } from "../../materialization/marks/index.js";
import { registerGeoAnnotationActions } from "./annotation.js";
import { closedAction } from "../../core/action.js";
import { normalizeGeoStyle, normalizeGraticule, GEO_STYLE_FIELDS } from "../../grammar/geo/mark.js";
import { resolveGeometryResource } from "../../selectors/geometry.js";
import { resolveGeoCoordinate } from "../../selectors/coordinates.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveGeoMark } from "../../materialization/geo/mark.js";
import { resolveMarkGraphicPlacement } from "../../materialization/graphicHierarchy.js";
import { applyMaterializationPlan, planLayerDataRematerialization } from "../../materialization/dependencies.js";
import { assertMarkAvailable, resolveMarkId } from "../marks/shared.js";
import { rematerializeHighlightBaseline } from "../marks/lifecycle.js";

export const materializeGeoMark = /* @__PURE__ */ closedAction(
  { op: "materializeGeoMark", description: "Materialize geographic feature parts through one coordinate projection." }, ["id", "scales"], function ({ id, scales } = {}) {
    if (scales !== undefined && typeof scales !== "boolean") throw new TypeError("Geographic scales must be boolean.");
    const layer = requireLayer(this, id);
    if (layer.mark.type !== "geo") throw new TypeError("Geographic materialization requires a Geo mark.");
    const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: "materializeGeoMark", scales, resetProperty: "items", resetValue: [] });
    if (highlighted !== undefined) return highlighted;
    let next = this;
    if (scales !== false) for (const scale of getLayerScaleIds(layer)) next = next.rematerializeScale({ id: scale, marks: false, guides: false });
    const config = next.markConfigs[id].geo, resolved = resolveGeoMark(next, layer, config);
    if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: "geo" }) });
    next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
    if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
    return next;
  });

function facade(mode, editing, name) {
  const op = `${editing ? "edit" : "create"}${name}`, graticule = mode === "graticule";
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} geographic ${mode} geometry through a shared projection.` },
    [editing ? "target" : "id", "coordinate", ...(graticule ? ["stepDeg", "extentDeg", "precisionDeg"] : ["geometry", "interpolation", "routeHint", ...(mode === "point" ? ["radiusDeg"] : [])]), ...GEO_STYLE_FIELDS], function (args = {}) {
      if (Object.values(args).some(value => value === undefined)) throw new TypeError("Geographic mark options cannot be undefined.");
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError("Geographic mark edit requires a nonempty patch.");
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === "geo" && layer.geoBinding.mode === mode, label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: graticule ? "graticule" : `geo-${mode}`, label: "Geographic mark id", markType: "geo", operation: op, predicate: layer => layer.mark.type === "geo" && layer.geoBinding.mode === mode });
      if (!editing) assertMarkAvailable(this, id);
      const coordinate = resolveGeoCoordinate(this, args.coordinate ?? previous?.coordinate);
      let binding;
      if (graticule) {
        const patch = Object.fromEntries(["stepDeg", "extentDeg", "precisionDeg"].filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]]));
        binding = { mode, graticule: normalizeGraticule({ ...previous?.geoBinding.graticule, ...patch }) };
      } else {
        const resource = resolveGeometryResource(this, args.geometry ?? previous?.geoBinding.geometry.id);
        const radiusDeg = Object.hasOwn(args, "radiusPx") ? undefined : args.radiusDeg ?? previous?.geoBinding.radiusDeg;
        if (Object.hasOwn(args, "radiusDeg") && Object.hasOwn(args, "radiusPx")) throw new TypeError("Geographic point radiusDeg conflicts with radiusPx.");
        binding = { ...previous?.geoBinding, mode, geometry: { kind: "geometry", id: resource.id, revision: resource.revision },
          interpolation: args.interpolation ?? previous?.geoBinding.interpolation ?? "source-segment" };
        if (Object.hasOwn(args, "routeHint")) {
          if (args.routeHint === false) delete binding.routeHint; else binding.routeHint = args.routeHint;
        }
        if (radiusDeg !== undefined) binding.radiusDeg = radiusDeg; else delete binding.radiusDeg;
      }
      if (previous?.encoding?.color !== undefined && Object.hasOwn(args, mode === "line" ? "stroke" : "fill")) throw new TypeError("Geographic color is field-bound; remove its encoding or use encodeColor with a constant value.");
      if (previous?.encoding?.size !== undefined && ["radiusPx", "radiusDeg"].some(key => Object.hasOwn(args, key))) throw new TypeError("Geographic size is field-bound; remove its encoding or use encodeSize with a constant value.");
      const style = Object.fromEntries(GEO_STYLE_FIELDS.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]]));
      const config = normalizeGeoStyle(mode, style, previous === undefined ? undefined : this.markConfigs[id].geo);
      const layer = { ...previous, id, mark: { type: "geo" }, coordinate: coordinate.id, geoBinding: binding, encoding: previous?.encoding ?? {} };
      const preview = { ...this, materializationConfigs: { ...this.materializationConfigs, marks: { ...this.markConfigs, [id]: { ...this.markConfigs[id], geo: config } } }, semanticSpec: { ...this.semanticSpec, layers: [...this.semanticSpec.layers.filter(value => value.id !== id), layer] } };
      preflightGeoConsumers(preview, [id]);
      const next = this.editSemantic({ property: `layer[${id}].mark.type`, value: "geo" })
        .editSemantic({ property: `layer[${id}].coordinate`, value: coordinate.id })
        .editSemantic({ property: `layer[${id}].geoBinding`, value: binding })._withMarkConfig(id, { geo: config });
      return applyMaterializationPlan(next, planLayerDataRematerialization(next, id));
    });
}
export const createGeoShapeMark = /* @__PURE__ */ facade("shape", false, "GeoShapeMark");
export const editGeoShapeMark = /* @__PURE__ */ facade("shape", true, "GeoShapeMark");
export const createGeoPointMark = /* @__PURE__ */ facade("point", false, "GeoPointMark");
export const editGeoPointMark = /* @__PURE__ */ facade("point", true, "GeoPointMark");
export const createGeoLineMark = /* @__PURE__ */ facade("line", false, "GeoLineMark");
export const editGeoLineMark = /* @__PURE__ */ facade("line", true, "GeoLineMark");
export const createGraticule = /* @__PURE__ */ facade("graticule", false, "Graticule");
export const editGraticule = /* @__PURE__ */ facade("graticule", true, "Graticule");
export function registerGeoMarkActions(ProgramClass) {
  registerGeoAnnotationActions(ProgramClass);
  Object.assign(ProgramClass.prototype, { createGeoShapeMark, editGeoShapeMark, createGeoPointMark, editGeoPointMark,
    createGeoLineMark, editGeoLineMark, createGraticule, editGraticule, materializeGeoMark });
}
