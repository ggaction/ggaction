import { declaredActionMetadata } from "./action-card-source.js";
import { authoringRoles } from "./action-card-metadata.js";
import { publicOptionDeclarations } from "./generate-doc-signatures.js";

function titleId(title) {
  return title.replace(/`/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-");
}

function blocks(source) {
  const starts = [...source.matchAll(/^### (.+)$/gm)];
  return starts.map((match, index) => ({
    title: match[1], id: titleId(match[1]),
    body: source.slice(match.index + match[0].length,
      starts[index + 1]?.index ?? source.length).trim()
  }));
}

function typeCell(value) {
  return `\`${value.replaceAll("|", "\\|").replaceAll("`", "'")}\``;
}

export async function explicitActionPages({ catalog, sections, legacyLocations, families, page }) {
  const definitions = new Map((await declaredActionMetadata(catalog.actions)).map(item => [item.name, item]));
  const namedDeclarations = await publicOptionDeclarations();
  const sources = new Map();
  for (const section of sections) for (const block of blocks(section)) sources.set(block.id, block);
  // The extension source is a table rather than an H3 block.
  sources.set("extension-actions", {
    title: "Extension and scale contracts", id: "extension-actions",
    body: sections.at(-1).replace(/^## Extension API\n+/, "")
  });
  const familyFor = action => action.layer === "primitive" ? "extension"
    : action.layer === "advanced" ? "advanced"
      : families.find(family => family.domains.includes(action.domain))?.id;
  const locations = new Map(catalog.actions.map(action => {
    const family = familyFor(action);
    if (!family) throw new Error(`Missing documentation family for ${action.name}`);
    return [action.name, `/reference/actions/${family}/#${action.name.toLowerCase()}`];
  }));
  const grouped = new Map();
  for (const action of catalog.actions) {
    const old = legacyLocations.get(action.name);
    const anchor = old.split("#")[1];
    if (!sources.has(anchor)) throw new Error(`Missing behavior source ${anchor} for ${action.name}`);
    if (!grouped.has(anchor)) grouped.set(anchor, []);
    grouped.get(anchor).push(action);
  }
  const owners = new Map([...grouped].map(([anchor, actions]) => {
    const counts = new Map();
    for (const action of actions) counts.set(familyFor(action), (counts.get(familyFor(action)) ?? 0) + 1);
    return [anchor, [...counts].sort((a, b) => b[1] - a[1])[0][0]];
  }));
  const outputs = new Map();
  const definitionsByFamily = [...families, {
    id: "advanced", title: "Advanced Chart Actions",
    description: "Assign atomic channels and manage reusable final-item selections."
  }, {
    id: "extension", title: "Extension Actions",
    description: "Edit semantic and concrete graphics through extension primitives."
  }];
  for (const family of definitionsByFamily) {
    const actions = catalog.actions.filter(action => familyFor(action) === family.id);
    const entries = actions.map(action => {
      const declaration = definitions.get(action.name);
      const oldAnchor = legacyLocations.get(action.name).split("#")[1];
      const source = sources.get(oldAnchor);
      const shared = grouped.get(oldAnchor).length > 1;
      const typeNames = [...new Set(declaration.signature.match(/\b[A-Z][A-Za-z0-9]+\b/g) ?? [])]
        .filter(name => name !== "ChartProgram" && namedDeclarations.has(name));
      const optionRows = declaration.options.map(option =>
        `| \`${option.name}\` | ${option.required ? "Required" : "Optional / branch-dependent"} | ${typeCell(option.type)} |`
      );
      return [
        `### \`${action.name}\``, "",
        `**API layer:** ${action.layer}. **Authoring roles:** ${authoringRoles(action).join(", ")}.`, "",
        "```typescript", declaration.signature, "```", "",
        ...(typeNames.length ? ["Named option contracts: " + typeNames.map(name =>
          `[\`${name}\`](./../types.md#type-${name.toLowerCase()})`).join(" · ") + ".", ""] : []),
        '<details markdown="1">', '<summary>Declared options</summary>', "",
        "Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.", "",
        ...(optionRows.length ? ["| Option | Presence | Type |", "| --- | --- | --- |", ...optionRows]
          : ["This action takes no named options."]), "", "</details>", "",
        ...(shared ? [
          `Behavior, inference, resets, and errors: [${source.title.replaceAll("`", "")}](./${owners.get(oldAnchor)}.md#${oldAnchor}).`, ""
        ] : ["The following call patterns are abbreviated examples; the declaration above owns the complete option set.", "", source.body]), ""
      ].join("\n");
    });
    const sharedBlocks = [...grouped].filter(([anchor, names]) => names.length > 1 && owners.get(anchor) === family.id)
      .map(([anchor]) => `### ${sources.get(anchor).title}\n\n${sources.get(anchor).body}`);
    const aliases = new Map();
    for (const [name, oldUrl] of legacyLocations) {
      if (!oldUrl.startsWith(`/reference/actions/${family.id}/#`)) continue;
      const oldAnchor = oldUrl.split("#")[1];
      if (locations.get(name) === oldUrl ||
          (grouped.get(oldAnchor).length > 1 && owners.get(oldAnchor) === family.id)) continue;
      const destination = grouped.get(oldAnchor).length > 1
        ? `/reference/actions/${owners.get(oldAnchor)}/#${oldAnchor}` : locations.get(name);
      aliases.set(oldAnchor, destination);
    }
    const legacy = [...aliases].map(([anchor, destination]) =>
      `### Previous reference location {#${anchor}}\n\nThis contract moved: [open the current action or shared contract](./${destination.split("/").at(-2)}.md#${destination.split("#")[1]}).`);
    outputs.set(`reference/actions/${family.id}.md`, page({
      ...family,
      introduction: "Each declared action has an exact signature and its own stable link. Option tables are generated from types; behavior prose names the owning workflow and its constraints. API layer and H0–H4 authoring role are independent classifications.",
      body: [...entries, ...sharedBlocks, ...legacy].join("\n\n")
    }));
  }
  return { outputs, locations };
}
