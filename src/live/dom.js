// Live host UI. Field values are text only; nothing is inserted as HTML.

function documentOf(element) {
  const owner = element?.ownerDocument;
  if (owner === undefined || owner === null || typeof owner.createElement !== "function") throw new TypeError("Live UI requires an element attached to a document.");
  return owner;
}

function floating(element, styles) {
  const node = documentOf(element).createElement("div");
  Object.assign(node.style, { position: "fixed", pointerEvents: "none", display: "none", zIndex: "1000", ...styles });
  (element.ownerDocument.body ?? element.parentNode).appendChild(node);
  return node;
}

function place(node, element, point, dx = 0, dy = 0) {
  const box = element.getBoundingClientRect();
  node.style.left = `${box.left + point.x + dx}px`;
  node.style.top = `${box.top + point.y + dy}px`;
}

export function createTooltip(element) {
  const node = floating(element, { background: "rgba(17,24,39,0.92)", color: "#fff", font: "12px sans-serif",
    padding: "4px 8px", borderRadius: "4px", whiteSpace: "pre", maxWidth: "320px" });
  node.setAttribute?.("role", "tooltip");
  return {
    show(point, text) { node.textContent = text; node.style.display = "block"; place(node, element, point, 12, 12); },
    hide() { node.style.display = "none"; },
    remove() { node.remove?.(); }
  };
}

export function createHoverMarker(element, color) {
  const size = 16;
  const node = floating(element, { width: `${size}px`, height: `${size}px`, border: `2px solid ${color}`, borderRadius: "50%", boxSizing: "border-box" });
  return {
    show(point) { node.style.display = "block"; place(node, element, point, -size / 2, -size / 2); },
    hide() { node.style.display = "none"; },
    remove() { node.remove?.(); }
  };
}

// One labelled input bound to a parameter; `apply` receives the parsed value.
export function createControl(element, kind, { container, label, value, min, max, step, options }, apply) {
  const doc = documentOf(element), wrapper = doc.createElement("label"), input = doc.createElement(kind === "slider" ? "input" : "select");
  wrapper.textContent = label;
  if (kind === "slider") {
    Object.assign(input, { type: "range", min: String(min), max: String(max), step: String(step), value: String(value) });
  } else {
    for (const option of options) {
      const entry = doc.createElement("option");
      entry.value = String(option); entry.textContent = String(option);
      if (option === value) entry.selected = true;
      input.appendChild(entry);
    }
  }
  const listener = () => apply(kind === "slider" ? Number(input.value) : options.find(option => String(option) === input.value));
  input.addEventListener("input", listener);
  wrapper.appendChild(input);
  (container ?? element.parentNode).appendChild(wrapper);
  return { input, remove() { input.removeEventListener("input", listener); wrapper.remove?.(); } };
}
