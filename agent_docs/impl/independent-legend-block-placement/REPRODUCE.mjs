import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { chart } from "../../../src/index.js";
import { resolveConcreteGraphicBounds } from "../../../src/grammar/schemas/graphicBounds.js";
import { serializeProgram } from "../../../src/persistence.js";

const base=chart().createCanvas({width:700,height:700,margin:150})
  .createData({values:[{x:1,y:2,team:"A",amount:1},{x:2,y:3,team:"B",amount:9}]})
  .createScatterPlot({x:"x",y:"y",guides:false})
  .encodeColor({field:"team"}).encodeSize({field:"amount"});
const parent=base.createLegend({channels:["color"],position:"top-left"});
const serializedParent=serializeProgram(parent);
const result=parent.createLegend({channels:["size"],position:"bottom-left"});
assert.equal(serializeProgram(parent),serializedParent);
const blockBounds=(program,prefix)=>{
  const bounds=Object.keys(program.graphicSpec.objects)
    .filter(id=>id.startsWith(prefix)&&!id.includes("__"))
    .map(id=>resolveConcreteGraphicBounds(program.graphicSpec,id)).filter(Boolean);
  return {left:Math.min(...bounds.map(b=>b.left)),top:Math.min(...bounds.map(b=>b.top)),
    right:Math.max(...bounds.map(b=>b.right)),bottom:Math.max(...bounds.map(b=>b.bottom))};
};
const before=blockBounds(parent,"colorLegend"),after=blockBounds(result,"colorLegend");
assert.ok(Math.abs(before.top-158)<1e-8);
assert.ok(after.top>before.top+100,"The first block unexpectedly retained its requested top anchor.");
assert.equal(result.guideConfigs.legendGroups.scatterPlot.placement.position,"bottom-left");
for(const key of ["datasets","layers","scales","coordinates"])
  assert.deepEqual(result.semanticSpec[key],parent.semanticSpec[key]);
assert.deepEqual(result.graphicSpec.objects.scatterPlot,parent.graphicSpec.objects.scatterPlot);
const explicitGroup=base.createLegend({channels:["color"],position:"top-left",blockLayout:"row"});
const serializedGroup=serializeProgram(explicitGroup);
let rejection;
try { explicitGroup.createLegend({channels:["size"],position:"bottom-left"}); }
catch(error){rejection={name:error.name,message:error.message};}
assert.match(rejection?.message??"",/anchor conflicts/);
assert.equal(serializeProgram(explicitGroup),serializedGroup);
const evidence={status:"gap-confirmed",expected:{color:"top-left",size:"bottom-left"},
  actual:{group:result.guideConfigs.legendGroups.scatterPlot,
    storedColorPosition:result.guideConfigs.legend.color.position,
    storedSizePosition:result.guideConfigs.legend.size.position,
    effectiveColorAnchor:result.guideConfigs.legendGroups.scatterPlot.placement.position,
    effectiveSizeAnchor:result.guideConfigs.legendGroups.scatterPlot.placement.position,
    colorBoundsBefore:before,colorBoundsAfter:after,sizeBounds:blockBounds(result,"sizeLegend")},
  explicitExistingGroupRejection:rejection,parentImmutable:true,marksUnchanged:true,dataScalesLayersCoordinatesUnchanged:true,
  sourceModuleBindings:["src/actions/guides/legends/group.js","src/materialization/legendGroups.js"].map(path=>({path,
    sha256:createHash("sha256").update(readFileSync(new URL(`../../../${path}`,import.meta.url))).digest("hex")})),
  newPublicAPIImplemented:false,modelCalls:0,chartPixelsInspected:false};
writeFileSync(new URL("REPRODUCTION.json",import.meta.url),JSON.stringify(evidence,null,2)+"\n");
console.log(JSON.stringify(evidence,null,2));
