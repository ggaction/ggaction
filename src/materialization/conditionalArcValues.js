import { canonicalJSON } from "../core/contentDigest.js";
import { positionBindings } from "../core/encodingBindings.js";
import { deriveArcSectorsFromValues } from "../grammar/arcs.js";
import { conditionalArcStructure } from "./conditionalArcStructure.js";
import { mapConditionalValues } from "./conditionalMapping.js";
import { conditionalSelectionMembership } from "./conditionalSelection.js";
import { identifyItems, uniqueFields } from "./selection/items/common.js";
import { memberRowReferences } from "./selection/rows.js";

export function conditionalArcValues(program, layer, dataset, resolvers, options = {}) {
  const structure = conditionalArcStructure(program, layer, dataset);
  const items = identifyItems(program, layer, "sector", structure.derived.values.map(value => {
    const members = value.sourceIndices.map(index => dataset.values[index]), memberKeys = value.sourceIndices.map(index => dataset.rowKeys[index]);
    return { fields: uniqueFields(members), members, memberKeys, rows: memberRowReferences(program, members, layer.data, memberKeys) };
  }));
  const selected = {};
  for (const channel of ["theta", "radius"]) {
    const bindings = positionBindings(layer, channel);
    if (!bindings.length) continue;
    const definition = layer.conditionals?.[channel];
    const raw = value => channel === "theta" && structure.derived.proportional ? value.aggregateValue : value[channel];
    if (definition === undefined) selected[channel] = structure.derived.values.map(value => ({ value: raw(value), binding: bindings[0] }));
    else {
      const membership = conditionalSelectionMembership(program, layer, definition, items, resolvers, { rowMembership: true });
      // Grouped categorical theta maps its category label; its native count/sum
      // weight belongs to the same selected branch and is applied before layout.
      const branchValues = structure.branches[channel].map(branch => branch.values.map(value => channel === "theta" ? value.theta : value.radius));
      selected[channel] = mapConditionalValues(program, layer, channel, items, membership, { mapped: false, includeBinding: true, branchValues });
    }
  }
  const values = structure.derived.values.map((value, index) => {
    const theta = selected.theta[index], radius = selected.radius?.[index];
    const branchIndex = positionBindings(layer, "theta").indexOf(theta.binding);
    const chosenTheta = structure.branches.theta?.[branchIndex]?.values[index] ?? value;
    return { ...value, theta: chosenTheta.theta,
      ...(structure.derived.proportional ? { aggregateValue: chosenTheta.aggregateValue } : {}),
      ...(radius === undefined ? {} : { radius: radius.value }) };
  });
  if (structure.template.encoding.theta.aggregate !== undefined || structure.derived.measured) {
    const categories = new Set();
    for (const value of values) {
      const category = canonicalJSON(value.theta);
      if (categories.has(category)) throw new Error("Conditional arc theta merges distinct grouped items.");
      categories.add(category);
    }
  }
  if (options.project === false) return { ...structure, values };
  const positionScales = values.map((_, index) => ({ theta: program.resolvedScales[selected.theta[index].binding.scale],
    radius: selected.radius === undefined ? undefined : program.resolvedScales[selected.radius[index].binding.scale] }));
  const derived = deriveArcSectorsFromValues(values, structure.template, { ...options,
    thetaScale: program.resolvedScales[structure.template.encoding.theta.scale],
    radiusScale: program.resolvedScales[structure.template.encoding.radius?.scale], positionScales,
    measured: structure.derived.measured, proportional: structure.derived.proportional });
  return { ...structure, ...derived };
}
