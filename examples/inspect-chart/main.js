import { render } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { createInteractionSession } from "../../src/interaction.js";
import { createInspectionChart } from "./program.js";

const program = createInspectionChart(), canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"), { pixelRatio: window.devicePixelRatio });
document.querySelector("#vector").innerHTML = renderToSVG(program);
const svg = document.querySelector("#vector svg");
svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "The same observations rendered as SVG");
const sessions = [canvas, svg].map(element => {
  const session = createInteractionSession({ program });
  session.subscribe(({ state }) => {
    document.querySelector("#inspection").textContent = state.hit?.target
      ? `${state.hit.target.role}: ${state.hit.candidates.length} overlapping item(s)` : "Move over a point or guide.";
  });
  session.mount(element);
  return session;
});
window.addEventListener("pagehide", () => sessions.forEach(session => session.destroy()), { once: true });
document.querySelector("#status").textContent = "Canvas and SVG inspection ready";
window.__ggactionExample = Object.freeze({ id: "inspect-chart", width: 420, height: 300 });
window.__inspectionSessions = sessions;
