import { chart } from "../../src/index.js";

const SPECIES_COLORS = { Adelie: "#f97316", Chinstrap: "#a855f7", Gentoo: "#0d9488" };

// Every penguin flows from its species to the island it was measured on, then to its sex.
export function createPenguinSankey(penguins) {
  const nodes = new Map();
  const links = new Map();
  const node = (id, name, fill) => {
    if (!nodes.has(id)) nodes.set(id, { id, name, fill });
  };
  const link = (from, to, fill) => {
    const id = `${from}→${to}`;
    if (!links.has(id)) links.set(id, { id, from, to, count: 0, fill });
    links.get(id).count += 1;
  };
  for (const penguin of penguins) {
    const species = `species:${penguin.species}`;
    const island = `island:${penguin.island}`;
    const sex = `sex:${penguin.sex ?? "unrecorded"}`;
    const fill = SPECIES_COLORS[penguin.species];
    node(species, penguin.species, fill);
    node(island, `${penguin.island} Island`, "#64748b");
    node(sex, penguin.sex ? penguin.sex[0].toUpperCase() + penguin.sex.slice(1) : "Not recorded", "#94a3b8");
    link(species, island, fill);
    link(island, sex, "#94a3b8");
  }
  const nodeRows = [...nodes.values()];
  const linkRows = [...links.values()];

  return chart()
    .createCanvas({ width: 900, height: 520, margin: { top: 80, right: 120, bottom: 30, left: 100 } })
    .createData({ id: "nodes", keyField: "id", values: nodeRows })
    .createData({ id: "links", keyField: "id", values: linkRows })
    .createFlowData({
      id: "flow",
      nodes: "nodes",
      edges: "links",
      nodeKey: "id",
      edgeKey: "id",
      source: "from",
      target: "to",
      value: "count",
      attributes: ["name"]
    })
    .layoutFlow({
      id: "layout",
      method: "dag",
      options: { width: 680, height: 410, nodeWidth: 16, nodePadding: 22, order: "barycentric", iterations: 16 }
    })
    .createFlowLinks({
      links: { opacity: 0.45, overrides: linkRows.map(row => ({ key: row.id, fill: row.fill })) }
    })
    .createFlowNodes({
      clip: false,
      nodes: { overrides: nodeRows.map(row => ({ key: row.id, fill: row.fill })) },
      labels: { content: { field: "name" }, fontSize: 13, fontWeight: 600, outline: { color: "#ffffff", width: 3 } }
    })
    .createTitle({
      text: "344 Palmer penguins by species, island and sex",
      subtitle: "Gentoo live only on Biscoe and Chinstrap only on Dream · link width is the number of birds"
    });
}
