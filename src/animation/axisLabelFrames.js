import { cloneAndFreeze } from "../core/immutable.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { validateGeneratedItemLimit } from "../core/validation.js";
import { guideAnimationKey } from "../grammar/animation/guideState.js";
import { animationOwnerKey } from "../grammar/animation/ownerKey.js";
import { axisLabelDecision } from "../grammar/animation/axisLabelDecision.js";
import { axisLabelGroupIdentity, axisLabelGroupOrigin, inheritAxisLabelGroupOrigins } from "../materialization/animation/axisLabelGroups.js";

export function axisLabelFrameCollector(samples, target, timeline) {
  const groups = [], items = [], byKey = new Map(), skipFrom = new Set(), skipTo = new Set();
  const targetIndices = new Map();
  target.items.forEach((item, index) => { if (item !== null) targetIndices.set(guideAnimationKey(axisLabelGroupIdentity(target.groups[item.group], item.value, item.line)), index); });
  for (const [index, sample] of samples.entries()) {
    groups.push({ ...sample.group, placement: { ...sample.group.placement, insertion: undefined } });
    byKey.set(sample.group.key, index);
    sample.sourceIndices.forEach(index => skipFrom.add(index)); sample.targetIndices.forEach(index => skipTo.add(index));
  }
  const current = new Map();
  const prepared = samples.map((sample,index) => {
    const group = groups[index];
    const actualStyles = new Map(), rawIndices = new Map(group.layout.values.map((value, index) => [canonicalJSON(value), index]));
    const result = sample.graphics.map(graphic => {
      const identity = graphic.identity, guideKey = guideAnimationKey(identity), rawKey = canonicalJSON(identity.value);
      const node = timeline.node({ key: JSON.stringify(["animation-axis-label", guideKey]), type: "text", topology: "text", properties: graphic.properties, ...graphic.frame }, targetIndices.get(guideKey));
      const style = { ...group.presentation.styles[rawIndices.get(rawKey)] };
      for (const property of ["fill", "stroke", "opacity", "strokeWidth"]) if (Object.hasOwn(node.properties, property)) style[property] = node.properties[property];
      if (actualStyles.has(rawKey) && canonicalJSON(actualStyles.get(rawKey)) !== canonicalJSON(style)) group.reason = "guide-edited";
      actualStyles.set(rawKey, style);
      const origin = axisLabelGroupOrigin(target, sample.targetGroup, identity.value);
      return { node, identity, decision: axisLabelDecision(identity), origin,
        item: { group: index, value: identity.value, line: identity.line } };
    });
    if (group.reason === undefined) group.presentation = { ...group.presentation,
      styles: group.layout.values.map((value, index) => actualStyles.get(canonicalJSON(value)) ?? group.presentation.styles[index]) };
    if (group.reason === undefined) current.set(animationOwnerKey(group.scope.namespaces,group.scope.owner),cloneAndFreeze({
      graphics:result.map(({node,identity})=>({identity,properties:node.properties,frame:{offset:node.offset,clip:node.clip,clips:node.clips}})),
      labelBounds:sample.labelBounds,requiredBounds:sample.requiredBounds,metrics:group.layout.metrics
    }));
    return result;
  });
  function at(slot,size,key,geographicBefore) {
    const index=byKey.get(key),sample=samples[index];
    if(sample===undefined||sample.to.placement.insertion!==slot)return [];
    const group=groups[index];group.placement.insertion=size;group.placement.geographicBefore=geographicBefore;
    const result=prepared[index];validateGeneratedItemLimit(size+result.length,"Animation sampled nodes");return result;
  }
  return { skipFrom, skipTo, samples, slots: samples.map(sample => [sample.to.placement.insertion, sample.group.key, sample.to.placement.ordinal, sample.to.placement.geographicBefore]),
    current:ownerKey=>current.get(ownerKey), at, append: item => items.push(item ?? null), finish() {
      if (groups.some(group => group.placement.insertion === undefined)) throw new TypeError("Axis label groups require actual sampled collection slots.");
      return inheritAxisLabelGroupOrigins(cloneAndFreeze({ groups, items }), target, samples.map(sample => sample.targetGroup));
    } };
}
