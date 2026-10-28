import test from "node:test";
import assert from "node:assert/strict";
import { createImageExample } from "../../../examples/image-assets/program.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { imageResourceHandler, validateImageBinding } from "../../../src/materialization/imageState.js";
const program = createImageExample(), text = serializeProgram(program);

test("offline image restoration rejects corrupted payload, resource envelopes and live bindings", () => {
  const changes = [
    state => { delete state.semanticSpec.resources[0].options.maxBytes; },
    state => { state.semanticSpec.resources[0].options.maxBytes = 1; },
    state => { state.semanticSpec.resources[0].result.extra = 1; },
    state => { delete state.semanticSpec.resources[0].result.width; },
    state => { state.semanticSpec.resources[0].result.payload.data = "bad"; },
    state => { state.semanticSpec.resources[0].options.expectedHash = "a".repeat(64); },
    state => { state.semanticSpec.resources[0].provenance.origin = "derived"; },
    state => { state.semanticSpec.resources[0].inputs.push({kind:"image",id:"logo",revision:0}); },
    state => { state.semanticSpec.layers[0].image.revision = 1; },
    state => { state.semanticSpec.layers[0].image.id = "missing"; },
    state => { state.semanticSpec.layers[0].alt = null; },
    state => { state.semanticSpec.layers[0].data = "fake"; },
    state => { state.semanticSpec.layers[0].coordinate = "fake"; },
    state => { state.semanticSpec.layers[0].encoding = {x:{datum:1}}; },
    state => { state.semanticSpec.layers[0].conditionals = {x:{}}; },
    state => { state.materializationConfigs.marks.image.fit = "invalid"; },
    state => { state.materializationConfigs.marks.image.extra = 1; }
  ];
  for (const change of changes) {
    const envelope=JSON.parse(text), state=decodeValue(envelope.payload);change(state);envelope.payload=encodeValue(state);
    assert.throws(()=>deserializeProgram(JSON.stringify(envelope)));
  }
  assert.equal(serializeProgram(deserializeProgram(text)),serializeProgram(deserializeProgram(text)));
});

test("image handler enforces authored ownership and rejects semantic bindings on other marks", () => {
  const resource=program.semanticSpec.resources[0];
  for (const change of [value=>{value.ownership.mode="derived";},value=>{value.provenance.extra=true;},value=>{value.inputs=[{kind:"image",id:"logo",revision:0}];}]) {
    const value=structuredClone(resource);change(value);assert.throws(()=>imageResourceHandler.validateStored(value),/authored/);
  }
  assert.throws(()=>validateImageBinding(program,{mark:{type:"point"},alt:"unexpected"}),/image mark/);
  assert.throws(()=>validateImageBinding(program,{mark:{type:"image"},image:{kind:"parameter",id:"logo",revision:0}}),/image resource/);
  for (const property of ["data","coordinate","encoding","conditionals","alt"]) {
    const layer=structuredClone(program.semanticSpec.layers[0]);layer[property]=["encoding","conditionals"].includes(property)?{x:{}}:property==="alt"?null:"fake";
    assert.throws(()=>validateImageBinding(program,layer),/cannot bind/);
  }
});
