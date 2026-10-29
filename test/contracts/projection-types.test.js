import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("projection declarations preserve type-specific units, fit conflicts and immutable resources", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-projection-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import {chart, type ProjectionResource, type CreateProjectionOptions} from ${JSON.stringify(path.join(root, "types/index.js"))};
import {chart as basic} from ${JSON.stringify(path.join(root, "types/basic.js"))};
const options:CreateProjectionOptions={id:'map',type:'conic-equal-area',parallelsDeg:[30,60],fit:{geometry:'shape',width:600,height:400}};
const p=chart().createProjection(options).editProjection({rotateDeg:[10,20,0]}).editProjection({scalePx:200});
p.editProjection({target:{childPath:['left'],id:'map'},type:'identity',fit:{width:100,height:100}});
p.createProjection({id:'insets',type:'albers-usa',precisionPx:.5});
p.removeResource({kind:'projection',id:'map'});
declare const resource:ProjectionResource;
const scale:number|undefined=resource.result.scalePx;
// @ts-expect-error The stored result is immutable.
resource.result.scalePx=200;
// @ts-expect-error Identity has no spherical rotation.
chart().createProjection({id:'bad',type:'identity',rotateDeg:[0,0]});
// @ts-expect-error Composite inset policy has no arbitrary clipping angle.
chart().createProjection({id:'bad',type:'albers-usa',clipAngleDeg:80});
// @ts-expect-error Parallel policy is conic only.
chart().createProjection({id:'bad',type:'mercator',parallelsDeg:[20,40]});
// @ts-expect-error Fit conflicts with explicit scale.
chart().createProjection({id:'bad',type:'identity',scalePx:2,fit:{width:100,height:100}});
// @ts-expect-error Fit conflicts with explicit translation on edit too.
p.editProjection({translatePx:[0,0],fit:{width:100,height:100}});
// @ts-expect-error Projection authoring is Full only.
basic().createProjection({id:'bad',type:'identity'});
void scale;
`);
    const result=compileTypeScript(["--noEmit","--strict","--exactOptionalPropertyTypes","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext",file],{cwd:root});
    assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory,{recursive:true,force:true}); }
});
