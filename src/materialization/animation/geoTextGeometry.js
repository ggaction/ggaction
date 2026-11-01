import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { validateInputReference } from "../../core/resourceReference.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { snapshotGeometryJSON, createGeometryBudget } from "../../grammar/geo/input.js";
import { normalizeProjectionOptions } from "../../grammar/geo/projectionOptions.js";
import { createProjectionKernel } from "../../grammar/geo/projections.js";
import { validateGraphicIdentity } from "../../grammar/schemas/graphicIdentity.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolveLabelLayout, resolveLabelLeader } from "../../layout/labels.js";
import { resolveTextBounds } from "../../core/textMetrics.js";
import { materializeFillItemsInPlot } from "../fillPaint.js";
import { validateGeoTextExpressions } from "./geoTextExpressions.js";
import { blendGeoTextGraphics } from "./geoTextBlend.js";

export const ANIMATION_GEO_TEXT_VERSION = "native-geo-text@2";
export const sameGeoTextValue = (a, b) => canonicalJSON(a) === canonicalJSON(b);
export function closedGeoText(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key) || value[key] === undefined)) throw new TypeError(`${label} requires every declared field.`);
}
function point(value, label) {
  ownArray(value, label);
  if (value.length !== 2 || value.some(n => !Number.isFinite(n))) throw new TypeError(`${label} requires two finite coordinates.`);
}
export function geoTextSourceToken(entry) {
  const ref = entry.identity.lineage.resource;
  return JSON.stringify([ref.kind, ref.id, entry.source.key, entry.source.digest]);
}
// These are raw geographic/planar prepared values, never recovered screen pixels.
// A sampled-only digest is a consistency key, not a historical source certificate.
export function normalizeGeoTextPresentation(input) {
  const value = snapshotGeometryJSON(input, createGeometryBudget());
  closedGeoText(value, ["key", "coordinateKind", "projection", "parameters", "entries", "expressions", "plotOrigin", "bounds"], "Geographic Text presentation");
  const address = JSON.parse(value.key);
  if (!Array.isArray(address) || address.length !== 2 || !Array.isArray(address[0]) || address[0].some(part => typeof part !== "string" || !part) || typeof address[1] !== "string" || !address[1] || JSON.stringify(address) !== value.key) throw new TypeError("Geographic Text requires a canonical scoped owner.");
  validateInputReference(value.projection);
  if (value.projection.kind !== "projection" || !sameGeoTextValue(value.parameters, normalizeProjectionOptions(value.parameters)) ||
      !["geographic", "planar"].includes(value.coordinateKind) || (value.coordinateKind === "planar") !== (value.parameters.type === "identity")) throw new TypeError("Geographic Text requires consistent coordinates and normalized camera.");
  point(value.plotOrigin, "Geographic Text plot origin");
  closedGeoText(value.bounds, ["left", "right", "top", "bottom"], "Geographic Text layout bounds");
  if (!Object.values(value.bounds).every(Number.isFinite) || value.bounds.right <= value.bounds.left || value.bounds.bottom <= value.bounds.top) throw new TypeError("Geographic Text requires ordered finite bounds.");
  ownArray(value.entries, "Geographic Text entries"); validateGeneratedItemLimit(value.entries.length, "Geographic Text entries");
  const keys = new Set(), anchors = new Map(), projection = createProjectionKernel(value.parameters);
  for (const entry of value.entries) {
    closedGeoText(entry, ["identity", "anchor", "source"], "Geographic Text entry");
    validateGraphicIdentity(entry.identity);
    const key = JSON.parse(entry.identity.key), role = key[2] === "text" ? "body" : key[2] === "geo" ? "label" : undefined;
    if (JSON.stringify(key.slice(0, 2)) !== value.key || entry.identity.role !== role || entry.identity.topology !== "text" || entry.identity.lineage.kind !== "resource" || !["geometry", "projection"].includes(entry.identity.lineage.resource.kind) || keys.has(entry.identity.key)) throw new TypeError("Geographic Text entry requires unique native Text identity and resource lineage.");
    keys.add(entry.identity.key);
    closedGeoText(entry.source, ["key", "digest"], "Geographic Text source");
    validateGraphicIdentity({ ...entry.identity, key: entry.source.key });
    const source = JSON.parse(entry.source.key);
    if (!Array.isArray(source) || source.length !== 4 || source[2] !== "geo" || !/^[a-f0-9]{64}$/.test(entry.source.digest) ||
        (key[2] === "text" ? key[3][0] !== "label" || key[3][1] !== entry.source.key : entry.identity.key !== entry.source.key)) throw new TypeError("Geographic Text requires its exact native source key and digest.");
    if (entry.anchor !== null) { point(entry.anchor, "Geographic Text raw anchor"); projection.forward(entry.anchor); }
    const token = geoTextSourceToken(entry), previous = anchors.get(token);
    if (previous !== undefined && !sameGeoTextValue(previous, entry.anchor)) throw new TypeError("One geographic source cannot have contradictory raw anchors.");
    anchors.set(token, entry.anchor);

  }
  validateGeoTextExpressions(value.expressions,value.entries.length,value.plotOrigin);
  return value;
}

// The same layout and leader kernels used by native Text consume current anchors.
export function resolveGeoTextPresentation(input, accountWork, frames) {
  let work = 0;
  const account = amount => { validateWorkLimit(work += amount, "Geographic Text materialization work"); accountWork?.(amount); };
  const value = normalizeGeoTextPresentation(input), projection = createProjectionKernel(value.parameters);
  account(value.entries.length * value.expressions.length);
  const outputs=value.expressions.map(expression=>{
  const entries = value.entries.flatMap((raw,index) => {
    if(expression.properties[index]===null)return [];
    const entry={...raw,properties:expression.properties[index]};
    const anchor = entry.anchor === null ? null : projection.forward(entry.anchor).point;
    if (anchor === null) return [];
    return [{ ...entry, point: anchor, properties: { ...entry.properties, x: anchor[0] + entry.properties.x, y: anchor[1] + entry.properties.y } }];
  });
  const inputs = entries.map(entry => ({ ...entry.properties, id: entry.identity.key, sourceX: entry.point[0], sourceY: entry.point[1] }));
  const resolved = expression.layout === null ? inputs.map(item => ({ ...item,
    dx: item.x - item.sourceX, dy: item.y - item.sourceY, bounds: resolveTextBounds(item, expression.textMetrics ?? undefined) }))
    : resolveLabelLayout({ items: inputs, bounds: value.bounds, axis: expression.layout.axis, padding: expression.layout.padding, maxDisplacement: expression.layout.maxDisplacement }, expression.textMetrics ?? undefined, account).items;
  const labels = materializeFillItemsInPlot(entries.map((entry, index) => ({ type: "text", identity: entry.identity,
    properties: { ...entry.properties, x: resolved[index].x, y: resolved[index].y } })), { plotOrigin: value.plotOrigin, textMetrics: expression.textMetrics ?? undefined });
  const leaders = expression.leader === false ? [] : resolved.flatMap((item, index) => {
    const line = resolveLabelLeader(item);
    return line === undefined ? [] : [{ type: "line", identity: { ...entries[index].identity, role: "leader" }, properties: { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, ...expression.leader } }];
  });
  validateGeneratedItemLimit(labels.length + leaders.length, "Geographic Text graphics");
  for (const graphic of [...labels, ...leaders]) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { labels, leaders };
  });
  return cloneAndFreeze(blendGeoTextGraphics(outputs,value.expressions,frames));
}
