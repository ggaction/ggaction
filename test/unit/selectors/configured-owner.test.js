import assert from "node:assert/strict";
import test from "node:test";
import { validateUserId } from "../../../src/core/identifiers.js";
import { resolveConfiguredOwner as resolve } from "../../../src/selectors/layers.js";

const resolveConfiguredOwner = (p, target, config) => resolve(p, target, config, validateUserId);

const options = { config: "ecdfPlot", operation: "editECDFPlot", kind: "ECDF", article: "an" };
function program(currentMark) {
  return { semanticSpec: { layers: [{id:"a"},{id:"b"},{id:"other"}] },
    context: {currentMark}, markConfigs: {a:{ecdfPlot:{}},b:{ecdfPlot:{}},other:{}} };
}
test("configured plot owners resolve explicit, current, and unique eligible identities", () => {
  const p=program("a");
  assert.equal(resolveConfiguredOwner(p,"b",options).id,"b");
  assert.equal(resolveConfiguredOwner(p,undefined,options).id,"a");
  assert.throws(()=>resolveConfiguredOwner(p,"other",options),/Unknown ECDF-plot owner "other"/);
  assert.throws(()=>resolveConfiguredOwner(p,"bad id",options),/ECDF-plot owner id/);
  assert.throws(()=>resolveConfiguredOwner(program("other"),undefined,options),/ambiguous; provide target/);
  delete p.markConfigs.a.ecdfPlot;
  assert.equal(resolveConfiguredOwner(p,undefined,options).id,"b");
  delete p.markConfigs.b.ecdfPlot;
  assert.throws(()=>resolveConfiguredOwner(p,undefined,options),/requires an ECDF plot/);
});
test("materialized owners reject pending plots and retain specialized missing errors", () => {
  const p=program("a");
  p.markConfigs.b.ecdfPlot.materialized=true;
  assert.equal(resolveConfiguredOwner(p,undefined,{...options,materialized:true}).id,"b");
  assert.throws(()=>resolveConfiguredOwner(p,"a",{...options,materialized:true}),/Unknown ECDF-plot owner/);
  assert.throws(()=>resolveConfiguredOwner(p,undefined,{...options,config:"missing",missing:"No owner."}),/^Error: No owner\.$/);
  assert.throws(()=>resolveConfiguredOwner(program(),undefined,{...options,ambiguous:"Choose an owner."}),/^Error: Choose an owner\.$/);
});
