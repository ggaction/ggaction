import { ownRecord } from "../../core/ownData.js";
import { buildAnnularSectorCommands } from "../../grammar/polarPaths.js";
import { closedAction } from "../../core/action.js";
import { normalizeScreenPolygon } from "../../grammar/selectionRegion.js";
import { buildLinearPathCommands } from "../../grammar/pathCommands.js";
import { requireSingleOrderedGraphicByType } from "../../grammar/schemas/graphicTree.js";

// A runtime preview is a separate immutable program. The committed program
// never contains this overlay; the ordinary four renderers consume this path.
export const materializeSelectionPreview = /* @__PURE__ */ closedAction({
  op: "materializeSelectionPreview", description: "Materialize a transient selection overlay.", scope: "any"
}, ["points", "sector"], function (options) {
  if (Object.hasOwn(options, "points") === Object.hasOwn(options, "sector")) throw new TypeError("Selection preview requires points or a sector.");
  let commands, clip;
  if (Object.hasOwn(options, "sector")) {
    ownRecord(options.sector, "Selection preview sector");
    if (Object.keys(options.sector).some(key => !["frame", "startTheta", "endTheta", "outerRadius", "clip"].includes(key))) throw new TypeError("Selection preview sector contains unsupported options.");
    const sector = Object.assign(Object.create(null), options.sector);
    ownRecord(sector.frame, "Selection preview frame");
    if (Object.keys(sector.frame).length !== 3 || !["centerX", "centerY", "availableRadius"].every(key => Object.hasOwn(sector.frame, key))) throw new TypeError("Selection preview requires an exact Polar frame.");
    sector.frame = Object.assign(Object.create(null), sector.frame);
    clip = sector.clip; delete sector.clip;
    commands = buildAnnularSectorCommands(sector);
  } else {
    const polygon = normalizeScreenPolygon(options.points);
    if (polygon.length < 2) return this;
    commands = buildLinearPathCommands(polygon, { close: polygon.length >= 3 });
  }
  const id = "interaction-selection-preview", parent = requireSingleOrderedGraphicByType(this.graphicSpec, "canvas").id;
  if (Object.hasOwn(this.graphicSpec.objects, id)) throw new Error("Selection preview graphic ID conflicts with authored graphics.");
  const properties = { commands, fillRule: "evenodd",
    fill: "#3b82f6", stroke: "#2563eb", strokeWidth: 1, opacity: 0.25 };
  const next = this.createGraphics({ id, type: "collection", parent }).editGraphics({ target: id, property: "items", value: [{ type: "path", properties }] });
  return clip === undefined ? next : next.editGraphics({ target: id, property: "clip", value: clip });
});
