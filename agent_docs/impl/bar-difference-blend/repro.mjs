import assert from 'node:assert/strict';
import {chart} from '../../../src/index.js';
const gradient={type:'linear-gradient',from:{x:0,y:0},to:{x:1,y:0},stops:[{offset:0,color:'orange'},{offset:1,color:'cyan'}]};
const p=chart().createCanvas({width:320,height:200}).createData({values:[{category:'A',amount:3}]}).createBarPlot({x:'category',y:'amount',guides:false}).editBarMark({fill:gradient,stroke:'yellow',strokeWidth:4}).editBarMark({cornerRadius:10});
assert.throws(()=>p.editBarMark({blend:'difference'}),/Unknown.*blend/);
const difference=(backdrop,source)=>backdrop.map((v,i)=>Math.abs(v-source[i]));
assert.deepEqual(difference([255,255,255],[255,165,0]),[0,90,255]);
assert.deepEqual(difference([221,221,221],[255,165,0]),[34,56,221]);
console.log(JSON.stringify({status:'confirmed-current-public-gap',gradientCornersStrokeSupported:true,blendRejected:true,sourceOrangeOverWhite:[0,90,255],sameSourceOverGrayGrid:[34,56,221],staticInversionInsufficient:true,pixelsInspected:false}));
