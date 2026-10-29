import { closedAction } from "../../core/action.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString } from "../../core/validation.js";
import { PYRAMID_PLOT_FIELDS, normalizePyramidPlot } from "../../grammar/pyramid/plot.js";
import { resolvePyramidPlot } from "../../materialization/pyramid/plot.js";
import { findCoordinate, resolveCartesianCoordinate } from "../../selectors/coordinates.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveFacadeData } from "./shared.js";
import { assertMarkAvailable, resolveMarkId } from "../marks/shared.js";
import { rematerializeHighlightBaseline } from "../marks/lifecycle.js";
import { resolveMarkGraphicPlacement } from "../../materialization/graphicHierarchy.js";
import { applyMaterializationPlan, planLayerDataRematerialization } from "../../materialization/dependencies.js";
import { hasMaterializedLegend } from "../../materialization/legends.js";
import { resolveColorScaleDefinition, resolveQuantitativeColorScaleDefinition } from "../scales/definitions.js";
import { resolveScalePreview } from "../scales/preview.js";
import { applyEncodingScale, applyDetachedScaleRematerialization } from "../encodings/shared.js";
import { resolveColorScaleOptions, resolveColorReassignmentScaleOptions, withColorLegendReassignment } from "../encodings/color/policy.js";
import { legendBlockDescriptors } from "../guides/legends/target.js";

export const materializePyramidPlot = /* @__PURE__ */ closedAction(
  { op: "materializePyramidPlot", description: "Materialize ordered Pyramid stages and their labels." }, ["id", "scales"], function ({ id, scales } = {}) {
    if (scales !== undefined && typeof scales !== "boolean") throw new TypeError("Pyramid scales must be boolean.");
    const layer = requireLayer(this, id);
    if (layer.mark.type !== "pyramid") throw new TypeError("Pyramid materialization requires a Pyramid mark.");
    const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: "materializePyramidPlot", scales, resetProperty: "items", resetValue: [] });
    if (highlighted !== undefined) return highlighted;
    let next = this;
    if (scales !== false && layer.encoding?.color !== undefined) next = next.rematerializeScale({ id: layer.encoding.color.scale, marks: false, guides: false });
    const config = next.markConfigs[id].pyramidPlot, resolved = resolvePyramidPlot(next, layer, config);
    if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: "pyramid" }) });
    next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
    if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
    return next;
  });

function facade(editing) {
  const op = editing ? "editPyramidPlot" : "createPyramidPlot";
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} an ordered stage Pyramid with width or area meaning.` },
    [editing ? "target" : "id", "data", "coordinate", "color", ...PYRAMID_PLOT_FIELDS], function (args = {}) {
      if (Object.values(args).some(value => value === undefined || value === null)) throw new TypeError("Pyramid options cannot contain null or undefined.");
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError("Pyramid edit requires a nonempty patch.");
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === "pyramid", label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: "pyramid", label: "Pyramid plot id", markType: "pyramid", operation: op });
      if (!editing) assertMarkAvailable(this, id);
      const data = resolveFacadeData(this, args.data ?? previous?.data, op);
      const coordinate = resolveCartesianCoordinate(this, args.coordinate ?? previous?.coordinate, "Pyramid plot");
      const normalized = normalizePyramidPlot(Object.fromEntries(PYRAMID_PLOT_FIELDS.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]])), previous?.pyramid, this.markConfigs[id]?.pyramidPlot);
      const color = Object.hasOwn(args, "color") ? args.color : undefined;
      let options, definition, encoding = previous?.encoding ?? {};
      if (color === false) encoding = {};
      else if (color !== undefined) {
        const input = typeof color === "string" ? { field: color } : color;
        ownRecord(input, "Pyramid color"); rejectUnknownProperties(input, ["field", "fieldType", "scale", "palette"], "pyramid color");
        validateNonEmptyString(input.field, "Pyramid color field");
        const fieldType = input.fieldType ?? "nominal";
        if (!["nominal", "ordinal", "quantitative", "temporal"].includes(fieldType)) throw new TypeError("Pyramid color fieldType is invalid.");
        options = resolveColorReassignmentScaleOptions(this, previous ?? { id }, "color", fieldType, { id: previous?.encoding?.color?.scale ?? `${id}-color`, ...resolveColorScaleOptions(input) });
        definition = ["nominal", "ordinal"].includes(fieldType) ? resolveColorScaleDefinition(this, options) : resolveQuantitativeColorScaleDefinition(this, fieldType, options);
        encoding = { color: { field: input.field, fieldType, scale: definition.id } };
      }
      const layer = { ...previous, id, mark: { type: "pyramid" }, data, coordinate: coordinate.id, pyramid: normalized.binding, encoding };
      const scales = new Map(this.semanticSpec.scales.map(scale => [scale.id, scale]));
      if (definition) scales.set(definition.id, definition);
      const preview = { ...this, semanticSpec: { ...this.semanticSpec,
        coordinates: findCoordinate(this, coordinate.id) ? this.semanticSpec.coordinates : [...this.semanticSpec.coordinates, coordinate],
        layers: [...this.semanticSpec.layers.filter(entry => entry.id !== id), layer], scales: [...scales.values()] } };
      const resolved = { ...this.resolvedScales };
      if (encoding.color) resolved[encoding.color.scale] = resolveScalePreview(preview, encoding.color.scale).resolvedScale;
      resolvePyramidPlot(preview, layer, normalized.config, resolved);
      const apply = candidate => {
        let next = findCoordinate(candidate, coordinate.id) ? candidate : candidate.createCoordinate(coordinate);
        next = next.editSemantic({ property: `layer[${id}].mark.type`, value: "pyramid" })
          .editSemantic({ property: `layer[${id}].data`, value: data })
          .editSemantic({ property: `layer[${id}].coordinate`, value: coordinate.id })
          .editSemantic({ property: `layer[${id}].pyramid`, value: normalized.binding })
          ._withMarkConfig(id, { ...this.markConfigs[id], pyramidPlot: normalized.config });
        if (previous?.encoding?.color && color === false) next = next.editSemantic({ property: `layer[${id}].encoding.color`, remove: true });
        if (color !== undefined && color !== false) for (const [property, value] of Object.entries(encoding.color)) next = next.editSemantic({ property: `layer[${id}].encoding.color.${property}`, value });
        if (definition) next = applyEncodingScale(next, definition, options, { reassignment: editing, allowTypeChange: true });
        next = applyMaterializationPlan(next, [...planLayerDataRematerialization(next, id), ...(hasMaterializedLegend(next) ? [{ op: "rematerializeLegend" }] : [])]);
        return previous ? applyDetachedScaleRematerialization(next, [previous]) : next;
      };
      if (previous?.encoding?.color && definition) return withColorLegendReassignment(this, previous, definition, apply);
      const baseline = color === false && legendBlockDescriptors(this, id).some(block => block.channels.includes("color")) ? this.removeLegend({ target: id, channels: ["color"] }) : this;
      return apply(baseline);
    });
}
export const createPyramidPlot = /* @__PURE__ */ facade(false);
export const editPyramidPlot = /* @__PURE__ */ facade(true);
