// Read-only compatibility sweep against two caller-selected runtime roots.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const [beforeRoot,afterRoot,output]=process.argv.slice(2);
if(!beforeRoot||!afterRoot)throw Error('BEFORE_RUNTIME AFTER_RUNTIME [OUTPUT] required');
const load=async root=>({...(await import(pathToFileURL(path.resolve(root,'src/index.js')))),...(await import(pathToFileURL(path.resolve(root,'src/renderers/svg.js'))))});
const [before,after]=await Promise.all([load(beforeRoot),load(afterRoot)]);
const values=[{x:1,y:2,group:'Alpha',amount:1},{x:2,y:3,group:'Long category',amount:4}];
const kinds=['color','series','stroke','gradient','strokeGradient','interval','strokeInterval','size','opacity','strokeWidth','combined'];
function source(api,kind){let p=api.chart().createCanvas({width:1400,height:1200,margin:350}).createData({values});
  if(kind==='strokeWidth')return p.createLinePlot({x:'x',y:'y',groupBy:'group',guides:false}).encodeStrokeWidth({field:'amount'});
  p=p.createScatterPlot({x:'x',y:'y',guides:false});
  if(kind==='series')return p.encodeShape({field:'group'});
  if(kind==='size')return p.encodeSize({field:'amount'});
  if(kind==='opacity')return p.encodeOpacity({field:'amount'});
  if(kind.startsWith('stroke'))return p.encodeStroke({field:kind==='stroke'?'group':'amount',fieldType:kind==='stroke'?'nominal':'quantitative',...(kind==='strokeInterval'?{scale:{type:'quantize',range:['red','blue']}}:{})});
  p=p.encodeColor({field:kind==='color'||kind==='combined'?'group':'amount',fieldType:kind==='color'||kind==='combined'?'nominal':'quantitative',...(kind==='interval'?{scale:{type:'quantize',range:['red','blue']}}:{})});return kind==='combined'?p.encodeSize({field:'amount'}):p;
}
const records=[],sha=x=>createHash('sha256').update(x).digest('hex');
for(const kind of kinds)for(const position of['top','right','bottom','left'])for(const title of['Heading','Alpha\n\nBeta']){
  const a=source(before,kind).createLegend({position,title,border:true}),b=source(after,kind).createLegend({position,title,border:true});
  assert.deepEqual(b.graphicSpec,a.graphicSpec);assert.deepEqual(b.semanticSpec,a.semanticSpec);assert.deepEqual(b.materializationConfigs,a.materializationConfigs);
  const svg=after.renderToSVG(b);assert.equal(svg,before.renderToSVG(a));records.push({kind,position,multiline:title.includes('\n'),graphicSha256:sha(JSON.stringify(a.graphicSpec)),svgSha256:sha(svg)});
}
for(const placement of[{at:{x:12,y:15}},{position:'top-right'},{position:'bottom-left'}])for(const kind of['color','combined','gradient','size','opacity']){
  const a=source(before,kind).createLegend({...placement,title:'Heading'}),b=source(after,kind).createLegend({...placement,title:'Heading'});
  assert.deepEqual(b.graphicSpec,a.graphicSpec);assert.deepEqual(b.materializationConfigs,a.materializationConfigs);assert.equal(after.renderToSVG(b),before.renderToSVG(a));records.push({kind,placement,graphicSha256:sha(JSON.stringify(a.graphicSpec))});
}
for(const kind of kinds){
  const run=api=>source(api,kind).createLegend({position:'bottom-left',title:'Heading'}).editLegendLayout({at:{x:12,y:15}}).editLegendLayout({position:'top'}).editLegendLayout({at:{x:12,y:15}});
  const a=run(before),b=run(after);assert.deepEqual(b.graphicSpec,a.graphicSpec);assert.deepEqual(b.materializationConfigs,a.materializationConfigs);assert.equal(after.renderToSVG(b),before.renderToSVG(a));records.push({kind,transition:'corner-free-top-free',graphicSha256:sha(JSON.stringify(a.graphicSpec))});
}
const result={reviewer:'codex',status:'pass',cases:records.length,graphicAndSemanticAndStoredIntentExact:true,svgByteExact:true,chartPixelsInspected:false,newModelResponses:0,records};
if(output)fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:'pass',cases:records.length}));
