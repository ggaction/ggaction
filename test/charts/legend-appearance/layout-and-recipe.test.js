import { assertEquivalentMeaning } from "../../support/identity-equivalence.js";
import assert from'node:assert/strict';
import test from'node:test';
import{summarizeArgs}from'../../../src/core/action.js';
import{serializeProgram,deserializeProgram}from'../../../src/persistence.js';
import{resolveConcreteGraphicBounds}from'../../../src/grammar/schemas/graphicBounds.js';
import{renderWithNativeTrace}from'../../support/native-canvas-trace.js';
import{assertDisplayedProgram,displayedActionCalls}from'../../support/visual-variants.js';
import{appearanceVariants}from'./manifest.js';
import{gradientBlockScene,recipeOpacityScene}from'../../oracles/legend-appearance-scenes.js';

for(const variant of appearanceVariants){
 test(`${variant.variant} preserves independent graph, order, native calls, full RGBA and exact public trace`,()=>{
  const a=variant.userFacing(),b=variant.primitive();assertDisplayedProgram(variant,a);
  assert.deepEqual(a.trace.children.map(({op,args})=>({op,args})),displayedActionCalls(variant.callChain).map(({op,args})=>({op,args:summarizeArgs(args)})));
  assertEquivalentMeaning(a.graphicSpec,b.graphicSpec);assert.deepEqual(a.graphicSpec.order,b.graphicSpec.order);
  assert.deepEqual(a.actionStack,[]);assert.deepEqual(b.actionStack,[]);
  assert.equal(Object.isFrozen(a.graphicSpec),true);assert.equal(Object.isFrozen(b.graphicSpec),true);
  assert.deepEqual(renderWithNativeTrace(a,variant),renderWithNativeTrace(b,variant));
  assert.deepEqual(deserializeProgram(serializeProgram(a)).graphicSpec,a.graphicSpec);
  assert.deepEqual(b.semanticSpec.layers,[]);assert.deepEqual(b.semanticSpec.datasets,[]);
 });
}
test('the independent gradient and local size scene retains literal colors, geometry and owned clearance',()=>{
 const scene=gradientBlockScene();
 assert.equal(scene.colorGradientStrips.length,60);
 assert.equal(scene.colorGradientStrips[0].properties.fill,'#33698d');assert.equal(scene.colorGradientStrips[59].properties.fill,'#fbe626');
 assert.deepEqual(scene.colorGradientBackground.strokeDash,[4,2,6,1]);
 const a=appearanceVariants[0].userFacing(),strips=a.graphicSpec.objects.colorGradientStrips.items;
 const bounds=id=>resolveConcreteGraphicBounds(a.graphicSpec,id,a.materializationConfigs.textMetrics);
 const body=['Strips','Ticks','Labels'].map(suffix=>bounds('colorGradient'+suffix));
 assert.equal(Math.max(...strips.map(i=>i.properties.x+i.properties.width))-strips[0].properties.x,120);
 assert.equal(strips[0].properties.height,16);
 assert.equal(bounds('colorGradientTitle').top-Math.max(...body.map(b=>b.bottom)),12);
 assert.ok(Math.abs(Math.min(bounds('sizeLegendSymbols').left,bounds('sizeLegendLabels').left)-8)<1e-12);
 assert.equal(Math.max(bounds('sizeLegendSymbols').bottom,bounds('sizeLegendLabels').bottom),262);
 assert.equal(a.guideConfigs.legend.size.blockOverrides['["size"]'].position,'bottom-left');
 assert.equal(a.guideConfigs.legend.gradient.gradientDirection,'horizontal');
 for(const opacity of[0,.7,1]){
  const s=recipeOpacityScene(opacity);assert.equal(s.colorLegendSymbolPoints[0].properties.opacity,opacity);
  assert.equal(s.colorLegendSymbolLines[0].properties.opacity,opacity);
  assert.equal(s.colorLegendSymbolPoints[0].properties.radius,6);assert.equal(s.colorLegendSymbolLines[0].properties.x2-s.colorLegendSymbolLines[0].properties.x1,40);
  assert.equal(s.colorLegendLabels[0].properties.fill,'#222');
 }
});
