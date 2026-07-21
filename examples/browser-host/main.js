import { render } from "../../src/index.js";
import { PUBLIC_CHARTS } from "../registry.js";

const DATA_FILES = Object.freeze({
  cars: "cars.json",
  gapminder: "gapminder.json",
  jobs: "jobs.json",
  nightingaleRose: "nightingale_rose.json",
  imdbSelected: "imdb_selected.json",
  fashionTsne: "fashion_mnist_tsne.csv"
});

function parseFashionRows(source) {
  return source.trim().split(/\r?\n/).slice(1).map(line => {
    const [xPosition, yPosition, label, labelName] = line.split(",");
    return {
      x_pos: Number(xPosition),
      y_pos: Number(yPosition),
      label: Number(label),
      label_name: labelName
    };
  });
}

async function loadDataset(id) {
  const file = DATA_FILES[id];
  if (file === undefined) throw new Error(`Unknown browser dataset "${id}".`);
  const response = await fetch(`../../data/${file}`);
  if (!response.ok) throw new Error(`Cannot load browser dataset "${id}".`);
  return id === "fashionTsne"
    ? parseFashionRows(await response.text())
    : response.json();
}

async function loadExampleData(definition) {
  if (typeof definition === "string") return loadDataset(definition);
  return Object.fromEntries(await Promise.all(
    Object.entries(definition).map(async ([key, id]) => [key, await loadDataset(id)])
  ));
}

const id = new URLSearchParams(window.location.search).get("chart");
const example = PUBLIC_CHARTS.find(candidate => candidate.id === id);
if (example === undefined) throw new Error(`Unknown browser chart "${id}".`);

const program = example.createProgram(await loadExampleData(example.data));
const canvas = document.querySelector("#chart");
const title = example.id.split("-").map(word =>
  word.charAt(0).toUpperCase() + word.slice(1)
).join(" ");
document.title = `ggaction ${title}`;
document.querySelector("#title").textContent = title;
canvas.setAttribute("aria-label", title);
render(program, canvas.getContext("2d"), { pixelRatio: window.devicePixelRatio });
document.querySelector("#status").textContent = `${title} rendered`;
window.__ggactionExample = Object.freeze({
  id: example.id,
  width: example.width,
  height: example.height
});
