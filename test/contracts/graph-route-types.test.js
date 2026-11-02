import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("route declarations separate immutable authoring, opaque preparation and host worker lifetime", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-routes-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, type EdgeRouteResource, type EdgeRouteResourceV2, type EdgeRouteExecution } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basicChart } from ${JSON.stringify(path.join(root, "types/basic.js"))};
import { createGraphRouteExecutor, prepareGraphEdgeRoutes, computeGraphEdgeRoutes, computeGraphEdgeRoutesAsync, type GraphRouteJobV2, type GraphRouteJob } from ${JSON.stringify(path.join(root, "types/graph.js"))};
const program = chart().bundleGraphEdges({ id: "routes", method: "edge-path", options: { exponent: 2, maxStretch: 3 } })
  .editEdgeRoute({ options: { exponent: 3 }, target: { childPath: ["child"], id: "routes" } })
  .createGraphPlot({ routes: "routes" }).editGraphPlot({ routes: false });
program.bundleGraphEdges({ id: "tree", method: "hierarchical", options: { hierarchy: "tree", mapping: [{nodeKey:["family",1],hierarchyKey:"leaf"}], strength:.5 } });
program.bundleGraphEdges({ id: "force", method: "force-directed", options: { compatibilityThreshold:.8, limits:{maxSamples:10000} } });
program.bundleGraphEdges({ id: "density", method: "density", coordinateSpace: "screen" });
const executor = createGraphRouteExecutor({ createWorker: () => new Worker("worker.js", {type:"module"}) });
const signal = new AbortController().signal;
const prepared = await prepareGraphEdgeRoutes(program, {kind:"edit",target:"routes",options:{maxStretch:2}}, {requestToken:"generation-1",executor,signal});
program.editEdgeRoute({prepared,requestToken:"generation-1"}); executor.evict(prepared.inputHash); executor.dispose();
declare const job: GraphRouteJob;
const completion = computeGraphEdgeRoutes(job, signal);
const complete: true = completion.result.complete;
const execution: EdgeRouteExecution = {policy:"bounded-route@1",maxWork:8000000000,maxCandidatePairs:50000000,maxSamples:16777216,maxBufferBytes:134217728,maxBytes:134217728};
program.bundleGraphEdges({id:"bounded",method:"density",options:{execution,limits:{maxNodes:1000,maxEdges:10000}}});
declare const jobV2: GraphRouteJobV2;
const completedV2 = await computeGraphEdgeRoutesAsync(jobV2, signal);
const version: 2 = completedV2.schemaVersion;
const buffers: number = completedV2.result.diagnostics.peakBufferBytes;
executor.compute(jobV2,{signal,deadlineMs:30000});
prepareGraphEdgeRoutes(program,{kind:"create",id:"bounded",method:"density",options:{execution}},{requestToken:"bounded",executor,deadlineMs:30000});
declare const storedV2: EdgeRouteResourceV2;
const resourceVersion: "2" = storedV2.algorithmVersion;
const updated = await prepareGraphEdgeRoutes(program,{kind:"update",edit:{action:"editLayout",args:{target:"layout",node:{key:1,x:20,y:5}}}},{requestToken:"update",executor,deadlineMs:30000});
program.applyGraphEdgeRoutesUpdate({prepared:updated,requestToken:"update"});
// @ts-expect-error native update handles cannot create an edge route
program.bundleGraphEdges({prepared:updated,requestToken:"update"});
// @ts-expect-error authoring handles cannot apply a native update
program.applyGraphEdgeRoutesUpdate({prepared,requestToken:"update"});
// @ts-expect-error native update requires an explicit worker deadline
prepareGraphEdgeRoutes(program,{kind:"update",edit:{action:"editLayout",args:{options:{}}}},{requestToken:"update",executor});
// @ts-expect-error native action union is closed
prepareGraphEdgeRoutes(program,{kind:"update",edit:{action:"arbitrary",args:{}}},{requestToken:"update",executor,deadlineMs:30000});
// @ts-expect-error Basic cannot apply native graph route updates
basicChart().applyGraphEdgeRoutesUpdate({prepared:updated,requestToken:"update"});
// @ts-expect-error bounded policies require every numeric field
const incomplete: EdgeRouteExecution = {policy:"bounded-route@1",maxWork:1000};
// @ts-expect-error v2 limits have no second pair/sample authority
program.bundleGraphEdges({id:"bounded",method:"density",options:{execution,limits:{maxSamples:10}}});
// @ts-expect-error v2 computation requires the explicit async worker entry
computeGraphEdgeRoutes(jobV2);
// @ts-expect-error async worker entry requires a v2 job
computeGraphEdgeRoutesAsync(job);
// @ts-expect-error v2 executor admission requires a deadline
executor.compute(jobV2);
// @ts-expect-error a deadline host requires an authentic executor
prepareGraphEdgeRoutes(program,{kind:"create",id:"bounded",method:"density",options:{execution}},{requestToken:"bounded",deadlineMs:30000});
const route = program.semanticSpec.resources.find((value): value is EdgeRouteResource => value.kind === "edge-route");
if(route) {
  const x: number = route.result.routes[0].commands[0].x;
  // @ts-expect-error stored routes are immutable
  route.result.routes[0].commands[0].x = 3;
}
// @ts-expect-error Basic has no graph route authoring
basicChart().bundleGraphEdges({id:"route",method:"density"});
// @ts-expect-error route method is closed
program.bundleGraphEdges({id:"route",method:"other"});
// @ts-expect-error hierarchical routes require an explicit mapping
program.bundleGraphEdges({id:"route",method:"hierarchical"});
// @ts-expect-error method options are closed
program.bundleGraphEdges({id:"route",method:"density",options:{exponent:2}});
// @ts-expect-error undefined is not omission
program.bundleGraphEdges({id:"route",method:"density",coordinateSpace:undefined});
// @ts-expect-error prepared handles cannot be fabricated
program.bundleGraphEdges({prepared:{kind:"edge-route-preparation",request:{kind:"create",id:"route"},inputHash:"hash"},requestToken:"x"});
// @ts-expect-error a host request token is required
prepareGraphEdgeRoutes(program,{kind:"create",id:"route",method:"density"},{});
// @ts-expect-error screen routes use stored resource IDs
program.createGraphPlot({routes:true});
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
