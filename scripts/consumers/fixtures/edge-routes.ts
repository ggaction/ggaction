import { chart, type EdgeRouteResource } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { createGraphRouteExecutor, prepareGraphEdgeRoutes, computeGraphEdgeRoutes, type GraphRouteJob } from "ggaction/graph";
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