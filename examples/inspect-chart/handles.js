import { render } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { createInteractionSession } from "../../src/interaction.js";
import { createSelectionHandleChart, createCategoryHandleChart } from "./program.js";

// The host owns idle UI and ARIA. The same readonly CSS positions are also
// used by the session's pointer candidate resolver. No semantic renderer hooks.
export function mountHandleExamples(container) {
  const sessions = [];
  for (const kind of ["resize", "reorder"]) for (const backend of ["canvas", "svg"]) {
    const card = document.createElement("section"), title = document.createElement("h3"), wrapper = document.createElement("div");
    title.textContent = `${kind === "resize" ? "Selection boundary" : "Category order"} · ${backend.toUpperCase()}`;
    wrapper.className = "handle-view"; wrapper.dataset.kind = kind; wrapper.dataset.backend = backend;
    const host = document.createElement(backend === "canvas" ? "canvas" : "div"), handles = document.createElement("div"), controls = document.createElement("div");
    host.className = "handle-surface"; handles.className = "handle-overlay"; controls.className = "handle-controls";
    host.setAttribute("aria-label", title.textContent); host.setAttribute("role", "img");
    wrapper.append(host, handles); card.append(title, wrapper, controls); container.append(card);
    const program = kind === "resize" ? createSelectionHandleChart() : createCategoryHandleChart();
    const binding = kind === "resize" ? { type: "resize", target: "observations", selection: "window", axis: "x" }
      : { type: "reorder", target: "bars", channel: "x" };
    const session = createInteractionSession({ program, bindings: [binding] }), buttons = new Map();
    sessions.push({ kind, backend, session });
    const draw = () => {
      const state = session.getState(), current = state.previewProgram ?? state.program;
      if (backend === "canvas") render(current, host.getContext("2d"), { pixelRatio: window.devicePixelRatio });
      else host.innerHTML = renderToSVG(current);
      if (kind === "resize") {
        const currentHandles = session.getSelectionHandles().handles;
        const selected = current.semanticSpec.resources.find(resource => resource.id === "window").options.predicate.region.x.ranges[0];
        for (const handle of currentHandles) {
          let button = buttons.get(handle.handle);
          if (!button) {
            button = document.createElement("button"); button.type = "button"; button.className = "selection-handle";
            button.dataset.handle = handle.handle; button.setAttribute("role", "slider");
            button.setAttribute("aria-label", handle.handle === "x-min" ? "Selection minimum" : "Selection maximum");
            button.setAttribute("aria-valuemin", "0"); button.setAttribute("aria-valuemax", "10");
            button.addEventListener("keydown", event => {
              if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
              event.preventDefault();
              const p = session.getState().program, range = p.semanticSpec.resources.find(resource => resource.id === "window").options.predicate.region.x.ranges[0];
              const value = range[handle.handle === "x-min" ? "min" : "max"] + (event.key === "ArrowRight" ? 1 : -1);
              if (value < 0 || value > 10 || (handle.handle === "x-min" ? value >= range.max : value <= range.min)) return;
              session.dispatch({ type: "select", target: "observations", payload: { id: "window", mode: "replace",
                select: { region: { x: { ranges: [{ ...range, [handle.handle === "x-min" ? "min" : "max"]: value }] } } } }, origin: "user" });
            });
            handles.append(button); buttons.set(handle.handle, button);
          }
          button.style.left = `${handle.point.x}px`; button.style.top = `${handle.point.y}px`;
          button.setAttribute("aria-valuenow", String(selected[handle.handle === "x-min" ? "min" : "max"]));
        }
        for (const [key, button] of buttons) button.hidden = !currentHandles.some(handle => handle.handle === key);
      } else {
        for (const value of current.resolvedScales.x.domain) {
          let button = buttons.get(value);
          if (!button) {
            button = document.createElement("button"); button.type = "button"; button.textContent = `Move ${value}`;
            button.setAttribute("aria-label", `Move category ${value}; use left or right arrow`);
            button.addEventListener("keydown", event => {
              if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
              event.preventDefault();
              const values = [...session.getState().program.resolvedScales.x.domain], old = values.indexOf(value), next = old + (event.key === "ArrowRight" ? 1 : -1);
              if (next < 0 || next >= values.length) return;
              values.splice(old, 1); values.splice(next, 0, value);
              session.dispatch({ type: "reorder", target: "bars", payload: { channel: "x", values }, origin: "user" });
            });
            controls.append(button); buttons.set(value, button);
          }
          button.setAttribute("aria-description", `Position ${current.resolvedScales.x.domain.indexOf(value) + 1} of 3`);
        }
      }
    };
    session.subscribe(event => { if (!event.state.destroyed && event.phase !== "settled") draw(); });
    draw(); session.mount(wrapper);
  }
  return sessions;
}
