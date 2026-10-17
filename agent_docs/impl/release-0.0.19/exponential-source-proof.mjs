import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createCanvas} from '@napi-rs/canvas';
import {chart,render} from '../../../src/index.js';
import {renderToSVG} from '../../../src/renderers/svg.js';
if (!process.argv[2] || !process.argv[3]) throw new Error('Provide preserved raw JSON and settled-state JSON paths.');
const bytes=fs.readFileSync(process.argv[2]);const raw=JSON.parse(bytes);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'fb962e106c9b6f5ad601d05afd5197d59c3c3c8310c2cd4d6a15ccaf5deb5073');
const state=JSON.parse(fs.readFileSync(process.argv[3]));const samples=state.datasets.data_1;
assert.equal(raw.length,9);assert.equal(samples.length,60);
const program=chart().createCanvas({width:360,height:360,margin:30})
 .createData({id:'raw',values:raw})
 .createComputedData({id:'horizontal',as:'exposure',expression:{op:'toNumber',operand:{field:'Keep_adj'}}})
 .createComputedData({id:'vertical',as:'response',expression:{op:'toNumber',operand:{field:'Dollars_adj'}}})
 .createScatterPlot({x:{field:'exposure',scale:{domain:[0,100]}},y:{field:'response',scale:{domain:[0,100]}},point:{opacity:0},guides:false})
 .createRegression({method:'exp',predict:{values:samples.map(row=>row.Keep_adj)},line:{strokeWidth:1}});
assert.deepEqual(program.semanticSpec.datasets[0].values,raw);
const output=program.semanticSpec.datasets.at(-1).values;
const commands=program.graphicSpec.objects.scatterPlotRegressionLines.items[0].properties.commands;
let maximumResponseError=0,maximumCoordinateError=0;
output.forEach((row,i)=>{
 assert.equal(row.exposure,samples[i].Keep_adj);
 const error=Math.abs(row.response-samples[i].Dollars_adj);maximumResponseError=Math.max(maximumResponseError,error);assert.ok(error<2e-13);
 const x=30+3*samples[i].Keep_adj,y=330-3*samples[i].Dollars_adj;
 maximumCoordinateError=Math.max(maximumCoordinateError,Math.abs(commands[i].x-x),Math.abs(commands[i].y-y));
 assert.ok(Math.abs(commands[i].x-x)<1e-12&&Math.abs(commands[i].y-y)<1e-12);
});
const primitive=createCanvas(360,360).getContext('2d');primitive.fillStyle='white';primitive.fillRect(0,0,360,360);
primitive.strokeStyle='#4c78a8';primitive.lineWidth=1;primitive.beginPath();
samples.forEach((row,i)=>{const x=30+3*row.Keep_adj,y=330-3*row.Dollars_adj;i===0?primitive.moveTo(x,y):primitive.lineTo(x,y);});primitive.stroke();
const actual=createCanvas(360,360).getContext('2d');render(program,actual);
assert.deepEqual(actual.getImageData(0,0,360,360).data,primitive.getImageData(0,0,360,360).data);
assert.match(renderToSVG(program),/<path/);
console.log(JSON.stringify({rawSha256:createHash('sha256').update(bytes).digest('hex'),rawRows:raw.length,sampleCount:samples.length,maximumResponseError,maximumCoordinateError,rawRowsUnchanged:true,canvasWholeRgbaExact:true,chartPixelsInspected:false},null,2));
