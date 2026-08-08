import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import {
  docsFallbackResources,
  listKnowledgeResources,
  listKnowledgeResourceTemplates,
  readKnowledgeResource,
  SEARCH_TOOL_NAME,
  searchGgactionText
} from "../../src/mcp/adapter.js";
import { createGgactionMcpServer } from "../../src/mcp/server.js";

async function connectedPair() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client(
    { name: "ggaction-contract-test", version: "1.0.0" },
    { capabilities: {} }
  );
  const server = createGgactionMcpServer();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport)
  ]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    }
  };
}

test("exposes exactly one read-only search tool with a byte-equal direct payload", async () => {
  const { client, close } = await connectedPair();
  try {
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map(tool => tool.name), [SEARCH_TOOL_NAME]);
    assert.deepEqual(listed.tools[0].annotations, {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    });

    const query = "scatter plot with a color legend at bottom as svg";
    const direct = searchGgactionText(query);
    const called = await client.callTool({
      name: SEARCH_TOOL_NAME,
      arguments: { query }
    });
    assert.equal(called.content.length, 1);
    assert.deepEqual(called.content[0], { type: "text", text: direct });
    assert.equal(Buffer.byteLength(called.content[0].text), 1689);
    assert.equal(JSON.parse(called.content[0].text).unresolved.length, 0);
  } finally {
    await close();
  }
});

test("keeps resource discovery bounded and reads exact cards and recipes", async () => {
  const resources = listKnowledgeResources();
  const templates = listKnowledgeResourceTemplates();
  assert.equal(resources.length, 9);
  assert.deepEqual(templates.map(template => template.uriTemplate), [
    "ggaction://actions/{name}",
    "ggaction://docs/{section}"
  ]);
  assert.equal(resources.some(resource => resource.uri.startsWith("ggaction://docs/")), false);

  const card = readKnowledgeResource("ggaction://actions/createScatterPlot");
  const recipe = readKnowledgeResource("ggaction://recipes/scatter-svg");
  assert.equal(JSON.parse(card.text).name, "createScatterPlot");
  assert.deepEqual(JSON.parse(recipe.text).packet.exactCalls, [
    "program.createScatterPlot({ x: \"x\", y: \"y\", color: \"category\", guides: {} })",
    "program.editLegendLayout({ position: \"bottom\" })",
    "renderToSVG(program)"
  ]);
  for (const resource of [card, recipe]) {
    assert.ok(Buffer.byteLength(resource.text) <= 6144, resource.uri);
  }
});

test("permits documentation only for the latest unresolved result", async () => {
  const resolved = JSON.parse(searchGgactionText("scatter plot as svg"));
  const unresolved = JSON.parse(searchGgactionText("make a chart"));
  assert.deepEqual(docsFallbackResources(resolved), []);
  assert.deepEqual(
    docsFallbackResources(unresolved).map(resource => resource.uri),
    ["ggaction://docs/choose-chart-type"]
  );

  const { client, close } = await connectedPair();
  try {
    await assert.rejects(
      client.readResource({ uri: "ggaction://docs/choose-chart-type" }),
      /available only when recommended/
    );
    await client.callTool({
      name: SEARCH_TOOL_NAME,
      arguments: { query: "make a chart" }
    });
    const section = await client.readResource({
      uri: "ggaction://docs/choose-chart-type"
    });
    assert.match(section.contents[0].text, /^# Choose a chart or mark type/);
    assert.ok(Buffer.byteLength(section.contents[0].text) <= 2048);

    await client.callTool({
      name: SEARCH_TOOL_NAME,
      arguments: { query: "scatter plot as svg" }
    });
    await assert.rejects(
      client.readResource({ uri: "ggaction://docs/choose-chart-type" }),
      /available only when recommended/
    );
  } finally {
    await close();
  }
});

test("rejects non-knowledge resources and invalid tool arguments without execution", async () => {
  const { client, close } = await connectedPair();
  try {
    const invalid = await client.callTool({
      name: SEARCH_TOOL_NAME,
      arguments: { query: "scatter plot", code: "process.exit()" }
    });
    assert.equal(invalid.isError, true);
    assert.match(invalid.content[0].text, /accepts exactly one argument/);
    await assert.rejects(
      client.readResource({ uri: "file:///etc/passwd" }),
      /Unsupported knowledge resource URI/
    );
    await assert.rejects(
      client.callTool({ name: "render_chart", arguments: {} }),
      /Unknown tool/
    );
  } finally {
    await close();
  }
});

test("keeps the MCP implementation out of chart execution and network surfaces", () => {
  const packageJson = JSON.parse(readFileSync(
    new URL("../../package.json", import.meta.url),
    "utf8"
  ));
  assert.deepEqual(packageJson.bin, {
    "ggaction-mcp": "./src/mcp/cli.js"
  });
  assert.equal(packageJson.dependencies["@modelcontextprotocol/sdk"], "1.30.0");
  assert.equal(Object.keys(packageJson.exports).includes("./mcp"), false);

  const sources = [
    "../../src/mcp/adapter.js",
    "../../src/mcp/server.js",
    "../../src/mcp/cli.js"
  ].map(relative => readFileSync(new URL(relative, import.meta.url), "utf8")).join("\n");
  for (const forbidden of [
    "node:child_process",
    "node:net",
    "node:http",
    "node:https",
    "node:dgram",
    "fetch(",
    "eval(",
    "new Function("
  ]) {
    assert.equal(sources.includes(forbidden), false, forbidden);
  }
  assert.equal(sources.includes("../index.js"), false);
  assert.equal(sources.includes("../renderers/"), false);
});
