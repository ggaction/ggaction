import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, hconcat, prepareFontResource, prepareTextMetrics, prepareFontRendering,
  prepareImageResource, prepareImageRendering, render } from "ggaction";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { getMarkItems, getProjectionView, inspectProgram } from "ggaction/inspection";
import { createInteractionSession } from "ggaction/interaction";
import { exportAccessibleData } from "ggaction/accessibility";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { installedFontSource, installedFontHost, registerInstalledFont } from "./fonts.mjs";

const digest = value => createHash("sha256").update(value).digest("hex");
const target = (child, id) => ({ childPath: ["native", child], id });
const partitionTarget = target("partition", "partition");
const graphTarget = target("graph", "network");
const geoTarget = target("geo", "places");
const decode = async ({ bytes }) => { const image = await loadImage(bytes);
  return { image, width: image.width, height: image.height, originClean: true }; };
const plain = value => JSON.parse(JSON.stringify(value));

async function example() {
  const partition = chart().createCanvas({ width: 200, height: 180, margin: 20, background: "white" })
    .createData({ id: "rows", keyField: "id", values: [
      { id: "root", parent: null }, { id: "A", parent: "root" },
      { id: "A1", parent: "A", value: 2 }, { id: "A2", parent: "A", value: 1 },
      { id: "B", parent: "root", value: 3 }
    ] }).createHierarchyData({ id: "hierarchy", key: "id", parent: "parent", value: "value" })
    .layoutHierarchy({ id: "layout", method: "partition" })
    .createPartitionPlot({ id: "partition", labels: false, clip: true })
    .selectMarks({ id: "picked", target: "partition", items: [], empty: "none" });
  const graph = chart().createCanvas({ width: 200, height: 180, margin: 0, background: "white" })
    .createData({ id: "nodes", keyField: "id", values: [{ id: 1 }, { id: "1" }] })
    .createData({ id: "edges", keyField: "id", values: [{ id: "edge", from: 1, to: "1" }] })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to" })
    .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: 1, x: 40, y: 50 }, { key: "1", x: 150, y: 100 }] } })
    .createGraphPlot({ id: "network", origin: [0, 0], labels: false, clip: true, nodes: { radius: 8 } })
    .selectMarks({ id: "picked", target: "network", items: [], empty: "none" });
  const geo = chart().createCanvas({ width: 200, height: 180, margin: 0, background: "white" })
    .createGeometryData({ id: "geometry", format: "geojson", coordinateKind: "planar", featureKey: "id", values: {
      type: "FeatureCollection", features: [
        { type: "Feature", id: "west", properties: { name: "West" }, geometry: { type: "Point", coordinates: [30, 40] } },
        { type: "Feature", id: "east", properties: { name: "East" }, geometry: { type: "Point", coordinates: [90, 60] } }
      ] } }).createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
    .createGeoPointMark({ id: "places", geometry: "geometry", radiusPx: 6, fill: "#ff0000", clip: true })
    .selectMarks({ id: "picked", target: "places", items: [], empty: "none" });
  const pixels = createCanvas(4, 4), context = pixels.getContext("2d");
  context.fillStyle = "#ff0000"; context.fillRect(0, 0, 4, 4);
  context.fillStyle = "#0000ff"; context.fillRect(2, 0, 2, 4);
  const bytes = pixels.toBuffer("image/png");
  let assets = chart().createCanvas({ width: 200, height: 180, margin: 40, background: "white" })
    .createTitle({ text: "AB", titleStyle: { fontFamily: installedFontSource.family, fontSize: 20, fontWeight: 400 } });
  assets = assets.createImageResource({ prepared: await prepareImageResource(assets,
    { kind: "create", id: "logo", uri: "fixture:embedded-logo", mimeType: "image/png", expectedHash: digest(bytes) },
    { requestToken: "image", load: () => ({ bytes, mimeType: "image/png" }), decode: async request => { const { width, height, originClean } = await decode(request); return { width, height, originClean }; } }), requestToken: "image" })
    .createImageMark({ id: "logo", image: "logo", viewport: { x: 20, y: 70, width: 80, height: 40 },
      fit: "fill", clip: { x: 30, y: 75, width: 40, height: 20 }, alt: "Clipped two-color logo" });
  assets = assets.createFontResource({ prepared: await prepareFontResource(assets,
    { kind: "create", id: "font", ...installedFontSource }, installedFontHost), requestToken: "current" });
  assets = assets.applyTextMetrics({ prepared: await prepareTextMetrics(assets, { id: "exact", fonts: ["font"] }, { requestToken: "current", decode: installedFontHost.decode, measure: installedFontHost.measure }), requestToken: "current" });
  return hconcat({ programs: [{ id: "native", program: hconcat({ programs: [
    { id: "partition", program: partition }, { id: "graph", program: graph }, { id: "geo", program: geo }
  ], gap: 12 }) }, { id: "assets", program: assets }], gap: 12 });
}

function describe(program) {
  return plain({ items: [partitionTarget, graphTarget, geoTarget].map(address => getMarkItems(program, { target: address })),
    accessible: exportAccessibleData(program, { format: "items" }),
    projection: getProjectionView(program, { target: "map", childPath: ["native", "geo"] }),
    inspection: inspectProgram(program), scene: createTransitionScene(program, { format: "canvas" }) });
}
function nativeExpectations(program) {
  const partition = getMarkItems(program, { target: partitionTarget });
  assert.deepEqual(partition.filter(item => item.visible).map(item => item.fields.id), ["A", "A1", "A2"]);
  const graph = getMarkItems(program, { target: graphTarget });
  assert.deepEqual(graph.filter(item => item.fields.kind === "node").map(item => [item.fields.key, item.properties.x, item.properties.y]), [[1, 70, 85], ["1", 150, 100]]);
  assert.deepEqual(graph.map(item => item.rows.map(row => [row.data, row.index, row.revision, row.role, JSON.parse(row.rowKey)])), [
    [["edges", 0, 0, "source", ["scalar", [["string", "edge"]]]]],
    [["nodes", 0, 0, "source", ["scalar", [["number", 1]]]]],
    [["nodes", 1, 0, "source", ["scalar", [["string", "1"]]]]]
  ]);
  assert.deepEqual(program.children.native.children.graph.semanticSpec.resources.map(resource => [resource.kind, resource.id, resource.revision]), [["graph", "graph", 0], ["layout", "layout", 1], ["persistent-selection", "picked", 1]]);
  assert.deepEqual(getMarkItems(program, { target: geoTarget }).map(item => [item.fields.name, item.properties.x, item.properties.y]), [["West", 55, 55], ["East", 145, 85]]);
  const projection = getProjectionView(program, { target: "map", childPath: ["native", "geo"] });
  assert.equal(projection.projection.revision, 1);
  assert.equal(projection.parameters.scalePx, 1.5); assert.deepEqual(projection.parameters.translatePx, [10, -5]);
  const views = exportAccessibleData(program, { format: "items" }).views.filter(view => view.childPath[0] === "native");
  assert.deepEqual(views.map(view => view.items.filter(item => item.selectedBy.includes("picked")).length), [1, 1, 1]);
  assert.equal(new Set(views.flatMap(view => view.items.map(item => item.key))).size, views.reduce((count, view) => count + view.items.length, 0));
  const assets = program.children.assets;
  assert.deepEqual(assets.semanticSpec.resources.map(resource => [resource.kind, resource.id, resource.revision]), [["image", "logo", 0], ["font", "font", 0]]);
  assert.equal(assets.materializationConfigs.textMetrics.measurements.find(item => item.text === "AB").width, 28);
  assert.deepEqual(assets.graphicSpec.objects.logo.clip, { x: 60, y: 110, width: 80, height: 40 });
  assert.deepEqual(assets.graphicSpec.objects["logo-image-clip"].clip, { x: 70, y: 115, width: 40, height: 20 });
}
function interact(program) {
  const original = serializeProgram(program), session = createInteractionSession({ program, bindings: [], selectionPolicy: "keep-hidden" });
  try {
    session.dispatch({ type: "focusHierarchy", target: partitionTarget, payload: { focus: { key: "A" } } });
    session.dispatch({ type: "moveNode", target: target("graph", "layout"), payload: { key: 1, x: 70, y: 85 } });
    session.dispatch({ type: "setViewport", target: target("geo", "map"), payload: { scalePx: 1.5, translatePx: [10, -5] } });
    for (const [address, predicate] of [[partitionTarget, item => item.fields.id === "A2"],
      [graphTarget, item => item.fields.kind === "node" && item.fields.key === 1], [geoTarget, item => item.fields.name === "West"]]) {
      const key = getMarkItems(session.getState().program, { target: address }).find(predicate).key;
      session.dispatch({ type: "select", target: address, payload: { id: "picked", select: { items: [key] } } });
    }
    assert.equal(session.getState().history.undoCount, 6); assert.equal(session.getState().revision, 6);
    assert.equal(serializeProgram(program), original);
    return session.getState().program;
  } finally { session.destroy(); }
}
function pdfStreams(buffer) {
  return [...buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match => {
    const bytes = Buffer.from(match[1], "latin1");
    try { return digest(inflateSync(bytes)); } catch { return digest(bytes); }
  });
}
async function outputs(program, prefix) {
  const fonts = await prepareFontRendering(program, { register: registerInstalledFont });
  const images = await prepareImageRendering(program, { decode });
  try {
    const canvas = createCanvas(1, 1); render(program, canvas.getContext("2d"), { fonts, images });
    const canvasPixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    // Four 200px panels and three 12px gaps. The asset plot starts 40px inside its panel.
    assert.deepEqual([canvas.width, canvas.height], [836, 180]);
    for (const [x, y, expected] of [[705, 120, [255, 255, 255, 255]], [708, 120, [255, 0, 0, 255]],
      [747, 120, [255, 255, 255, 255]], [720, 114, [255, 255, 255, 255]]]) {
      assert.deepEqual([...canvas.getContext("2d").getImageData(x, y, 1, 1).data], expected);
    }
    const png = await renderToPNGBuffer(program), pdf = await renderToPDFBuffer(program), svg = renderToSVG(program);
    const image = await loadImage(png.buffer), decoded = createCanvas(png.width, png.height);
    decoded.getContext("2d").drawImage(image, 0, 0);
    assert.deepEqual(decoded.getContext("2d").getImageData(0, 0, png.width, png.height).data, canvasPixels);
    assert.match(svg, /@font-face/); assert.match(svg, /data:image\/png;base64,/); assert.match(svg, /clipPath/);
    assert.match(pdf.buffer.toString("latin1"), /\/Subtype \/Image/); assert.match(pdf.buffer.toString("latin1"), /\/ToUnicode/);
    assert.deepEqual([pdf.width, pdf.height, pdf.pages], [canvas.width, canvas.height, 1]);
    const scene = createTransitionScene(program, { format: "canvas" });
    const sceneFonts = await prepareFontRendering(scene, { register: registerInstalledFont });
    const sceneImages = await prepareImageRendering(scene, { decode });
    try { const sceneCanvas = createCanvas(1, 1); renderTransitionScene(scene, sceneCanvas.getContext("2d"), { fonts: sceneFonts, images: sceneImages });
      assert.deepEqual(sceneCanvas.toBuffer("image/png"), canvas.toBuffer("image/png")); }
    finally { sceneFonts.dispose(); }
    await Promise.all([writeFile(`${prefix}.svg`, svg), writeFile(`${prefix}.png`, png.buffer), writeFile(`${prefix}.pdf`, pdf.buffer)]);
    return { width: canvas.width, height: canvas.height, rgba: digest(canvasPixels), png: digest(png.buffer), svg: digest(svg), pdfStreams: pdfStreams(pdf.buffer) };
  } finally { fonts.dispose(); }
}

async function restoreStaticDelivery(saved, directory) {
  assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
  const program = deserializeProgram(saved); assert.equal(serializeProgram(program), saved); nativeExpectations(program);
  const assetHash = program.children.assets.semanticSpec.resources.find(resource => resource.kind === "image").options.expectedHash;
  assert.throws(() => deserializeProgram(saved.replaceAll(assetHash, "0".repeat(64))), /hash|digest/i);
  const corrupted = JSON.parse(saved); let changed = false;
  const tamper = value => {
    if (!Array.isArray(value)) return;
    if (!changed && value.length === 3 && value.some(entry => Array.isArray(entry) && entry[0] === "kind" && entry[1] === "image") &&
        value.some(entry => Array.isArray(entry) && entry[0] === "id" && entry[1] === "logo")) {
      value.find(entry => entry[0] === "revision")[1] = 99; changed = true;
    } else for (const entry of value) tamper(entry);
  };
  tamper(corrupted.payload); assert.equal(changed, true);
  assert.throws(() => deserializeProgram(JSON.stringify(corrupted)), /revision|stale|resource|graphic/i);
  const restored = describe(program), rendered = await outputs(program, `${directory}/restored`);
  const session = createInteractionSession({ program, bindings: [{ type: "keyboard", targets: [{ target: graphTarget }] }], selectionPolicy: "keep-hidden" });
  try {
    assert.equal(session.getState().history.undoCount, 0); assert.equal(session.getState().revision, 0);
    assert.equal(session.getState().focus, null);
    const invalid = [
      { type: "moveNode", target: target("graph", "layout"), payload: { key: "missing", x: 10, y: 10 } },
      { type: "setViewport", target: target("geo", "map"), payload: { scalePx: 0 } }
    ];
    for (const command of invalid) { assert.throws(() => session.dispatch(command)); assert.equal(session.getState().program, program);
      assert.equal(serializeProgram(program), saved); assert.equal(session.getState().history.undoCount, 0); }
    session.dispatch({ type: "focus", move: "first" });
    const focused = session.getState().focus.itemKey; assert.ok(getMarkItems(program, { target: graphTarget }).some(item => item.key === focused));
    session.dispatch({ type: "moveNode", target: target("graph", "layout"), payload: { key: "1", x: 170, y: 110 }, origin: "replay" });
    const edited = session.getState().program;
    assert.deepEqual(getMarkItems(edited, { target: graphTarget }).filter(item => item.fields.kind === "node").map(item => [item.fields.key, item.properties.x, item.properties.y]), [[1, 70, 85], ["1", 170, 110]]);
    assert.equal(edited.children.native.children.graph.semanticSpec.resources.find(resource => resource.id === "layout").revision, 2);
    assert.equal(edited.children.native.children.partition, program.children.native.children.partition);
    assert.equal(edited.children.native.children.geo, program.children.native.children.geo);
    assert.equal(edited.children.assets, program.children.assets);
    session.dispatch({ type: "undo" }); assert.equal(session.getState().program, program);
    session.dispatch({ type: "redo" }); assert.equal(session.getState().program, edited);
    session.dispatch({ type: "clearSelection", target: geoTarget, payload: { id: "picked" } });
    assert.ok(exportAccessibleData(session.getState().program, { format: "items" }).views.find(view => view.ownerId === "places" && view.childPath.join("/") === "native/geo").items.every(item => item.selectedBy.length === 0));
    session.dispatch({ type: "undo" }); assert.equal(session.getState().program, edited);
    const editedSaved = serializeProgram(edited); assert.equal(serializeProgram(deserializeProgram(editedSaved)), editedSaved);
    const editedOutput = await outputs(edited, `${directory}/edited`); assert.notEqual(editedOutput.rgba, rendered.rgba);
    await writeFile(`${directory}/edited.json`, editedSaved);
    return { restored, rendered, edited: describe(edited), editedOutput, focused, history: plain(session.getState().history), networkCalls: globalThis.__offlineCalls ?? null };
  } finally { session.destroy(); assert.throws(() => session.dispatch({ type: "undo" }), /disposed|destroyed/i); }
}

export const cases = [{ id: "static-delivery/interacted-native-offline-four-formats", async run() {
  assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
  const program = interact(await example()), saved = serializeProgram(program);
  nativeExpectations(program);
  await mkdir("static-delivery", { recursive: true }); await writeFile("static-delivery/program.json", saved);
  const before = describe(program), rendered = await outputs(program, "static-delivery/original");
  const script = `import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import dns from 'node:dns';import {syncBuiltinESMExports} from 'node:module';import {readFileSync} from 'node:fs';
    globalThis.__offlineCalls=0;const blocked=()=>{globalThis.__offlineCalls++;throw new Error('Network disabled in offline consumer');};
    globalThis.fetch=blocked;globalThis.WebSocket=blocked;
    for(const [owner,keys]of [[http,['request','get']],[https,['request','get']],[net,['connect','createConnection']],[tls,['connect']],[dns,['lookup','resolve']],[dns.promises,['lookup','resolve']]])for(const key of keys)owner[key]=blocked;
    net.Socket.prototype.connect=blocked;syncBuiltinESMExports();
    for(const probe of [()=>fetch('https://invalid.example'),()=>http.get('http://invalid.example'),()=>net.connect(80,'invalid.example')]){try{probe();throw new Error('Guard failed');}catch(error){if(!error.message.startsWith('Network disabled'))throw error;}}
    globalThis.__offlineCalls=0;const {restoreStaticDelivery}=await import('./static-delivery.mjs');const result=await restoreStaticDelivery(readFileSync(0,'utf8'),'static-delivery');if(globalThis.__offlineCalls!==0)throw new Error('Unexpected network use');process.stdout.write(JSON.stringify(result));`;
  const result = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: saved, encoding: "utf8", timeout: 60_000, maxBuffer: 16 * 1024 * 1024 }));
  assert.equal(result.networkCalls, 0); assert.deepEqual(result.restored, before); assert.deepEqual(result.rendered, rendered);
  assert.equal(serializeProgram(program), saved);
  const edited = deserializeProgram(await readFile("static-delivery/edited.json", "utf8"));
  assert.deepEqual(describe(edited), result.edited); assert.deepEqual(await outputs(edited, "static-delivery/edited-parent"), result.editedOutput);
  await writeFile("static-delivery/receipt.json", JSON.stringify({ node: process.version, freshProcess: true, networkCalls: result.networkCalls,
    snapshotSha256: digest(saved), restoredDescriptionSha256: digest(JSON.stringify(before)), original: rendered, edited: result.editedOutput,
    commands: ["focusHierarchy", "moveNode", "setViewport", "select", "focus", "undo", "redo"], history: result.history }, null, 2));
} }];

export { restoreStaticDelivery };
