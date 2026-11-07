import { ownArray } from "../core/ownData.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { graphicScopes } from "../selectors/graphicScopes.js";
import { cartesianAxisOwners, axisGraphicIds } from "../selectors/axes.js";
import { valuesFromTickConfig } from "../materialization/guides/tickValues.js";
import { normalizeGuideIdentity } from "../grammar/animation/guideState.js";
import { guideHitItemKey, guideHitToken } from "./hitGuides.js";

// Source membership is the native raw axis cohort, independent of the current
// responsive skip/wrap decision. It grants guide metadata, not mark selection.
export function axisLabelSourceResolver(spend, requireProgram) {
  const programs = new Map();
  return (origin, identity) => {
    ownArray(origin.childPath, "Animation axis label child path");
    if (origin.childPath.length > 1024 || origin.childPath.some(id => typeof id !== "string" || !id) || typeof origin.ownerId !== "string" || !origin.ownerId) throw new TypeError("Animation axis label source requires an exact bounded scope.");
    spend(1 + origin.ownerId.length + origin.childPath.reduce((n, id) => n + id.length, 0));
    let scopes = programs.get(origin.program);
    if (scopes === undefined) {
      requireProgram(origin.program); scopes = new Map();
      for (const context of graphicScopes(origin.program, spend)) {
        requireProgram(context.program); scopes.set(JSON.stringify(context.childPath), { ...context, axes: new Map() });
      }
      programs.set(origin.program, scopes);
    }
    const context = scopes.get(JSON.stringify(origin.childPath));
    if (context === undefined) throw new TypeError("Animation axis label source has an unknown child path.");
    let values = context.axes.get(origin.ownerId);
    if (values === undefined) {
      const owners = cartesianAxisOwners(context.program); spend(owners.length);
      const owner = owners.find(owner => owner.id === origin.ownerId);
      if (owner?.config.labels === undefined || context.program.graphicSpec.objects[axisGraphicIds(owner.channel,owner.id)[2]] === undefined) throw new TypeError("Animation axis label source requires its native label owner.");
      const raw = valuesFromTickConfig(context.program, owner.config.labels); spend(raw.length);
      values = new Set(raw.map(value => canonicalJSON(value))); context.axes.set(origin.ownerId, values);
    }
    if (!values.has(canonicalJSON(origin.value))) throw new TypeError("Animation axis label raw value is absent from its native owner.");
    let metadata;
    if (identity !== undefined) {
      const value = normalizeGuideIdentity(identity);
      if (value.component !== "labels" || value.owner !== origin.ownerId || canonicalJSON(value.namespaces) !== canonicalJSON(context.namespaces) || canonicalJSON(value.value) !== canonicalJSON(origin.value)) throw new TypeError("Animation axis label identity differs from its exact native source.");
      const guide = guideHitToken(origin.ownerId, "axis-tick", ["axis", origin.value]);
      metadata = cloneAndFreeze({ itemKey: guideHitItemKey(context.namespaces,guide), ownerId: origin.ownerId, role: guide.role, childPath: context.childPath, rowKeys: [], resourceRefs: [] });
    }
    return { metadata, metrics: context.program.materializationConfigs.textMetrics };
  };
}
