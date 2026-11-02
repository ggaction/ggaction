import { registerHooks } from 'node:module';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
globalThis.snapshotOwnedAdds = 0;
registerHooks({ load(url, context, next) {
  const r = next(url, context); let source = String(r.source);
  if (url.endsWith('/src/core/immutable.js')) source = source.replace('ownedValues.add(value);', 'globalThis.snapshotOwnedAdds++;ownedValues.add(value);');
  if (url.endsWith('/src/grammar/geo/input.js')) source = source
    .replace('import { cloneAndFreeze }', 'import { cloneAndFreeze, isOwned }')
    .replace('const ancestors = new WeakSet(), stack = [];', 'const ancestors = new WeakSet(), stack = [];\n  let reusable = isOwned(input);\n  const seen = reusable ? new WeakSet() : undefined;')
    .replace('budget.charge(keys.length); ancestors.add(value);', 'budget.charge(keys.length); ancestors.add(value);\n    if (reusable) {\n      if (!isOwned(value) || !array && Object.getPrototypeOf(value) !== Object.prototype || seen.has(value)) reusable = false;\n      else seen.add(value);\n    }')
    .replace('return cloneAndFreeze(output);', 'return reusable ? input : cloneAndFreeze(output);');
  if (url.endsWith('/src/grammar/animation/geoState.js?baseline')) source = source.replace('"../geo/input.js"', '"../geo/input.js?baseline"');
  return { ...r, source };
}});
const base = new URL('../../../src/', import.meta.url);
const a = await import(new URL('grammar/geo/input.js?baseline', base)), b = await import(new URL('grammar/geo/input.js', base));
const {cloneAndFreeze, freezeOwned, isOwned} = await import(new URL('core/immutable.js', base));
const receipt = { kind:'read-only loader prototype; unchanged product', pairs:0, errors:0, baselineAdds:0, candidateAdds:0, reused:0, cases:[] };
function compare(label, input, limits = {}, expectedReuse = false, maxWork = Infinity) {
  const budgets=[a.createGeometryBudget(limits),b.createGeometryBudget(limits)].map(budget=>({...budget,charge(amount=1){budget.charge(amount);if(budget.diagnostics().work>maxWork)throw new RangeError('Prototype exact work boundary.');}})), values=[],errors=[];
  for (const [i,m] of [a,b].entries()) {
    const start=globalThis.snapshotOwnedAdds;
    try { values[i]=m.snapshotGeometryJSON(input,budgets[i]); } catch(e) {errors[i]=e;}
    receipt[i ? 'candidateAdds':'baselineAdds']+=globalThis.snapshotOwnedAdds-start;
  }
  assert.deepEqual(budgets[1].diagnostics(),budgets[0].diagnostics(),label+' charges');
  assert.equal(errors[1]?.name,errors[0]?.name,label); assert.equal(errors[1]?.message,errors[0]?.message,label);
  if(errors[0])receipt.errors++;
  else {assert.deepEqual(values[1],values[0],label); if(input!==null&&typeof input==='object'){assert.equal(values[1]===input,expectedReuse,label);assert.ok(isOwned(values[1]));}if(expectedReuse)receipt.reused++;}
  receipt.pairs++;receipt.cases.push({label,diagnostics:budgets[0].diagnostics(),error:errors[0]?.message,reused:expectedReuse});return values[1];
}
for(const v of [null,true,0,-0,'',[],{},[1,[2]],{a:{b:[-0,1]},z:'hello'},JSON.parse('{"__proto__":{"safe":1}}')]) {
  compare('mutable '+JSON.stringify(v),v);
  if(v&&typeof v==='object')compare('owned '+JSON.stringify(v),cloneAndFreeze(v),{},true);
}
const child=cloneAndFreeze({a:[1,2]}); const aliases=compare('owned aliases',freezeOwned({x:child,y:child}));assert.notEqual(aliases.x,aliases.y);assert.notEqual(aliases.x.a,aliases.y.a);
const mutableAlias={a:[1]};const copied=compare('mutable aliases',{x:mutableAlias,y:mutableAlias});assert.notEqual(copied.x,copied.y);
const mutable={x:[1]}; const isolated=compare('shallow owned',freezeOwned({mutable}));mutable.x[0]=9;assert.equal(isolated.mutable.x[0],1);
compare('frozen unowned',Object.freeze({x:Object.freeze([1])}));
compare('owned null prototype',freezeOwned(Object.assign(Object.create(null),{x:1})));
compare('nested owned null prototype',freezeOwned({child:freezeOwned(Object.assign(Object.create(null),{x:1}))}));
let reads=0;const getter={};Object.defineProperty(getter,'x',{enumerable:true,get(){reads++;return 1;}});compare('owned accessor',freezeOwned(getter));assert.equal(reads,0);
const cycle={};cycle.x=cycle;compare('owned cycle',freezeOwned(cycle));
compare('owned sparse array',freezeOwned(new Array(2)));
compare('owned extra array',freezeOwned(Object.assign([1],{extra:2})));
compare('owned nonfinite',freezeOwned({x:NaN}));compare('owned undefined',freezeOwned({x:undefined}));
compare('owned symbol',freezeOwned({[Symbol('bad')]:1}));compare('owned nonenumerable',freezeOwned(Object.defineProperty({},'x',{value:1})));
compare('depth bound',cloneAndFreeze({a:{b:1}}),{maxDepth:1});compare('values bound',cloneAndFreeze([1,2]),{maxValues:2});
for(const limit of [0,1,2,3,4,5,6,7])compare('work bound '+limit,cloneAndFreeze({a:[1]}),{},limit>=7,limit);
const line=cloneAndFreeze({type:'LineString',coordinates:Array.from({length:1000},(_,i)=>[-30+60*i/999,i%2?5:-5])});
compare('owned 1000 original coordinates',line,{},true);
const {chart}=await import(new URL('index.js',base)), {projectGeoAnimationGroup}=await import(new URL('materialization/animation/geo.js',base));
const stateA=await import(new URL('grammar/animation/geoState.js?baseline',base)),stateB=await import(new URL('grammar/animation/geoState.js',base));
let p=chart().createCanvas({width:400,height:300,margin:0}).createGeometryData({id:'world',format:'geojson',values:{type:'Feature',id:'line',properties:{id:'line'},geometry:line},coordinateKind:'geographic',featureKey:['properties','id']}).createProjection({id:'projection',type:'equirectangular',scalePx:100,translatePx:[200,150]}).createCoordinate({type:'geo'}).createGeoLineMark({id:'map'});
const group=projectGeoAnimationGroup(p,p.semanticSpec.layers.find(x=>x.id==='map'));
compare('native group',group,{},true);
const malformed=structuredClone(group);malformed.features[0].geometry.coordinates[0][1]=91;
for(const input of [group,JSON.parse(JSON.stringify(group)),cloneAndFreeze(malformed)]) {
 let x,y,ex,ey;try{x=stateA.normalizeAnimationGeoGroup(input);}catch(e){ex=e;}try{y=stateB.normalizeAnimationGeoGroup(input);}catch(e){ey=e;}
 assert.deepEqual(y,x);assert.equal(ey?.name,ex?.name);assert.equal(ey?.message,ex?.message);
}
receipt.semanticPairs=3;writeFileSync(new URL('proof.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
