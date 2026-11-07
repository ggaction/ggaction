import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {buildPublicOptionInventory} from "../support/scenarios/coverage-inventory.js";
import {literalValueKey} from "../support/scenarios/coverage-ledger.js";
import {releaseTidyTuesdaySourceCache} from "../support/datasets/tidytuesday.js";
import {datasetDefinition} from "../support/datasets/catalog.js";
import {chart, hconcat} from "../../src/index.js";
import {directProgramTrace, programTraceOwners} from "../support/program-traces.js";
import {realisticRecordView} from "../support/scenarios/realistic-data.js";
import {appendRealisticColorControls} from "../support/scenarios/realistic-color-controls.js";
import {realisticResourcePalettePrograms} from "../support/scenarios/realistic-resource-palette.js";
import {REALISTIC_ENCODING_COVERAGE_RECIPES as encodingRecipes} from "../support/scenarios/realistic-encoding-coverage-recipes.js";
import {REALISTIC_GUIDE_SCALE_RECIPES as guideRecipes} from "../support/scenarios/realistic-guide-scale-recipes.js";
import {REALISTIC_CARTESIAN_FACADE_COVERAGE_RECIPES as cartesianRecipes} from "../support/scenarios/realistic-cartesian-facade-coverage-recipes.js";
import {REALISTIC_FACADE_OPTION_RECIPES as facadeRecipes} from "../support/scenarios/realistic-facade-option-recipes.js";
import {referenceLinearStatistics} from "../oracles/regression-statistics.js";
import {renderToSVG} from "../../src/renderers/svg.js";

const DATASETS = ["tt-penguins","tt-london-marathon-winners","tt-astronauts",
  "tt-us-births","tt-chocolate-ratings"];
const COLOR_ACTIONS = new Set(["createScale","editScale","editColorScale","editStrokeScale",
  "encodeColor","encodeStroke","createScatterPlot","createBarPlot","createHeatmap",
  "createPolarScatterPlot","createStripPlot","createBeeswarmPlot","createIntervalPlot",
  "createRegressionPlot","createTextPlot"]);
const FIT_ACTIONS = new Set(["createRegression","editRegression","createRegressionData",
  "editRegressionData","createRegressionPlot"]);
const COMPUTED_ACTIONS = new Set(["createComputedData","editComputedData"]);
const STATISTICS_ACTIONS = new Set(["createRegressionStatisticsData","editRegressionStatisticsData"]);
let inventoryPromise;
const publicInventory = () => inventoryPromise ??= buildPublicOptionInventory(
  JSON.parse(readFileSync(new URL("../../knowledge/action-cards.json",import.meta.url))));

function targets(inventory) {
  const options=inventory.optionPaths.filter(option=>option.required && (
    COLOR_ACTIONS.has(option.action) && /(?:^|\.)(?:whitePoint|gamma|exponent)$/u.test(option.path) &&
      (["createScale","editScale","editColorScale","editStrokeScale"].includes(option.action)||/(?:color|stroke|scale)/iu.test(option.path)) ||
    COMPUTED_ACTIONS.has(option.action) && ["expression.part","expression.timeZone"].includes(option.path) ||
    STATISTICS_ACTIONS.has(option.action) && !option.path.startsWith("target.") &&
      !(option.action === "createRegressionStatisticsData" && option.path === "target")
  ));
  const optionIds=new Set(options.map(option=>option.id));
  const literals=inventory.pathLiteralRequirements.filter(requirement=>{
    if(optionIds.has(requirement.optionPath))return true;
    const option=inventory.optionPaths.find(option=>option.id===requirement.optionPath);
    return COLOR_ACTIONS.has(option.action) && /(?:^|\.)type$/u.test(option.path) &&
      requirement.valueKey==="string:pow" &&
      (["createScale","editScale","editColorScale","editStrokeScale"].includes(option.action)||/(?:color|stroke|scale)/iu.test(option.path)) ||
      FIT_ACTIONS.has(option.action) && option.path==="method" && requirement.valueKey==="string:exp";
  });
  return {options,literals};
}
function valuesAt(args,path){
  let values=[args];
  for(const name of path.split("."))values=values.flatMap(value=>{
    if(!value||typeof value!=="object")return [];
    if(Object.hasOwn(value,name))return [value[name]];
    const count=value[`${name}Count`];
    return Number.isInteger(count)&&count>0?[{summarizedArray:true,length:count}]:[];
  });
  return values.filter(value=>value!==undefined);
}
function digest(ids){return createHash("sha256").update(ids.sort().join("\n")).digest("hex");}
function close(actual,expected){assert.ok(Math.abs(actual-expected)<=1e-9*Math.max(1,Math.abs(expected)),`${actual} versus ${expected}`);}

// Existing pinned real-data projections and recipes supply the observations.
// This test locks the new contract surface and requires direct execution on each source;
// a changed inventory fingerprint alone cannot satisfy a requirement.
test("computed, fit, statistics and color additions have actual public 5/3 witnesses",{timeout:600000},async()=>{
  const inventory=await publicInventory();
  const target=targets(inventory);
  assert.deepEqual({options:target.options.length,literals:target.literals.length,sha256:digest([...target.options,...target.literals].map(value=>value.id))},
    {options:84,literals:87,sha256:"c4f83a4e2cdd374b532c0e81f291f928ee6f4cda402b8fabbe5d4e1690b79359"});
  const stats=new Map([...target.options,...target.literals].map(value=>[value.id,{occurrences:0,datasets:new Set()}]));
  const expressionStats=new Map(["createComputedData:floor","createComputedData:datePart","editComputedData:floor","editComputedData:datePart"].map(id=>[id,{occurrences:0,datasets:new Set()}]));
  const optionsByAction=new Map();
  for(const option of target.options){const list=optionsByAction.get(option.action)??[];list.push(option);optionsByAction.set(option.action,list);}
  const literalOptions=new Map(inventory.optionPaths.map(option=>[option.id,option]));
  let builds=0;
  function record(program,dataset){
    const observed=new Set();
    for(const entry of directProgramTrace(program)){
      for(const option of optionsByAction.get(entry.op)??[])if(valuesAt(entry.args,option.path).length)observed.add(option.id);
      for(const requirement of target.literals){const option=literalOptions.get(requirement.optionPath);
        if(option.action===entry.op && valuesAt(entry.args,option.path).some(value=>literalValueKey(value)===requirement.valueKey))observed.add(requirement.id);}
      const expressionId=`${entry.op}:${entry.args?.expression?.op}`;
      if(expressionStats.has(expressionId)){expressionStats.get(expressionId).occurrences++;expressionStats.get(expressionId).datasets.add(dataset);}
    }
    for(const id of observed){stats.get(id).occurrences++;stats.get(id).datasets.add(dataset);}
    assert.match(renderToSVG(program),/<(?:circle|path|rect)\b/u);
    builds++;
  }
  function build(recipe,dataset,variant){
    const domains=recipe.factorsForDataset(dataset);assert.ok(domains,`${recipe.id} ${dataset}`);
    const factors={dataset,...(domains.fieldPair?{fieldPair:domains.fieldPair[0]}:{}),
      ...(domains.profile?{profile:domains.profile[0]}:{}),...(variant?{variant}:domains.variant?{variant:domains.variant[0]}:{})};
    const program=recipe.build(factors);const metadata=recipe.describe(factors);
    assert.equal(datasetDefinition(dataset).corpus,"tidytuesday");
    assert.equal(metadata.provenance.sourceDataset,dataset);
    assert.ok(metadata.provenance.sourceRowCount>0);
    record(program,dataset);return program;
  }
  for(const dataset of DATASETS){
    try{
      const view=realisticRecordView(dataset,{includeSecondaryMeasure:true,includeSecondaryDimension:true,
        deriveSubgroup:true,rowLimit:96,groupLimit:8});
      const rows=view.rows.map(row=>({...row,positiveX:row.sourceRowIndex+1,
        positiveY:Math.abs(row.value)+1,lower:(Math.abs(row.value)+1)*.88,
        upper:(Math.abs(row.value)+1)*1.12}));
      assert.equal(view.provenance.sourceDataset,dataset);
      assert.deepEqual(rows.map(row=>row.sourceRowIndex),view.rows.map(row=>row.sourceRowIndex));
      const sourceSnapshot=JSON.stringify(rows);
      let program=chart().createCanvas({width:1200,height:800,margin:100})
        .createData({id:"analysisRows",values:rows})
        .createScatterPlot({id:"observations",x:{field:"positiveX",scale:{id:"observation-x",type:"pow",exponent:2}},
          y:{field:"positiveY",scale:{id:"observation-y",type:"pow",exponent:2}},
          size:{field:"positiveY",scale:{id:"observation-size",type:"pow",exponent:2}},guides:false})
        .createComputedData({id:"rounded",source:"analysisRows",as:"roundedValue",
          expression:{op:"floor",operand:{field:"positiveY"}}})
        .editComputedData({target:"rounded",as:"lowerValue",expression:{op:"floor",operand:{field:"positiveY"}}})
        .createComputedData({id:"year",source:"analysisRows",as:"sourceYear",expression:{op:"datePart",part:"year",timeZone:"UTC",
          operand:{op:"parseTime",operand:{field:"time"}}}})
        .editComputedData({target:"year",expression:{op:"datePart",part:"year",timeZone:"Europe/Copenhagen",
          operand:{op:"parseTime",operand:{field:"time"}}}})
        .createRegression({target:"observations",method:"exp",band:false})
        .editRegression({target:"observations",method:"exp",line:{strokeWidth:2.3}})
        .createRegressionData({id:"exponentialFit",source:"analysisRows",x:"positiveX",y:"positiveY",method:"exp"})
        .editRegressionData({target:"exponentialFit",method:"exp",predict:{domain:[rows[0].positiveX,rows.at(-1).positiveX],steps:48}})
        .createRegressionData({id:"linearFit",source:"analysisRows",x:"positiveX",y:"positiveY",interval:false})
        .createRegressionStatisticsData({id:"statistics",source:"linearFit"})
        .createRegressionData({id:"alternateFit",source:"analysisRows",x:"positiveY",y:"positiveX",interval:false})
        .editRegressionStatisticsData({target:"statistics",source:"alternateFit"});
      assert.deepEqual(program.semanticSpec.datasets[0].values,rows);
      assert.equal(JSON.stringify(rows),sourceSnapshot);
      const rounded=program.semanticSpec.datasets.find(data=>data.transform?.[0]?.as==="lowerValue").values;
      rounded.forEach((row,index)=>assert.equal(row.lowerValue,Math.floor(rows[index].positiveY)));
      const statistics=program.semanticSpec.datasets.find(data=>data.transform?.[0]?.type==="regressionStatistics").values[0];
      const expected=referenceLinearStatistics(rows,"positiveY","positiveX");
      assert.equal(statistics.count,expected.count);close(statistics.intercept,expected.intercept);close(statistics.slope,expected.slope);
      if(expected.rSquared===null)assert.equal(statistics.rSquared,null);else close(statistics.rSquared,expected.rSquared);
      const colorProgram=appendRealisticColorControls(chart().createCanvas({width:1200,height:800,margin:100})
        .createData({id:"analysisRows",values:rows}));
      record(hconcat({id:"computedAndColor",programs:[
        {id:"computed",program},{id:"color",program:colorProgram}
      ],gap:24}),dataset);
      build(encodingRecipes.find(recipe=>recipe.id.includes("appearance")),dataset);
      for(const variantId of ["color-sequential-viridis-lab","color-sequential-viridis-hcl","color-sequential-viridis-cubehelix","color-pow"]){
        // Palette/interpolation pairs are distributed between the two existing
        // schedules, so resolve the exact owner instead of inventing a variant.
        const owner=guideRecipes.find(recipe=>recipe.factors.variant?.some(variant=>variant.id===variantId));
        assert.ok(owner,variantId);build(owner,dataset,owner.factors.variant.find(variant=>variant.id===variantId));
      }
      for(const suffix of ["scatter","bar"]){const recipe=cartesianRecipes.find(recipe=>recipe.id.endsWith(suffix));
        for(const ordinal of suffix==="scatter"?[11,12,13,14,15]:[3,4,5,6,7]){
          const variant=recipe.factorsForDataset(dataset).variant.find(variant=>variant.ordinal===ordinal);assert.ok(variant);build(recipe,dataset,variant);
        }
      }
      const heatmap=facadeRecipes.find(recipe=>recipe.expectedDirectActions[0]==="createHeatmap");
      for(const id of ["sequential-lab","sequential-hcl","sequential-cubehelix","pow-lab"]){
        const variant=heatmap.factorsForDataset(dataset).variant.find(variant=>variant.id===id);assert.ok(variant,id);build(heatmap,dataset,variant);
      }
      console.log(JSON.stringify({completedDataset:dataset,actualBuilds:builds}));
    }finally{releaseTidyTuesdaySourceCache(dataset);}
  }
  const missing=[...stats].filter(([,value])=>value.occurrences<5||value.datasets.size<3).map(([id,value])=>({id,occurrences:value.occurrences,datasets:[...value.datasets]}));
  assert.deepEqual(missing,[]);
  assert.deepEqual([...expressionStats].filter(([,value])=>value.occurrences<5||value.datasets.size<3),[]);
  assert.equal(builds,100);
  console.log(JSON.stringify({requirementCount:stats.size,requirementSha256:digest([...stats.keys()]),actualBuilds:builds,minimumOccurrences:5,minimumDatasets:3}));
});

// Every range-object branch remains an execution obligation as new public
// consumers are added. Inventory declarations alone are not observations.
test("palette range objects have actual public 5/3 witnesses at every restored consumer",{timeout:600000},async()=>{
  const {realisticDirectPaletteRangeProgram}=await import("../support/scenarios/realistic-direct-lifecycle-coverage-recipes.js");
  const {REALISTIC_STATISTICAL_FACADE_COVERAGE_RECIPES:statisticalRecipes}=await import("../support/scenarios/realistic-statistical-facade-coverage-recipes.js");
  const inventory=await publicInventory();
  const options=inventory.optionPaths.filter(option=>option.required&&/(?:^|\.)range\.palette(?:\.|$)/u.test(option.path));
  assert.equal(options.length,200);
  assert.equal(digest(options.map(value=>value.id)),"b3c9eb622b877a277f4b71834559776054419a497a0f0e74414be4748bd58a8f");
  const nativeOptions=options.filter(option=>["createTrailPlot","editTrailPlot","createTablePlot","editTablePlot"].includes(option.action));
  assert.deepEqual(nativeOptions.map(option=>option.id).sort(),
    ["createTrailPlot","editTrailPlot","createTablePlot","editTablePlot"].flatMap(action=>
      ["", ".count", ".extent", ".name"].map(suffix=>`option-path:${action}.color.scale.range.palette${suffix}`)).sort());
  const stats=new Map(options.map(option=>[option.id,{occurrences:0,datasets:new Set(),values:new Set()}]));
  let builds=0;
  function record(program,dataset,metadata){
    const observed=new Map();
    for(const entry of directProgramTrace(program)){
      for(const option of options){
        if(option.action!==entry.op)continue;
        const values=valuesAt(entry.args,option.path);
        if(!values.length)continue;
        if(option.path.endsWith(".extent"))assert.ok(values.every(value=>
          Array.isArray(value)?value.length===2:value.summarizedArray===true&&value.length===2));
        const seen=observed.get(option.id)??new Set();
        for(const value of values)seen.add(literalValueKey(value));
        observed.set(option.id,seen);
      }
    }
    for(const [id,values] of observed){const value=stats.get(id);value.occurrences++;value.datasets.add(dataset);for(const key of values)value.values.add(key);}
    assert.equal(datasetDefinition(dataset).corpus,"tidytuesday");
    const raw=programTraceOwners(program).flatMap(owner=>
      owner.semanticSpec.datasets.filter(data=>data.id==="analysisRows"));
    assert.ok(raw.length>0);
    assert.ok(raw.every(data=>data.values.length>0));
    assert.equal(metadata.provenance.sourceRowIndexBasis,"zero-based-data-row-in-pinned-csv");
    assert.match(metadata.provenance.sourceSelectionSha256,/^[a-f0-9]{64}$/u);
    assert.equal(metadata.provenance.indexEncoding,"sorted-zero-based-indexes-sha256-v1");
    assert.match(renderToSVG(program),/<(?:circle|path|rect)\b/u);
    builds++;
  }
  function build(recipe,dataset,variant){
    const domains=recipe.factorsForDataset(dataset);assert.ok(domains,`${recipe.id} ${dataset}`);
    const factors={dataset,...(domains.fieldPair?{fieldPair:domains.fieldPair[0]}:{}),
      ...(domains.profile?{profile:domains.profile[0]}:{}),...(variant?{variant}:domains.variant?{variant:domains.variant[0]}:{})};
    const program=recipe.build(factors);const metadata=recipe.describe(factors);
    assert.equal(metadata.provenance.sourceDataset,dataset);
    assert.ok(metadata.provenance.sourceRowCount>0);
    record(program,dataset,metadata);
  }
  for(const dataset of DATASETS){
    try{
      const direct=realisticDirectPaletteRangeProgram(dataset);
      record(direct.program,dataset,{provenance:direct.provenance});
      const adjacent = direct.program.createAdjacentPlot({id:"palettePanel",source:"paletteObservations",share:{},
        plot:{action:"createScatterPlot",options:{data:"analysisRows",x:"positiveX",y:"positiveY",guides:false,
          color:{field:"positiveY",fieldType:"quantitative",scale:{type:"sequential",range:{palette:{name:"blues",extent:[.1,.9]}}}},
          stroke:{field:"positiveY",fieldType:"quantitative",scale:{type:"sequential",range:{palette:{name:"reds",extent:[.1,.9]}}}}}}});
      record(adjacent,dataset,{provenance:direct.provenance});
      const layer = direct.program.createLayerPlot({id:"paletteLayer",source:"paletteObservations",
        plot:{action:"createScatterPlot",options:{guides:false,
          color:{field:"positiveY",fieldType:"quantitative",scale:{id:"layerPaletteColor",type:"sequential",range:{palette:{name:"blues",extent:[.1,.9]}}}},
          stroke:{field:"positiveY",fieldType:"quantitative",scale:{id:"layerPaletteStroke",type:"sequential",range:{palette:{name:"reds",extent:[.1,.9]}}}}}}});
      record(layer,dataset,{provenance:direct.provenance});


      const guide=guideRecipes.find(recipe=>recipe.factors.variant?.some(variant=>variant.id==="color-pow"));
      build(guide,dataset,guide.factors.variant.find(variant=>variant.id==="color-pow"));
      for(const id of ["color-sequential-reds-lab","color-sequential-greenblue-lab","color-sequential-purpleorange-lab"]) {
        const owner=guideRecipes.find(recipe=>recipe.factors.variant?.some(variant=>variant.id===id));
        build(owner,dataset,owner.factors.variant.find(variant=>variant.id===id));
      }
      build(encodingRecipes.find(recipe=>recipe.id.includes("appearance")),dataset);
      for(const recipe of cartesianRecipes){
        // This fixed132-leaf contract owns the original three named-object recipes.
        // Later string-palette and combined-legend variants have independent strict ledgers.
        const variants=recipe.factorsForDataset(dataset).variant.filter(variant=>variant.ordinal>=36&&variant.ordinal<=38);
        assert.deepEqual(variants.map(variant=>variant.ordinal),[36,37,38]);
        for(const variant of variants)build(recipe,dataset,variant);
      }
      for(const recipe of statisticalRecipes.filter(recipe=>["createViolinPlot","createHistogram","createHeatmap"].includes(recipe.expectedDirectActions[0]))){
        const variants=recipe.factorsForDataset(dataset).variant.filter(variant=>
          variant.rangePalette?.palette!==null&&typeof variant.rangePalette?.palette==="object");
        assert.equal(variants.length,3);
        for(const variant of variants)build(recipe,dataset,variant);
      }
      for(const ordinal of [0,1,2])for(const witness of realisticResourcePalettePrograms(dataset,ordinal)){
        const raw=witness.program.semanticSpec.datasets.find(data=>data.id==="analysisRows");
        assert.deepEqual(raw.values.map(row=>row.sourceRowIndex).sort((a,b)=>a-b),witness.provenance.sourceRowIndexes);
        assert.equal(raw.values.length,witness.provenance.sourceRowCount);
        assert.equal(createHash("sha256").update(witness.provenance.sourceRowIndexes.join(",")).digest("hex"),
          witness.provenance.sourceSelectionSha256);
        record(witness.program,dataset,{provenance:witness.provenance});
      }
      console.log(JSON.stringify({paletteDataset:dataset,actualBuilds:builds}));
    }finally{releaseTidyTuesdaySourceCache(dataset);}
  }
  const missing=[...stats].filter(([id,value])=>value.occurrences<5||value.datasets.size<3||id.endsWith(".name")&&value.values.size<3).map(([id,value])=>({id,occurrences:value.occurrences,datasets:[...value.datasets],values:[...value.values]}));
  assert.deepEqual(missing,[]);
  assert.equal(builds,265);
  console.log(JSON.stringify({paletteRequirementCount:options.length,paletteRequirementSha256:digest(options.map(value=>value.id)),actualBuilds:builds,minimumOccurrences:5,minimumDatasets:3}));
});

test("direct trace array summaries witness presence without inventing extent values",()=>{
  assert.deepEqual(valuesAt({range:{palette:{extentCount:2}}},"range.palette.extent"),[{summarizedArray:true,length:2}]);
  for(const count of [0,-1,1.5,"2",undefined])assert.deepEqual(valuesAt({range:{palette:{extentCount:count}}},"range.palette.extent"),[]);
  assert.deepEqual(valuesAt({range:{palette:{extentCount:2}}},"range.palette.extent.missing"),[]);
});
