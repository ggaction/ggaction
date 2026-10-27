import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root='/Users/hj/Desktop/ggaction_chongjeonglee/ggaction';
const evidence='/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence';
// Preserve the complete shared PNG assertion implementation; replace only its renderer import.
let source=await readFile(`${root}/test/support/png.js`,'utf8');
source=source.replace('from "@napi-rs/canvas"',`from "${root}/node_modules/@napi-rs/canvas/index.js"`);
for(const name of ['failure-artifacts','artifact-metadata','artifact-paths'])source=source.replace(`from "./${name}.js"`,`from "${root}/test/support/${name}.js"`);
source=source.replace('import { renderToPNG } from "ggaction/png";',`
async function renderToPNG(program, {pixelRatio}) {
 const canvasSpec=Object.values(program.graphicSpec.objects).find(x=>x.type==='canvas').properties;
 const width=canvasSpec.width*pixelRatio,height=canvasSpec.height*pixelRatio;
 const canvas=createCanvas(width,height),output='${evidence}/browser-mutant-transparent.png';
 await writeFile(output,await canvas.encode('png'));
 return {output,width,height,pixelRatio};
}
`);
await writeFile(`${evidence}/browser-png-helper-mutant.mjs`,source);
const {assertRenderedPNG,assertSameRenderedPNG,normalizeExpectedColor}=await import(pathToFileURL(`${evidence}/browser-png-helper-mutant.mjs`));
const results=[];
for(const chart of ['continuous-area-color','bootstrap-mean-ci']){
 const {visualVariants}=await import(pathToFileURL(`${root}/test/charts/${chart}/manifest.js`));
 const variant=visualVariants[0];
 const options={name:`audit-${chart}`,width:variant.width,height:variant.height,colors:variant.colors,regions:variant.regions,visualSignature:variant.visualSignature};
 const actual=await assertRenderedPNG(variant.userFacing(),options);
 const expected=await assertRenderedPNG(variant.primitive(),options);
 await assertSameRenderedPNG(actual,expected,chart);
 results.push({chart,allSharedPNGAssertions:'PASS',actual:'fully transparent PNG',inkPixels:actual.inkPixels,inkRatio:actual.visualSignature.inkRatio,regions:actual.regionResults.map(x=>({name:x.name,inkPixels:x.inkPixels})),sameRunPixelHashEqual:actual.pixelHash===expected.pixelHash});
}
results.push({invalidCSSAccepted:normalizeExpectedColor('not-a-css-color')});
await writeFile(`${evidence}/browser-png-blank-results.json`,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
