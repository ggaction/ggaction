import { closedAction } from "../../core/action.js";
import { ownRecord } from "../../core/ownData.js";
import { normalizeContourStyle, CONTOUR_STYLE_FIELDS } from "../../grammar/contour/plot.js";
import { resolveContourResource } from "../../selectors/contours.js";
import { findCoordinate, resolveCartesianCoordinate } from "../../selectors/coordinates.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveContourPlot } from "../../materialization/contour/plot.js";
import { resolveMarkGraphicPlacement } from "../../materialization/graphicHierarchy.js";
import { applyMaterializationPlan, planLayerDataRematerialization } from "../../materialization/dependencies.js";
import { hasMaterializedLegend } from "../../materialization/legends.js";
import { withColorLegendReassignment } from "../encodings/color/policy.js";
import { legendBlockDescriptors } from "../guides/legends/target.js";
import { assertMarkAvailable, resolveMarkId } from "../marks/shared.js";
import { rematerializeHighlightBaseline } from "../marks/lifecycle.js";
import { resolvePositionScaleDefinition, resolveQuantitativeColorScaleDefinition } from "../scales/definitions.js";
import { resolveScalePreview } from "../scales/preview.js";
import { applyEncodingScale, rebindPositionGuides, applyDetachedScaleRematerialization } from "../encodings/shared.js";

export const materializeContourMark = /* @__PURE__ */ closedAction(
  { op: "materializeContourMark", description: "Materialize stored contour paths through their shared scales." }, ["id", "scales"], function ({ id, scales } = {}) {
    if (scales !== undefined && typeof scales !== "boolean") throw new TypeError("Contour scales must be boolean.");
    const layer = requireLayer(this, id);
    if (layer.mark.type !== "contour") throw new TypeError("Contour materialization requires a contour mark.");
    const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: "materializeContourMark", scales, resetProperty: "items", resetValue: [] });
    if (highlighted !== undefined) return highlighted;
    let next = this;
    if (scales !== false) for (const scale of new Set(Object.values(layer.encoding).map(value => value.scale))) next = next.rematerializeScale({ id: scale, marks: false, guides: false });
    const config = next.markConfigs[id].contour, resolved = resolveContourPlot(next, layer, config);
    if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: "contour" }) });
    next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
    if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
    return next;
  });

function facade(editing) {
  const op = editing ? "editContourMark" : "createContourMark";
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} line or filled contours from stored geometry.` },
    [editing ? "target" : "id", "geometry", "coordinate", "mode", "x", "y", "color", ...CONTOUR_STYLE_FIELDS], function (args = {}) {
      if (Object.values(args).some(value => value === undefined)) throw new TypeError("Contour options cannot be undefined.");
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError("Contour mark edit requires a nonempty patch.");
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === "contour", label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: "contour", label: "Contour mark id", markType: "contour", operation: op });
      if (!editing) assertMarkAvailable(this, id);
      const resource = resolveContourResource(this, args.geometry ?? previous?.contourBinding.geometry.id);
      const coordinate = resolveCartesianCoordinate(this, args.coordinate ?? previous?.coordinate, "Contour mark");
      const mode = args.mode ?? previous?.contourBinding.mode ?? "filled";
      const style = Object.fromEntries(CONTOUR_STYLE_FIELDS.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]]));
      const config = normalizeContourStyle(mode, style, previous === undefined ? undefined : this.markConfigs[id].contour);
      const color = Object.hasOwn(args, "color") ? args.color : previous === undefined || previous.encoding.color !== undefined ? {} : false;
      const definitions = {}, options = {}, encoding = {};
      for (const channel of ["x", "y", ...(color === false ? [] : ["color"])]) {
        const requested = channel === "color" ? color : args[channel] ?? {};
        ownRecord(requested, `Contour ${channel} scale`);
        options[channel] = { id: previous?.encoding[channel]?.scale ?? `${id}-${channel}`, ...requested };
        definitions[channel] = channel === "color" ? resolveQuantitativeColorScaleDefinition(this, "quantitative", options[channel])
          : resolvePositionScaleDefinition(this, channel, "quantitative", options[channel]);
        encoding[channel] = { field: channel === "color" ? "value" : channel, fieldType: "quantitative", scale: definitions[channel].id };
      }
      const layer = { ...previous, id, mark: { type: "contour" }, coordinate: coordinate.id,
        contourBinding: { geometry: { kind: "geometry", id: resource.id, revision: resource.revision }, mode }, encoding };
      const scaleMap = new Map(this.semanticSpec.scales.map(scale => [scale.id, scale]));
      for (const definition of Object.values(definitions)) scaleMap.set(definition.id, definition);
      const preview = { ...this, semanticSpec: { ...this.semanticSpec,
        coordinates: findCoordinate(this, coordinate.id) ? this.semanticSpec.coordinates : [...this.semanticSpec.coordinates, coordinate],
        layers: [...this.semanticSpec.layers.filter(value => value.id !== id), layer], scales: [...scaleMap.values()] } };
      const resolved = { ...this.resolvedScales };
      for (const definition of Object.values(definitions)) resolved[definition.id] = resolveScalePreview(preview, definition.id).resolvedScale;
      resolveContourPlot(preview, layer, config, resolved);
      const apply = candidate => {
        let next = findCoordinate(candidate, coordinate.id) ? candidate : candidate.createCoordinate(coordinate);
        next = next.editSemantic({ property: `layer[${id}].mark.type`, value: "contour" })
          .editSemantic({ property: `layer[${id}].coordinate`, value: coordinate.id })
          .editSemantic({ property: `layer[${id}].contourBinding`, value: layer.contourBinding })._withMarkConfig(id, { contour: config });
        if (previous?.encoding.color !== undefined && color === false) next = next.editSemantic({ property: `layer[${id}].encoding.color`, remove: true });
        for (const [channel, value] of Object.entries(encoding)) for (const [property, field] of Object.entries(value)) {
          next = next.editSemantic({ property: `layer[${id}].encoding.${channel}.${property}`, value: field });
        }
        for (const [channel, definition] of Object.entries(definitions)) next = applyEncodingScale(next, definition, options[channel], { reassignment: editing });
        next = applyMaterializationPlan(next, [
          ...planLayerDataRematerialization(next, id),
          ...(hasMaterializedLegend(next) ? [{ op: "rematerializeLegend" }] : [])
        ]);
        if (previous !== undefined) {
          for (const channel of ["x", "y"]) next = rebindPositionGuides(next, channel, previous.encoding[channel].scale, encoding[channel].scale, id);
          next = applyDetachedScaleRematerialization(next, [previous]);
        }
        return next;
      };
      if (previous?.encoding.color !== undefined && color !== false) return withColorLegendReassignment(this, previous, definitions.color, apply);
      const baseline = color === false && legendBlockDescriptors(this, id).some(block => block.channels.includes("color"))
        ? this.removeLegend({ target: id, channels: ["color"] }) : this;
      return apply(baseline);
    });
}
export const createContourMark = /* @__PURE__ */ facade(false);
export const editContourMark = /* @__PURE__ */ facade(true);
export function registerContourMarkActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createContourMark, editContourMark, materializeContourMark });
}
