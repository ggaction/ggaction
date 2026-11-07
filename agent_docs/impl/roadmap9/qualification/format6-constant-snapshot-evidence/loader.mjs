import {readFile} from 'node:fs/promises';
export function transform(url, source) {
  const replace = (old, next) => { if (!source.includes(old)) throw Error('Review source anchor missing: '+old); source=source.replace(old,next); };
  if(url.endsWith('/src/animation/columnCodec.js')) {
    replace('cloneAndFreeze, isPlainObject, isOwned', 'cloneAndFreeze, freezeOwned, isPlainObject, isOwned');
    replace('function validateColumns(input, scope, version) {', `// Format6 snapshots each already-validated compound constant once. The
// snapshot copier intentionally ignores shallow ownership on caller values.
function snapshotValidatedConstant(value) {
  if (scalar(value)) return value;
  const result = Array.isArray(value) ? new Array(value.length) : {};
  for (const key of Object.keys(value)) define(result, key, snapshotValidatedConstant(value[key]));
  return freezeOwned(result);
}
function ownedConstantColumn(snapshot, logicalSum) { return { at: () => snapshot.value, logicalSum }; }
export function validateAnimationColumnsV2WithOwnedConstants(input, scope) { return validateColumns(input, scope, 2, true); }
function validateColumns(input, scope, version, ownConstants = false) {
  const constantSnapshots = new Map();`);
    replace('if(tag==="constant"){const size=version===1?treeSize(value.constant):treeSize(value.constant,new Set(),0,scope);validateAnimationColumnCount(size*length,"expandedValues",scope);return {at:()=>value.constant,logicalSum:size*length};}', `if(tag==="constant"){
      const size=version===1?treeSize(value.constant):treeSize(value.constant,new Set(),0,scope);
      validateAnimationColumnCount(size*length,"expandedValues",scope);
      if(ownConstants&&!scalar(value.constant)){
        let snapshot=constantSnapshots.get(value.constant);
        if(snapshot===undefined){snapshot={input:value.constant};constantSnapshots.set(value.constant,snapshot);}
        return ownedConstantColumn(snapshot,size*length);
      }
      return {at:()=>value.constant,logicalSum:size*length};
    }`);
    replace('const root=node(input.root);\n  return {logicalValues:', `const root=node(input.root);
  // Complete physical, descriptor, expanded-value and cell validation precedes
  // every new owned snapshot. Returned closures retain no mutable constants.
  for(const snapshot of constantSnapshots.values()){
    snapshot.value=snapshotValidatedConstant(snapshot.input);delete snapshot.input;Object.freeze(snapshot);
  }
  constantSnapshots.clear();
  return {logicalValues:`);
  } else if(url.endsWith('/src/animation/planner.js')) {
    replace('restoreAnimationColumnsV2, validateAnimationColumnsV2 }', 'restoreAnimationColumnsV2, validateAnimationColumnsV2WithOwnedConstants }');
    replace('?validateAnimationColumnsV2(compact,resources):undefined', '?validateAnimationColumnsV2WithOwnedConstants(compact,resources):undefined');
  }
  return source;
}
export async function load(url, context, next) {
  if(url.endsWith('/src/animation/columnCodec.js')||url.endsWith('/src/animation/planner.js'))return{format:'module',shortCircuit:true,source:transform(url,await readFile(new URL(url),'utf8'))};
  return next(url,context);
}
