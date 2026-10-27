import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chart } from "../../../src/index.js";
import { createCompoundPathExample } from "../../../examples/compound-path/program.js";
import { variants, pixelCommands } from "../../../examples/compound-path/data.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../src/persistence/codec.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createTransitionScene } from "../../../src/scene.js";
for(const variant of variants) test(`${variant.id}: immutable edits, persistence and scenes preserve authored topology`,()=>{
  const program=createCompoundPathExample(variant),before=serializeProgram(program);
  assert.equal(JSON.parse(before).schemaVersion,4);assert.equal(JSON.parse(serializeGraphic(program)).schemaVersion,1);
  assert.equal(serializeProgram(deserializeProgram(before)),before);
  assert.deepEqual(deserializeGraphic(serializeGraphic(program)).graphicSpec,program.graphicSpec);
  const after=program.editGraphics({target:"shape",property:"opacity",value:0.5});
  assert.equal(serializeProgram(program),before);assert.notEqual(renderToSVG(after),renderToSVG(program));
  for(const format of ["canvas","svg"]){const scene=createTransitionScene(program,{format});assert.deepEqual(structuredClone(scene),scene);assert.equal(createTransitionScene(program,{format}),scene);}
  assert.equal(deserializeProgram(serializeProgram(after.editGraphics({target:"shape",remove:true}))).graphicSpec.objects.shape,undefined);
});
test("path items broadcast and distribute fill rules without mutating caller commands",()=>{
  const commands=structuredClone(pixelCommands(variants[0]));
  const p=chart().createGraphics({id:"paths",type:"path",length:2}).editGraphics({target:"paths",property:"commands",value:[commands,commands]}).editGraphics({target:"paths",property:"fillRule",value:"evenodd"});
  commands[0].x=999;assert.notEqual(p.graphicSpec.objects.paths.items[0].properties.commands[0].x,999);
  const q=p.editGraphics({target:"paths",property:"fillRule",value:["nonzero","evenodd"]});
  assert.deepEqual(q.graphicSpec.objects.paths.items.map(v=>v.properties.fillRule),["nonzero","evenodd"]);
  const mixed=chart().createGraphics({id:"mixed",type:"collection"}).editGraphics({target:"mixed",property:"items",value:[{type:"path",properties:{commands}},{type:"rect",properties:{}}]});
  const before=JSON.stringify(mixed);assert.throws(()=>mixed.editGraphics({target:"mixed",property:"fillRule",value:"evenodd"}));assert.equal(JSON.stringify(mixed),before);
});
test("invalid fill rules, commands and owner clips fail atomically",()=>{
  const p=createCompoundPathExample(),before=serializeProgram(p);
  for(const [target,property,value] of [["shape","fillRule","other"],["underlay","fillRule","evenodd"],["shape","commands",[{op:"M",x:0,y:0},{op:"Z"},{op:"L",x:1,y:1}]],["shape","clip",{type:"path",commands:[],fillRule:"evenodd"}],["shape","clip",{type:"path",commands:pixelCommands(variants[0]),extra:1}],["canvas","clip",{type:"path",commands:pixelCommands(variants[0])}]]){
    assert.throws(()=>p.editGraphics({target,property,value}));assert.equal(serializeProgram(p),before);
  }
  const clipped=p.editGraphics({target:"shape",property:"clip",value:{type:"path",commands:pixelCommands(variants[0])}});
  assert.equal(clipped.editGraphics({target:"shape",property:"clip",value:false}).graphicSpec.objects.shape.clip,undefined);
});
test("legacy editable versions reject compound grammar instead of accepting forged newer graphics",()=>{
  for(const version of [1,2,3]) for(const variant of variants){
    const envelope=JSON.parse(serializeProgram(createCompoundPathExample(variant))),state=decodeValue(envelope.payload);
    delete state.semanticSpec.resources;envelope.schemaVersion=version;envelope.payload=encodeValue(state);
    assert.throws(()=>deserializeProgram(JSON.stringify(envelope)),/subpath|snapshot version 4|L or C/);
  }
});
test("legacy editable versions restore original path grammar and reject newer topology without fillRule",()=>{
  const move={op:"M",x:1,y:2},line={op:"L",x:4,y:5};
  for(const version of [1,2,3]) for(const commands of [[move],[move,line],[move,line,{op:"Z"}],[move,line,{op:"M",x:8,y:9}],[move,{op:"Z"}]]){
    const p=chart().createCanvas({width:20,height:20,margin:0})
      .createGraphics({id:"path",type:"path",parent:"plot-main"})
      .editGraphics({target:"path",property:"stroke",value:"black"})
      .editGraphics({target:"path",property:"strokeWidth",value:1})
      .editGraphics({target:"path",property:"commands",value:commands});
    const envelope=JSON.parse(serializeProgram(p)),state=decodeValue(envelope.payload);
    delete state.semanticSpec.resources;envelope.schemaVersion=version;envelope.payload=encodeValue(state);
    const snapshot=JSON.stringify(envelope),legacy=commands.length===1||commands[1].op==="L"&&commands.at(-1).op!=="M";
    if(legacy){
      const restored=deserializeProgram(snapshot);
      assert.deepEqual(restored.graphicSpec.objects.path.properties.commands,commands);
      assert.equal(renderToSVG(restored),renderToSVG(p));
    }else assert.throws(()=>deserializeProgram(snapshot),/one subpath|at least one L or C/);
    assert.equal(JSON.stringify(envelope),snapshot);
  }
});
test("a fresh process can restore, edit and remove compound graphics",()=>{
  const snapshots=variants.map(v=>serializeProgram(createCompoundPathExample(v)));
  const result=spawnSync(process.execPath,["--input-type=module","-e",`
    import {readFileSync} from 'node:fs';import {deserializeProgram,serializeProgram} from './src/persistence.js';
    const values=JSON.parse(readFileSync(0,'utf8'));console.log(JSON.stringify(values.map(value=>{
      const p=deserializeProgram(value),q=p.editGraphics({target:'shape',property:'opacity',value:0.2});
      return serializeProgram(p)===value && deserializeProgram(serializeProgram(q.editGraphics({target:'shape',remove:true}))).graphicSpec.objects.shape===undefined;
    })));`],{input:JSON.stringify(snapshots),encoding:"utf8",timeout:30000});
  assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),variants.map(()=>true));
});

test("compound graphics keep mark identity, accessible rows and compatible overrides during rematerialization",async()=>{
  const {getMarkItems}=await import("../../../src/inspection.js");
  const {exportAccessibleData}=await import("../../../src/accessibility.js");
  const p=chart().createCanvas().createData({id:"d",values:[{x:1,y:2},{x:2,y:3}]})
    .createLinePlot({id:"line",data:"d",x:"x",y:"y",guides:false});
  const commands=pixelCommands(variants[0]);
  const q=p.editGraphics({target:"line",property:"commands",value:[commands]})
    .editGraphics({target:"line",property:"fillRule",value:"evenodd"})
    .editGraphics({target:"line",property:"clip",value:{type:"path",commands,fillRule:"nonzero"}});
  const original=getMarkItems(p,{target:"line"})[0],edited=getMarkItems(q,{target:"line"})[0];
  assert.equal(edited.key,original.key);assert.deepEqual(edited.rows,original.rows);
  assert.deepEqual(edited.geometry[0].properties.commands,commands);assert.equal(edited.geometry[0].properties.fillRule,"evenodd");
  assert.deepEqual(exportAccessibleData(q),exportAccessibleData(p));
  const resized=q.editCanvas({width:700});
  assert.equal(resized.graphicSpec.objects.line.items[0].properties.fillRule,"evenodd");
  assert.deepEqual(resized.graphicSpec.objects.line.clip,q.graphicSpec.objects.line.clip);
  assert.equal(getMarkItems(resized,{target:"line"})[0].key,original.key);
  assert.notDeepEqual(resized.graphicSpec.objects.line.items[0].properties.commands,commands);
  assert.deepEqual(deserializeProgram(serializeProgram(resized)).graphicSpec,resized.graphicSpec);
});
