import { prepareSharedFacetLegend } from "./preparation.js";
import { facetLegendIntent, intrinsicFacetLegendSource, restoreFacetLegendIntent,
  prepareAuthoredFacetLegend } from "./owner.js";

export function editFacetParentLegend(program, operation, args) {
  if (program.compositionSpec?.type !== "facet") {
    throw new Error(`${operation} supports only a unit chart or a facet parent shared legend.`);
  }
  const current = program.compositionSpec.facet.guides.legend;
  if (current === false) throw new Error(`${operation} requires an existing facet parent legend.`);
  const prepared = current === "shared" ? prepareSharedFacetLegend(program) : prepareAuthoredFacetLegend(program);
  let source;
  if (prepared.source !== undefined) {
    source = restoreFacetLegendIntent(intrinsicFacetLegendSource(program), facetLegendIntent(prepared.source));
  } else {
    const entries = prepared.compatibility.entries;
    if (entries.length !== 1) throw new Error("Facet parent inferred legend requires an unambiguous native owner.");
    const config = entries[0].config;
    source = intrinsicFacetLegendSource(program).createLegend({ target: config.target, channels: ["color"],
      itemGap: 26, titleStyle: { fontSize: 12, fontWeight: 700 },
      ...(prepared.legend.mark === "point" ? { symbol: { layers: [{ type: "point", size: 5.5, stroke: "#ffffff", strokeWidth: 0.35 }] } } : {}) });
  }
  source = source[operation](args);
  const intent = Object.keys(source.guideConfigs.legend ?? {}).length === 0 ? false : facetLegendIntent(source);
  const spec = program.compositionSpec;
  return program._clone({ trace: source.trace, actionStack: source.actionStack, actionSequence: source._actionSequence })
    ._withCompositionState({ children: program.children,
      compositionSpec: { ...spec, facet: { ...spec.facet, guides: { ...spec.facet.guides, legend: intent } } } })
    .materializeComposition();
}
