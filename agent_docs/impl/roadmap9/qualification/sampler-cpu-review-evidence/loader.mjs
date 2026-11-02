import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const source=new URL('../../../../../src/',import.meta.url).href;
const replace=(text,old,value)=>{assert.ok(text.includes(old),'Missing candidate seam: '+old);return text.replace(old,value);};
export function transform(file,content){
 if(file!=='renderers/canvasScene.js')return content;
 content=replace(content,"  const keys = new Set();","  const pending = [['canvas',objects.canvas]];\n  const keys = new Set();");
 content=replace(content,'      parent.children.push(id); groups.push(nested);','      pending.push([id,nested]);\n      parent.children.push(id); groups.push(nested);');
 content=replace(content,'    objects[id] = isOwned(object.properties) ? freezeOwned(object) : object;',"    if(isOwned(object.properties))objects[id]=freezeOwned(object);\n    else {objects[id]=object;pending.push([id,object]);}");
 return replace(content,"  return { graphicSpec: { objects, order: ['canvas'] } };",`  for(const [id,object] of pending){
    if(Object.hasOwn(object,'children'))freezeOwned(object.children);
    objects[id]=cloneAndFreeze(object,undefined,'state.graphicSpec.objects.'+id);
  }
  return freezeOwned({graphicSpec:freezeOwned({objects:freezeOwned(objects),order:freezeOwned(['canvas'])})});`);
}
const freeze=Object.freeze;
Object.freeze=function(value){if(globalThis.__counts){globalThis.__counts.freezeCalls=(globalThis.__counts.freezeCalls??0)+1;const stack=new Error().stack.split('\n').find(line=>line.includes('/src/')&&!line.includes('/core/immutable.js'));const owner=(stack??'other').replace(/:\d+:\d+\)?$/,'');const counts=globalThis.__counts.freezeSources??={};counts[owner]=(counts[owner]??0)+1;}return Reflect.apply(freeze,Object,[value]);};
registerHooks({load(url,context,next){const result=next(url,context);if(!url.startsWith(source))return result;const file=url.slice(source.length);let content=String(result.source);
 if(process.env.FRAME_CANDIDATE==='1')content=transform(file,content);
 if(file==='core/immutable.js'){
 content=replace(content,'const clone = array ? new Array(input.length) : {};','const clone = array ? new Array(input.length) : {};if(globalThis.__counts){globalThis.__counts.clones++;if(array)globalThis.__counts.cloneArraySlots=(globalThis.__counts.cloneArraySlots??0)+input.length;else globalThis.__counts.cloneRecordKeys=(globalThis.__counts.cloneRecordKeys??0)+Object.keys(input).length;}');
 content=replace(content,'ownedValues.add(value);','ownedValues.add(value);if(globalThis.__counts)globalThis.__counts.ownedAdds++;');}
 if(file==='animation/resources.js')content=replace(content,'export function validateAnimationResourceWork(value,label,scope) {','export function validateAnimationResourceWork(value,label,scope) {if(globalThis.__work)globalThis.__work[label]=Math.max(globalThis.__work[label]??0,value);');
 return{...result,source:content};}});
