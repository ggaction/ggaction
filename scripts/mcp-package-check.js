import { stat } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import {
  loadInstalledDirectKnowledge,
  prepareInstalledMcpArtifact
} from "./llm-eval/installed-mcp-artifact.js";

const root = fileURLToPath(new URL("../", import.meta.url));

async function discoverySnapshot(client) {
  const [resources, templates, tools, overview, search] = await Promise.all([
    client.listResources(),
    client.listResourceTemplates(),
    client.listTools(),
    client.readResource({ uri: "ggaction://overview" }),
    client.callTool({ name: "search_ggaction", arguments: { query: "scatter plot", limit: 3 } })
  ]);
  return {
    server: client.getServerVersion(),
    instructions: client.getInstructions(),
    resources: resources.resources,
    resourceTemplates: templates.resourceTemplates,
    tools: tools.tools,
    overview: JSON.parse(overview.contents[0].text),
    search: JSON.parse(search.content[0].text)
  };
}

async function closeClients(...clients) {
  const keepAlive = setInterval(() => {}, 1_000);
  try {
    await Promise.all(clients.filter(Boolean).map(client => client.close()));
  } finally {
    clearInterval(keepAlive);
  }
}

export async function verifyInstalledMcpPackage() {
  const installed = await prepareInstalledMcpArtifact();
  let client;
  let sourceClient;
  try {
    const directKnowledge = await loadInstalledDirectKnowledge(installed);
    const transport = new StdioClientTransport({
      command: installed.clientOptions.command,
      args: installed.clientOptions.args,
      cwd: installed.clientOptions.cwd,
      stderr: "ignore"
    });
    client = new Client({ name: "ggaction-installed-package-check", version: "1.0.0" });
    await client.connect(transport);
    const sourceTransport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(root, "bin", "ggaction-mcp.js")],
      cwd: root,
      stderr: "ignore"
    });
    sourceClient = new Client({ name: "ggaction-source-package-check", version: "1.0.0" });
    await sourceClient.connect(sourceTransport);
    const [installedDiscovery, sourceDiscovery, action, recipe, docs] = await Promise.all([
      discoverySnapshot(client),
      discoverySnapshot(sourceClient),
      client.readResource({ uri: "ggaction://actions/createScatterPlot" }),
      client.readResource({ uri: "ggaction://recipes/scatterplot" }),
      client.readResource({ uri: "ggaction://docs/overview" })
    ]);
    if (!isDeepStrictEqual(installedDiscovery, sourceDiscovery)) {
      throw new Error("Installed MCP discovery differs from the source MCP discovery.");
    }
    const parsed = result => JSON.parse(result.contents[0].text);
    const [directSearch, directRecipe] = await Promise.all([
      directKnowledge.search({ query: "scatter plot", limit: 3 }),
      directKnowledge.read({ kind: "recipe", id: "scatterplot" })
    ]);
    if (!isDeepStrictEqual(directSearch, installedDiscovery.search)) {
      throw new Error("Installed direct search payload differs from installed MCP transport.");
    }
    if (!isDeepStrictEqual(directRecipe, parsed(recipe))) {
      throw new Error("Installed direct resource payload differs from installed MCP transport.");
    }
    return Object.freeze({
      package: {
        name: installed.artifact.name,
        version: installed.artifact.version,
        entryCount: installed.artifact.entryCount,
        packedBytes: installed.artifact.packedBytes,
        unpackedBytes: installed.artifact.unpackedBytes,
        sha256: installed.artifact.sha256
      },
      executableMode: process.platform === "win32" ? null : (await stat(installed.executable)).mode & 0o777,
      discoveryMatchesSource: true,
      directPayloadMatchesTransport: true,
      instructions: installedDiscovery.instructions,
      resources: installedDiscovery.resources.map(resource => resource.uri),
      templates: installedDiscovery.resourceTemplates.map(template => template.uriTemplate),
      tools: installedDiscovery.tools.map(tool => tool.name),
      counts: installedDiscovery.overview.counts,
      action: parsed(action).id,
      recipe: parsed(recipe).id,
      docs: parsed(docs).id,
      search: installedDiscovery.search.results.map(result => `${result.kind}:${result.id}`),
      stderr: ""
    });
  } finally {
    await closeClients(client, sourceClient);
    await installed.cleanup();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await verifyInstalledMcpPackage(), null, 2)}\n`);
}
