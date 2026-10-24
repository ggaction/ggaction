import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { root, run, npmCommand, tscCommand } from "./runtime.js";

export async function testMcpConsumer(directory) {
  const installedRoot = path.join(directory, "node_modules", "ggaction");
  const installedPackage = JSON.parse(await readFile(
    path.join(installedRoot, "package.json"),
    "utf8"
  ));
  const executable = path.join(
    directory,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "ggaction-mcp.cmd" : "ggaction-mcp"
  );
  const { searchGgactionText } = await import(
    pathToFileURL(path.join(installedRoot, "src", "mcp", "adapter.js")).href
  );
  const [
    actionCardSchema,
    actionCardsSchema,
    actionCards,
    taskPacketSchema,
    intentTaxonomySchema,
    mcpResourcesSchema,
    intentTaxonomy,
    mcpResources
  ] = await Promise.all([
    "action-card.schema.json",
    "action-cards.schema.json",
    "action-cards.json",
    "task-packet.schema.json",
    "intent-taxonomy.schema.json",
    "mcp-resources.schema.json",
    "intent-taxonomy.json",
    "mcp-resources.json"
  ].map(async file => JSON.parse(await readFile(
    path.join(installedRoot, "knowledge", file),
    "utf8"
  ))));
  const actionIndex = JSON.parse(await readFile(path.join(root, "agent_docs/contract/ACTION_INDEX.json"), "utf8"));
  const expectedActions = actionIndex.actions.filter(entry => entry.status === "implemented").length;
  if (
    actionCardSchema.properties?.schemaVersion?.const !== 3 ||
    actionCardsSchema.properties?.schemaVersion?.const !== 3 ||
    actionCards.schemaVersion !== 3 ||
    actionCards.count !== expectedActions ||
    actionCards.cards.length !== expectedActions ||
    actionCards.packageVersion !== installedPackage.version
  ) {
    throw new Error("Installed action-card discovery contract is missing or stale.");
  }
  const installedCards = new Map(actionCards.cards.map(card => [card.name, card]));
  if (
    installedCards.get("editLegendBlock")?.signature !==
      "editLegendBlock(options: TargetedOptions<EditLegendBlockOptions>): ChartProgram;" ||
    installedCards.get("editLegendBlock")?.supports.entryPoints.join(",") !== "default" ||
    installedCards.get("editLegendBlock")?.inference.find(entry =>
      entry.input === "target")?.strategy !== "explicit" ||
    installedCards.get("editLegendBlock")?.callPatterns.some(pattern =>
      pattern.includes("symbol")) !== true
  ) {
    throw new Error("Installed legend-block discovery metadata is stale.");
  }
    if (
      installedCards.get("editMarkLabelSelection")?.signature !==
      "editMarkLabelSelection(options: TargetedOptions<EditMarkLabelSelectionOptions>): ChartProgram;" ||
    installedCards.get("editMarkLabelSelection")?.supports.entryPoints.join(",") !== "default" ||
    installedCards.get("editMarkLabelSelection")?.inference.find(entry => entry.input === "target")?.strategy !== "explicit"
  ) {
      throw new Error("Installed selected-label discovery metadata is stale.");
    }
    if (
      installedCards.get("editMarkLabelPlacement")?.signature !==
        "editMarkLabelPlacement(options: TargetedOptions<EditMarkLabelPlacementOptions>): ChartProgram;" ||
      installedCards.get("editMarkLabelPlacement")?.supports.entryPoints.join(",") !== "default" ||
      installedCards.get("editMarkLabelPlacement")?.inference.find(entry => entry.input === "target")?.strategy !== "explicit"
    ) {
      throw new Error("Installed semantic label-placement discovery metadata is stale.");
    }
  if (
    installedCards.get("editCoordinate")?.signature !==
      "editCoordinate(options: TargetedOptions<EditCoordinateOptions>): ChartProgram;" ||
    installedCards.get("editCoordinate")?.supports.entryPoints.join(",") !== "default"
  ) {
    throw new Error("Installed coordinate aspect discovery metadata is stale.");
  }
  if (
    installedCards.get("removeMarkLabels")?.signature !==
      "removeMarkLabels(options: TargetedOptions<RemoveMarkLabelsOptions>): ChartProgram;" ||
    installedCards.get("removeMarkLabels")?.supports.entryPoints.join(",") !== "default" ||
    installedCards.get("removeMarkLabels")?.inference.some(entry => entry.strategy !== "explicit")
  ) {
    throw new Error("Installed mark-label removal discovery metadata is stale.");
  }
  if (
    installedCards.get("encodeChannels")?.signature !==
      "encodeChannels(options: TargetedOptions<EncodeChannelsOptions>): ChartProgram;" ||
    installedCards.get("encodeChannels")?.supports.entryPoints.join(",") !== "default"
  ) {
    throw new Error("Installed atomic encoding discovery metadata is stale.");
  }
  if (installedCards.get("createNormalizedData")?.signature !==
    "createNormalizedData(options: TargetedOptions<NormalizedDataOptions>): ChartProgram;") {
    throw new Error("Installed normalization discovery metadata is stale.");
  }
  if (
    installedCards.get("createCompleteData")?.signature !==
      "createCompleteData(options: TargetedOptions<CompleteDataOptions>): ChartProgram;" ||
    installedCards.get("createImputedData")?.signature !==
      "createImputedData(options: TargetedOptions<ImputedDataOptions>): ChartProgram;"
  ) {
    throw new Error("Installed missing-data discovery metadata is stale.");
  }
  if (
    installedCards.get("editDerivedData")?.signature !==
      "editDerivedData(options: TargetedOptions<EditDerivedDataOptions>): ChartProgram;" ||
    installedCards.get("editComputedData")?.signature !==
      "editComputedData(options: TargetedOptions<EditComputedDataOptions>): ChartProgram;"
  ) {
    throw new Error("Installed derived-data editing metadata is stale.");
  }
  if (installedCards.get("editParallelScale")?.signature !==
    "editParallelScale(options: TargetedOptions<EditParallelScaleOptions>): ChartProgram;") {
    throw new Error("Installed Parallel scale editing metadata is stale.");
  }
  if (installedCards.get("editStrokeScale")?.signature !==
    "editStrokeScale(options: TargetedOptions<EditStrokeScaleOptions>): ChartProgram;") {
    throw new Error("Installed stroke scale editing metadata is stale.");
  }
  if (
    installedCards.get("editXOffsetScale")?.signature !==
      "editXOffsetScale(options: TargetedOptions<EditXOffsetScaleOptions>): ChartProgram;" ||
    installedCards.get("editYOffsetScale")?.signature !==
      "editYOffsetScale(options: TargetedOptions<EditYOffsetScaleOptions>): ChartProgram;"
  ) {
    throw new Error("Installed offset-scale editing metadata is stale.");
  }
  const installedScatter = installedCards.get("createScatterPlot");
  if (
    !installedScatter?.authoringRoles.includes("H0") ||
    !installedScatter?.wraps.includes("createPointMark") ||
    installedScatter?.completionRequirements.state !== "complete" ||
    installedScatter?.supports.entryPoints.join(",") !== "default,basic"
  ) {
    throw new Error("Installed complete-chart discovery metadata is stale.");
  }
  if (
    installedCards.get("createBoxPlot")?.completionRequirements.state !== "deferred" ||
    installedCards.get("createGradientPlot")?.completionRequirements.state !== "deferred" ||
    ["editSemantic", "createGraphics", "editGraphics"].some(name =>
      installedCards.get(name)?.authoringRoles.join(",") !== "H4"
    )
  ) {
    throw new Error("Installed completion or primitive discovery metadata is stale.");
  }
  if (taskPacketSchema.properties?.schemaVersion?.const !== 5) {
    throw new Error("Installed task packet schema must require schemaVersion 5.");
  }
  if (
    intentTaxonomySchema.$id !==
      "https://ggaction.github.io/ggaction/schemas/intent-taxonomy.schema.json" ||
    mcpResourcesSchema.$id !==
      "https://ggaction.github.io/ggaction/schemas/mcp-resources.schema.json"
  ) {
    throw new Error("Installed resolver knowledge schemas are missing or stale.");
  }
  if (
    intentTaxonomy.packageVersion !== installedPackage.version ||
    mcpResources.packageVersion !== installedPackage.version
  ) {
    throw new Error("Installed resolver knowledge must match the package version.");
  }
  const transport = new StdioClientTransport({
    command: executable,
    cwd: directory,
    stderr: "pipe"
  });
  const client = new Client(
    { name: "ggaction-installed-consumer", version: "1.0.0" },
    { capabilities: {} }
  );
  const started = performance.now();
  await client.connect(transport);
  const coldStartMilliseconds = performance.now() - started;
  try {
    const tools = await client.listTools();
    if (tools.tools.length !== 1 || tools.tools[0].name !== "search_ggaction") {
      throw new Error("Installed MCP must expose only search_ggaction.");
    }
    const query = "scatter plot with a color legend at bottom as svg";
    const result = await client.callTool({
      name: "search_ggaction",
      arguments: { query }
    });
    if (result.content[0]?.text !== searchGgactionText(query)) {
      throw new Error("Installed direct and MCP payloads are not byte-equal.");
    }
    const packet = JSON.parse(result.content[0].text);
    if (
      packet.schemaVersion !== 5 ||
      packet.packageVersion !== installedPackage.version ||
      packet.authoring?.initialize !== "let program = chart()" ||
      packet.authoring?.prerequisites?.length !== 2 ||
      !Array.isArray(packet.appliedOptions) ||
      !Array.isArray(packet.placeholderBindings) ||
      !Array.isArray(packet.unmatchedRequirements)
    ) {
      throw new Error("Installed MCP did not return the task packet v4 authoring bootstrap.");
    }
    const authoringSource = [
      'import assert from "node:assert/strict";',
      ...packet.authoring.imports,
      "const values = [",
      '  { x: 1, y: 4, category: "A" },',
      '  { x: 2, y: 7, category: "B" },',
      '  { x: 3, y: 6, category: "A" }',
      "];",
      `${packet.authoring.initialize};`,
      ...packet.authoring.prerequisites.map(entry => `${entry.call};`),
      ...packet.authoring.steps.map(step => `${step};`),
      'assert.equal(output.startsWith("<svg"), true);',
      "assert.ok(program.graphicSpec.objects.scatterPlot.items.length > 0);",
      ""
    ].join("\n");
    const authoringFile = path.join(directory, "mcp-authoring-smoke.mjs");
    await writeFile(authoringFile, authoringSource);
    run(process.execPath, [authoringFile], directory);
    const labelRemovalResult = await client.callTool({
      name: "search_ggaction",
      arguments: { query: "remove labels from bar" }
    });
    const labelRemovalPacket = JSON.parse(labelRemovalResult.content[0].text);
    if (
      labelRemovalPacket.actionPlan?.map(step => step.name).join(",") !== "removeMarkLabels" ||
      labelRemovalPacket.exactCalls?.join(",") !==
        'program.removeMarkLabels({ source: "bars" })' ||
      labelRemovalPacket.unresolved?.length !== 0
    ) {
      throw new Error("Installed MCP did not route attached-label removal.");
    }
    const selectedLabelResult = await client.callTool({
      name: "search_ggaction",
      arguments: { query: "show all labels" }
    });
    const selectedLabelPacket = JSON.parse(selectedLabelResult.content[0].text);
    if (
      selectedLabelPacket.actionPlan?.map(step => step.name).join(",") !== "editMarkLabelSelection" ||
      selectedLabelPacket.exactCalls?.join(",") !==
        'program.editMarkLabelSelection({ target: "labels", all: true })' ||
      selectedLabelPacket.unresolved?.length !== 0
    ) {
      throw new Error("Installed MCP did not route selected-label editing.");
    }
    const labelPlacementResult = await client.callTool({
      name: "search_ggaction",
      arguments: { query: "labels outside bars" }
    });
    const labelPlacementPacket = JSON.parse(labelPlacementResult.content[0].text);
    if (
      labelPlacementPacket.actionPlan?.map(step => step.name).join(",") !== "editMarkLabelPlacement" ||
      labelPlacementPacket.exactCalls?.join(",") !==
        'program.editMarkLabelPlacement({ target: "labels", placement: { anchor: "outsideEnd" } })' ||
      labelPlacementPacket.unresolved?.length !== 0
    ) {
      throw new Error("Installed MCP did not route semantic label placement.");
    }
    const resources = await client.listResources();
    if (
      resources.resources.length !== 9 ||
      resources.resources.some(resource => resource.uri.startsWith("ggaction://docs/"))
    ) {
      throw new Error("Installed MCP resource discovery is not bounded.");
    }
    const overview = await client.readResource({ uri: "ggaction://overview" });
    if (!overview.contents[0]?.text.includes("never executes chart code")) {
      throw new Error("Installed MCP overview is missing its read-only boundary.");
    }
    let deniedResolvedFallback = false;
    try {
      await client.readResource({ uri: "ggaction://docs/choose-chart-type" });
    } catch (error) {
      deniedResolvedFallback = /available only when recommended/.test(String(error));
    }
    if (!deniedResolvedFallback) {
      throw new Error("Installed MCP exposed docs without an unresolved search result.");
    }
    await client.callTool({
      name: "search_ggaction",
      arguments: { query: "make a chart" }
    });
    const fallback = await client.readResource({
      uri: "ggaction://docs/choose-chart-type"
    });
    if (!fallback.contents[0]?.text.startsWith("# Choose a chart or mark type")) {
      throw new Error("Installed MCP did not expose the recommended bounded fallback.");
    }
    await client.callTool({
      name: "search_ggaction",
      arguments: { query: "map chart" }
    });
    let deniedTerminalFallback = false;
    try {
      await client.readResource({ uri: "ggaction://docs/unsupported-capabilities" });
    } catch (error) {
      deniedTerminalFallback = /available only when recommended/.test(String(error));
    }
    if (!deniedTerminalFallback) {
      throw new Error("Installed MCP required documentation for a terminal unsupported result.");
    }
    let deniedArbitraryFile = false;
    try {
      await client.readResource({ uri: "file:///etc/passwd" });
    } catch (error) {
      deniedArbitraryFile = /Unsupported knowledge resource URI/.test(String(error));
    }
    if (!deniedArbitraryFile) {
      throw new Error("Installed MCP accepted an arbitrary file URI.");
    }
    return { coldStartMilliseconds };
  } finally {
    await client.close();
  }
}
