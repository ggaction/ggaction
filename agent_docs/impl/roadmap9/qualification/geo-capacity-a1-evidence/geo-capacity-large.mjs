import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {inflateSync} from 'node:zlib';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {chart,render} from '../src/index.js';
import {serializeProgram,serializeGraphic,deserializeGraphic} from '../src/persistence.js';
import {createTransitionScene,renderTransitionScene} from '../src/scene.js';
import {renderToSVG} from '../src/renderers/svg.js';
import {renderToPNGBuffer} from '../src/renderers/png.js';
import {renderToPDFBuffer} from '../src/renderers/pdf.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','src','types'],{encoding:'utf8'}).trim().split('\n');
const sourceFiles=Object.fromEntries(await Promise.all([...new Set(files)].sort().map(async file=>[file,sha(await readFile(file))])));
const output=process.env.GEO_CAPACITY_OUTPUT??'.artifacts/geo-capacity-large-final.json';
const record={sourceFiles,node:process.version,pid:process.pid,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceDiffHash:sha(execFileSync('git',['diff','--','src','types'])),kind:'source functional diagnostic, not P95',cases:[]};
const save=()=>writeFile(output,JSON.stringify(record,null,2));
await save();console.log(JSON.stringify({pid:record.pid,sourceDiffHash:record.sourceDiffHash}));
for (const count of [1000,10000,100000]) {
 const row={count,start:new Date().toISOString()};record.cases.push(row);await save();const start=performance.now();
 try {
  const coordinates=Array.from({length:count},(_,i)=>[-30+60*i/(count-1),(i%2?1:-1)*5]);
  const values={type:'FeatureCollection',features:[{type:'Feature',id:'line',properties:{},geometry:{type:'LineString',coordinates}}]};
  row.rawHash=sha(JSON.stringify(values));
  const source=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false})
   .createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',values})
   .createProjection({id:'map',type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5}).createCoordinate({type:'geo'});
  const immutable=serializeProgram(source);
  if(count>1000){assert.throws(()=>source.createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2}),/must not exceed (10000|30000)/);row.default='explicit-limit';}
  let program=source.createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2,capacity:{maxProjectedPoints:200000,maxPathCommands:200000}});
  row.scales=[];
  for (const scale of [100,Math.sqrt(20000),200]) {
   if(scale!==100)program=program.editProjection({scalePx:scale});
   const items=program.graphicSpec.objects.coast.items;assert.equal(items.length,1);
   const commands=items[0].properties.commands;assert.equal(commands.length,2*count-1);assert.equal(items[0].properties.maxCommands,200000);
   let maxError=0;
   for(const[i,c]of commands.entries()) {const lon=-30+60*(i/2)/(count-1),lat=i%2?0:((i/2)%2?5:-5);assert.equal(c.op,i?'L':'M');maxError=Math.max(maxError,Math.abs(c.x-(200+scale*lon*Math.PI/180)),Math.abs(c.y-(200-scale*lat*Math.PI/180)));}
   assert.ok(maxError<1e-9);row.scales.push({scale,commands:commands.length,maxError,hash:sha(JSON.stringify(commands))});
  }
  assert.equal(serializeProgram(source),immutable);assert.equal(sha(JSON.stringify(values)),row.rawHash);row.nativeMs=performance.now()-start;await save();
  const graphic=deserializeGraphic(serializeGraphic(program));assert.equal(graphic.semanticSpec,undefined);
  const scene=createTransitionScene(graphic,{format:'canvas'});assert.equal(scene.nodes.filter(n=>n.type==='path').length,1);assert.equal(scene.nodes.find(n=>n.type==='path').properties.commands.length,2*count-1);
  row.sceneHash=sha(JSON.stringify(scene));
  const canvas=createCanvas(1,1),ctx=canvas.getContext('2d');let lines=0;const recorder=new Proxy(ctx,{get(t,k){if(k==='lineTo')return(...args)=>{lines++;return t.lineTo(...args);};const v=t[k];return typeof v==='function'?v.bind(t):v;},set(t,k,v){t[k]=v;return true;}});
  render(graphic,recorder);assert.equal(lines,2*count-2);const bytes=Buffer.from(ctx.getImageData(0,0,400,400).data);assert.ok(bytes.some((x,i)=>i%4!==3&&x<200));row.canvasHash=sha(bytes);
  const png=await renderToPNGBuffer(graphic),decoded=createCanvas(400,400),dc=decoded.getContext('2d');dc.drawImage(await loadImage(png.buffer),0,0);assert.deepEqual(Buffer.from(dc.getImageData(0,0,400,400).data),bytes);row.pngHash=sha(png.buffer);
  const sc=createCanvas(1,1),scx=sc.getContext('2d');renderTransitionScene(scene,scx);assert.deepEqual(Buffer.from(scx.getImageData(0,0,400,400).data),bytes);
  const svg=renderToSVG(graphic);assert.equal(svg,renderToSVG(program));const path=/<path\b[^>]*\bd="([^"]+)"/.exec(svg);assert.ok(path);assert.equal((path[1].match(/[MLCZ]/g)??[]).length,2*count-1);row.svgHash=sha(svg);
  const pdf=await renderToPDFBuffer(graphic);assert.equal(pdf.buffer.subarray(0,5).toString(),'%PDF-');assert.doesNotMatch(pdf.buffer.toString('latin1'),/\/Subtype\s*\/Image/);const streams=[...pdf.buffer.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].flatMap(m=>{try{return[inflateSync(Buffer.from(m[1],'latin1')).toString()];}catch{return[];}}).join('\n');
  assert.ok((streams.match(/ l\n/g)??[]).length>=2*count-2);row.pdfHash=sha(pdf.buffer);row.status='passed';row.totalMs=performance.now()-start;
 } catch(error){row.status='failed';row.error=error.stack;process.exitCode=1;}
 await save();console.log(JSON.stringify(row));if(process.exitCode)break;
}
