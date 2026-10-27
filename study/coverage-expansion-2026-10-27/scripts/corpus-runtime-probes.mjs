import {findRepository} from './environment.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const gg=findRepository();
const require=createRequire(path.join(gg,'package.json'));
const {build}=require('esbuild'),{chromium}=require('playwright');
const ids=process.argv.slice(2).length?process.argv.slice(2):['vl_0002','vl_0009','vl_0011','vl_0237','vl_1180','vl_1417'];
const root=path.join(base,'sources/chart-datasets'),sha=x=>createHash('sha256').update(x).digest('hex');
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:'en-US',timezoneId:'UTC',viewport:{width:1280,height:960},deviceScaleFactor:2,colorScheme:'light'});
const results=[];
await fs.mkdir(path.join(base,'evidence/runtime-probes'),{recursive:true});
try{for(const id of ids){
 const page=await context.newPage(),dir=path.join(root,'charts',id);
 try{
  const meta=JSON.parse(await fs.readFile(path.join(dir,'metadata.json'),'utf8'));
  const code=meta.stages.map((s,i)=>`import {buildChart as c${i}} from ${JSON.stringify(path.join(dir,s.code))};`).join('\n')+`\nimport {renderToSVG} from ${JSON.stringify(path.join(gg,'src/renderers/svg.js'))};globalThis.builders=[${meta.stages.map((_,i)=>'c'+i).join(',')}];globalThis.svg=renderToSVG;`;
  const bundle=await build({stdin:{contents:code,resolveDir:root},bundle:true,write:false,platform:'browser',format:'iife',logLevel:'silent',plugins:[{name:'runtime',setup(b){b.onResolve({filter:/^ggaction$/},()=>({path:path.join(gg,'src/index.js')}));}}]});
  await page.route('**/*',r=>r.abort());await page.setContent('<!doctype html><html><body></body></html>');await page.addScriptTag({content:bundle.outputFiles[0].text});
  const frozen=sha(await fs.readFile(path.join(dir,'ggaction.svg'))),stages=[];let first;
  for(let i=0;i<meta.stages.length;i++){
   const result=await page.evaluate(async i=>{await document.fonts.ready;const p=await globalThis.builders[i]();return {svg:globalThis.svg(p),canvas:p.graphicSpec.objects.canvas.properties,objectCount:Object.keys(p.graphicSpec.objects).length,semanticKeys:Object.keys(p.semanticSpec)};},i);
   const hash=sha(result.svg);if(i===0){first=hash;await fs.writeFile(path.join(base,'evidence/runtime-probes',id+'.svg'),result.svg);}
   stages.push({level:meta.stages[i].level,svgSha256:hash,sameFamily:hash===first,sameFrozenArtifact:hash===frozen,canvas:result.canvas,objectCount:result.objectCount,semanticKeys:result.semanticKeys});
  }
  results.push({id,status:'executed',stages,allStagesSame:stages.every(x=>x.sameFamily),allFrozenSame:stages.every(x=>x.sameFrozenArtifact),sourceFidelity:'not tested: comparison is to frozen ggaction SVG, not canonical original Vega-Lite or event states'});
 }catch(e){results.push({id,status:'failed',error:e.stack});}finally{await page.close();}
}}
finally{await browser.close();}
const report={runtimeCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:gg,encoding:'utf8'}).trim(),runtimeVersion:JSON.parse(await fs.readFile(path.join(gg,'package.json'),'utf8')).version,browser:browser.version(),environment:{locale:'en-US',timezone:'UTC',viewport:[1280,960],dpr:2,network:'blocked',fonts:'host installed; no independent font-file hash qualification'},results};
await fs.writeFile(path.join(base,'evidence/translations-runtime-probes.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
