import { compileTypeScript } from "../support/typescript.js";
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const separateOnly = ['createAreaPlot','createBarPlot','createDensityPlot','createPiePlot','createPolarLinePlot','createRadarPlot','createRadialBarPlot','createRosePlot','createParallelCoordinates','createHeatmap','createHistogram','createIntervalPlot','createDotPlot','createLollipopPlot','createDumbbellPlot'];
const categoricalOnly = ['createAreaPlot','createDensityPlot','createPiePlot','createPolarLinePlot','createRadarPlot','createRadialBarPlot','createRosePlot','createParallelCoordinates','createLinePlot','createHistogram','createRaincloudPlot'];

test('facade declarations retain only combinations supported by their own mark and field inputs', async () => {
 const dir=await mkdtemp(path.join(tmpdir(),'ggaction-facade-legend-types-'));
 try {
  const snippets=[`import type {ChartProgram} from ${JSON.stringify(path.join(root,'types/index.js'))};
  type Args<A extends keyof ChartProgram> = ChartProgram[A] extends (options: infer O) => unknown ? O : never;
  type Guides<A extends keyof ChartProgram> = Args<A> extends {guides?: infer G} ? Exclude<G,false|undefined> : never;
  type Legend<A extends keyof ChartProgram> = Guides<A> extends {legend?: infer L} ? Exclude<L,false|undefined> : never;`];
  for(const action of [...separateOnly,'createLinePlot']) for(const combine of ['size-shape','color-size']) snippets.push(`// @ts-expect-error ${action} cannot encode this pair on its own target.\nconst ${action}${combine.replace('-','')}: Legend<'${action}'> = {combine:'${combine}'};`);
  for(const action of separateOnly) snippets.push(`const ${action}Valid: Legend<'${action}'> = {combine:'separate',border:{strokeDash:[4,2]},clipHeight:8};`);
  for(const action of categoricalOnly) snippets.push(`// @ts-expect-error ${action} cannot create a gradient legend.\nconst ${action}Bottom: Legend<'${action}'> = {titlePosition:'bottom'};`);
  for(const action of ['createScatterPlot','createRegressionPlot','createStripPlot','createBeeswarmPlot']) for(const combine of ['size-shape','color-size']) snippets.push(`const ${action}${combine.replace('-','')}: Legend<'${action}'> = {combine:'${combine}'};`);
  snippets.push(`const polar: Legend<'createPolarScatterPlot'>={combine:'size-shape'};
  // @ts-expect-error Only color-size requires a Cartesian point owner.
  const polarColor: Legend<'createPolarScatterPlot'>={combine:'color-size'};
  const raincloud: Legend<'createRaincloudPlot'>={combine:'size-shape'};
  // @ts-expect-error Raincloud accepts categorical color only.
  const raincloudColor: Legend<'createRaincloudPlot'>={combine:'color-size'};
  const gradient: Legend<'createHeatmap'>={titlePosition:'bottom',representation:'gradient'};`);
  const file=path.join(dir,'legend.mts');await writeFile(file,snippets.join('\n'));
  const result=compileTypeScript(['--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{encoding:'utf8',cwd:root});
  assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
 } finally {await rm(dir,{recursive:true,force:true});}
});
