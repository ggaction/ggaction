import { closedAction } from "../../core/action.js";
import { ownRecord } from "../../core/ownData.js";
import { normalizeCalendarPlot, CALENDAR_PLOT_FIELDS } from "../../grammar/calendar/plot.js";
import { resolveLayoutResource } from "../../selectors/layouts.js";
import { findCoordinate, resolveCartesianCoordinate } from "../../selectors/coordinates.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveCalendarPlot } from "../../materialization/calendar/plot.js";
import { resolveMarkGraphicPlacement } from "../../materialization/graphicHierarchy.js";
import { applyMaterializationPlan, planLayerDataRematerialization } from "../../materialization/dependencies.js";
import { hasMaterializedLegend } from "../../materialization/legends.js";
import { withColorLegendReassignment } from "../encodings/color/policy.js";
import { legendBlockDescriptors } from "../guides/legends/target.js";
import { assertMarkAvailable, resolveMarkId } from "../marks/shared.js";
import { rematerializeHighlightBaseline } from "../marks/lifecycle.js";
import { resolveQuantitativeColorScaleDefinition } from "../scales/definitions.js";
import { resolveScalePreview } from "../scales/preview.js";
import { applyEncodingScale, applyDetachedScaleRematerialization } from "../encodings/shared.js";

export const materializeCalendarPlot = /* @__PURE__ */ closedAction(
  { op: "materializeCalendarPlot", description: "Materialize calendar cells, month boundaries and date labels." }, ["id", "scales"], function ({ id, scales } = {}) {
    if (scales !== undefined && typeof scales !== "boolean") throw new TypeError("Calendar scales must be boolean.");
    const layer = requireLayer(this, id);
    if (layer.mark.type !== "calendar") throw new TypeError("Calendar materialization requires a calendar mark.");
    const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: "materializeCalendarPlot", scales, resetProperty: "items", resetValue: [] });
    if (highlighted !== undefined) return highlighted;
    let next = this;
    if (scales !== false && layer.encoding?.color !== undefined) next = next.rematerializeScale({ id: layer.encoding?.color.scale, marks: false, guides: false });
    const config = next.markConfigs[id].calendarPlot, resolved = resolveCalendarPlot(next, layer, config);
    if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: "calendar" }) });
    next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
    if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
    return next;
  });

function facade(editing) {
  const op = editing ? "editCalendarPlot" : "createCalendarPlot";
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} a calendar plot from a stored civil-day layout.` },
    [editing ? "target" : "id", "layout", "coordinate", "color", ...CALENDAR_PLOT_FIELDS], function (args = {}) {
      if (Object.values(args).some(value => value === undefined)) throw new TypeError("Calendar plot options cannot be undefined.");
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError("Calendar plot edit requires a nonempty patch.");
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === "calendar", label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: "calendar", label: "Calendar plot id", markType: "calendar", operation: op });
      if (!editing) assertMarkAvailable(this, id);
      const resource = resolveLayoutResource(this, args.layout ?? previous?.calendarBinding.layout.id, "data", "calendar");
      const coordinate = resolveCartesianCoordinate(this, args.coordinate ?? previous?.coordinate, "Calendar plot");
      const normalized = normalizeCalendarPlot(Object.fromEntries(CALENDAR_PLOT_FIELDS.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]])),
        previous === undefined ? undefined : this.markConfigs[id].calendarPlot, previous?.calendarLabels);
      const color = Object.hasOwn(args, "color") ? args.color : previous === undefined || previous.encoding?.color !== undefined ? {} : false;
      let options, definition;
      if (color !== false) {
        ownRecord(color, "Calendar color scale");
        options = { id: previous?.encoding?.color?.scale ?? `${id}-color`, ...color };
        definition = resolveQuantitativeColorScaleDefinition(this, "quantitative", options);
      }
      const encoding = definition === undefined ? {} : { color: { field: "value", fieldType: "quantitative", scale: definition.id } };
      const layer = { ...previous, id, mark: { type: "calendar" }, coordinate: coordinate.id,
        calendarBinding: { layout: { kind: "layout", id: resource.id, revision: resource.revision } }, calendarLabels: normalized.labels, encoding };
      const scaleMap = new Map(this.semanticSpec.scales.map(scale => [scale.id, scale]));
      if (definition !== undefined) scaleMap.set(definition.id, definition);
      const preview = { ...this, semanticSpec: { ...this.semanticSpec,
        coordinates: findCoordinate(this, coordinate.id) ? this.semanticSpec.coordinates : [...this.semanticSpec.coordinates, coordinate],
        layers: [...this.semanticSpec.layers.filter(value => value.id !== id), layer], scales: [...scaleMap.values()] } };
      const resolved = { ...this.resolvedScales };
      if (definition !== undefined) resolved[definition.id] = resolveScalePreview(preview, definition.id).resolvedScale;
      resolveCalendarPlot(preview, layer, normalized.config, resolved);
      const apply = candidate => {
        let next = findCoordinate(candidate, coordinate.id) ? candidate : candidate.createCoordinate(coordinate);
        next = next.editSemantic({ property: `layer[${id}].mark.type`, value: "calendar" })
          .editSemantic({ property: `layer[${id}].coordinate`, value: coordinate.id })
          .editSemantic({ property: `layer[${id}].calendarBinding`, value: layer.calendarBinding })
          .editSemantic({ property: `layer[${id}].calendarLabels`, value: layer.calendarLabels })._withMarkConfig(id, { calendarPlot: normalized.config });
        if (previous?.encoding?.color !== undefined && color === false) next = next.editSemantic({ property: `layer[${id}].encoding.color`, remove: true });
        if (encoding.color !== undefined) for (const [property, value] of Object.entries(encoding.color)) next = next.editSemantic({ property: `layer[${id}].encoding.color.${property}`, value });
        if (definition !== undefined) next = applyEncodingScale(next, definition, options, { reassignment: editing });
        next = applyMaterializationPlan(next, [...planLayerDataRematerialization(next, id), ...(hasMaterializedLegend(next) ? [{ op: "rematerializeLegend" }] : [])]);
        return previous === undefined ? next : applyDetachedScaleRematerialization(next, [previous]);
      };
      if (previous?.encoding?.color !== undefined && color !== false) return withColorLegendReassignment(this, previous, definition, apply);
      const baseline = color === false && legendBlockDescriptors(this, id).some(block => block.channels.includes("color"))
        ? this.removeLegend({ target: id, channels: ["color"] }) : this;
      return apply(baseline);
    });
}
export const createCalendarPlot = /* @__PURE__ */ facade(false);
export const editCalendarPlot = /* @__PURE__ */ facade(true);
export function registerCalendarPlotActions(ProgramClass) { Object.assign(ProgramClass.prototype, { createCalendarPlot, editCalendarPlot, materializeCalendarPlot }); }
