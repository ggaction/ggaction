import { closedAction } from "../../core/action.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateNonEmptyString } from "../../core/validation.js";
import { TABLE_PLOT_FIELDS, normalizeTablePlot } from "../../grammar/tablePlot.js";
import { resolveTablePlot } from "../../materialization/table/plot.js";
import { findCoordinate, resolveCartesianCoordinate } from "../../selectors/coordinates.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveFacadeData } from "./shared.js";
import { assertMarkAvailable, resolveMarkId } from "../marks/shared.js";
import { applyMaterializationPlan, planLayerDataRematerialization } from "../../materialization/dependencies.js";
import { hasMaterializedLegend } from "../../materialization/legends.js";
import { resolveColorScaleDefinition, resolveQuantitativeColorScaleDefinition } from "../scales/definitions.js";
import { resolveScalePreview } from "../scales/preview.js";
import { applyEncodingScale, applyDetachedScaleRematerialization } from "../encodings/shared.js";
import { resolveColorScaleOptions, resolveColorReassignmentScaleOptions, withColorLegendReassignment } from "../encodings/color/policy.js";
import { legendBlockDescriptors } from "../guides/legends/target.js";

function facade(editing) {
  const op = editing ? "editTablePlot" : "createTablePlot";
  return closedAction({ op, description: `${editing ? "Edit" : "Create"} a keyed Table with formatted, bar and sparkline cells.` },
    [editing ? "target" : "id", "data", "coordinate", "color", ...TABLE_PLOT_FIELDS], function (args = {}) {
      if (Object.values(args).some(value => value === undefined || value === null)) throw new TypeError("Table options cannot contain null or undefined.");
      if (editing && !Object.keys(args).some(key => key !== "target")) throw new TypeError("Table edit requires a nonempty patch.");
      const previous = editing ? resolveEligibleLayer(this, { target: args.target, predicate: layer => layer.mark.type === "table", label: op }) : undefined;
      const id = previous?.id ?? resolveMarkId(this, args.id, { defaultId: "table", label: "Table plot id", markType: "table", operation: op });
      if (!editing) assertMarkAvailable(this, id);
      const data = resolveFacadeData(this, args.data ?? previous?.data, op);
      const coordinate = resolveCartesianCoordinate(this, args.coordinate ?? previous?.coordinate, "Table plot");
      const normalized = normalizeTablePlot(Object.fromEntries(TABLE_PLOT_FIELDS.filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]])), previous?.table, this.markConfigs[id]?.tablePlot);
      const color = Object.hasOwn(args, "color") ? args.color : undefined;
      let options, definition, encoding = previous?.encoding ?? {};
      if (color === false) encoding = {};
      else if (color !== undefined) {
        const input = typeof color === "string" ? { field: color } : color;
        ownRecord(input, "Table color"); rejectUnknownProperties(input, ["field", "fieldType", "scale", "palette"], "table color");
        validateNonEmptyString(input.field, "Table color field");
        const fieldType = input.fieldType ?? "nominal";
        if (!["nominal", "ordinal", "quantitative", "temporal"].includes(fieldType)) throw new TypeError("Table color fieldType is invalid.");
        options = resolveColorReassignmentScaleOptions(this, previous ?? { id }, "color", fieldType, { id: previous?.encoding?.color?.scale ?? `${id}-color`, ...resolveColorScaleOptions(input) });
        definition = ["nominal", "ordinal"].includes(fieldType) ? resolveColorScaleDefinition(this, options) : resolveQuantitativeColorScaleDefinition(this, fieldType, options);
        encoding = { color: { field: input.field, fieldType, scale: definition.id } };
      }
      const layer = { ...previous, id, mark: { type: "table" }, data, coordinate: coordinate.id, table: normalized.binding, encoding };
      const scales = new Map(this.semanticSpec.scales.map(scale => [scale.id, scale]));
      if (definition) scales.set(definition.id, definition);
      const preview = { ...this, semanticSpec: { ...this.semanticSpec,
        coordinates: findCoordinate(this, coordinate.id) ? this.semanticSpec.coordinates : [...this.semanticSpec.coordinates, coordinate],
        layers: [...this.semanticSpec.layers.filter(entry => entry.id !== id), layer], scales: [...scales.values()] } };
      const resolved = { ...this.resolvedScales };
      if (encoding.color) resolved[encoding.color.scale] = resolveScalePreview(preview, encoding.color.scale).resolvedScale;
      resolveTablePlot(preview, layer, normalized.config, resolved);
      const apply = candidate => {
        let next = findCoordinate(candidate, coordinate.id) ? candidate : candidate.createCoordinate(coordinate);
        next = next.applyTableMark({ layer, config: normalized.config });
        if (definition) next = applyEncodingScale(next, definition, options, { reassignment: editing, allowTypeChange: true });
        next = applyMaterializationPlan(next, [...planLayerDataRematerialization(next, id), ...(hasMaterializedLegend(next) ? [{ op: "rematerializeLegend" }] : [])]);
        return previous ? applyDetachedScaleRematerialization(next, [previous]) : next;
      };
      if (previous?.encoding?.color && definition) return withColorLegendReassignment(this, previous, definition, apply);
      const baseline = color === false && legendBlockDescriptors(this, id).some(block => block.channels.includes("color")) ? this.removeLegend({ target: id, channels: ["color"] }) : this;
      return apply(baseline);
    });
}
export const createTablePlot = /* @__PURE__ */ facade(false);
export const editTablePlot = /* @__PURE__ */ facade(true);
