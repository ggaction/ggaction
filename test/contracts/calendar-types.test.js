import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("calendar completion declares exclusive day domains and Full-only editing", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-calendar-types-"));
  try {
    const file = path.join(directory, "calendar.mts");
    await writeFile(file, `
import type { ChartProgram, CalendarDayDomain, CompleteDataOptions, DatasetCompleteTransform } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram; declare const basic: BasicChartProgram;
const calendar: CalendarDayDomain = {unit:"day",start:"2024-01-01",end:"2024-12-31",timeZone:"UTC"};
const options: CompleteDataOptions = {id:"days",key:"day",calendar,fill:{total:null}};
p.createCompleteData(options).editCompleteData({target:"days",calendar});
const definition: DatasetCompleteTransform = {type:"complete",key:"day",groupBy:[],fill:{},calendar};
p.createDerivedData({id:"days",source:"raw",transform:[definition]});
p.editCompleteData({target:"days",values:[0]});
p.editCompleteData({target:"days",sequence:{start:0,end:1,step:1}});
// @ts-expect-error calendar does not infer a time zone
p.createCompleteData({id:"days",key:"day",calendar:{unit:"day",start:"2024-01-01",end:"2024-01-02"}});
// @ts-expect-error only civil days are supported
p.editCompleteData({target:"days",calendar:{...calendar,unit:"month"}});
// @ts-expect-error calendar and values are exclusive
p.createCompleteData({id:"days",key:"day",calendar,values:[0]});
// @ts-expect-error calendar and sequence are exclusive in edits
p.editCompleteData({target:"days",calendar,sequence:{start:0,end:1,step:1}});
// @ts-expect-error dates are authored strings
p.editCompleteData({target:"days",calendar:{...calendar,start:0}});
// @ts-expect-error replacement calendar requires a complete policy
p.editCompleteData({target:"days",calendar:{end:"2024-02-02"}});
// @ts-expect-error completion is Full-only
basic.createCompleteData(options);
// @ts-expect-error editing completion is Full-only
basic.editCompleteData({target:"days",calendar});
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
