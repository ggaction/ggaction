import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWaterfallPlot, validateWaterfallBinding, readWaterfallItems } from "../../../src/grammar/waterfallPlot.js";
const make = patch => normalizeWaterfallPlot({ role: "role", ...patch });
const layer = binding => ({ id: "steps", mark: { type: "waterfall" }, waterfall: binding, encoding: { x: { field: "stage", fieldType: "nominal", scale: "x" }, y: { field: "value", fieldType: "quantitative", scale: "y" } } });
test("Waterfall retains one canonical owner for field roles, appearance and label meaning", () => {
 const state=make({reset:"reset",labels:{content:"end",fontSize:14},connectors:{strokeWidth:2}});validateWaterfallBinding(layer(state.binding),state.config);
 assert.deepEqual(state.binding,{role:"role",reset:"reset",labels:{content:"end",format:"auto"}});assert.equal(state.config.labels.fontSize,14);assert.equal(state.binding.width,undefined);assert.ok(Object.isFrozen(state.config.bars));
 const edited=normalizeWaterfallPlot({reset:false,labels:false,connectors:false},state.binding,state.config);assert.equal(edited.binding.reset,undefined);assert.equal(edited.config.connectors,false);assert.equal(state.binding.reset,"reset");
});
test("Waterfall source membership follows explicit totals and reset without using category labels as identity", () => {
 const rows=[{role:"delta",value:5},{role:"delta",value:-2},{role:"subtotal"},{role:"total",value:10,reset:true},{role:"delta",value:2},{role:"total"}];
 const result=readWaterfallItems({values:rows,rowKeys:[1,"1",2,3,4,5]},layer(make({reset:"reset"}).binding));
 assert.deepEqual(result.items.map(i=>i.memberIndices),[[0],[1],[0,1,2],[3],[4],[4,5]]);assert.equal(result.running,2);
});
test("Waterfall closes authored options and stored binding shapes", () => {
 for(const patch of [{role:null},{role:undefined},{reset:1},{width:{band:0}},{width:{pixels:2,band:1}},{width:{pixels:undefined}},{bars:{fill:"red"}},{bars:{positiveFill:null}},{connectors:{strokeWidth:-1}},{labels:{content:"x"}},{labels:{offset:-1}},{labels:{fontSize:0}},{labels:{fontWeight:[]}}, {labels:{content:undefined}},{clip:1}]) assert.throws(()=>make(patch));
 const state=make({});const l=layer(state.binding);
 for(const [binding,config] of [[{...l,conditionals:{}},state.config],[{...l,source:"other"},state.config],[{...l,encoding:{...l.encoding,x:{...l.encoding.x,fieldType:"quantitative"}}},state.config],[l,{...state.config,width:{pixels:8,band:1}}],[l,{...state.config,labels:{}}],[l,{...state.config,extra:true}],[{...l,waterfall:{role:"role",labels:{content:"value",format:"auto",extra:1}}},{...state.config,labels:{}}]])assert.throws(()=>validateWaterfallBinding(binding,config));
 assert.throws(()=>validateWaterfallBinding(l,{...state.config,bars:{positiveFill:"red"}}),/canonical/);
});
test("Waterfall bounds source projection work before allocating repeated contribution lists", () => {
 const values=[...Array.from({length:4000},()=>({role:"delta",value:1})),...Array.from({length:3000},()=>({role:"total"}))];
 assert.throws(()=>readWaterfallItems({values,rowKeys:values.map((_,i)=>i)},layer(make({}).binding)),/membership work/);
});
