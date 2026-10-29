import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(), entry=file=>import(pathToFileURL(path.join(root,file)));
const {preparePackageConsumer}=await entry('scripts/package-consumer.js');
const {run}=await entry('scripts/consumers/runtime.js');
const {testTypeScriptConsumer}=await entry('scripts/consumers/types.js');
const {testOptionalDependencies}=await entry('scripts/consumers/optional-peers.js');
const {measureMinimalBrowserBundle}=await entry('scripts/browser-bundle-size.js');
const tar=path.resolve(process.argv[2]), consumer=await preparePackageConsumer({packageSpec:tar});
try {
 await testOptionalDependencies(consumer);
 const fixtures=['theme-guide-defaults','theme-item-identity','theme-resource-plots','theme-typography','theme-flow','theme-guide-geometry','theme-spacing','theme-palettes','theme-provenance','theme-paint-consumers'];
 const lock=JSON.parse(await readFile('package-lock.json','utf8'));
 run('npm',['install','--ignore-scripts','--no-audit','--no-fund',`@napi-rs/canvas@${lock.packages['node_modules/@napi-rs/canvas'].version}`],consumer.directory);
 await mkdir(path.join(consumer.directory,'fixtures/fonts'),{recursive:true});
 await copyFile('test/fixtures/fonts/metric-fixture.ttf',path.join(consumer.directory,'fixtures/fonts/metric-fixture.ttf'));
 for(const name of fixtures) {
  const source=(await readFile(`test/unit/actions/${name}.test.js`,'utf8')).replaceAll('../../../src/renderers/png.js','ggaction/png').replaceAll('../../../src/renderers/svg.js','ggaction/svg').replaceAll('../../../src/index.js','ggaction').replaceAll('../../../src/basic.js','ggaction/basic').replaceAll('../../../src/inspection.js','ggaction/inspection').replaceAll('../../../src/persistence.js','ggaction/persistence').replaceAll('../../../src/scene.js','ggaction/scene').replaceAll('../../fixtures/fonts/','./fixtures/fonts/');
  await writeFile(path.join(consumer.directory,name+'.test.mjs'),source);
 }
 run(process.execPath,['--test',...fixtures.map(name=>name+'.test.mjs')],consumer.directory,{stdio:'inherit'});
 const files=['observed-graphs.mjs','inferred-graphs.mjs','contours.mjs','interaction.mjs'];
 for(const file of files) await copyFile(path.join(root,'scripts/consumers/fixtures/node',file),path.join(consumer.directory,file));
 await writeFile(path.join(consumer.directory,'verify.mjs'),'const records=[];for(const file of '+JSON.stringify(files)+'){const {cases}=await import("./"+file);for(const entry of cases){await entry.run();records.push({id:entry.id,status:"passed"})}}console.log(JSON.stringify(records));');
 const records=JSON.parse(execFileSync(process.execPath,['verify.mjs'],{cwd:consumer.directory,encoding:'utf8'}));
 await testTypeScriptConsumer(consumer.directory);
 const bundles={};for(const specifier of ['ggaction','ggaction/basic','ggaction/svg','ggaction/interaction']) bundles[specifier]=await measureMinimalBrowserBundle(consumer.directory,{specifier});
 const result={node:process.version,tar,fixtures,records,types:'passed',optionalPeers:consumer.resolvedPeers,bundles};
 await writeFile(path.resolve(process.argv[3]),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
}finally{await consumer.cleanup()}
