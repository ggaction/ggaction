import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTrailPlot, validateTrailBinding } from "../../../src/grammar/trailPlot.js";
const normalized = () => normalizeTrailPlot({ width: "w" });
const layer = () => ({ mark: { type: "trail" }, trail: normalized().binding, encoding: { x: { field: "x", fieldType: "quantitative", scale: "x" }, y: { field: "y", fieldType: "quantitative", scale: "y" } } });
test("Trail canonical meaning and appearance stay separate and retain explicit zero values", () => {
 const first=normalizeTrailPlot({width:0,closed:true,clip:false,curve:"cardinal",tension:.2,lineCap:"square",lineJoin:"bevel",fillRule:"evenodd",body:{fill:"none",stroke:"red",strokeWidth:0,opacity:0}});
 assert.deepEqual(first.binding,{width:{datum:0},missing:"error"}); assert.equal(first.config.body.opacity,0);
 const next=normalizeTrailPlot({curve:"linear",body:{outline:false,shadow:false}},first.binding,first.config);
 assert.equal(next.config.tension,undefined); assert.equal(first.config.tension,.2); assert.equal(next.config.closed,true);
 validateTrailBinding({...layer(),trail:first.binding},first.config);
});
test("Trail rejects malformed appearance, conditional positions and noncanonical restoration", () => {
 for(const patch of [{},{width:2,clip:1},{width:2,body:{stroke:""}},{width:2,body:{opacity:2}},{width:2,body:{fill:{type:"bogus"}}},{width:2,body:{outline:{width:-1,color:"red"}}},{width:2,body:{fill:undefined}},{width:null},{width:2,unknown:1}]) assert.throws(()=>normalizeTrailPlot(patch));
 const config=normalized().config;
 for(const patch of [{source:{mark:"other"}},{conditionals:{}},{encoding:{...layer().encoding,x:{field:"x",fieldType:"bad",scale:"x"}}},{encoding:{...layer().encoding,pathOrder:{field:"w",order:"bad"}}},{encoding:{...layer().encoding,group:{field:"g",fields:["g"],fieldType:"nominal"}}},{encoding:{...layer().encoding,group:{field:"g",fieldType:"quantitative"}}}]) assert.throws(()=>validateTrailBinding({...layer(),...patch},config));
 const missing={...config};delete missing.clip;assert.throws(()=>validateTrailBinding(layer(),missing),/canonical/);
 assert.throws(()=>validateTrailBinding(layer(),{...config,extra:2}));
 let accessed=0;assert.throws(()=>normalizeTrailPlot({width:2,body:{get opacity(){accessed++;return 1;}}}));assert.equal(accessed,0);
 const ordered={...layer(),encoding:{...layer().encoding,pathOrder:{field:"w",order:"descending"},group:{fields:["g"],fieldType:"nominal"}}};validateTrailBinding(ordered,config);
 const polar={...layer(),encoding:{theta:layer().encoding.x,radius:layer().encoding.y}};
 assert.throws(()=>validateTrailBinding(polar,{...config,curve:"basis"}),/linear/);
 assert.throws(()=>validateTrailBinding({...polar,encoding:{...polar.encoding,x:layer().encoding.x}},config),/mix/);
});
