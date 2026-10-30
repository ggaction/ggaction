import { chart } from '../../../../../src/index.js';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from '../../../../../src/animation.js';
import { animationFrameProvenance } from '../../../../../src/animation/frameProvenance.js';
const from=chart().createCanvas({width:400,height:300,margin:0})
.createGeometryData({id:'places',format:'geojson',coordinateKind:'planar',featureKey:'id',values:{type:'FeatureCollection',features:[{type:'Feature',id:'a',properties:{name:'Alpha'},geometry:{type:'Point',coordinates:[40,50]}}]}})
.createProjection({id:'map',type:'identity'}).createCoordinate({type:'geo'}).createGeoPointMark({id:'places-mark',fill:'black'})
.createMarkLabels({field:'name'}).editTextMark({target:'places-mark-labels',fill:'black'});
const to=from.editProjection({scalePx:4}).editGeoPointMark({target:'places-mark',fill:'white'}).editTextMark({target:'places-mark-labels',fill:'white'});
const prep=(a,b,extra={})=>planTransition({from:a,to:b,options:{durationMs:100,easing:'linear',...extra}});
const decisions=sampleTransition(prep(from,to),50).decisions;
for(const kind of ['native-geo','native-geo-text']) {
 const decision=decisions.find(x=>x.kernel===kind);
 const p=prep(from,to,{tracks:[{target:{ownerKey:decision.ownerKey},property:'geometry',kernel:'native-progress',keyframes:[{timeMs:0,value:0},{timeMs:50,value:.25},{timeMs:100,value:1}]}]});
 try {
  const middle=sampleTransition(p,50), proof=animationFrameProvenance(middle);
  const next=prep(middle,from), restored=deserializeAnimation(serializeAnimation(next)).plan;
  sampleTransition(restored,50);
  console.log(JSON.stringify({kind,result:'pass',body:proof.geos.groups[0].presentation.camera,label:proof.geotexts.groups[0].presentation.camera}));
 } catch(e) { console.log(JSON.stringify({kind,result:'failure',message:e.message,stack:e.stack})); }
}
