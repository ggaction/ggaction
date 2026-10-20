import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, writeFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const root=fileURLToPath(new URL("../../",import.meta.url));
test("declares existing grouped numeric and UTC weekday formats in Full and Basic",async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),"ggaction-value-format-types-"));
  try{
    const file=path.join(directory,"formats.mts");
    await writeFile(file,`
import type {ChartProgram, NumericFormatString, ValueFormat, AxisFormatString} from ${JSON.stringify(path.join(root,"types/program.js"))};
import type {BasicChartProgram} from ${JSON.stringify(path.join(root,"types/basic.js"))};
declare const full: ChartProgram;
declare const basic: BasicChartProgram;
const formats: readonly NumericFormatString[] = [",", ",.0f", ",.2f", ",.12f", ",.02f", ".2%", ".3e"];
const weekday: ValueFormat = "%a";
const weekdayAndDate: AxisFormatString = "%a %d";
full.createAxes({x:{ticksAndLabels:{labels:{format:",.0f"}}}});
full.editXAxisLabels({format:","});
full.encodeText({field:"amount",format:",.2f"});
basic.createLinePlot({x:"x",y:"y",guides:{axes:{x:{ticksAndLabels:{labels:{format:",.2f"}}}}}});
basic.createLinePlot({x:{field:"date",fieldType:"temporal"},y:"y",guides:{axes:{x:{ticksAndLabels:{labels:{format:"%a"}}}}}});
// @ts-expect-error grouped precision remains bounded by twelve decimals
const tooPrecise: NumericFormatString = ",.13f";
// @ts-expect-error grouped scientific output is not supported
const groupedScientific: NumericFormatString = ",.2e";
// @ts-expect-error grouped percent output is not supported
const groupedPercent: NumericFormatString = ",.2%";
// @ts-expect-error unsupported UTC directive
const unsupportedWeekday: ValueFormat = "%q";
`);
    const result=spawnSync(path.join(root,"node_modules/.bin/tsc"),["--noEmit","--strict","--skipLibCheck","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext",file],{encoding:"utf8",cwd:root});
    assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
  }finally{await rm(directory,{recursive:true,force:true});}
});
