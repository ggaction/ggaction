import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import {chart} from '../../../../src/index.js';
import {chart as basicChart} from '../../../../src/basic.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';
import {createLegendContentSpacingProgram,legendContentSpacingCalls} from '../../../../examples/legend-content-spacing/program.js';

const rows=Array.from({length:6},(_,i)=>({x:i%2,y:Math.floor(i/2)+i%2/2,g:['A','B','C'][Math.floor(i/2)],v:Math.floor(i/2)}));
function family(name,factory=chart){
  let base=factory().createCanvas({width:1400,height:1200,margin:400}).createData({values:rows});
  const line=['series','width','strokeInterval','strokeGradient'].includes(name);
  base=line?base.createLinePlot({x:'x',y:'y',guides:false}).encodeGroup({field:'g'}):base.createScatterPlot({x:'x',y:'y',guides:false});
  const target=line?'linePlot':'scatterPlot';let options,kind;
  if(name==='color'||name==='series'){base=base.encodeColor({field:'g'});options={channels:['color']};kind=line?'series':'color';}
  else if(name==='ordinal'){base=base.encodeSize({field:'g',fieldType:'ordinal',scale:{domain:['A','B','C'],range:[20,80,180]}});options={channels:['size']};kind='size';}
  else if(name==='size'||name==='discrete'){base=base.encodeSize({field:'v',scale:name==='discrete'?{type:'quantize',domain:[0,2],range:[20,180]}:{domain:[0,2],range:[20,180]}});options={channels:['size']};kind='size';}
  else if(name==='opacity'){base=base.encodeOpacity({field:'v'});options={channels:['opacity']};kind='opacity';}
  else if(name==='width'){base=base.encodeStrokeWidth({field:'v'});options={channels:['strokeWidth']};kind='strokeWidth';}
  else if(name==='colorSize'){base=base.encodeColor({field:'v',fieldType:'quantitative',scale:{domain:[0,2]}}).encodeSize({field:'v',scale:{domain:[0,2]}});options={channels:['color','size'],combine:'color-size'};kind='colorSize';}
  else if(name==='strokeInterval'||name==='strokeGradient'){
    base=base.encodeStroke({field:'v',fieldType:'quantitative',scale:name==='strokeInterval'?{type:'quantize',domain:[0,2],range:['red','blue']}:{domain:[0,2]}});
    options={channels:['stroke']};kind=name;
  }else{
    base=base.encodeColor({field:'v',fieldType:'quantitative',scale:name==='interval'?{type:'quantize',domain:[0,2],range:['red','blue']}:{domain:[0,2]}});
    options={channels:['color'],...(name==='symbols'?{representation:'symbols'}:{})};kind=name==='interval'?'interval':'gradient';
  }
  return{base,options,kind,target,gradient:['gradient','strokeGradient'].includes(name)};
}

for(const name of ['color','series','size','ordinal','discrete','opacity','width','interval','strokeInterval','symbols','gradient','strokeGradient','colorSize']){
  test(`${name} spacing creation, editing, reset, persistence and Canvas replay agree`,()=>{
    const{base,options,kind,target,gradient}=family(name),spacing={titlePadding:20,...(gradient?{}:{rowPadding:7})};
    const control=base.createLegend(options),p=base.createLegend({...options,...spacing});
    assert.equal(p.guideConfigs.legend[kind].titlePadding,20);
    if(!gradient)assert.equal(p.guideConfigs.legend[kind].rowPadding,7);
    assert.deepEqual(p.semanticSpec,control.semanticSpec);
    assert.deepEqual(p.graphicSpec.objects[target],control.graphicSpec.objects[target]);
    assert.deepEqual(control.editLegend(spacing).graphicSpec,p.graphicSpec);
    assert.deepEqual(control.editLegendLayout(spacing).graphicSpec,p.graphicSpec);
    const restored=deserializeProgram(serializeProgram(p));
    assert.deepEqual(restored.graphicSpec,p.graphicSpec);
    assert.deepEqual(restored.editCanvas({width:1500}).graphicSpec,
      base.editCanvas({width:1500}).createLegend({...options,...spacing}).graphicSpec);
    const reset=p.editLegendLayout({rowPadding:'auto',titlePadding:'auto'});
    assert.equal(Object.hasOwn(reset.guideConfigs.legend[kind],'rowPadding'),false);
    assert.equal(Object.hasOwn(reset.guideConfigs.legend[kind],'titlePadding'),false);
    assert.deepEqual(reset.graphicSpec,control.graphicSpec);
    for(const key of ['rowPadding','titlePadding'])for(const value of [-1,NaN,Infinity,null,false,'7']){
      const before=JSON.stringify(p);assert.throws(()=>p.editLegend({[key]:value}));assert.equal(JSON.stringify(p),before);
      assert.throws(()=>base.createLegend({...options,[key]:value}));
    }
    assert.throws(()=>serializeProgram(p._withLegendConfig(kind,{...p.guideConfigs.legend[kind],titlePadding:'auto'})),/non-negative finite/);
  });
}

test('Basic categorical creation forwards both spacing controls without exposing editors',()=>{
  const{base,options}=family('color',basicChart),p=base.createLegend({...options,rowPadding:0,titlePadding:9});
  assert.equal(p.guideConfigs.legend.color.rowPadding,0);assert.equal(p.guideConfigs.legend.color.titlePadding,9);
  assert.equal(p.editLegend,undefined);
});

function exampleControl(){
  let p=chart();for(const{op,args}of legendContentSpacingCalls.slice(0,-1))p=p[op](args);return p;
}
const symbolY=p=>p.graphicSpec.objects.sizeLegendSymbols.items.map(item=>item.properties.y);

test('variable size rows have literal centers and source-free exact stroke-edge gaps',()=>{
  const p=createLegendContentSpacingProgram();assert.deepEqual(symbolY(p),[73,102,143]);
  const symbols=p.graphicSpec.objects.sizeLegendSymbols.items.map(i=>i.properties);
  assert.deepEqual(symbols.map(s=>s.radius),[8,12,20]);
  for(let i=1;i<symbols.length;i++)assert.equal(symbols[i].y-symbols[i].radius-symbols[i].strokeWidth/2-
    (symbols[i-1].y+symbols[i-1].radius+symbols[i-1].strokeWidth/2),7);
  const t=p.graphicSpec.objects.sizeLegendTitle.properties;
  assert.equal(symbols[0].y-symbols[0].radius-symbols[0].strokeWidth/2-(t.y+t.fontSize),20);
  const thick=p.editLegendBlock({target:'scatterPlot',channel:'size',symbol:{strokeWidth:12}});
  const changed=thick.graphicSpec.objects.sizeLegendSymbols.items.map(i=>i.properties);
  for(let i=1;i<changed.length;i++)assert.equal(changed[i].y-changed[i].radius-6-(changed[i-1].y+changed[i-1].radius+6),7);
});

test('stored itemGap controls columns and returns to uniform pitch after row reset',()=>{
  const p=exampleControl().editLegendLayout({rowPadding:7,itemGap:60,titlePadding:20});
  assert.deepEqual(symbolY(p),[73,102,143]);assert.equal(p.guideConfigs.legend.size.itemGap,60);
  assert.deepEqual(symbolY(p.editLegendLayout({rowPadding:'auto'})),[73,133,193]);
});

test('hidden titles retain padding intent and restore their complete visible geometry',()=>{
  const p=createLegendContentSpacingProgram(),hidden=p.editLegend({title:false});
  assert.equal(hidden.graphicSpec.objects.sizeLegendTitle,undefined);
  assert.deepEqual(symbolY(hidden),[39,68,109]);assert.equal(hidden.guideConfigs.legend.size.titlePadding,20);
  assert.deepEqual(hidden.editLegend({title:'auto'}).graphicSpec,p.graphicSpec);
});

test('representation changes require an explicit reset for incompatible row intent',()=>{
  const{base,options}=family('symbols'),p=base.createLegend({...options,rowPadding:7,titlePadding:20}),snapshot=JSON.stringify(p);
  assert.throws(()=>p.editLegend({representation:'gradient'}),/item-based/);assert.equal(JSON.stringify(p),snapshot);
  const gradient=p.editLegend({representation:'gradient',rowPadding:'auto'});
  assert.equal(gradient.guideConfigs.legend.gradient.rowPadding,undefined);
  assert.equal(gradient.guideConfigs.legend.gradient.titlePadding,20);
  const symbols=gradient.editLegend({representation:'symbols',rowPadding:7});
  assert.deepEqual(symbols.graphicSpec,p.graphicSpec);
});

test('legacy-bottom rejects new spacing and a single edit can explicitly enter edge layout',()=>{
  const{base,options}=family('color'),legacy=base.createLegend({...options,position:'bottom',layout:'legacy-bottom'});
  for(const key of ['rowPadding','titlePadding'])assert.throws(()=>legacy.editLegend({[key]:0}),/edge/);
  const moved=legacy.editLegend({layout:'edge',rowPadding:7,titlePadding:20});
  assert.equal(moved.guideConfigs.legend.color.rowPadding,7);
  assert.deepEqual(moved.graphicSpec,base.createLegend({...options,position:'bottom',layout:'edge',rowPadding:7,titlePadding:20}).graphicSpec);
});

test('content replacement applies explicit spacing to every final item block',()=>{
  const{base}=family('color');const full=base.encodeSize({field:'v'});
  const initial=full.createLegend({channels:['color'],rowPadding:7,titlePadding:20});
  const p=initial.editLegend({channels:['color','size'],rowPadding:9,titlePadding:12});
  for(const key of ['color','size']){assert.equal(p.guideConfigs.legend[key].rowPadding,9);assert.equal(p.guideConfigs.legend[key].titlePadding,12);}
  const selected=p.editLegendLayout({channel:'size',rowPadding:3});
  assert.equal(selected.guideConfigs.legend.size.rowPadding,3);assert.equal(selected.guideConfigs.legend.color.rowPadding,9);
});

test('text-only categorical summary uses its own row height instead of a hidden sample',()=>{
  const{base}=family('color'),p=base.createLegend({channels:['color'],overflow:{maxItems:2},rowPadding:7,
    labels:{fontSize:10},symbol:{layers:[{type:'point',size:20,stroke:'#000',strokeWidth:4}]}});
  const labels=p.graphicSpec.objects.colorLegendLabels.items.map(i=>i.properties);
  assert.equal(p.graphicSpec.objects.colorLegendSymbolPoints.items.length,2);
  assert.deepEqual(labels.map(p=>p.text),['A','B','…1 entries']);
  assert.equal(labels[1].y-labels[0].y,51);
  assert.equal(labels[2].y-labels[1].y,34);
});

test('multi-column rows retain domain filling order at side and horizontal edges',()=>{
  const{base}=family('color');
  for(const position of['left','right','top','bottom']){
    const p=base.createLegend({channels:['color'],position,columns:2,rowPadding:7,titlePadding:20,
      direction:'vertical',labels:{fontSize:10},symbol:{layers:[{type:'point',size:20,stroke:'#000',strokeWidth:4}]}});
    const a=p.graphicSpec.objects.colorLegendLabels.items.map(i=>i.properties);
    assert.deepEqual(a.map(p=>p.text),['A','B','C']);assert.equal(a[0].y,a[2].y);
    assert.equal(a[1].y-a[0].y,51);assert.notEqual(a[0].x,a[2].x);
  }
});

test('corner and free group anchors retain spacing and reject overflow atomically',()=>{
  const{base}=family('size');
  for(const placement of[{position:'top-left'},{position:'bottom-right'},{at:{x:10,y:10}}]){
    const p=base.createLegend({channels:['size'],...placement,rowPadding:7,titlePadding:20,border:{padding:5}});
    assert.equal(p.guideConfigs.legend.size.rowPadding,7);assert.equal(p.guideConfigs.legend.size.titlePadding,20);
    const snapshot=JSON.stringify(p);assert.throws(()=>p.editLegendLayout({rowPadding:10000}));
    assert.equal(JSON.stringify(p),snapshot);
    assert.deepEqual(p.editCanvas({width:1500}).graphicSpec,
      base.editCanvas({width:1500}).createLegend({channels:['size'],...placement,rowPadding:7,titlePadding:20,border:{padding:5}}).graphicSpec);
  }
});

test('gradient strips reject numeric row padding at creation without changing the input',()=>{
  for(const name of['gradient','strokeGradient']){
    const{base,options}=family(name),snapshot=JSON.stringify(base);
    assert.throws(()=>base.createLegend({...options,rowPadding:0}),/item-based/);
    assert.equal(JSON.stringify(base),snapshot);
  }
});

test('scale-family transitions preserve title padding and cannot discard row intent',()=>{
  const{base,options}=family('gradient'),p=base.createLegend({...options,titlePadding:20});
  const interval=p.editColorScale({type:'quantize',range:['red','blue']});
  assert.equal(interval.guideConfigs.legend.interval.titlePadding,20);
  const rows=interval.editLegendLayout({rowPadding:7}),snapshot=JSON.stringify(rows);
  assert.throws(()=>rows.editColorScale({type:'sequential',range:['red','blue']}),/resetting rowPadding/);
  assert.equal(JSON.stringify(rows),snapshot);
  const back=rows.editLegendLayout({rowPadding:'auto'}).editColorScale({type:'sequential',range:['red','blue']});
  assert.equal(back.guideConfigs.legend.gradient.titlePadding,20);
  assert.equal(back.guideConfigs.legend.gradient.rowPadding,undefined);
});

test('combination conflicts require an explicit spacing choice and splits preserve compatible intent',()=>{
  const{base}=family('colorSize'),separate=base.createLegend({channels:['color']}).createLegend({channels:['size']})
    .editLegendLayout({channel:'size',rowPadding:7});
  const snapshot=JSON.stringify(separate);
  assert.throws(()=>separate.editLegend({combine:'color-size'}),/rowPadding/);
  assert.equal(JSON.stringify(separate),snapshot);
  const combined=separate.editLegend({combine:'color-size',rowPadding:7,titlePadding:20});
  assert.equal(combined.guideConfigs.legend.colorSize.rowPadding,7);
  assert.throws(()=>combined.editLegend({combine:'separate'}),/item-based/);
  const split=combined.editLegend({combine:'separate',rowPadding:'auto'});
  for(const key of['gradient','size']){assert.equal(split.guideConfigs.legend[key].rowPadding,undefined);assert.equal(split.guideConfigs.legend[key].titlePadding,20);}
});

test('source revisions, scale ranges and theme replay retain owned spacing',()=>{
  const{base,options}=family('size'),p=base.createLegend({...options,rowPadding:7,titlePadding:20}),snapshot=serializeProgram(p);
  const revised=p.reviseData({source:'data',id:'revised',values:rows.map(row=>({...row,y:row.y+.1}))});
  const scaled=revised.editSizeScale({range:[25,900]}),themed=scaled.applyTheme({theme:'dark'});
  for(const program of[revised,scaled,themed]){
    assert.equal(program.guideConfigs.legend.size.rowPadding,7);assert.equal(program.guideConfigs.legend.size.titlePadding,20);
    assert.deepEqual(deserializeProgram(serializeProgram(program)).editCanvas({width:1500}).graphicSpec,
      program.editCanvas({width:1500}).graphicSpec);
  }
  assert.equal(serializeProgram(p),snapshot);
});

test('shared facet parent intent retains spacing through focused edits and layout replay',()=>{
  const{base}=family('color');
  const p=base.facet({field:'g',columns:3,spacing:'plot',gap:10,
    guides:{axes:'outer',legend:{position:'right',rowPadding:7,titlePadding:20}}});
  assert.equal(p.guideConfigs.legend.color.rowPadding,7);
  assert.equal(p.compositionSpec.facet.guides.legend.blocks.color.config.titlePadding,20);
  for(const child of Object.values(p.children))assert.equal(child.guideConfigs.legend,undefined);
  const q=p.editLegendLayout({rowPadding:3,titlePadding:0});assert.deepEqual(q.children,p.children);
  assert.equal(q.compositionSpec.facet.guides.legend.blocks.color.config.rowPadding,3);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).editCompositionLayout({gap:20}).graphicSpec,
    q.editCompositionLayout({gap:20}).graphicSpec);
});

test('content policies override retained block gap and reset restores that fallback',()=>{
  const p=createLegendContentSpacingProgram();
  const q=p.editLegendBlock({target:'scatterPlot',channel:'size',gap:60});
  assert.deepEqual(q.graphicSpec,p.graphicSpec);
  const reset=q.editLegendLayout({rowPadding:'auto',titlePadding:'auto'});
  assertEquivalentMeaning(reset.graphicSpec,exampleControl().editLegendBlock({target:'scatterPlot',channel:'size',gap:60}).graphicSpec);
});

test('multiline titles and clipped samples use final logical occupied bounds',()=>{
  const p=createLegendContentSpacingProgram();
  const multi=p.editLegend({title:'first\nsecond'}),title=multi.graphicSpec.objects.sizeLegendTitle.properties;
  assert.equal(title.y+title.lines[0].y,30);
  assert.deepEqual(symbolY(multi),[89.80000000000001,118.80000000000001,159.8]);
  const clipped=p.editLegend({clipHeight:6});
  assert.deepEqual(clipped.graphicSpec.objects.sizeLegendLabels.items.map(i=>i.properties.y),[64,81,98]);
  assert.equal(clipped.graphicSpec.objects.sizeLegendSymbols.type,'collection');
  assert.equal(clipped.graphicSpec.objects.sizeLegendTitle.properties.y,30);
  assert.deepEqual(clipped.editLegend({clipHeight:'auto'}).graphicSpec,p.graphicSpec);
});

test('bottom gradient title padding measures the final tick and label body',()=>{
  const base=chart().createCanvas({width:900,height:800,margin:250})
    .createData({values:[{x:0,y:0,v:0},{x:1,y:1,v:1}]})
    .createScatterPlot({x:'x',y:'y',guides:false}).encodeColor({field:'v',fieldType:'quantitative'});
  const p=base.createLegend({channels:['color'],position:'bottom',titlePosition:'bottom',titlePadding:17});
  const o=p.graphicSpec.objects,title=o.colorGradientTitle.properties;
  assert.equal(title.y,639.5);
  const labelBottom=Math.max(...o.colorGradientLabels.items.map(i=>i.properties.y+i.properties.fontSize/2));
  assert.equal(title.y-title.fontSize/2-labelBottom,17);
  assert.deepEqual(p.editLegendLayout({titlePadding:'auto'}).graphicSpec,
    base.createLegend({channels:['color'],position:'bottom',titlePosition:'bottom'}).graphicSpec);
});
