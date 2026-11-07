import assert from "node:assert/strict";
import test from "node:test";
import {createCanvas} from "@napi-rs/canvas";
import {chart, hconcat, render} from "../../../src/index.js";
import {ChartProgram} from "../../../src/core/ChartProgram.js";
import {createTransitionScene, renderTransitionScene} from "../../../src/scene.js";
import {serializeGraphic, deserializeGraphic} from "../../../src/persistence.js";
import {projectAnimationEndpoint, matchAnimationEndpoints} from "../../../src/animation/endpoints.js";

const rows = [{id: "a", x: 1, y: 2}, {id: "b", x: 2, y: 4}, {id: "c", x: 3, y: 3}];
const scatter = () => chart().createCanvas({width: 300, height: 220, margin: 30})
  .createData({id: "rows", keyField: "id", values: rows})
  .createScatterPlot({id: "points", data: "rows", x: "x", y: "y", guides: false});
const identified = endpoint => endpoint.identities.flatMap((identity, index) => identity ? [{identity, index}] : []);

function pixels(program, scene, ratio) {
  const canvas = createCanvas(1, 1), context = canvas.getContext("2d");
  if (scene) renderTransitionScene(scene, context, {pixelRatio: ratio});
  else render(program, context, {pixelRatio: ratio});
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

test("endpoint projection consumes graphics alone and retains the exact native concrete scene", () => {
  const program = scatter(), original = JSON.stringify(program);
  const graphicsOnly = {graphicSpec: program.graphicSpec};
  for (const key of ["semanticSpec", "trace", "materializationConfigs", "resolvedScales", "children"])
    Object.defineProperty(graphicsOnly, key, {get() {throw new Error("unexpected authoring read");}});
  const endpoint = projectAnimationEndpoint(graphicsOnly);
  assert.equal(endpoint.graphicSpec, program.graphicSpec);
  assert.deepEqual(endpoint.scene, createTransitionScene(program, {format: "canvas"}));
  assert.deepEqual(endpoint.sources.map(source => source.nodeKey), endpoint.scene.nodes.map(node => node.key));
  assert.equal(identified(endpoint).length, 3);
  assert.equal(JSON.stringify(program), original);
  assert.deepEqual(structuredClone(endpoint), endpoint);
  for (const object of [endpoint, endpoint.scene, endpoint.identities, endpoint.matching, ...endpoint.matching.filter(Boolean)])
    assert.ok(Object.isFrozen(object));
});

test("keyed revisions match item meaning after reordering, insertion and deletion", () => {
  const before = scatter();
  const after = before.reviseData({source: "rows", id: "revised", values: [
    {id: "c", x: 8, y: 9}, {id: "a", x: 4, y: 5}, {id: "d", x: 2, y: 6}
  ]});
  const from = projectAnimationEndpoint(before), to = projectAnimationEndpoint(after);
  const result = matchAnimationEndpoints(from, to);
  assert.deepEqual(result.matches.map(match => [match.sourceIndex, match.targetIndex]), [[3, 1], [1, 2]]);
  assert.deepEqual(result.enters, [0, 3]);
  assert.deepEqual(result.exits, [0, 2]);
  assert.notDeepEqual(from.scene.nodes[3].properties, to.scene.nodes[1].properties);
});

test("compound primitive roles remain distinct within one keyed observation", () => {
  const program = chart().createCanvas({width: 300, height: 220, margin: 30})
    .createData({id: "prices", keyField: "id", values: [{id: "a", x: "A", low: 1, open: 2, high: 4, close: 3}]})
    .createOHLCPlot({id: "candles", data: "prices", x: "x", low: "low", open: "open", high: "high", close: "close", guides: false});
  const before = projectAnimationEndpoint(program);
  const after = projectAnimationEndpoint(program.editOHLCPlot({target: "candles", stem: {strokeWidth: 3}}));
  assert.deepEqual(matchAnimationEndpoints(before, after).matches.map(match => match.role), ["stem", "body"]);
  const items = identified(before);
  assert.equal(items[0].identity.key, items[1].identity.key);
  assert.notEqual(items[0].identity.role, items[1].identity.role);
});

test("nested compositions preserve namespaces, offsets and clips without aliases", () => {
  const child = scatter();
  const program = hconcat({id: "outer", programs: [
    {id: "left", program: hconcat({id: "inner", programs: [{id: "first", program: child}, {id: "second", program: child}]})},
    {id: "right", program: child}
  ]});
  const endpoint = projectAnimationEndpoint(program);
  const items = identified(endpoint);
  assert.equal(items.length, 9);
  assert.equal(new Set(items.map(({identity}) => identity.key)).size, 9);
  assert.equal(new Set(items.map(({identity}) => JSON.parse(identity.key)[0].join("/"))).size, 3);
  assert.deepEqual(endpoint.scene, createTransitionScene(program, {format: "canvas"}));
  assert.ok(endpoint.canvases.length >= 4);
  for (const ratio of [1, 2]) assert.deepEqual(pixels(program, endpoint.scene, ratio), pixels(program, null, ratio));
});

test("anonymous scene fallbacks never establish item correspondence", () => {
  const program = chart().createCanvas({width: 100, height: 80, margin: 10, background: "#fff"});
  const from = projectAnimationEndpoint(program), to = projectAnimationEndpoint(program);
  assert.deepEqual(from.scene.nodes.map(node => node.key), to.scene.nodes.map(node => node.key));
  assert.deepEqual(matchAnimationEndpoints(from, to), {matches: [], enters: [0], exits: [0]});
  const withoutBackground = projectAnimationEndpoint(chart().createCanvas({width: 100, height: 80, margin: 10, background: "none"}));
  assert.equal(identified(withoutBackground).length, 0);
});

test("graphic codec round trips preserve actual payload, typed keys and primitive topology", () => {
  const program = chart().createCanvas({width: 300, height: 220, margin: 30})
    .createData({id: "typed", keyField: "id", values: [{id: 1, x: 1, y: 2}, {id: "1", x: 2, y: 3}]})
    .createScatterPlot({id: "points", data: "typed", x: "x", y: "y", guides: false});
  const from = projectAnimationEndpoint(program);
  const to = projectAnimationEndpoint(deserializeGraphic(serializeGraphic(program)));
  assert.deepEqual(to, from);
  assert.equal(matchAnimationEndpoints(from, to).matches.length, 2);
  assert.notEqual(identified(from)[0].identity.key, identified(from)[1].identity.key);
  const changed = structuredClone(program.graphicSpec);
  changed.objects.points.items[0].identity.topology = "changed-topology";
  const other = projectAnimationEndpoint(new ChartProgram({graphicSpec: changed}));
  assert.equal(matchAnimationEndpoints(from, other).matches.length, 2);
  assert.notEqual(from.scene.nodes[1].topology, other.scene.nodes[1].topology);
  // Matching is identity only; a typed planner still has to admit topology.
});

test("malformed and ambiguous owned identities fail before matching endpoints", () => {
  const program = scatter();
  const duplicateId = structuredClone(program.graphicSpec);
  duplicateId.objects.points.items[1].id = duplicateId.objects.points.items[0].id;
  assert.throws(() => projectAnimationEndpoint(new ChartProgram({graphicSpec: duplicateId})), /ambiguous graphic IDs/);
  const duplicateIdentity = structuredClone(program.graphicSpec);
  duplicateIdentity.objects.points.items[1].identity = duplicateIdentity.objects.points.items[0].identity;
  assert.throws(() => projectAnimationEndpoint(new ChartProgram({graphicSpec: duplicateIdentity})), /ambiguous item identity/);
  const invalid = structuredClone(program.graphicSpec);
  invalid.objects.points.items[0].identity = {key: "invalid"};
  assert.throws(() => projectAnimationEndpoint(new ChartProgram({graphicSpec: invalid})), /Graphic identity/);
});

test("endpoint ownership rejects accessors and shallow freezes without invoking host code", () => {
  let calls = 0;
  const getter = Object.defineProperty({}, "graphicSpec", {get() {calls++; return scatter().graphicSpec;}});
  for (const input of [undefined, null, 1, {}, getter, {graphicSpec: Object.freeze(structuredClone(scatter().graphicSpec))}])
    assert.throws(() => projectAnimationEndpoint(input), /owned graphic state/);
  assert.equal(calls, 0);
  const endpoint = projectAnimationEndpoint(scatter());
  for (const [from, to] of [[{}, endpoint], [endpoint, {}], [structuredClone(endpoint), endpoint], [endpoint, null]])
    assert.throws(() => matchAnimationEndpoints(from, to), /authentic projected endpoints/);
});
