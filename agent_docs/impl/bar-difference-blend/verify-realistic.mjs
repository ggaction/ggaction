import assert from "node:assert/strict";
import {writeFile} from "node:fs/promises";
import {REALISTIC_DIRECT_LIFECYCLE_COVERAGE_RECIPES as recipes} from "../../../test/support/scenarios/realistic-direct-lifecycle-coverage-recipes.js";
import {releaseTidyTuesdaySourceCache} from "../../../test/support/datasets/tidytuesday.js";
import {renderToSVG} from "../../../src/renderers/svg.js";
const recipe=recipes.find(recipe=>recipe.id==="realistic-direct-lifecycle-data-mark-coverage");
const results=[];
for(const dataset of ["tt-penguins","tt-global-temperatures","tt-london-marathon-winners"]){
  assert.ok(recipe.datasets.includes(dataset));
  for(let repetition=0;repetition<5;repetition++){
    const factors={dataset,profile:recipe.factorsForDataset(dataset).profile[0]},program=recipe.build(factors);
    const calls=program.trace.children.filter(node=>node.op==="editBarMark"&&node.args.blend);
    assert.deepEqual(calls.map(node=>node.args.blend),["normal","difference"]);
    assert.ok(program.graphicSpec.objects.maximalBars.items.length>0);
    assert.ok(program.graphicSpec.objects.maximalBars.items.every(item=>item.properties.blend==="difference"));
    const svg=renderToSVG(program);assert.match(svg,/mix-blend-mode:difference/);
    const metadata=recipe.describe(factors);
    results.push({dataset,repetition,source:metadata.provenance,barItems:program.graphicSpec.objects.maximalBars.items.length,svgBytes:Buffer.byteLength(svg),modes:calls.map(node=>node.args.blend)});
    releaseTidyTuesdaySourceCache(dataset);
  }
}
const report={status:"passed",programs:results.length,datasets:3,occurrencesPerMode:results.length,results};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({status:report.status,programs:report.programs,datasets:report.datasets,occurrencesPerMode:report.occurrencesPerMode}));
