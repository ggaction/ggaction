import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createGgactionMcpServer } from "../../mcp/server.js";

async function connectedClient() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createGgactionMcpServer();
  const client = new Client({ name: "ggaction-contract", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    server,
    async close() {
      await client.close();
      await server.close();
    }
  };
}

function parsedResource(result) {
  assert.equal(result.contents.length, 1);
  assert.equal(result.contents[0].mimeType, "application/json");
  return JSON.parse(result.contents[0].text);
}

test("exposes one overview, three templates, and one read-only search tool", async () => {
  const connection = await connectedClient();
  try {
    const [resources, templates, tools] = await Promise.all([
      connection.client.listResources(),
      connection.client.listResourceTemplates(),
      connection.client.listTools()
    ]);
    assert.deepEqual(resources.resources.map(resource => resource.uri), ["ggaction://overview"]);
    assert.deepEqual(templates.resourceTemplates.map(template => template.uriTemplate), [
      "ggaction://actions/{name}",
      "ggaction://recipes/{id}",
      "ggaction://docs/{section}"
    ]);
    assert.equal(tools.tools.length, 1);
    assert.equal(tools.tools[0].name, "search_ggaction");
    assert.deepEqual(tools.tools[0].annotations, {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    });
    assert.equal(tools.tools[0].inputSchema.additionalProperties, false);
  } finally {
    await connection.close();
  }
});

test("reads packaged overview, action, recipe, and documentation knowledge", async () => {
  const connection = await connectedClient();
  try {
    const overview = parsedResource(await connection.client.readResource({ uri: "ggaction://overview" }));
    assert.equal(overview.schemaVersion, 2);
    assert.deepEqual(overview.counts, { actions: 173, recipes: 33, docs: 4 });
    assert.deepEqual(overview.resources, [
      "ggaction://overview",
      "ggaction://actions/{name}",
      "ggaction://recipes/{id}",
      "ggaction://docs/{section}"
    ]);

    const action = parsedResource(await connection.client.readResource({
      uri: "ggaction://actions/createScatterPlot"
    }));
    const recipe = parsedResource(await connection.client.readResource({
      uri: "ggaction://recipes/scatterplot"
    }));
    const docs = parsedResource(await connection.client.readResource({
      uri: "ggaction://docs/overview"
    }));
    assert.equal(action.value.name, "createScatterPlot");
    assert.equal(action.value.typeDefinitions.length > 0, true);
    assert.equal(recipe.value.id, "scatterplot");
    assert.match(recipe.value.exampleSource, /from "ggaction"/u);
    assert.match(recipe.nextStep, /submit_program/u);
    assert.match(docs.value.text, /# LLM Guide/u);
  } finally {
    await connection.close();
  }
});

test("keeps search deterministic, bounded, and strict about invalid input", async () => {
  const connection = await connectedClient();
  try {
    const call = arguments_ => connection.client.callTool({
      name: "search_ggaction",
      arguments: arguments_
    });
    const first = await call({ query: "scatter plot relationship", limit: 3 });
    const second = await call({ query: "scatter plot relationship", limit: 3 });
    assert.deepEqual(second, first);
    const response = JSON.parse(first.content[0].text);
    assert.equal(response.schemaVersion, 2);
    assert.equal(response.results.length, 3);
    assert.equal(response.results[0].id, "scatterplot");
    assert.equal(response.nextStep, "Read one best matching action or recipe.");

    for (const invalid of [
      { query: "" },
      { query: "legend", limit: 11 },
      { query: "legend", path: "/etc/passwd" },
      { query: "legend", url: "https://example.com" },
      { query: "legend", source: "process.exit()" }
    ]) {
      assert.equal((await call(invalid)).isError, true);
    }
    await assert.rejects(
      () => connection.client.readResource({ uri: "ggaction://actions/unknownAction" }),
      /Unknown action knowledge ID/u
    );
    await assert.rejects(
      () => connection.client.readResource({ uri: "ggaction://actions/..%2Fpackage" }),
      /Knowledge ID is invalid/u
    );
  } finally {
    await connection.close();
  }
});

test("keeps MCP source on fixed local reads without network, code, chart, or renderer execution", async () => {
  const files = ["mcp/knowledge.js", "mcp/server.js", "bin/ggaction-mcp.js"];
  const source = (await Promise.all(files.map(file =>
    readFile(new URL(`../../${file}`, import.meta.url), "utf8")
  ))).join("\n");
  for (const forbidden of [
    /node:https?/u,
    /\bfetch\s*\(/u,
    /\beval\s*\(/u,
    /new\s+Function\b/u,
    /\bimport\s*\(/u,
    /from\s+["']\.\.\/src\//u,
    /renderTo(?:PNG|PDF|SVG)|\brender\s*\(/u
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
  assert.equal((source.match(/registerTool\s*\(/gu) ?? []).length, 1);
  assert.match(source, /new URL\("\.\.\/knowledge\/index\.json", import\.meta\.url\)/u);
  assert.match(source, /new URL\("\.\.\/knowledge\/search-index\.json", import\.meta\.url\)/u);
});

test("serves protocol-only stdout through the package executable", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [new URL("../../bin/ggaction-mcp.js", import.meta.url).pathname],
    cwd: new URL("../../", import.meta.url).pathname,
    stderr: "pipe"
  });
  const client = new Client({ name: "ggaction-stdio-contract", version: "1.0.0" });
  try {
    await client.connect(transport);
    const [resources, tools, search] = await Promise.all([
      client.listResources(),
      client.listTools(),
      client.callTool({
        name: "search_ggaction",
        arguments: { query: "edit legend layout", limit: 2 }
      })
    ]);
    assert.deepEqual(resources.resources.map(resource => resource.uri), ["ggaction://overview"]);
    assert.deepEqual(tools.tools.map(tool => tool.name), ["search_ggaction"]);
    assert.equal(JSON.parse(search.content[0].text).results[0].id, "editLegendLayout");
    assert.equal(transport.stderr?.read()?.toString() ?? "", "");
  } finally {
    await client.close();
  }
});
