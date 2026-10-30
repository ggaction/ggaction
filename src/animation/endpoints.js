import {freezeOwned, isOwned} from "../core/immutable.js";
import {canvasSceneSnapshot} from "../sceneSnapshot.js";
import {validateGraphicIdentity} from "../grammar/schemas/graphicIdentity.js";
import {matchItemIdentities} from "../grammar/animation/matching.js";

const endpoints = new WeakSet();

// This private boundary accepts already-owned native graphic state. Offline
// input must first pass the graphic codec; a caller's shallow freeze is not
// evidence that nested state belongs to the program.
export function projectAnimationEndpoint(program) {
  const descriptor = program !== null && typeof program === "object"
    ? Object.getOwnPropertyDescriptor(program, "graphicSpec") : undefined;
  if (descriptor === undefined || !Object.hasOwn(descriptor, "value") || !isOwned(descriptor.value)) {
    throw new TypeError("Animation endpoint requires immutable owned graphic state.");
  }
  const graphicSpec = descriptor.value;
  const identitiesById = new Map(), used = new Set();
  const add = (id, object) => {
    if (used.has(id)) throw new TypeError("Animation endpoint contains ambiguous graphic IDs.");
    used.add(id);
    if (object.identity !== undefined) {
      validateGraphicIdentity(object.identity);
      identitiesById.set(id, object.identity);
    }
  };
  for (const [id, object] of Object.entries(graphicSpec.objects)) {
    add(id, object);
    for (const item of object.items ?? []) add(item.id, item);
  }
  // Pass only graphics to the shared snapshot owner. Neither semantic state,
  // authoring configuration nor trace may influence an endpoint projection.
  const snapshot = canvasSceneSnapshot({graphicSpec}, false);
  const identities = snapshot.sources.map(source => identitiesById.get(source.graphicId));
  // Validate ambiguity within one endpoint before a second endpoint is present.
  const matching = identities.map(identity => identity === undefined ? undefined
    : freezeOwned({key: identity.key, role: identity.role}));
  matchItemIdentities(matching, []);
  const endpoint = freezeOwned({format:"native",graphicSpec, scene: snapshot.scene,
    sources: snapshot.sources, canvases: snapshot.canvases, collections: snapshot.collections,
    backgrounds: freezeOwned(snapshot.sources.flatMap((source,index)=>snapshot.canvases.some(canvas=>`${canvas.graphicId}/background`===source.graphicId)
      ? [freezeOwned({index,owner:source.graphicId})] : [])),
    identities: freezeOwned(identities), matching: freezeOwned(matching)});
  endpoints.add(endpoint);
  return endpoint;
}

// Sampled endpoints already have resolved concrete scene coordinates. Keep their
// explicit identities separate from compiler-generated graphic IDs.
export function projectSampledAnimationEndpoint(frame, identities, backgrounds) {
  if(!isOwned(frame.graphicSpec)||!isOwned(frame.scene)||!isOwned(identities)||!isOwned(backgrounds)||identities.length!==frame.scene.nodes.length)
    throw new TypeError("Sampled animation endpoint requires owned scene and identity mappings.");
  const matching=identities.map(identity=>{
    if(identity===undefined)return undefined;
    validateGraphicIdentity(identity);return freezeOwned({key:identity.key,role:identity.role});
  });
  matchItemIdentities(matching,[]);
  const endpoint=freezeOwned({format:"sampled",graphicSpec:frame.graphicSpec,scene:frame.scene,identities,backgrounds,
    sources:freezeOwned(frame.scene.nodes.map((node,index)=>freezeOwned({nodeKey:node.key,graphicId:`animation/node/${index}`}))),
    canvases:freezeOwned([]),matching:freezeOwned(matching)});
  endpoints.add(endpoint);return endpoint;
}

// Scene keys include anonymous serialization fallbacks. Only explicit persisted
// item key and primitive role are evidence for correspondence between states.
export function matchAnimationEndpoints(from, to) {
  if (!endpoints.has(from) || !endpoints.has(to)) {
    throw new TypeError("Animation matching requires authentic projected endpoints.");
  }
  return matchItemIdentities(from.matching, to.matching);
}
