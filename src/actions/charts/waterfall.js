import { closedAction } from "../../core/action.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString } from "../../core/validation.js";
import { WATERFALL_PLOT_FIELDS, normalizeWaterfallPlot, readWaterfallItems } from "../../grammar/waterfallPlot.js";
import { resolveWaterfallPlot } from "../../materialization/waterfall/plot.js";
import { requireDataset } from "../../selectors/datasets.js";
import { findCoordinate, resolveCartesianCoordinate } from "../../selectors/coordinates.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveFacadeData, normalizeFieldEncoding, normalizeGuides, applyFacadeGuides } from "./shared.js";
import { assertMarkAvailable, resolveMarkId } from "../marks/shared.js";
import { rematerializeHighlightBaseline } from "../marks/lifecycle.js";
import { resolveMarkGraphicPlacement } from "../../materialization/graphicHierarchy.js";
import { applyMaterializationPlan, planLayerDataRematerialization } from "../../materialization/dependencies.js";
import { hasMaterializedLegend } from "../../materialization/legends.js";
import { resolvePositionScaleDefinition, resolveColorScaleDefinition, resolveQuantitativeColorScaleDefinition } from "../scales/definitions.js";
import { resolveScalePreview } from "../scales/preview.js";
import { applyEncodingScale, applyDetachedScaleRematerialization, rebindPositionGuides, resolvePositionGuideRebinding } from "../encodings/shared.js";
import { resolveColorScaleOptions, resolveColorReassignmentScaleOptions, withColorLegendReassignment } from "../encodings/color/policy.js";
import { legendBlockDescriptors } from "../guides/legends/target.js";
import { resolveFacadeGuidePlan } from "../guides/facade.js";
import { assertFacadeGuidesFrame } from "./frame.js";

export const materializeWaterfallPlot = /* @__PURE__ */ closedAction(
  { op: "materializeWaterfallPlot", description: "Materialize ordered contribution bars, connectors and labels." }, ["id", "scales"], function ({ id, scales } = {}) {
    if (scales !== undefined && typeof scales !== "boolean") throw new TypeError("Waterfall scales must be boolean.");
    const layer = requireLayer(this, id);
    if (layer.mark.type !== "waterfall") throw new TypeError("Waterfall materialization requires an Waterfall mark.");
    const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: "materializeWaterfallPlot", scales, resetProperty: "items", resetValue: [] });
    if (highlighted !== undefined) return highlighted;
    let next = this;
    if (scales !== false) for (const scale of new Set(Object.values(layer.encoding).map(entry => entry.scale))) next = next.rematerializeScale({ id: scale, marks: false, guides: false });
    const config = next.markConfigs[id].waterfallPlot, resolved = resolveWaterfallPlot(next, layer, config);
    if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: "waterfall" }) });
    next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
    if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
    return next;
  });

function facade(editing) {
  const op = editing ? "editWaterfallPlot" : "createWaterfallPlot";
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} ordered contributions, subtotals and totals.` },
    [editing ? "target" : "id", "data", "coordinate", "x", "value", "yScale", "color", "guides", ...WATERFALL_PLOT_FIELDS], function (args = {}) {
      if (Object.values(args).some(value => value === undefined || value === null)) throw new TypeError("Waterfall options cannot contain null or undefined.");
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError("Waterfall edit requires a nonempty patch.");
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === "waterfall", label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: "waterfall", label: "Waterfall plot id", markType: "waterfall", operation: op });
      if (!editing) assertMarkAvailable(this, id);
      const data = resolveFacadeData(this, args.data ?? previous?.data, op);
      const coordinate = resolveCartesianCoordinate(this, args.coordinate ?? previous?.coordinate, "Waterfall plot");
      const normalized = normalizeWaterfallPlot(Object.fromEntries(WATERFALL_PLOT_FIELDS.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]])), previous?.waterfall, this.markConfigs[id]?.waterfallPlot);
      const x = args.x === undefined ? previous?.encoding.x : normalizeFieldEncoding(args.x, "Waterfall x");
      ownRecord(x, "Waterfall x"); rejectUnknownProperties(x, ["field", "fieldType", "scale"], "Waterfall x");
      validateNonEmptyString(x.field, "Waterfall x field");
      const value = args.value ?? previous?.encoding.y.field;
      validateNonEmptyString(value, "Waterfall value field");
      const dataset = requireDataset(this, data);
      readWaterfallItems(dataset, { waterfall: normalized.binding, encoding: { y: { field: value } } });
      const xType = x.fieldType ?? "nominal";
      if (!["nominal", "ordinal"].includes(xType)) throw new TypeError("Waterfall stages require nominal or ordinal positions.");
      if (args.x !== undefined && x.scale !== undefined) ownRecord(x.scale, "Waterfall x scale");
      if (args.yScale !== undefined) ownRecord(args.yScale, "Waterfall yScale");
      const xOptions = { id: previous?.encoding.x.scale ?? `${id}-x`, ...(args.x === undefined ? {} : x.scale) };
      const yOptions = { id: previous?.encoding.y.scale ?? `${id}-y`, ...args.yScale };
      const xDefinition = resolvePositionScaleDefinition(this, "x", xType, xOptions, { discreteType: "band" });
      const yDefinition = resolvePositionScaleDefinition(this, "y", "quantitative", yOptions, { zero: true, nice: false });
      const encoding = { x: { field: x.field, fieldType: xType, scale: xDefinition.id }, y: { field: value, fieldType: "quantitative", scale: yDefinition.id }, ...(previous?.encoding.color ? { color: previous.encoding.color } : {}) };
      const definitions = [[xDefinition, xOptions], [yDefinition, yOptions]];
      let colorDefinition;
      if (args.color === false) delete encoding.color;
      else if (args.color !== undefined) {
        const input = normalizeFieldEncoding(args.color, "Waterfall color");
        ownRecord(input, "Waterfall color"); rejectUnknownProperties(input, ["field", "fieldType", "scale", "palette"], "Waterfall color");
        validateNonEmptyString(input.field, "Waterfall color field");
        if (input.scale !== undefined) ownRecord(input.scale, "Waterfall color scale");
        const fieldType = input.fieldType ?? "nominal";
        if (!["nominal", "ordinal", "quantitative", "temporal"].includes(fieldType)) throw new TypeError("Waterfall color fieldType is invalid.");
        const options = resolveColorReassignmentScaleOptions(this, previous ?? { id }, "color", fieldType, { id: previous?.encoding.color?.scale ?? `${id}-color`, ...resolveColorScaleOptions(input) });
        colorDefinition = ["nominal", "ordinal"].includes(fieldType) ? resolveColorScaleDefinition(this, options) : resolveQuantitativeColorScaleDefinition(this, fieldType, options);
        definitions.push([colorDefinition, options]); encoding.color = { field: input.field, fieldType, scale: colorDefinition.id };
      }
      const layer = { ...previous, id, mark: { type: "waterfall" }, data, coordinate: coordinate.id, waterfall: normalized.binding, encoding };
      const scaleMap = new Map(this.semanticSpec.scales.map(scale => [scale.id, scale]));
      for (const [definition] of definitions) scaleMap.set(definition.id, definition);
      const preview = { ...this, context: this.context, guideConfigs: this.guideConfigs, semanticSpec: { ...this.semanticSpec,
        coordinates: findCoordinate(this, coordinate.id) ? this.semanticSpec.coordinates : [...this.semanticSpec.coordinates, coordinate],
        layers: [...this.semanticSpec.layers.filter(entry => entry.id !== id), layer], scales: [...scaleMap.values()] }, markConfigs: { ...this.markConfigs, [id]: { ...this.markConfigs[id], waterfallPlot: normalized.config } } };
      const resolved = { ...this.resolvedScales };
      for (const scale of new Set(Object.values(encoding).map(entry => entry.scale))) resolved[scale] = resolveScalePreview(preview, scale).resolvedScale;
      preview.resolvedScales = resolved;
      resolveWaterfallPlot(preview, layer, normalized.config);
      const guides = args.guides === undefined && editing ? false : normalizeGuides(args.guides, op);
      assertFacadeGuidesFrame(preview, id, guides);
      resolveFacadeGuidePlan(preview, guides, id);
      for (const channel of ["x", "y"]) if (previous) resolvePositionGuideRebinding(preview, channel, previous.encoding[channel].scale, encoding[channel].scale, id);
      const apply = candidate => {
        let next = findCoordinate(candidate, coordinate.id) ? candidate : candidate.createCoordinate(coordinate);
        next = next.editSemantic({ property: `layer[${id}].mark.type`, value: "waterfall" })
          .editSemantic({ property: `layer[${id}].data`, value: data })
          .editSemantic({ property: `layer[${id}].coordinate`, value: coordinate.id })
          .editSemantic({ property: `layer[${id}].waterfall`, value: normalized.binding })
          ._withMarkConfig(id, { ...this.markConfigs[id], waterfallPlot: normalized.config });
        for (const channel of Object.keys(previous?.encoding ?? {})) if (!encoding[channel]) next = next.editSemantic({ property: `layer[${id}].encoding.${channel}`, remove: true });
        for (const [channel, binding] of Object.entries(encoding)) {
          for (const [property, value] of Object.entries(binding)) next = next.editSemantic({ property: `layer[${id}].encoding.${channel}.${property}`, value });
        }
        for (const [definition, options] of definitions) next = applyEncodingScale(next, definition, options, { reassignment: editing, allowTypeChange: true });
        for (const channel of ["x", "y"]) if (previous) next = rebindPositionGuides(next, channel, previous.encoding[channel].scale, encoding[channel].scale, id);
        next = applyMaterializationPlan(next, [...planLayerDataRematerialization(next, id), ...(hasMaterializedLegend(next) ? [{ op: "rematerializeLegend" }] : [])]);
        if (previous) next = applyDetachedScaleRematerialization(next, [previous]);
        return applyFacadeGuides(next, guides, id);
      };
      if (previous?.encoding.color && colorDefinition) return withColorLegendReassignment(this, previous, colorDefinition, apply);
      const baseline = args.color === false && legendBlockDescriptors(this, id).some(block => block.channels.includes("color")) ? this.removeLegend({ target: id, channels: ["color"] }) : this;
      return apply(baseline);
    });
}
export const createWaterfallPlot = /* @__PURE__ */ facade(false);
export const editWaterfallPlot = /* @__PURE__ */ facade(true);
