import {registerHooks} from 'node:module';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
globalThis.queryOwnedAdds=0;
registerHooks({load(url,c,next){const r=next(url,c);if(url.includes('?baseline'))return r;if(url.endsWith('/src/core/immutable.js'))return {...r,source:String(r.source).replace('ownedValues.add(value);','globalThis.queryOwnedAdds++;ownedValues.add(value);')};if(url.endsWith('/src/grammar/pathGeometry.js'))return {...r,source:String(r.source).replace('const geometry = flattenPathCommands(commands, options);','const geometry = calculateFlattenedPathCommands(commands, options);').replace('error.diagnostics = geometry.diagnostics;','error.diagnostics = ownFlattenedGeometry(geometry).diagnostics;')};return r;}});
const url=`file://${process.cwd()}/src/grammar/pathGeometry.js`,a=await import(url+'?baseline'),b=await import(url),receipt={kind:'read-only load-hook prototype; no product source change',pairs:0,errors:0,baselineAdds:0,candidateAdds:0};
const commands=[
 [{op:'M',x:-0,y:-0},{op:'L',x:1,y:0},{op:'L',x:0,y:1},{op:'Z'}],
 [{op:'M',x:0,y:0},{op:'C',x1:10,y1:30,x2:-20,y2:10,x:30,y:0},{op:'Z'}],
 [{op:'M',x:1e200,y:-1e200},{op:'L',x:1e200,y:1e200}],
 [{op:'M',x:1e-200,y:0},{op:'L',x:0,y:1e-200},{op:'Z'}]
];
for(const path of commands)for(const point of[{x:-0,y:-0},{x:0,y:0},{x:.25,y:.25},{x:2,y:4},{x:100,y:100}])for(const name of['pathFillContains','pathStrokeDistance']){
 const before=structuredClone(path);let start=globalThis.queryOwnedAdds;const x=a[name](path,point);receipt.baselineAdds+=globalThis.queryOwnedAdds-start;start=globalThis.queryOwnedAdds;const y=b[name](path,point);receipt.candidateAdds+=globalThis.queryOwnedAdds-start;assert.equal(y,x);assert.deepEqual(path,before);receipt.pairs++;
}
for(const options of[{maxDepth:0,tolerance:1e-12},{maxPoints:2,tolerance:1e-12},{maxCommands:1},{tolerance:0},{fillRule:'bad'}])for(const name of['pathFillContains','pathStrokeDistance']){
 let x,y;try{a[name](commands[1],{x:0,y:0},options);}catch(e){x=e;}try{b[name](commands[1],{x:0,y:0},options);}catch(e){y=e;}assert.equal(y?.name,x?.name);assert.equal(y?.message,x?.message);assert.deepEqual(y?.diagnostics,x?.diagnostics);if(y?.diagnostics){assert.ok(Object.isFrozen(y.diagnostics));for(const d of y.diagnostics)assert.ok(Object.isFrozen(d));}receipt.errors++;
}
writeFileSync('.artifacts/geo-hit-a3/raw-path-query/proof.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
