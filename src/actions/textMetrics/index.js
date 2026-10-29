import { withRetainedFacetDomains } from "../../materialization/facetScaleContext.js";
import { action, closedAction } from "../../core/action.js";
import { noOptions } from "../../core/validation.js";
import { normalizeTextMetricProfile } from "../../core/textMetricProfile.js";
import { rematerializeTypography } from "../../materialization/typography.js";
import { validateFontMetricBindings, inheritFontMetricResources } from "../../materialization/fontState.js";
import { readPreparedTextMetrics } from "../../resources/textMetrics.js";

function metricsProgram(parent, child) {
  return typeof child.applyTextMetrics === "function" ? child : new parent.constructor({
    ...child, actionSequence: child._actionSequence
  });
}

export function inheritTextMetrics(parent, child) {
  const profile = parent.materializationConfigs.textMetrics;
  if (profile === undefined) return child;
  child = metricsProgram(parent, child);
  if (profile.schemaVersion !== 2) return child.applyTextMetrics({ profile });
  child = inheritFontMetricResources(parent, child, profile);
  return applyTextMetricProfile(child, profile);
}

export function applyTextMetricProfile(program, profile) {
  validateFontMetricBindings(program, profile);
  let next = profile === undefined
    ? program._withoutMaterializationConfig(["textMetrics"])
    : program._withMaterializationConfig(["textMetrics"], profile);
  if (next.compositionSpec !== undefined) {
    const children = Object.fromEntries(next.compositionSpec.children.map(id => [id,
      withRetainedFacetDomains(next, id, child => profile === undefined
        ? child.materializationConfigs.textMetrics === undefined ? child : metricsProgram(next, child).removeTextMetrics()
        : inheritTextMetrics(next, child))]));
    next = next._withCompositionState({ children, compositionSpec: next.compositionSpec });
    for (const id of next.compositionSpec.children) next = next.useProgram({ id });
    return next.materializeComposition();
  }
  return rematerializeTypography(next);
}

export const applyTextMetrics = /* @__PURE__ */ closedAction(
  { op: "applyTextMetrics", description: "Apply measured text widths to chart layout.", scope: "any" }, ["profile", "prepared", "requestToken"],
  function (args = {}) {
    const supplied = Object.hasOwn(args, "profile");
    if (supplied && (Object.hasOwn(args, "prepared") || Object.hasOwn(args, "requestToken"))) throw new TypeError("Text metrics require either a profile or prepared metrics and requestToken.");
    const profile = supplied ? normalizeTextMetricProfile(args.profile)
      : readPreparedTextMetrics(this, args.prepared, args.requestToken);
    applyTextMetricProfile(this, profile);
    return applyTextMetricProfile(this, profile);
  }
);

export const removeTextMetrics = /* @__PURE__ */ action(
  { op: "removeTextMetrics", description: "Restore estimated text layout.", scope: "any" },
  function (args = {}) {
    noOptions(args, "removeTextMetrics");
    if (this.materializationConfigs.textMetrics === undefined) throw new Error("removeTextMetrics requires an active profile.");
    applyTextMetricProfile(this, undefined);
    return applyTextMetricProfile(this, undefined);
  }
);

export function registerTextMetricActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { applyTextMetrics, removeTextMetrics });
}
