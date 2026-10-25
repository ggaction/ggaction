import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { localLegendPlacement } from '../../../../src/grammar/legendGroups.js';
import { resolveConcreteGraphicBounds } from '../../../../src/grammar/schemas/graphicBounds.js';
const base=()=>chart().createCanvas({width:480,height:270,margin:{left:0,right:180,top:0,bottom:0}}).createData({values:[{x:0,y:0,v:1},{x:1,y:1,v:4}]})
 .createScatterPlot({x:'x',y:'y',guides:false}).encodeSize({field:'v'});
test('local plot-corner placement resets only an inferred outside default to the corner gap',()=>{
 for(const [offset,expected] of [[undefined,8],[12,12]]){
  const next=base().createLegend({channels:['size'],title:false,...(offset===undefined?{}:{offset})})
   .editLegendBlock({target:'scatterPlot',channel:'size',position:'bottom-left'});
  assert.equal(localLegendPlacement(next.guideConfigs.legend.size).offset,expected);
  const bounds=resolveConcreteGraphicBounds(next.graphicSpec,'sizeLegendSymbols');
  assert.ok(Math.abs(bounds.left-expected)<1e-9);
  const changed=next.editCanvas({width:520,height:300});
  assert.equal(localLegendPlacement(changed.guideConfigs.legend.size).offset,expected);
 }
});
