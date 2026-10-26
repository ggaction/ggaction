import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { resolveConcreteGraphicBounds } from '../../../../src/grammar/schemas/graphicBounds.js';
const legendBounds=p=>Object.keys(p.graphicSpec.objects).filter(id=>/^(colorLegend|colorGradient|sizeLegend)/.test(id))
  .map(id=>resolveConcreteGraphicBounds(p.graphicSpec,id)).filter(Boolean).reduce((a,b)=>a?({left:Math.min(a.left,b.left),right:Math.max(a.right,b.right),top:Math.min(a.top,b.top),bottom:Math.max(a.bottom,b.bottom)}):b);

function fixture(continuous=false) {
  return chart().createCanvas({width:1000,height:900,margin:250})
    .createData({values:[{x:1,y:2,g:'A'},{x:2,y:3,g:'B'}]})
    .createScatterPlot({id:'p',x:'x',y:'y',guides:false,color:{field:continuous?'x':'g',fieldType:continuous?'quantitative':'nominal'},size:'y'})
    .createLegend({target:'p',channels:['color','size']});
}
for(const continuous of [false,true]) test(`all selects existing ${continuous?'gradient':'categorical'} and size blocks without changing content`,()=>{
  const p=fixture(continuous).editLegend({target:'p',channel:'size',position:'bottom',labels:{fontSize:15,color:'purple'}});
  const original=JSON.stringify(p);
  for(const position of ['left','right','top','bottom','top-left','top-right','bottom-left','bottom-right']) {
    const n=p.editLegend({target:'p',channel:'all',position});
    const group=n.guideConfigs.legendGroups.p;
    assert.equal(group.placement.position,position);
    for(const [kind,c] of Object.entries(n.guideConfigs.legend)){
      assert.equal(c.blockOverrides,undefined);
      assert.deepEqual(c.labels,p.guideConfigs.legend[kind].labels);
      assert.equal(c.title,p.guideConfigs.legend[kind].title);
    }
    const b=legendBounds(n);
    if(position==='right')assert.ok(b.left>750);
    if(position==='left')assert.ok(b.right<250);
    if(position==='top')assert.ok(b.bottom<250);
    if(position==='bottom')assert.ok(b.top>650);
    assert.deepEqual(deserializeProgram(serializeProgram(n)).graphicSpec,n.graphicSpec);
    assert.deepEqual(n.rematerializeLegend().graphicSpec,n.graphicSpec);
  }
  assert.equal(JSON.stringify(p),original);
});
test('all shared appearance and visibility apply to each family; spacing skips gradient strips',()=>{
  const p=fixture(true);
  const n=p.editLegend({target:'p',channel:'all',labels:{fontSize:17},itemGap:22,titleStyle:{visible:false}});
  for(const c of Object.values(n.guideConfigs.legend)){
    assert.equal(c.labels.fontSize,17);assert.equal(c.visibility.titleStyle,false);
  }
  assert.equal(n.guideConfigs.legend.size.itemGap,22);
  const hidden=n.editLegend({target:'p',channel:'all',visible:false});
  for(const c of Object.values(hidden.guideConfigs.legend))assert.equal(c.visibility.all,false);
  const shown=hidden.editLegend({target:'p',channel:'all',visible:true});
  assert.deepEqual(shown.graphicSpec,n.graphicSpec);
});
test('all rejects ambiguous targets, empty edits, content replacement and invalid changes atomically',()=>{
  const p=fixture(),before=JSON.stringify(p);
  for(const patch of [{},{channels:['color']},{combine:'separate'},{representation:'symbols'},{position:'inherit'},{position:'left',labels:{fontSize:-2}}]){
    assert.throws(()=>p.editLegend({target:'p',channel:'all',...patch}));
    assert.equal(JSON.stringify(p),before);
  }
  assert.throws(()=>p.editLegend({target:'missing',channel:'all',position:'left'}));
});

test('all can reunite locally positioned blocks at a free group anchor',()=>{
  const p=fixture().editLegend({target:'p',channel:'size',position:'bottom'});
  const n=p.editLegend({target:'p',channel:'all',at:{x:0,y:0}});
  assert.deepEqual(n.guideConfigs.legendGroups.p.placement.at,{x:0,y:0});
  for(const c of Object.values(n.guideConfigs.legend))assert.equal(c.blockOverrides,undefined);
  assert.deepEqual(deserializeProgram(serializeProgram(n)).graphicSpec,n.graphicSpec);
});
