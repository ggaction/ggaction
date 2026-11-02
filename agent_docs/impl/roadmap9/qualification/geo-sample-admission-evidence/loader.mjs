import {registerHooks} from 'node:module';
import {candidate,paths} from './candidate.mjs';
const mode=process.env.GEO_C1_MODE;
globalThis.geoC1={active:false,events:[],admissionDepth:0,counts:{presentation:0,group:0,stream:0}};
registerHooks({load(url,context,next){const result=next(url,context);if(!url.includes('/src/'))return result;let source=String(result.source);const path=paths.find(path=>url.endsWith('/'+path));if(mode==='candidate'&&path)source=candidate(path,source);
 function admission(name,args,exported,key){source=source.replace(`${exported?'export ':''}function ${name}(${args}) {`,`function ${name}ProofImpl(${args}) {`)+`\n${exported?'export ':''}function ${name}(${args}){const a=globalThis.geoC1;if(a.active)a.counts.${key}++;a.admissionDepth++;try{return ${name}ProofImpl(${args});}finally{a.admissionDepth--;}}\n`;}
 if(url.endsWith('/src/materialization/animation/geoPresentation.js'))admission(mode==='candidate'?'admitGeoAnimationPresentation':'normalizeGeoAnimationPresentation',mode==='candidate'?'input, prepareGeometry':'input',mode!=='candidate','presentation');
 if(url.endsWith('/src/grammar/animation/geoState.js'))admission('normalizeAnimationGeoGroup','input',true,'group');
 if(url.endsWith('/src/grammar/geo/stream.js'))source=source.replace('export function projectGeometry(geometry, projectionInput, input = {}) {','function projectGeometryProofImpl(geometry, projectionInput, input = {}) {if(globalThis.geoC1.active)globalThis.geoC1.counts.stream++;')+
 '\nexport function projectGeometry(geometry,projectionInput,input={}){const value=projectGeometryProofImpl(geometry,projectionInput,input),override=globalThis.geoC1Override;return override===undefined?value:{...value,diagnostics:{...value.diagnostics,...override}};}\n';
 if(url.endsWith('/src/core/validation.js'))for(const name of ['validateWorkLimit','validateGeneratedItemLimit'])source=source.replace(new RegExp(`export function ${name}\\(([^)]*)\\) \\{`),(match,args)=>match+`if(globalThis.geoC1.active)globalThis.geoC1.events.push([globalThis.geoC1.admissionDepth,${JSON.stringify(name)},${args.split(',').map(s=>s.trim().split('=')[0].trim()).join(',')}]);`);
 return{...result,source};}});
