import { action, closedAction } from "../../core/action.js";
import { noOptions } from "../../core/validation.js";
import { normalizeTextMetricProfile } from "../../core/textMetricProfile.js";
import { rematerializeTypography } from "../../materialization/typography.js";

function metricsProgram(parent, child) {
  return typeof child.applyTextMetrics === "function" ? child : new parent.constructor({
    ...child, actionSequence: child._actionSequence
  });
}

export function inheritTextMetrics(parent, child) {
  const profile = parent.materializationConfigs.textMetrics;
  return profile === undefined ? child : metricsProgram(parent, child).applyTextMetrics({ profile });
}

function applyProfile(program, profile) {
  let next = profile === undefined
    ? program._withoutMaterializationConfig(["textMetrics"])
    : program._withMaterializationConfig(["textMetrics"], profile);
  if (next.compositionSpec !== undefined) {
    const children = Object.fromEntries(next.compositionSpec.children.map(id => {
      const child = next.children[id];
      return [id, profile === undefined
        ? child.materializationConfigs.textMetrics === undefined ? child : metricsProgram(next, child).removeTextMetrics()
        : inheritTextMetrics(next, child)];
    }));
    next = next._withCompositionState({ children, compositionSpec: next.compositionSpec });
    for (const id of next.compositionSpec.children) next = next.useProgram({ id });
    return next.materializeComposition();
  }
  return rematerializeTypography(next);
}

export const applyTextMetrics = /* @__PURE__ */ closedAction(
  { op: "applyTextMetrics", description: "Apply measured text widths to chart layout.", scope: "any" }, ["profile"],
  function (args = {}) {
    const profile = normalizeTextMetricProfile(args.profile);
    applyProfile(this, profile);
    return applyProfile(this, profile);
  }
);

export const removeTextMetrics = /* @__PURE__ */ action(
  { op: "removeTextMetrics", description: "Restore estimated text layout.", scope: "any" },
  function (args = {}) {
    noOptions(args, "removeTextMetrics");
    if (this.materializationConfigs.textMetrics === undefined) throw new Error("removeTextMetrics requires an active profile.");
    applyProfile(this, undefined);
    return applyProfile(this, undefined);
  }
);

export function registerTextMetricActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { applyTextMetrics, removeTextMetrics });
}
