import { closedAction } from "../../core/action.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString } from "../../core/validation.js";
import { OHLC_PLOT_FIELDS, normalizeOHLCPlot, readOHLCItems } from "../../grammar/ohlcPlot.js";
import { resolveTemporalUnit } from "../../grammar/scales/index.js";
import { resolveOHLCPlot } from "../../materialization/ohlc/plot.js";
import { requireDataset } from "../../selectors/datasets.js";
import { findCoordinate, resolveCartesianCoordinate } from "../../selectors/coordinates.js";
import { requireLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveFacadeData, normalizeFieldEncoding, inferFacadeFieldType, normalizeGuides, applyFacadeGuides } from "./shared.js";
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

export const materializeOHLCPlot = /* @__PURE__ */ closedAction(
  { op: "materializeOHLCPlot", description: "Materialize row-owned price stems, bodies and labels." }, ["id", "scales"], function ({ id, scales } = {}) {
    if (scales !== undefined && typeof scales !== "boolean") throw new TypeError("OHLC scales must be boolean.");
    const layer = requireLayer(this, id);
    if (layer.mark.type !== "ohlc") throw new TypeError("OHLC materialization requires an OHLC mark.");
    const highlighted = rematerializeHighlightBaseline(this, { target: id, operation: "materializeOHLCPlot", scales, resetProperty: "items", resetValue: [] });
    if (highlighted !== undefined) return highlighted;
    let next = this;
    if (scales !== false) for (const scale of new Set(Object.values(layer.encoding).map(entry => entry.scale))) next = next.rematerializeScale({ id: scale, marks: false, guides: false });
    const config = next.markConfigs[id].ohlcPlot, resolved = resolveOHLCPlot(next, layer, config);
    if (!next.graphicSpec.objects[id]) next = next.createGraphics({ id, type: "collection", ...resolveMarkGraphicPlacement(next, { markType: "ohlc" }) });
    next = next.editGraphics({ target: id, property: "items", value: resolved.graphics });
    if (config.clip || next.graphicSpec.objects[id].clip !== undefined) next = next.editGraphics({ target: id, property: "clip", value: config.clip ? resolved.frame : false });
    return next;
  });

function facade(editing) {
  const op = editing ? "editOHLCPlot" : "createOHLCPlot";
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} row-owned open/high/low/close prices.` },
    [editing ? "target" : "id", "data", "coordinate", "x", "low", "high", "yScale", "color", "guides", ...OHLC_PLOT_FIELDS], function (args = {}) {
      if (Object.values(args).some(value => value === undefined || value === null)) throw new TypeError("OHLC options cannot contain null or undefined.");
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError("OHLC edit requires a nonempty patch.");
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === "ohlc", label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: "ohlc", label: "OHLC plot id", markType: "ohlc", operation: op });
      if (!editing) assertMarkAvailable(this, id);
      const data = resolveFacadeData(this, args.data ?? previous?.data, op);
      const coordinate = resolveCartesianCoordinate(this, args.coordinate ?? previous?.coordinate, "OHLC plot");
      const normalized = normalizeOHLCPlot(Object.fromEntries(OHLC_PLOT_FIELDS.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]])), previous?.ohlc, this.markConfigs[id]?.ohlcPlot);
      const x = args.x === undefined ? previous?.encoding.x : normalizeFieldEncoding(args.x, "OHLC x");
      ownRecord(x, "OHLC x"); rejectUnknownProperties(x, ["field", "fieldType", "scale", "temporalUnit"], "OHLC x");
      validateNonEmptyString(x.field, "OHLC x field");
      const low = args.low ?? previous?.encoding.y.field, high = args.high ?? previous?.encoding.y2.field;
      validateNonEmptyString(low, "OHLC low field"); validateNonEmptyString(high, "OHLC high field");
      const dataset = requireDataset(this, data);
      const eligible = readOHLCItems(dataset, { ohlc: normalized.binding, encoding: { y: { field: low }, y2: { field: high } } });
      const inference = { semanticSpec: { datasets: [{ ...dataset, values: eligible.items.map(item => dataset.values[item.sourceIndex]) }] } };
      const xType = inferFacadeFieldType(inference, data, x, "OHLC x");
      const temporalUnit = resolveTemporalUnit(x, xType, previous?.encoding.x);
      if (args.x !== undefined && x.scale !== undefined) ownRecord(x.scale, "OHLC x scale");
      if (args.yScale !== undefined) ownRecord(args.yScale, "OHLC yScale");
      const xOptions = { id: previous?.encoding.x.scale ?? `${id}-x`, ...(args.x === undefined ? {} : x.scale) };
      const yOptions = { id: previous?.encoding.y.scale ?? `${id}-y`, ...args.yScale };
      const xDefinition = resolvePositionScaleDefinition(this, "x", xType, xOptions, { discreteType: "band" });
      const yDefinition = resolvePositionScaleDefinition(this, "y", "quantitative", yOptions, { zero: false, nice: false });
      const encoding = { x: { field: x.field, fieldType: xType, scale: xDefinition.id, ...(temporalUnit ? { temporalUnit } : {}) }, y: { field: low, fieldType: "quantitative", scale: yDefinition.id }, y2: { field: high, fieldType: "quantitative", scale: yDefinition.id }, ...(previous?.encoding.color ? { color: previous.encoding.color } : {}) };
      const definitions = [[xDefinition, xOptions], [yDefinition, yOptions]];
      let colorDefinition;
      if (args.color === false) delete encoding.color;
      else if (args.color !== undefined) {
        const input = normalizeFieldEncoding(args.color, "OHLC color");
        ownRecord(input, "OHLC color"); rejectUnknownProperties(input, ["field", "fieldType", "scale", "palette"], "OHLC color");
        validateNonEmptyString(input.field, "OHLC color field");
        if (input.scale !== undefined) ownRecord(input.scale, "OHLC color scale");
        const fieldType = input.fieldType ?? "nominal";
        if (!["nominal", "ordinal", "quantitative", "temporal"].includes(fieldType)) throw new TypeError("OHLC color fieldType is invalid.");
        const options = resolveColorReassignmentScaleOptions(this, previous ?? { id }, "color", fieldType, { id: previous?.encoding.color?.scale ?? `${id}-color`, ...resolveColorScaleOptions(input) });
        colorDefinition = ["nominal", "ordinal"].includes(fieldType) ? resolveColorScaleDefinition(this, options) : resolveQuantitativeColorScaleDefinition(this, fieldType, options);
        definitions.push([colorDefinition, options]); encoding.color = { field: input.field, fieldType, scale: colorDefinition.id };
      }
      const layer = { ...previous, id, mark: { type: "ohlc" }, data, coordinate: coordinate.id, ohlc: normalized.binding, encoding };
      const scaleMap = new Map(this.semanticSpec.scales.map(scale => [scale.id, scale]));
      for (const [definition] of definitions) scaleMap.set(definition.id, definition);
      const preview = { ...this, context: this.context, guideConfigs: this.guideConfigs, semanticSpec: { ...this.semanticSpec,
        coordinates: findCoordinate(this, coordinate.id) ? this.semanticSpec.coordinates : [...this.semanticSpec.coordinates, coordinate],
        layers: [...this.semanticSpec.layers.filter(entry => entry.id !== id), layer], scales: [...scaleMap.values()] }, markConfigs: { ...this.markConfigs, [id]: { ...this.markConfigs[id], ohlcPlot: normalized.config } } };
      const resolved = { ...this.resolvedScales };
      for (const scale of new Set(Object.values(encoding).map(entry => entry.scale))) resolved[scale] = resolveScalePreview(preview, scale).resolvedScale;
      preview.resolvedScales = resolved;
      resolveOHLCPlot(preview, layer, normalized.config);
      const guides = args.guides === undefined && editing ? false : normalizeGuides(args.guides, op);
      assertFacadeGuidesFrame(preview, id, guides);
      resolveFacadeGuidePlan(preview, guides, id);
      for (const channel of ["x", "y"]) if (previous) resolvePositionGuideRebinding(preview, channel, previous.encoding[channel].scale, encoding[channel].scale, id);
      const apply = candidate => {
        let next = findCoordinate(candidate, coordinate.id) ? candidate : candidate.createCoordinate(coordinate);
        next = next.editSemantic({ property: `layer[${id}].mark.type`, value: "ohlc" })
          .editSemantic({ property: `layer[${id}].data`, value: data })
          .editSemantic({ property: `layer[${id}].coordinate`, value: coordinate.id })
          .editSemantic({ property: `layer[${id}].ohlc`, value: normalized.binding })
          ._withMarkConfig(id, { ...this.markConfigs[id], ohlcPlot: normalized.config });
        for (const channel of Object.keys(previous?.encoding ?? {})) if (!encoding[channel]) next = next.editSemantic({ property: `layer[${id}].encoding.${channel}`, remove: true });
        for (const [channel, binding] of Object.entries(encoding)) {
          if (previous?.encoding[channel]?.temporalUnit && !binding.temporalUnit) next = next.editSemantic({ property: `layer[${id}].encoding.${channel}.temporalUnit`, remove: true });
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
export const createOHLCPlot = /* @__PURE__ */ facade(false);
export const editOHLCPlot = /* @__PURE__ */ facade(true);
