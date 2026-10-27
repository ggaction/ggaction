import { assertEquivalentMeaning } from "../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
import { renderWithNativeTrace } from "../../support/native-canvas-trace.js";
for (const variant of visualVariants) {
  test(`${variant.variant} preserves literal graphics, order, native calls and all pixels`, () => {
    const actual = variant.userFacing(), expected = variant.primitive();
    assertDisplayedProgram(variant, actual);
    assertEquivalentMeaning(actual.graphicSpec, expected.graphicSpec);
    assert.deepEqual(actual.graphicSpec.order, expected.graphicSpec.order);
    const dimensions = { width: variant.width, height: variant.height };
    assert.deepEqual(renderWithNativeTrace(actual, dimensions), renderWithNativeTrace(expected, dimensions));
  });
}

import {categoricalCalls,variant as numericVariant,approvedTargetCases} from './manifest.js';
import {createCombinedLegendsProgram,createMappedCombinedProgram,createOpacitySelectedProgram} from '../../../examples/combined-legends/program.js';
test('approved combined target retains two typed lists, physical areas, mapped labels and selected opacity fonts',()=>{
 const parent=createCombinedLegendsProgram(),categorical=parent.children.categorical,quantitative=parent.children.quantitative;
 assertDisplayedProgram({chart:'combined-legends',variant:'categorical-child',callChain:categoricalCalls.join('\n')+';'},categorical);
 assertDisplayedProgram({chart:'combined-legends',variant:'quantitative-child',callChain:numericVariant.calls.join('\n')+';'},quantitative);
 assert.deepEqual(categorical.guideConfigs.legend.series.sizeAreas,[25,100,225]);
 assert.deepEqual(categorical.graphicSpec.objects.seriesLegendLabels.items.map(i=>i.properties.text),['A','B','C']);
 assert.deepEqual(quantitative.graphicSpec.objects.colorSizeLegendSymbols.items.map(i=>i.properties.radius),[1,2,3]);
 assert.equal(Object.keys(categorical.guideConfigs.legend).length,1);assert.equal(Object.keys(quantitative.guideConfigs.legend).length,1);
 assert.equal(categorical.semanticSpec.datasets[0].values.length,3);assert.equal(quantitative.semanticSpec.datasets[0].values.length,3);
 const mapped=createMappedCombinedProgram();assert.deepEqual(mapped.guideConfigs.legend.colorSize.sampling.values,[0,5,10]);
 assert.deepEqual(mapped.graphicSpec.objects.colorSizeLegendLabels.items.map(i=>i.properties.text),['0','Five','10']);
 const focused=createOpacitySelectedProgram();
 assert.ok(focused.graphicSpec.objects.opacityLegendLabels.items.every(i=>i.properties.fontSize===10));
 assert.ok(focused.graphicSpec.objects.colorSizeLegendLabels.items.every(i=>i.properties.fontSize===12));
 assert.deepEqual(focused.graphicSpec.objects.colorSizeLegendSymbols,quantitative.graphicSpec.objects.colorSizeLegendSymbols);
 assert.deepEqual(Object.keys(approvedTargetCases).map(Number),[164,171,177,205]);
});
