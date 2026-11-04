import {freezeOwned, isOwned} from "../core/immutable.js";
import {canvasSceneSnapshot} from "../sceneSnapshot.js";
import {validateGraphicIdentity} from "../grammar/schemas/graphicIdentity.js";
import {matchItemIdentities} from "../grammar/animation/matching.js";

import { animationSceneLength, animationSceneRows } from "../core/sceneRows.js";

const endpoints = new WeakSet();
// Exact immutable identity vectors own at most one matching/source projection.
// Values contain no scene, frame, program or native authority.
const sampledMappings = new WeakMap();
const batchMappings = new WeakMap();

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
  const identities = snapshot.sources.map(source => source.rowIndex === undefined ? identitiesById.get(source.graphicId) : undefined);
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
export function projectSampledAnimationEndpoint(frame, identities, backgrounds, batchToken) {
  if(batchToken!==undefined)return projectBatchEndpoint(frame,identities,backgrounds,batchToken);
  if(!isOwned(frame.graphicSpec)||!isOwned(frame.scene)||!isOwned(identities)||!isOwned(backgrounds)||identities.length!==animationSceneLength(frame.scene))
    throw new TypeError("Sampled animation endpoint requires owned scene and identity mappings.");
  const prepared=sampledMappings.get(identities);
  const matching=prepared?.matching??freezeOwned(identities.map(identity=>{
    if(identity===undefined)return undefined;
    validateGraphicIdentity(identity);return freezeOwned({key:identity.key,role:identity.role});
  }));
  if(prepared===undefined)matchItemIdentities(matching,[]);
  const nodes=frame.scene.version===3?[...animationSceneRows(frame.scene)]:frame.scene.nodes;
  let sameSources=prepared!==undefined&&prepared.sources.length===nodes.length;
  for(let index=0;sameSources&&index<nodes.length;index++){
    sameSources=(index in nodes)===(index in prepared.sources)&&
      (!(index in nodes)||(frame.scene.version===3?nodes[index].node.key:nodes[index].key)===prepared.sources[index].nodeKey&&
      (frame.scene.version!==3||prepared.sources[index].graphicId===`animation/node/${nodes[index].entryIndex}`&&prepared.sources[index].rowIndex===nodes[index].rowIndex));
  }
  const sources=sameSources?prepared.sources:freezeOwned(nodes.map((node,index)=>freezeOwned(frame.scene.version===3?{nodeKey:node.node.key,graphicId:`animation/node/${node.entryIndex}`,...(node.rowIndex===undefined?{}:{rowIndex:node.rowIndex})}:{nodeKey:node.key,graphicId:`animation/node/${index}`})));
  const endpoint=freezeOwned({format:"sampled",graphicSpec:frame.graphicSpec,scene:frame.scene,identities,backgrounds,
    sources,canvases:freezeOwned([]),matching});
  sampledMappings.set(identities,{matching,sources});
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

// Preparation records correspondence only; current keys and numeric geometry
// remain checked while sampling. Tokens never carry a program or native origin.
export function prepareBatchEndpointMapping(endpoint, entries) {
  if(!endpoints.has(endpoint)||!isOwned(entries))throw new TypeError("Batched correspondence requires its exact prepared endpoint.");
  const sources=[];let index=0;
  for(let entryIndex=0;entryIndex<entries.length;entryIndex++){
    const keys=entries[entryIndex].keys;
    for(let row=0;row<keys.length;row++){
      if(keys[row]!==endpoint.scene.nodes[index]?.key)throw new TypeError("Batched correspondence differs from endpoint order.");
      sources.push(freezeOwned({nodeKey:keys[row],graphicId:`animation/node/${entryIndex}`,...(entries[entryIndex].kind==='single'?{}:{rowIndex:row})}));index++;
    }
  }
  if(index!==endpoint.identities.length)throw new TypeError("Batched correspondence must cover every logical row.");
  const token=Object.freeze({});batchMappings.set(token,{identities:endpoint.identities,matching:endpoint.matching,sources:freezeOwned(sources)});return token;
}
function projectBatchEndpoint(frame,identities,backgrounds,token){
  const mapping=batchMappings.get(token);
  if(mapping===undefined||!isOwned(frame.graphicSpec)||!isOwned(frame.scene)||!isOwned(backgrounds)||frame.scene.version!==3||identities!==mapping.identities)throw new TypeError("Batched endpoint requires exact prepared correspondence.");
  let index=0;
  for(let entryIndex=0;entryIndex<frame.scene.entries.length;entryIndex++){
    const entry=frame.scene.entries[entryIndex],keys=entry.kind==='single'?[entry.node.key]:entry.keys;
    for(let row=0;row<keys.length;row++){
      const source=mapping.sources[index++];
      if(source===undefined||source.nodeKey!==keys[row]||source.graphicId!==`animation/node/${entryIndex}`||source.rowIndex!==(entry.kind==='single'?undefined:row))throw new TypeError("Batched current row differs from its prepared correspondence.");
    }
  }
  if(index!==identities.length)throw new TypeError("Batched current rows must cover their exact identities.");
  const endpoint=freezeOwned({format:'sampled',graphicSpec:frame.graphicSpec,scene:frame.scene,identities,backgrounds,sources:mapping.sources,canvases:freezeOwned([]),matching:mapping.matching});endpoints.add(endpoint);return endpoint;
}
