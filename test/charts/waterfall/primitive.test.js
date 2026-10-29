import test from "node:test";
import assert from "node:assert/strict";
import { createWaterfallPrimitive } from "./primitive.program.js";
import { expected } from "./reference-values.js";
test("Waterfall primitive independently fixes signed contribution endpoints and totals",()=>{
 const p=createWaterfallPrimitive(),items=p.graphicSpec.objects.waterfall.items;
 const bars=items.filter(i=>i.type==="rect");
 assert.deepEqual(bars.map(i=>[i.properties.y,i.properties.height]),[[160,120],[160,48],[208,72],[112,96],[112,168]]);
 assert.deepEqual(bars.map(i=>i.properties.fill),["#16a34a","#dc2626","#64748b","#16a34a","#2563eb"]);
 assert.deepEqual(items.filter(i=>i.type==="path").map(i=>i.properties.commands),expected.connectors.slice(1).map(([x1,x2,y])=>[{op:"M",x:x1,y},{op:"L",x:x2,y}]));
 assert.deepEqual(p.graphicSpec.objects["plot-main"].children,["waterfall"]);
});
test("Waterfall primitive label and connector switches preserve all bar geometry",()=>{
 const bare=createWaterfallPrimitive(),labeled=createWaterfallPrimitive({labels:true,connectors:false});
 assert.deepEqual(labeled.graphicSpec.objects.waterfall.items.filter(i=>i.type==="rect").map(i=>i.properties),bare.graphicSpec.objects.waterfall.items.filter(i=>i.type==="rect").map(i=>i.properties));
 assert.deepEqual(labeled.graphicSpec.objects.waterfall.items.filter(i=>i.type==="text").map(i=>[i.properties.x,i.properties.y,i.properties.text]),[[82,154,"5"],[166,154,"-2"],[250,202,"3"],[334,106,"4"],[418,106,"7"]]);
});
