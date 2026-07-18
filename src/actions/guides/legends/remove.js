import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validateKeys } from "../../../core/validation.js";
import { legendGraphicIds } from
  "../../../materialization/guides/resources.js";

const OPTIONS = Object.freeze(["target"]);

function resolveTarget(program, requested) {
  const targets = [...new Set(Object.values(program.guideConfigs.legend ?? {})
    .map(config => config?.target)
    .filter(Boolean))];
  if (requested !== undefined) {
    const target = validateUserId(requested, "Legend target id");
    if (!targets.includes(target)) {
      throw new Error(`Unknown legend target "${target}".`);
    }
    return target;
  }
  if (targets.length === 0) throw new Error("removeLegend requires an existing legend.");
  if (targets.length > 1) {
    throw new Error("removeLegend requires target when the legend is ambiguous.");
  }
  return targets[0];
}

const SEMANTIC_KIND = Object.freeze({
  series: "series",
  color: "color",
  size: "size",
  gradient: "color",
  interval: "color",
  opacity: "opacity"
});

export const removeLegend = action(
  { op: "removeLegend", description: "Remove every legend block owned by one mark." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "removeLegend");
    const target = resolveTarget(this, args.target);
    const kinds = Object.entries(this.guideConfigs.legend ?? {})
      .filter(([, config]) => config?.target === target)
      .map(([kind]) => kind);
    const semanticKinds = new Set(kinds.map(kind => SEMANTIC_KIND[kind]));
    let next = this;
    for (const kind of semanticKinds) {
      if (next.semanticSpec.guides.legend?.[kind] !== undefined) {
        next = next.editSemantic({
          property: `guide.legend.${kind}`,
          remove: true
        });
      }
    }
    for (const id of new Set(kinds.flatMap(legendGraphicIds))) {
      if (next.graphicSpec.objects[id] !== undefined) {
        next = next.editGraphics({ target: id, remove: true });
      }
    }
    for (const kind of kinds) {
      next = next._withoutMaterializationConfig(["guides", "legend", kind]);
    }
    return next;
  }
);
