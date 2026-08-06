import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { createPackageArtifact } from "./package-artifact.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

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
  const temporary = await mkdtemp(path.join(tmpdir(), "ggaction-mcp-package-"));
  const packed = path.join(temporary, "packed");
  const consumer = path.join(temporary, "consumer");
  const cache = path.join(temporary, "npm-cache");
  let client;
  let sourceClient;
  try {
    await Promise.all([mkdir(packed), mkdir(consumer), mkdir(cache)]);
    const artifact = await createPackageArtifact({ cwd: root, outputDirectory: packed });
    execFileSync(npmCommand, [
      "install",
      artifact.file,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false"
    ], {
      cwd: consumer,
      env: { ...process.env, NPM_CONFIG_CACHE: cache },
      encoding: "utf8"
    });

    const executable = path.join(
      consumer,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "ggaction-mcp.cmd" : "ggaction-mcp"
    );
    const transport = new StdioClientTransport({
      command: executable,
      cwd: consumer,
      stderr: "pipe"
    });
    client = new Client({ name: "ggaction-installed-package-check", version: "1.0.0" });
    await client.connect(transport);
    const sourceTransport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(root, "bin", "ggaction-mcp.js")],
      cwd: root,
      stderr: "pipe"
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
    return Object.freeze({
      package: {
        name: artifact.name,
        version: artifact.version,
        entryCount: artifact.entryCount,
        packedBytes: artifact.size,
        unpackedBytes: artifact.unpackedSize,
        sha256: artifact.sha256
      },
      executableMode: process.platform === "win32" ? null : (await stat(executable)).mode & 0o777,
      discoveryMatchesSource: true,
      instructions: installedDiscovery.instructions,
      resources: installedDiscovery.resources.map(resource => resource.uri),
      templates: installedDiscovery.resourceTemplates.map(template => template.uriTemplate),
      tools: installedDiscovery.tools.map(tool => tool.name),
      counts: installedDiscovery.overview.counts,
      action: parsed(action).id,
      recipe: parsed(recipe).id,
      docs: parsed(docs).id,
      search: installedDiscovery.search.results.map(result => `${result.kind}:${result.id}`),
      stderr: `${transport.stderr?.read()?.toString() ?? ""}${sourceTransport.stderr?.read()?.toString() ?? ""}`
    });
  } finally {
    await closeClients(client, sourceClient);
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await verifyInstalledMcpPackage(), null, 2)}\n`);
}
