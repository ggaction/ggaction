import { render, prepareImageRendering } from "../../src/index.js";
import { createImageExample } from "./program.js";
import { fixtures } from "./data.js";
import { decodeImage } from "./host.js";
for (const fixture of fixtures) {
  const canvas = document.createElement("canvas");
  canvas.id = fixture.id; canvas.setAttribute("aria-label", `Image placement: ${fixture.id}`);
  document.querySelector("#charts").append(canvas);
  const program = createImageExample(fixture);
  const images = await prepareImageRendering(program, { decode: decodeImage });
  render(program, canvas.getContext("2d"), { images });
}
document.querySelector("#status").textContent = "Ready";
