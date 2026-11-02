import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const source=new URL('../../../../../src/',import.meta.url).href;
const replace=(text,old,value)=>{assert.ok(text.includes(old),'Missing candidate seam: '+old);return text.replace(old,value);};
export function transform(file,content,variant){
 if(file==='animation/sample.js'&&(variant==='decisions'||variant==='both')){
  return replace(content,'  const geos=geoFrame.finish();','  // Evidence-only: every current producer creates a new closed primitive decision\n  // or returns an already-owned geographic decision. Preserve child ownership.\n  for (const decision of decisions) freezeOwned(decision);\n  freezeOwned(decisions);\n  const geos=geoFrame.finish();');
 }
 if(file==='renderers/canvasScene.js'&&(variant==='wrappers'||variant==='both')){
  content=replace(content,'import { isOwned, cloneAndFreeze }','import { isOwned, cloneAndFreeze, freezeOwned }');
  return replace(content,`    objects[id] = { type: node.type, properties: position(node.properties,
      node.offset[0] - origin[0], node.offset[1] - origin[1]) };`,`    const object = { type: node.type, properties: position(node.properties,
      node.offset[0] - origin[0], node.offset[1] - origin[1]) };
    objects[id] = isOwned(object.properties) ? freezeOwned(object) : object;`);
 }
 return content;
}
registerHooks({load(url,context,next){const result=next(url,context);if(!url.startsWith(source))return result;const file=url.slice(source.length);let content=String(result.source);
 if(process.env.FRAME_CANDIDATE==='1')content=transform(file,content,process.env.FRAME_VARIANT??'both');
 if(file==='core/immutable.js'){
 content=replace(content,'const clone = array ? new Array(input.length) : {};','const clone = array ? new Array(input.length) : {};if(globalThis.__counts)globalThis.__counts.clones++;');
 content=replace(content,'ownedValues.add(value);','ownedValues.add(value);if(globalThis.__counts)globalThis.__counts.ownedAdds++;');}
 if(file==='animation/resources.js')content=replace(content,'export function validateAnimationResourceWork(value,label,scope) {','export function validateAnimationResourceWork(value,label,scope) {if(globalThis.__work)globalThis.__work[label]=Math.max(globalThis.__work[label]??0,value);');
 return{...result,source:content};}});
