const owners=new Map([
 ['src/grammar/geo/input.js',['snapshotGeometryJSON']],
 ['src/grammar/geo/stream.js',['projectGeometry']],
 ['src/grammar/animation/geoState.js',['normalizeAnimationGeoGroup','resolveAnimationGeoGeometry','sampleGeoInterpolation']],
 ['src/materialization/animation/geoPresentation.js',['normalizeGeoAnimationPresentation','resolveGeoAnimationPresentation']],
 ['src/core/immutable.js',['cloneAndFreeze']]
]);
export async function load(url,context,nextLoad){const result=await nextLoad(url,context);let source=result.source;
 for(const [suffix,names] of owners){if(!url.endsWith('/'+suffix))continue; source=String(source);
  for(const name of names){const pattern=new RegExp(`(export function ${name}\\([^\n]*\\)\\s*\\{)`);if(!pattern.test(source))throw new Error('Missing diagnostic owner '+name);
   source=source.replace(pattern,`$1 if(globalThis.__geoCapacityCalls)globalThis.__geoCapacityCalls['${name}']=(globalThis.__geoCapacityCalls['${name}']??0)+1;`);
  }
 }
 return source===result.source?result:{...result,source};
}
