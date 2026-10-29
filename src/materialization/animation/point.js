import { cloneAndFreeze } from "../../core/immutable.js";
import { hasPositionBinding } from "../../core/encodingBindings.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { findLayer } from "../../selectors/layers.js";
import { requireDataset } from "../../selectors/datasets.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { resolveGraphicScope, resolveGraphicLineage } from "../../selectors/resources.js";
import { unnamespaceItemKey } from "../../grammar/schemas/graphicIdentity.js";
import { applyItemMissingPolicy } from "../../grammar/itemMissing.js";
import { resolveRowEncodingValues } from "../rowEncoding.js";
import { resolveMarkIdentities, resolveMarkItems, resolveMarkSourceItems } from "../selection/policies/index.js";

const supported = new Set(["linear", "time", "log", "pow", "sqrt", "symlog"]);
const unavailable = reason => Object.freeze({ reason });
function position(input) {
  if (input === undefined) return unavailable("incomplete-position");
  const scale = input.scale;
  if (!supported.has(scale?.type)) return unavailable("scale-type");
  if (!Number.isFinite(input.value)) return unavailable("nonfinite-semantic-value");
  const keys = ["type", "domain", "range", "clamp", ...(scale.type === "log" ? ["base"] : scale.type === "pow" ? ["exponent"] : scale.type === "symlog" ? ["constant"] : [])];
  return cloneAndFreeze({ value: input.value, scale: Object.fromEntries(keys.filter(key => Object.hasOwn(scale, key)).map(key => [key, scale[key]])) });
}
function layerPositions(program, layer) {
  if (layer.mark.type !== "point") return unavailable("unsupported-family");
  if (layer.derivedBindings?.overlay) return unavailable("overlay-position");
  if (requireCoordinate(program, layer.coordinate).type !== "cartesian") return unavailable("coordinate-family");
  if (["xOffset", "yOffset"].some(channel => hasPositionBinding(layer, channel))) return unavailable("offset-position");
  if (program.materializationConfigs.jitters?.[layer.id] || program.materializationConfigs.pointPacking?.[layer.id]) return unavailable("computed-point-position");
  const dataset = applyItemMissingPolicy(layer, requireDataset(program, layer.data));
  validateGeneratedItemLimit(dataset.values.length, "Animation point rows");
  const resolvers = { resolveMarkItems, resolveMarkSourceItems };
  const values = Object.fromEntries(["x", "y"].map(channel => [channel,
    resolveRowEncodingValues(program, layer, dataset, channel, resolvers, { mapped: false, includeScale: true })]));
  if (values.x === undefined || values.y === undefined) return unavailable("incomplete-position");
  const indices = new Map(dataset.rowKeys.map((key, index) => [key, index]));
  return new Map(resolveMarkIdentities(program, layer.id).map(item => {
    if (item.rowKeys.length !== 1) throw new TypeError("Animation point requires one exact final row.");
    const index = indices.get(item.rowKeys[0]);
    if (index === undefined) throw new TypeError("Animation point identity has no eligible row.");
    const x = position(values.x[index]), y = position(values.y[index]);
    return [item.key, { position: x.reason ? x : y.reason ? y : cloneAndFreeze({ x, y }), rowKey: item.rowKeys[0] }];
  }));
}

// Resolve once per native final layer grain, then join by the persisted item key.
// Draw order and source row indices never establish correspondence.
export function projectPointAnimationPositions(program, endpoint) {
  const layers = new Map();
  return Object.freeze(endpoint.identities.map(identity => {
    if (identity === undefined) return unavailable("anonymous");
    const scope = resolveGraphicScope(program, identity), [namespaces, owner] = JSON.parse(identity.key);
    const layer = findLayer(scope, owner);
    if (layer === undefined) return unavailable("semantic-unavailable");
    if (identity.role !== "body") return unavailable("primitive-role");
    if (layer.mark.type === "point" && resolveGraphicLineage(program, identity) !== requireDataset(scope, layer.data)) {
      throw new TypeError("Animation point lineage does not match its semantic dataset.");
    }
    let scoped = layers.get(scope); if (scoped === undefined) layers.set(scope, scoped = new Map());
    if (!scoped.has(owner)) scoped.set(owner, layerPositions(scope, layer));
    const prepared = scoped.get(owner);
    if (prepared.reason) return prepared;
    const result = prepared.get(unnamespaceItemKey(identity.key, namespaces));
    if (result === undefined) throw new TypeError("Animation point is absent from its exact final grain.");
    if (identity.lineage.rowKeys.length !== 1 || identity.lineage.rowKeys[0] !== result.rowKey) {
      throw new TypeError("Animation point lineage does not match its exact final row.");
    }
    return result.position;
  }));
}
