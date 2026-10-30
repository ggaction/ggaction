import { prepareAnimationAppearance } from "./appearance.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray } from "../core/ownData.js";
import { validateWorkLimit } from "../core/validation.js";
import { guideAnimationKey, normalizeGuideAnimationState, guideAnimationMatchesNode, prepareGuideInterpolation } from "../grammar/animation/guideState.js";
import { sameConcreteValue, clipInterpolationCompatible } from "./concrete.js";

export const emptyAnimationGuides = endpoint => Object.freeze(endpoint.scene.nodes.map(() => null));
export const hasAnimationGuides = states => states.some(state => state !== null);
export function validateAnimationGuides(states, endpoint) {
  ownArray(states, "Animation guide states");
  if (states.length !== endpoint.scene.nodes.length) throw new TypeError("Guide states must follow exact endpoint node order.");
  return cloneAndFreeze(states.map((input, index) => {
    if (input === null) return null;
    const state = normalizeGuideAnimationState(input);
    if (endpoint.identities[index] !== undefined || endpoint.backgrounds?.some(entry => entry.index === index)) throw new TypeError("A guide cannot replace native mark identity.");
    if (state.reason === undefined && !guideAnimationMatchesNode(state, endpoint.scene.nodes[index])) {
      throw new TypeError("Guide animation meaning differs from its concrete endpoint.");
    }
    return state;
  }));
}
function indexStates(states) {
  const index = new Map();
  let work = 0;
  states.forEach((state, position) => {
    if (state === null) return;
    const key = guideAnimationKey(state.identity);
    validateWorkLimit(work += 1 + key.length, "Animation guide correspondence work");
    const previous = index.get(key);
    // Duplicated raw values have no unique correspondence. Retain their native
    // nodes as separate enters/exits instead of silently choosing either one.
    if (previous === undefined) index.set(key, [position]);
    else previous.push(position);
  });
  return index;
}
function prepareTrack(match, from, to, a, b) {
  const source = from.scene.nodes[match.sourceIndex], target = to.scene.nodes[match.targetIndex];
  const fade = reason => ({ ...match, kind: "crossfade", reason });
  if (a.reason !== undefined || b.reason !== undefined) return fade(a.reason ?? b.reason);
  if (source.type !== target.type) return fade("primitive-kind");
  if (source.topology !== target.topology) return fade("topology");
  if (sameConcreteValue(source, target) && sameConcreteValue(a, b)) return { ...match, kind: "exact" };
  if (!clipInterpolationCompatible(source, target)) return fade("clip-topology");
  const appearance = properties => Object.fromEntries(Object.entries(properties).filter(([key]) =>
    !["x", "y", "x1", "x2", "y1", "y2", "commands", "textAlign", "textBaseline"].includes(key)));
  const style = prepareAnimationAppearance(appearance(source.properties), appearance(target.properties));
  if (style.kind === "crossfade") return fade(style.reason);
  const guide = prepareGuideInterpolation(a, b);
  return guide.kind === "crossfade" ? fade(guide.reason) : { ...match, kind: "semantic-guide", guide, appearance: style };
}
export function prepareGuideTracks(from, to) {
  const a = from.guides ?? emptyAnimationGuides(from), b = to.guides ?? emptyAnimationGuides(to);
  const sources = indexStates(a), targets = indexStates(b), tracks = [], ambiguous = { source: [], target: [] };
  for (const [guideKey, indices] of sources) {
    const matches = targets.get(guideKey);
    if (indices.length !== 1 || matches !== undefined && matches.length !== 1) {
      ambiguous.source.push(...indices);
      if (matches !== undefined) ambiguous.target.push(...matches);
      continue;
    }
    if (matches === undefined) continue;
    const sourceIndex = indices[0], targetIndex = matches[0];
    tracks.push(prepareTrack({ guideKey, role: `guide-${a[sourceIndex].identity.component}`, sourceIndex, targetIndex }, from, to, a[sourceIndex], b[targetIndex]));
  }
  for (const [key, indices] of targets) if (!sources.has(key) && indices.length !== 1) ambiguous.target.push(...indices);
  return cloneAndFreeze({ tracks, ambiguous });
}
