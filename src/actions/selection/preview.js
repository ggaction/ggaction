import { closedAction } from "../../core/action.js";
import { normalizeScreenPolygon } from "../../grammar/selectionRegion.js";
import { buildLinearPathCommands } from "../../grammar/pathCommands.js";
import { requireSingleOrderedGraphicByType } from "../../grammar/schemas/graphicTree.js";

// A runtime preview is a separate immutable program. The committed program
// never contains this overlay; the ordinary four renderers consume this path.
export const materializeSelectionPreview = /* @__PURE__ */ closedAction({
  op: "materializeSelectionPreview", description: "Materialize a transient selection overlay.", scope: "any"
}, ["points"], function ({ points }) {
  const polygon = normalizeScreenPolygon(points);
  if (polygon.length < 2) return this;
  const id = "interaction-selection-preview", parent = requireSingleOrderedGraphicByType(this.graphicSpec, "canvas").id;
  if (Object.hasOwn(this.graphicSpec.objects, id)) throw new Error("Selection preview graphic ID conflicts with authored graphics.");
  const properties = { commands: buildLinearPathCommands(polygon, { close: polygon.length >= 3 }), fillRule: "evenodd",
    fill: "#3b82f6", stroke: "#2563eb", strokeWidth: 1, opacity: 0.25 };
  return this.createGraphics({ id, type: "collection", parent }).editGraphics({ target: id, property: "items", value: [{ type: "path", properties }] });
});
