import { render } from "../../src/index.js";
import { createAnnotatedImdbScatterplot } from "./program.js";

const response = await fetch("../../data/imdb_selected.json");
const rows = await response.json();
const program = createAnnotatedImdbScatterplot(rows);
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
document.querySelector("#status").textContent = `${rows.length} films annotated`;
