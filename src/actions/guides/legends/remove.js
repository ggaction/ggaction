import { action } from "../../../core/action.js";
import { validateKeys } from "../../../core/validation.js";
import { legendGraphicIds, legendResourcePolicy } from
  "../../../materialization/guides/resources.js";
import { resolveLegendTarget } from "./target.js";

const OPTIONS = Object.freeze(["target"]);

export function removeLegendKinds(program, kinds) {
  const semanticKinds = new Set(
    kinds.map(kind => legendResourcePolicy(kind).semanticKind)
  );
  let next = program;
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

export const removeLegend = action(
  { op: "removeLegend", description: "Remove every legend block owned by one mark." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "removeLegend");
    const target = resolveLegendTarget(this, args.target, "removeLegend");
    const kinds = Object.entries(this.guideConfigs.legend ?? {})
      .filter(([, config]) => config?.target === target)
      .map(([kind]) => kind);
    return removeLegendKinds(this, kinds);
  }
);
