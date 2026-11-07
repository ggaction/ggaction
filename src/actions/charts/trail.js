import { validateMarkBlend } from "../../grammar/markBlend.js";
import { closedAction } from "../../core/action.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString } from "../../core/validation.js";
import { TRAIL_PLOT_FIELDS, normalizeTrailPlot } from "../../grammar/trailPlot.js";
import { normalizeGroupFields } from "../../grammar/pathSeries.js";
import { validatePathOrderDirection } from "../../grammar/pathOrder.js";
import { resolveTemporalUnit } from "../../grammar/scales/index.js";
import { resolveTrailPlot } from "../../materialization/trail/plot.js";
import { findCoordinate, resolveCartesianCoordinate, resolvePolarCoordinate } from "../../selectors/coordinates.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveFacadeData, normalizeFieldEncoding, inferFacadeFieldType, normalizeGuides, applyFacadeGuides } from "./shared.js";
import { assertMarkAvailable, resolveMarkId } from "../marks/shared.js";
import { getLayerScaleIds } from "../../materialization/marks/index.js";
import { applyMaterializationPlan, planLayerDataRematerialization } from "../../materialization/dependencies.js";
import { hasMaterializedLegend } from "../../materialization/legends.js";
import { resolvePositionScaleDefinition, resolveColorScaleDefinition, resolveQuantitativeColorScaleDefinition } from "../scales/definitions.js";
import { resolveScalePreview } from "../scales/preview.js";
import { applyEncodingScale, applyDetachedScaleRematerialization, rebindPositionGuides, resolvePositionGuideRebinding } from "../encodings/shared.js";
import { resolveColorScaleOptions, resolveColorReassignmentScaleOptions, withColorLegendReassignment } from "../encodings/color/policy.js";
import { legendBlockDescriptors } from "../guides/legends/target.js";
import { resolveFacadeGuidePlan } from "../guides/facade.js";
import { assertFacadeGuidesFrame } from "./frame.js";

function fieldInput(value, label, keys) {
  if (typeof value !== "string") ownRecord(value, label);
  const result = normalizeFieldEncoding(value, label); rejectUnknownProperties(result, keys, label);
  validateNonEmptyString(result.field, `${label} field`);
  if (result.scale !== undefined) ownRecord(result.scale, `${label} scale`);
  return result;
}
function facade(editing) {
  const op = editing ? "editTrailPlot" : "createTrailPlot";
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} sample-width ribbons over ordered native series.` },
    [editing ? "target" : "id", "data", "coordinate", "x", "y", "theta", "radius", "groupBy", "order", "color", "guides", "blend", ...TRAIL_PLOT_FIELDS], function (args = {}) {
      if (Object.values(args).some(value => value == null)) throw new TypeError("Trail options require defined values.");
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError("Trail edit requires a nonempty patch.");
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === "trail", label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: "trail", label: "Trail plot id", markType: "trail", operation: op });
      if (!editing) assertMarkAvailable(this, id);
      const data = resolveFacadeData(this, args.data ?? previous?.data, op);
      const polar = args.theta !== undefined || args.radius !== undefined || previous?.encoding.theta !== undefined;
      if (polar && (args.x !== undefined || args.y !== undefined || previous?.encoding.x !== undefined)) throw new TypeError("Trail cannot mix Cartesian and Polar positions.");
      const coordinate = (polar ? resolvePolarCoordinate : resolveCartesianCoordinate)(this, args.coordinate ?? previous?.coordinate, "Trail plot");
      const normalized = normalizeTrailPlot(Object.fromEntries(TRAIL_PLOT_FIELDS.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]])), previous?.trail, this.markConfigs[id]?.trailPlot);
      const positions = polar ? ["theta", "radius"] : ["x", "y"], encoding = { ...previous?.encoding }, definitions = [];
      for (const channel of positions) {
        const input = args[channel] === undefined ? previous?.encoding[channel] : fieldInput(args[channel], `Trail ${channel}`, ["field", "fieldType", "scale", "temporalUnit"]);
        if (input === undefined) throw new TypeError(`Trail requires ${channel}.`);
        const fieldType = inferFacadeFieldType(this, data, input, `Trail ${channel}`);
        const options = { id: previous?.encoding[channel]?.scale ?? `${id}-${channel}`, ...(args[channel] === undefined ? {} : input.scale) };
        const definition = resolvePositionScaleDefinition(this, channel, fieldType, options, fieldType === "quantitative" ? { zero: false, nice: false } : fieldType === "temporal" ? { nice: false } : {});
        const temporalUnit = resolveTemporalUnit(input, fieldType, previous?.encoding[channel]);
        encoding[channel] = { field: input.field, fieldType, scale: definition.id, ...(temporalUnit === undefined ? {} : { temporalUnit }) };
        definitions.push([definition, options]);
      }
      if (args.groupBy === false) delete encoding.group;
      else if (args.groupBy !== undefined) {
        if (Array.isArray(args.groupBy)) ownArray(args.groupBy, "Trail groupBy");
        encoding.group = { fields: normalizeGroupFields(args.groupBy), fieldType: "nominal" };
      }
      if (args.order === false) delete encoding.pathOrder;
      else if (args.order !== undefined) {
        const order = typeof args.order === "string" ? { field: args.order } : args.order;
        ownRecord(order, "Trail order"); rejectUnknownProperties(order, ["field", "order"], "Trail order");
        validateNonEmptyString(order.field, "Trail order field");
        encoding.pathOrder = { field: order.field, order: validatePathOrderDirection(order.order ?? "ascending") };
      }
      let colorDefinition;
      if (args.color === false) delete encoding.color;
      else if (args.color !== undefined) {
        const input = fieldInput(args.color, "Trail color", ["field", "fieldType", "scale", "palette"]);
        const fieldType = input.fieldType ?? "nominal";
        if (!["nominal", "ordinal", "quantitative", "temporal"].includes(fieldType)) throw new TypeError("Trail color field type is invalid.");
        const options = resolveColorReassignmentScaleOptions(this, previous ?? { id }, "color", fieldType, { id: previous?.encoding.color?.scale ?? `${id}-color`, ...resolveColorScaleOptions(input) });
        colorDefinition = ["nominal", "ordinal"].includes(fieldType) ? resolveColorScaleDefinition(this, options) : resolveQuantitativeColorScaleDefinition(this, fieldType, options);
        definitions.push([colorDefinition, options]); encoding.color = { field: input.field, fieldType, scale: colorDefinition.id };
      }
      const blend = args.blend === undefined ? previous?.mark.blend : validateMarkBlend(args.blend, "trail");
      const layer = { ...previous, id, mark: { type: "trail", ...(blend === undefined || blend === "normal" ? {} : { blend }) }, data, coordinate: coordinate.id, trail: normalized.binding, encoding };
      const scaleMap = new Map(this.semanticSpec.scales.map(scale => [scale.id, scale]));
      for (const [definition] of definitions) scaleMap.set(definition.id, definition);
      const preview = { ...this, guideConfigs: this.guideConfigs, semanticSpec: { ...this.semanticSpec,
        coordinates: findCoordinate(this, coordinate.id) ? this.semanticSpec.coordinates : [...this.semanticSpec.coordinates, coordinate],
        layers: [...this.semanticSpec.layers.filter(entry => entry.id !== id), layer], scales: [...scaleMap.values()] }, markConfigs: { ...this.markConfigs, [id]: { ...this.markConfigs[id], trailPlot: normalized.config } } };
      preview.resolvedScales = { ...this.resolvedScales };
      for (const scale of getLayerScaleIds(layer)) preview.resolvedScales[scale] = resolveScalePreview(preview, scale).resolvedScale;
      resolveTrailPlot(preview, layer, normalized.config);
      const guides = args.guides === undefined && editing ? false : normalizeGuides(args.guides, op);
      assertFacadeGuidesFrame(preview, id, guides);
      resolveFacadeGuidePlan(preview, guides, id);
      for (const channel of positions) if (previous) resolvePositionGuideRebinding(preview, channel, previous.encoding[channel].scale, encoding[channel].scale, id);
      const apply = candidate => {
        let next = findCoordinate(candidate, coordinate.id) ? candidate : candidate.createCoordinate(coordinate);
        next = next.applyTrailMark({ layer, config: normalized.config });
        for (const [definition, options] of definitions) next = applyEncodingScale(next, definition, options, { reassignment: editing, allowTypeChange: true });
        for (const channel of positions) if (previous) next = rebindPositionGuides(next, channel, previous.encoding[channel].scale, encoding[channel].scale, id);
        next = applyMaterializationPlan(next, [...planLayerDataRematerialization(next, id), ...(hasMaterializedLegend(next) ? [{ op: "rematerializeLegend" }] : [])]);
        if (previous) next = applyDetachedScaleRematerialization(next, [previous]);
        return applyFacadeGuides(next, guides, id);
      };
      if (previous?.encoding.color && colorDefinition) return withColorLegendReassignment(this, previous, colorDefinition, apply);
      const baseline = args.color === false && legendBlockDescriptors(this, id).some(block => block.channels.includes("color")) ? this.removeLegend({ target: id, channels: ["color"] }) : this;
      return apply(baseline);
    });
}
export const createTrailPlot = /* @__PURE__ */ facade(false);
export const editTrailPlot = /* @__PURE__ */ facade(true);
