import { closedAction } from "../../core/action.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { GEO_ANNOTATION_STYLE_FIELDS, normalizeGeoAnnotationAnchor, normalizeGeoAnnotationStyle } from "../../grammar/geo/annotation.js";
import { resolveGeometryResource } from "../../selectors/geometry.js";
import { resolveGeoCoordinate } from "../../selectors/coordinates.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";
import { annotationFeatureSource } from "../../materialization/geo/annotationSource.js";
import { resolveGeoMark } from "../../materialization/geo/mark.js";
import { applyMaterializationPlan, planLayerDataRematerialization } from "../../materialization/dependencies.js";
import { assertMarkAvailable, resolveMarkId } from "../marks/shared.js";

function requestedAnchor(program, input, previous) {
  if (input === undefined && previous !== undefined) return { anchor: previous.anchor, ...(previous.geometry === undefined ? {} : { geometry: previous.geometry }) };
  ownRecord(input, "Geographic annotation anchor");
  rejectUnknownProperties(input, input.type === "position" ? ["type", "position"] : ["type", "geometry", "key", "level"], "geographic annotation anchor");
  if (Object.values(input).some(value => value === undefined)) throw new TypeError("Annotation anchor options cannot be undefined.");
  const { geometry: geometryId, ...intent } = input;
  let anchor = normalizeGeoAnnotationAnchor(intent);
  if (anchor.type === "position") return { anchor };
  const resource = resolveGeometryResource(program, geometryId ?? previous?.geometry?.id);
  const { level } = annotationFeatureSource(program, resource, anchor);
  if (level !== undefined) anchor = { ...anchor, level };
  return { anchor, geometry: { kind: "geometry", id: resource.id, revision: resource.revision } };
}

function facade(editing) {
  const op = editing ? "editGeoAnnotation" : "createGeoAnnotation";
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} text at a semantic geographic position or feature anchor.` },
    [editing ? "target" : "id", "coordinate", "anchor", "text", ...GEO_ANNOTATION_STYLE_FIELDS], function (args = {}) {
      if (Object.values(args).some(value => value === undefined)) throw new TypeError("Geographic annotation options cannot be undefined.");
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError("Geographic annotation edit requires a nonempty patch.");
      const predicate = layer => layer.mark.type === "geo" && layer.geoBinding.mode === "annotation";
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate, label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: "geo-annotation", label: "Geographic annotation id", markType: "geo", operation: op, predicate });
      if (!editing) assertMarkAvailable(this, id);
      const coordinate = resolveGeoCoordinate(this, args.coordinate ?? previous?.coordinate);
      const binding = { mode: "annotation", ...requestedAnchor(this, args.anchor, previous?.geoBinding),
        text: Object.hasOwn(args, "text") ? args.text : previous?.geoBinding.text };
      const style = Object.fromEntries(GEO_ANNOTATION_STYLE_FIELDS.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]]));
      const config = normalizeGeoAnnotationStyle(style, previous === undefined ? undefined : this.markConfigs[id].geo);
      const layer = { ...previous, id, mark: { type: "geo" }, coordinate: coordinate.id, geoBinding: binding, encoding: {} };
      const preview = { ...this, semanticSpec: { ...this.semanticSpec, layers: [...this.semanticSpec.layers.filter(value => value.id !== id), layer] } };
      resolveGeoMark(preview, layer, config);
      const next = this.editSemantic({ property: `layer[${id}].mark.type`, value: "geo" })
        .editSemantic({ property: `layer[${id}].coordinate`, value: coordinate.id })
        .editSemantic({ property: `layer[${id}].geoBinding`, value: binding })._withMarkConfig(id, { geo: config });
      return applyMaterializationPlan(next, planLayerDataRematerialization(next, id));
    });
}
const createGeoAnnotation = /* @__PURE__ */ facade(false);
const editGeoAnnotation = /* @__PURE__ */ facade(true);
export function registerGeoAnnotationActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createGeoAnnotation, editGeoAnnotation });
}
