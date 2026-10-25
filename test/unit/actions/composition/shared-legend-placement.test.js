import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { compositionPlotBounds, prepareCompositionSnapshots } from '../../../../src/materialization/composition.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
const rows=Array.from({length:12},(_,i)=>({x:i+1,y:2*i+3,g:i%2?'A':'B'}));
const unit=()=>chart().createCanvas({plot:{width:220,height:220},margin:160}).createData({id:'d',values:rows})
 .createScatterPlot({id:'p',x:'x',y:'y'}).encodeColor({target:'p',field:'g',fieldType:'nominal'})
 .createLegend({target:'p',channels:['color']});
for(const position of ['top','bottom','left','right'])for(const edge of ['left','right','top','bottom'])test(`${position} legend survives adding a chart ${edge}`,()=>{
 const source=unit().editLegend({target:'p',channel:'color',position,labels:{fontSize:18}});
 let p=source.createAdjacentPlot({id:'q',source:'p',position:edge,share:{color:true},plot:{action:'createScatterPlot'}})
  .createTitle({text:'Two panels',position,subtitle:'Shared guide'});
 const {layout,legendFrames}=prepareCompositionSnapshots(p),legendFrame=legendFrames.get('composition-shared-color-legend'),plot=compositionPlotBounds(p);
 assert.ok(legendFrame);assert.equal(layout.width,p.graphicSpec.objects.canvas.properties.width);
 assert.equal(layout.height,p.graphicSpec.objects.canvas.properties.height);
 const {x,y,width,height}=legendFrame;
 if(position==='top')assert.ok(y+height<plot.y);
 if(position==='bottom')assert.ok(y>plot.y+plot.height);
 if(position==='left')assert.ok(x+width<plot.x);
 if(position==='right')assert.ok(x>plot.x+plot.width);
 assert.ok(x>=0&&y>=0&&x+width<=layout.width&&y+height<=layout.height);
 assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 p=p.editLegend({target:{childPath:['p'],id:'p'},channel:'color',labels:{fontSize:23}});
 const labels=Object.entries(p.graphicSpec.objects).filter(([id])=>id.endsWith('LegendLabels'));
 assert.equal(labels.length,1);assert.ok(labels[0][1].items.every(item=>item.properties.fontSize===23));
});

test('left insertion of a bar retains the existing bottom legend typography',()=>{
 const p=unit().editLegend({target:'p',channel:'color',position:'bottom',labels:{fontSize:20},titleStyle:{fontSize:24}});
 const q=p.createAdjacentPlot({id:'bars',source:'p',position:'left',share:{color:true},plot:{action:'createBarPlot',options:{x:{field:'g',fieldType:'nominal'},y:{field:'y',aggregate:'mean'},color:{field:'g',fieldType:'nominal'}}}});
 const shared=prepareCompositionSnapshots(q).legends.find(block => block.id === 'composition-shared-color-legend');
 assert.equal(shared.placement.position,'bottom');assert.equal(shared.config.labels.fontSize,20);
 assert.equal(shared.config.titleStyle.fontSize,24);
 assert.equal(q.children.bars.guideConfigs.legend.color.labels.fontSize,20);
 assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
});
