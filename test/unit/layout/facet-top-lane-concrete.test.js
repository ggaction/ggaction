import test from 'node:test';
import assert from 'node:assert/strict';
import {assertFacetTopLane} from '../../../src/materialization/facetTopLane.js';

function scene(){return {compositionSpec:{topLane:'shared'},materializationConfigs:{},graphicSpec:{order:['canvas'],objects:{
  canvas:{type:'canvas',properties:{width:200,height:120},children:['title','header','nested']},
  title:{type:'text',properties:{x:30,y:35,text:'Title',fontSize:10,textAlign:'left',textBaseline:'top'}},
  header:{type:'collection',items:[{id:'header:0',type:'text',properties:{x:30,y:10,text:'Panel',fontSize:10,textBaseline:'top'}}]},
  nested:{type:'canvas',properties:{x:10,y:30,width:100,height:80},children:['retained']},
  retained:{type:'text',items:[{id:'retained:0',properties:{x:20,y:5,text:'50',fontSize:10,textAlign:'left',textBaseline:'top'}}]}
}}};}
const geometry={layout:{children:[{x:0,y:0}]},plots:[{x:20,y:70,width:100,height:30}],headerId:'header',titleIds:['title']};

test('shared lane checks final translated generated text, rotation, visibility and ancestor clips',()=>{
  const p=scene(),item=p.graphicSpec.objects.retained.items[0];
  assert.throws(()=>assertFacetTopLane(p,geometry),/retained chart text/);
  item.properties.opacity=0;assert.doesNotThrow(()=>assertFacetTopLane(p,geometry));
  delete item.properties.opacity;item.properties.text='';assert.doesNotThrow(()=>assertFacetTopLane(p,geometry));
  item.properties.text='50';item.properties.x=30;item.properties.rotation=Math.PI/2;
  assert.throws(()=>assertFacetTopLane(p,geometry),/retained chart text/);
  delete item.properties.rotation;item.properties.x=20;
  p.graphicSpec.objects.nested.properties.width=10;
  assert.doesNotThrow(()=>assertFacetTopLane(p,geometry));
  p.graphicSpec.objects.nested.properties.width=100;
  p.graphicSpec.objects.nested.properties.y=60;
  assert.doesNotThrow(()=>assertFacetTopLane(p,geometry));
  // Default mode does not impose this opt-in collision policy on old scenes.
  p.compositionSpec={};p.graphicSpec.objects.nested.properties.y=30;
  assert.doesNotThrow(()=>assertFacetTopLane(p,geometry));
});
