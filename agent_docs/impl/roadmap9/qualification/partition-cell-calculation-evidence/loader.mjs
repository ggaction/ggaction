import {registerHooks} from 'node:module';
import {candidate,paths} from './candidate.mjs';
globalThis.partitionAudit={active:false,owned:0,ownData:0,math:0,inverseIterations:0,work:[]};
registerHooks({load(url,context,next){const result=next(url,context);if(!url.includes('/src/'))return result;let source=String(result.source);const path=paths.find(path=>url.endsWith('/'+path));if(process.env.PARTITION_PROOF_MODE==='candidate'&&path)source=candidate(path,source);
 if(url.endsWith('/src/core/immutable.js'))source=source.replace('ownedValues.add(value);','if(globalThis.partitionAudit.active)globalThis.partitionAudit.owned++;ownedValues.add(value);');
 if(url.endsWith('/src/core/ownData.js'))source=source.replace('export function ownDataProperties(value, label) {','export function ownDataProperties(value, label) {if(globalThis.partitionAudit.active)globalThis.partitionAudit.ownData++;');
 if(url.endsWith('/src/grammar/hierarchy/partitionBend.js'))source=source.replace('const{u,v,bend:b}=point','if(globalThis.partitionAudit.active)globalThis.partitionAudit.math++;const{u,v,bend:b}=point').replace('for(let count=0;count<64;count++){','for(let count=0;count<64;count++){if(globalThis.partitionAudit.active)globalThis.partitionAudit.inverseIterations++;');
 if(url.endsWith('/src/core/validation.js'))for(const name of['validateWorkLimit','validateGeneratedItemLimit'])source=source.replace(new RegExp(`export function ${name}\\(([^)]*)\\) \\{`),(match,args)=>match+`if(globalThis.partitionAudit.active)globalThis.partitionAudit.work.push([${JSON.stringify(name)},${args.split(',').map(s=>s.trim().split('=')[0].trim()).join(',')}]);`);
 return{...result,source};}});
