import assert from 'node:assert/strict';
import {projectGeometry} from '../../../../../src/grammar/geo/stream.js';
const radians=Math.PI/180,h=5*radians,u=(60/999*radians)/4,t=Math.tan(h/2);
const longitudeBound=Math.atan(t*t*Math.tan(u));
const latitudeBound=Math.atan(t/Math.cos(u))-Math.atan(t);
const pxBound=200*Math.hypot(longitudeBound,latitudeBound);
const midpointFractionBound=Math.hypot(longitudeBound,latitudeBound)/h;
const angularDotLower=Math.cos(h)*Math.cos(2*u);
assert.ok(pxBound<.000101);assert.ok(pxBound<.25&&pxBound<.5);assert.ok(midpointFractionBound<.000006);assert.ok(angularDotLower>Math.cos(30*radians));
const observations=[];
for(const n of [1000,10000,100000])for(const at of [0,Math.floor((n-3)/2),n-3])for(const scale of [100,Math.sqrt(20000),200]){
 const coordinates=Array.from({length:3},(_,j)=>{const i=at+j;return[-30+60*i/(n-1),(i%2?1:-1)*5];});
 const out=projectGeometry({type:'LineString',coordinates},{type:'equirectangular',scalePx:scale,translatePx:[200,200],precisionPx:.5},{coordinateKind:'geographic'});
 assert.equal(out.parts.length,1);assert.equal(out.parts[0].commands.length,5);assert.equal(out.diagnostics.preparedPoints,4);
 observations.push({n,at,scale,localVertices:3,commands:5});
}
const digitUnits=n=>{let result=1;for(let digits=1,lower=1;lower<n;digits++,lower*=10)result+=digits*(Math.min(n,lower*10)-lower);return result;};
console.log(JSON.stringify({source:'ac96edb076fc9a299fa82e6ef18b63a2eb001845',mode:'analytic count proof plus local three-vertex probes; no full 10k/100k native execution',bounds:{maxLongitudeStepDeg:60/999,halfLatitudeStepDeg:5,longitudeMidpointErrorRad:longitudeBound,latitudeMidpointErrorRad:latitudeBound,maxProjectedMidpointErrorPx:pxBound,midpointFractionBound,angularDotLower,resampleAngularThreshold:Math.cos(30*radians)},derivedCounts:[1000,10000,100000].map(n=>({raw:n,refined:2*n-2,output:2*n-1,commands:2*n-1,parts:1,streamWork:16*n+digitUnits(n)+26,fullNativeObserved:n===1000})),observations},null,2));
