import {readFile} from 'node:fs/promises';
export async function load(url,context,next){
 if(url.endsWith('/src/core/immutable.js')){let source=await readFile(new URL(url),'utf8');source=source.replace('ownedValues.add(value);','ownedValues.add(value);globalThis.__ownedCount=(globalThis.__ownedCount??0)+1;');return{format:'module',shortCircuit:true,source};}
 if(process.env.PROTOTYPE==='yes'&&url.endsWith('/src/grammar/animation/pointState.js')){let source=await readFile(new URL(url),'utf8');source=source.replace('import { preparePositionInterpolation }','import { normalizePositionEndpoint }');source=source.replace('for (const channel of ["x", "y"]) preparePositionInterpolation(position[channel], position[channel]);','for (const channel of ["x", "y"]) { normalizePositionEndpoint(position[channel]); normalizePositionEndpoint(position[channel]); }');return{format:'module',shortCircuit:true,source};}
 return next(url,context);
}
