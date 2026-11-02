import {registerHooks} from 'node:module';
globalThis.projectionOwnershipAdds=0;
registerHooks({load(url,context,next){const r=next(url,context);if(url.includes('?baseline'))return r;
 if(url.endsWith('/src/core/immutable.js'))return{...r,source:String(r.source).replace('ownedValues.add(value);','globalThis.projectionOwnershipAdds++; ownedValues.add(value);')};
 if(url.endsWith('/src/grammar/geo/projections.js')){
  let source=String(r.source),a=source.indexOf('export function createProjectionKernel('),b=source.indexOf('// Raw mathematics');
  const calculation=source.slice(a,b).replace('createProjectionKernel','createProjectionCalculation').replaceAll('return result(', 'return intermediate(');
  source=source.slice(0,a)+"function intermediate(point,reason=null,component=null){return {point,reason,component};}\n"+calculation+`export function createProjectionKernel(input){const kernel=createProjectionCalculation(input);return Object.freeze({...kernel,forward(value){return cloneAndFreeze(kernel.forward(value));},inverse(value,settings){return cloneAndFreeze(kernel.inverse(value,settings));}});}\n`+source.slice(b);
  return{...r,source};
 }
 if(url.endsWith('/src/grammar/geo/stream.js'))return{...r,source:String(r.source).replaceAll('createProjectionKernel','createProjectionCalculation')};
 return r;
}});
