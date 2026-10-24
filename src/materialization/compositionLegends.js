import { legendBlockChannels } from "../grammar/legendBlocks.js";
import { allLegendGraphicIds } from "./guides/resources.js";
import { unionConcreteGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { namespaceGraphicId } from "./compositionSnapshot.js";

// Shared scale compatibility is validated before this plan is built. Canonical
// child guides remain intact; only the composed graphic snapshots are collected.
export function sharedCompositionColorLegend(program, children) {
  if (!program.compositionSpec.share?.color) return undefined;
  const candidates = [], remove = [];
  const qualified = (id, namespaces) => namespaces.reduceRight((value, namespace) => namespaceGraphicId(namespace, value), id);
  const visit = (child, namespaces) => {
    if (child.compositionSpec && !child.compositionSpec.facet) {
      const sharedId = `${child.compositionSpec.id}-shared-color-legend`;
      if (child.graphicSpec.objects[sharedId]) remove.push(qualified(sharedId, namespaces));
      for (const id of child.compositionSpec.children) visit(child.children[id], [...namespaces, `${child.compositionSpec.id}-${id}`]);
      return;
    }
    for (const [kind, config] of Object.entries(child.guideConfigs.legend ?? {})) {
      const channels = legendBlockChannels(kind, config);
      // A combined legend also explains unshared shape/size/etc. Keep it local.
      if (channels.length !== 1 || channels[0] !== 'color') continue;
      const roots = allLegendGraphicIds([kind]).filter(id => child.graphicSpec.objects[id]);
      const bounds = unionConcreteGraphicBounds(child.graphicSpec, roots, child.materializationConfigs.textMetrics);
      if (!bounds) continue;
      candidates.push({ source: child, roots, bounds });
      remove.push(...roots.map(id => qualified(id, namespaces)));
    }
  };
  for (const id of program.compositionSpec.children) visit(children[id], [`${program.compositionSpec.id}-${id}`]);
  if (!candidates.length) return undefined;
  return { ...candidates[0], remove };
}
