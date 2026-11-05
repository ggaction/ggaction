import { chart as programChart } from "../ChartProgram.js";
import { ChartProgram } from "../core/ChartProgram.js";
import { getWrappedActionMetadata } from "../core/action.js";
import { render } from "../renderers/canvas/index.js";
import { renderToSVG } from "../renderers/svg.js";
import { createInteractionSession } from "../interaction/session.js";
import { planTransition } from "../animation/planner.js";
import { createAnimationPlayer } from "../animation/createPlayer.js";
import { serializeProgram, deserializeProgram } from "../persistence.js";
import { exportAccessibleData } from "../accessibility.js";
import { getProjectionView } from "../inspection.js";
import { findDataset } from "../selectors/datasets.js";
import { findStoredResource } from "../selectors/resources.js";
import { createTooltip, createHoverMarker, createControl } from "./dom.js";
import { resolveMarkTarget, positionScales, zoomDomain, panDomain, sourceDataset, legendChannel } from "./targets.js";

const LIVE_FORMAT = "ggaction-live";
const DRAG_MODIFIERS = [{}, { shift: true }, { alt: true }, { ctrl: true }];
const frameClock = view => ({
  now: () => view.performance?.now() ?? Date.now(),
  requestFrame: callback => (view.requestAnimationFrame ?? (fn => setTimeout(() => fn(Date.now()), 16)))(callback),
  cancelFrame: handle => (view.cancelAnimationFrame ?? clearTimeout)(handle)
});

// One stateful chart over the immutable engine. Every authoring call replaces
// the current program and, once a screen is attached, draws it immediately.
// A failing call throws and leaves the program, screen and interactions as they were.
export class LiveChart {
  #program; #element; #canvas; #svg; #pixelRatio = 1;
  #features = []; #session; #unmount; #tooltip; #marker; #controls = [];
  #listeners = new Map(); #history = []; #future = []; #baseline; #items = new WeakMap();
  #wheel; #pan; #panStart; #resize; #links = new Set(); #applyingLink = false; #disposed = false; #revision = 0;

  constructor(program = programChart()) {
    if (!(program instanceof ChartProgram)) throw new TypeError("A live chart requires a ChartProgram.");
    this.#program = program; this.#baseline = program;
  }

  /** The current immutable program. */
  get program() { return this.#program; }

  /** Why the current program could not be drawn or made interactive yet, if so.
   * Incomplete authoring states (a mark before its encodings) are not failures. */
  get pendingError() { return this.#pendingError; }
  #pendingError = null;

  // Screen ---------------------------------------------------------------

  addCanvas(element, { pixelRatio } = {}) {
    this.#alive();
    if (element === null || typeof element !== "object" || typeof element.getBoundingClientRect !== "function") throw new TypeError("addCanvas requires a canvas, svg or container element.");
    this.#detachScreen();
    const tag = String(element.tagName ?? "").toLowerCase();
    this.#svg = tag === "svg" ? element : undefined;
    if (tag === "canvas" || tag === "svg") this.#canvas = element;
    else {
      this.#canvas = element.ownerDocument.createElement("canvas");
      element.appendChild(this.#canvas);
    }
    this.#element = element;
    const view = element.ownerDocument?.defaultView;
    this.#pixelRatio = pixelRatio ?? view?.devicePixelRatio ?? 1;
    this.#rebuild();
    return this;
  }

  autoResize({ height } = {}) {
    this.#requireScreen("autoResize");
    const view = this.#element.ownerDocument?.defaultView;
    if (typeof view?.ResizeObserver !== "function") throw new TypeError("autoResize requires ResizeObserver.");
    this.#resize?.disconnect();
    const target = this.#svg ?? this.#canvas.parentNode ?? this.#canvas;
    this.#resize = new view.ResizeObserver(entries => {
      const box = entries.at(-1)?.contentRect;
      if (!box || box.width <= 0) return;
      const size = { width: Math.round(box.width), height: Math.round(height ?? box.height) };
      const canvas = this.#program.materializationConfigs.canvas;
      if (size.height > 0 && (size.width !== canvas?.width || size.height !== canvas?.height)) this.#replace(this.#program.editCanvas(size), { record: false });
    });
    this.#resize.observe(target);
    return this;
  }

  setTheme(theme) { return this.#replace(this.#program.applyTheme({ theme })); }

  async download(format = "png", filename = `chart.${format}`) {
    this.#alive();
    let blob;
    if (format === "svg") blob = new Blob([renderToSVG(this.#program)], { type: "image/svg+xml" });
    else if (format === "png") {
      const canvas = this.#canvas?.tagName?.toLowerCase() === "canvas" ? this.#canvas : undefined;
      if (canvas === undefined) throw new TypeError("PNG download requires an attached canvas.");
      blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    } else if (format === "pdf") {
      throw new TypeError('PDF needs the Node.js native renderer: use renderToPDFBuffer(chart.program) from "ggaction/pdf".');
    } else throw new TypeError('download format must be "png" or "svg".');
    const doc = this.#element?.ownerDocument ?? globalThis.document;
    const link = doc.createElement("a"), url = URL.createObjectURL(blob);
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return blob;
  }

  dispose() {
    if (this.#disposed) return;
    this.#detachScreen(); this.#resize?.disconnect();
    for (const other of this.#links) other.#links.delete(this);
    this.#links.clear(); this.#listeners.clear(); this.#disposed = true;
  }

  // Interactions -----------------------------------------------------------

  addTooltip({ fields, format, target } = {}) {
    if (format !== undefined && typeof format !== "function") throw new TypeError("addTooltip format must be a function.");
    if (fields !== undefined && (!Array.isArray(fields) || !fields.every(field => typeof field === "string"))) throw new TypeError("addTooltip fields must be field names.");
    return this.#addFeature({ kind: "tooltip", fields, format, target: target === undefined ? undefined : resolveMarkTarget(this.#program, target, "addTooltip") });
  }

  addHover({ target, color = "#111827" } = {}) {
    return this.#addFeature({ kind: "hover", color, target: target === undefined ? undefined : resolveMarkTarget(this.#program, target, "addHover") });
  }

  addClickSelect({ target, mode = "replace", color } = {}) { return this.#addSelection("select", "addClickSelect", target, { mode }, color); }
  addBrush({ target, axis = "xy", mode = "replace", color } = {}) { return this.#addSelection("brush", "addBrush", target, { axis, mode }, color); }
  addLasso({ target, mode = "replace", color } = {}) { return this.#addSelection("lasso", "addLasso", target, { mode }, color); }

  addZoom({ target, factor = 1.1, scaleExtent = [0.25, 16] } = {}) { return this.#addNavigation("zoom", target, { factor, scaleExtent }); }
  addPan({ target, scaleExtent = [0.25, 16] } = {}) { return this.#addNavigation("pan", target, { scaleExtent }); }

  addLegendToggle({ effect = "visibility", target, channel } = {}) {
    if (!["visibility", "selection"].includes(effect)) throw new TypeError('addLegendToggle effect must be "visibility" or "selection".');
    const mark = resolveMarkTarget(this.#program, target, "addLegendToggle"), legend = legendChannel(this.#program, mark, channel), before = this.#program;
    if (effect === "selection") this.#ensureSelection(mark);
    return this.#addFeature({ kind: "legend", effect, target: mark, channel: legend }, before);
  }

  addDragNodes({ target } = {}) {
    return this.#addFeature({ kind: "moveNode", target: resolveMarkTarget(this.#program, target, "addDragNodes"), drag: true });
  }

  on(event, handler) {
    if (!["select", "hover", "change", "error"].includes(event)) throw new TypeError('on event must be "select", "hover", "change" or "error".');
    if (typeof handler !== "function") throw new TypeError("on requires a handler function.");
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(handler);
    return () => this.#listeners.get(event)?.delete(handler) ?? false;
  }

  // Data and change ----------------------------------------------------------

  setData(rows, { source, animate = true, duration = 500 } = {}) {
    this.#alive();
    const from = sourceDataset(this.#program, source);
    const id = `${from.replace(/_live\d+$/, "")}_live${++this.#revision}`;
    const next = this.#program.reviseData({ source: from, id, values: rows });
    const done = animate && this.#canvas !== undefined ? this.animateTo(next, { duration }) : Promise.resolve(this.#replace(next));
    return done.then(() => { this.#baseline = this.#program; return this; });
  }

  animateTo(next, { duration = 500, easing = "cubic-in-out" } = {}) {
    this.#alive();
    const to = this.#resolveNext(next), from = this.#program;
    if (this.#canvas === undefined) { this.#replace(to); return Promise.resolve(this); }
    return playOn(this.#element.ownerDocument?.defaultView ?? globalThis, from, to, frame => this.#draw(frame), { duration, easing })
      .then(() => { this.#replace(to); return this; });
  }

  playOver(field, { duration = 600, loop = false, source } = {}) {
    this.#alive();
    const from = sourceDataset(this.#program, source), dataset = findDataset(this.#program, from);
    if (!dataset.values.some(row => Object.hasOwn(row, field))) throw new TypeError(`playOver field "${field}" is not in the data.`);
    const steps = [...new Set(dataset.values.map(row => row[field]))].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    let stopped = false, index = 0, paused = false, resume;
    const run = async () => {
      while (!stopped && (loop || index < steps.length)) {
        if (paused) await new Promise(resolve => { resume = resolve; });
        if (stopped) break;
        const value = steps[index % steps.length]; index++;
        await this.setData(dataset.values.filter(row => row[field] === value), { source: sourceDataset(this.#program), duration });
      }
      if (!stopped) await this.setData(dataset.values, { source: sourceDataset(this.#program), animate: false });
    };
    const finished = run();
    return { finished, pause() { paused = true; }, play() { paused = false; resume?.(); }, stop() { stopped = true; paused = false; resume?.(); return finished; } };
  }

  addSlider(parameter, { container, min = 0, max = 100, step = 1, label = parameter } = {}) {
    return this.#addControl("slider", parameter, { container, min, max, step, label });
  }

  addDropdown(parameter, { container, options, label = parameter } = {}) {
    if (!Array.isArray(options) || options.length === 0) throw new TypeError("addDropdown requires options.");
    return this.#addControl("dropdown", parameter, { container, options, label });
  }

  linkTo(other, { by } = {}) {
    if (!(other instanceof LiveChart) || other === this) throw new TypeError("linkTo requires another live chart.");
    if (typeof by !== "string" || !by) throw new TypeError("linkTo requires a shared field name in `by`.");
    this.#links.add(other); other.#links.add(this);
    this.#linkField = by; other.#linkField = by;
    return this;
  }
  #linkField;

  undo() {
    if (!this.#history.length) return this;
    this.#future.push(this.#program);
    return this.#replace(this.#history.pop(), { record: false });
  }

  redo() {
    if (!this.#future.length) return this;
    this.#history.push(this.#program);
    return this.#replace(this.#future.pop(), { record: false });
  }

  reset() {
    this.#history.push(this.#program); this.#future.length = 0;
    return this.#replace(this.#baseline, { record: false });
  }

  save() {
    return JSON.stringify({ format: LIVE_FORMAT, version: 1, program: serializeProgram(this.#program),
      features: this.#features.map(({ format: _format, ...feature }) => feature) });
  }

  static load(text, element) {
    let saved;
    try { saved = JSON.parse(text); } catch { throw new TypeError("Live chart text must be valid JSON."); }
    if (saved?.format !== LIVE_FORMAT || saved.version !== 1 || typeof saved.program !== "string" || !Array.isArray(saved.features)) throw new TypeError("Unsupported live chart text.");
    const live = new LiveChart(deserializeProgram(saved.program));
    live.#features = saved.features.map(feature => ({ ...feature }));
    if (element !== undefined) live.addCanvas(element);
    return live;
  }

  /** Apply any immutable-program update; this is also the authoring baseline for reset. */
  edit(update) {
    if (typeof update !== "function") throw new TypeError("edit requires an update function.");
    const next = update(this.#program);
    if (!(next instanceof ChartProgram)) throw new TypeError("edit update must return a ChartProgram.");
    this.#replace(next);
    this.#baseline = this.#program;
    return this;
  }

  // Internals ----------------------------------------------------------------

  #alive() { if (this.#disposed) throw new TypeError("This live chart has been disposed."); }
  #requireScreen(name) { this.#alive(); if (this.#canvas === undefined) throw new TypeError(`${name} requires addCanvas first.`); }

  #resolveNext(next) {
    if (next instanceof LiveChart) return next.program;
    if (next instanceof ChartProgram) return next;
    if (typeof next === "function") {
      const result = next(this.#program);
      if (result instanceof LiveChart) return result.program;
      if (result instanceof ChartProgram) return result;
    }
    throw new TypeError("animateTo requires a chart, a program or an update function returning one.");
  }

  // Replace the current program, record history and redraw. Interaction state
  // follows the new program; a failing rebuild restores everything.
  #replace(next, { record = true, origin = "programmatic" } = {}) {
    this.#alive();
    if (next === this.#program) return this;
    const previous = this.#program;
    this.#program = next;
    let updated = false;
    if (this.#session !== undefined) {
      try { this.#session.updateProgram(next, { history: "reset", origin }); updated = true; } catch { /* rebuilt below */ }
    }
    if (updated) { this.#pendingError = null; this.#draw(); } else this.#rebuild();
    if (record) { this.#history.push(previous); this.#future.length = 0; }
    this.#emit("change", { program: next, previous });
    return this;
  }

  // On a complete chart a feature the engine rejects is not added; on an
  // incomplete one it waits, like drawing, until the chart can take it.
  #addFeature(feature, restore = this.#program) {
    this.#alive();
    const previous = this.#features, ready = this.#canvas !== undefined && this.#pendingError === null;
    this.#features = [...previous, feature];
    try { this.#bindings(); } catch (error) { this.#features = previous; this.#program = restore; throw error; }
    this.#rebuild();
    if (ready && this.#pendingError !== null) {
      const error = this.#pendingError;
      this.#features = previous; this.#program = restore; this.#rebuild();
      throw error;
    }
    return this;
  }

  #selectionId(target) { return `live-${target}`; }

  #ensureSelection(target, color = "#dc2626") {
    const id = this.#selectionId(target);
    if (findStoredResource(this.#program, "persistent-selection", id) !== undefined) return id;
    this.#program = this.#program.selectMarks({ id, target, items: [] })
      .highlightMarks({ selection: id, color, dimOthers: true, bringToFront: true });
    return id;
  }

  #addSelection(type, name, target, options, color) {
    this.#alive();
    const mark = resolveMarkTarget(this.#program, target, name), before = this.#program;
    const selection = this.#ensureSelection(mark, color);
    return this.#addFeature({ kind: type, target: mark, selection, ...options, drag: type !== "select" }, before);
  }

  #addNavigation(kind, target, options) {
    const projections = this.#program.semanticSpec.resources.filter(resource => resource.kind === "projection");
    if (projections.length > 0) {
      const id = target ?? (projections.length === 1 ? projections[0].id : undefined);
      if (id === undefined) throw new TypeError(`add${kind === "zoom" ? "Zoom" : "Pan"} requires an explicit projection target.`);
      // One native navigation binding owns drag, wheel, pinch and keyboard for a map.
      if (this.#features.some(feature => feature.kind === "navigate" && feature.target === id)) return this;
      return this.#addFeature({ kind: "navigate", target: id, scaleExtent: options.scaleExtent, drag: true });
    }
    const mark = resolveMarkTarget(this.#program, target, kind === "zoom" ? "addZoom" : "addPan");
    if (Object.keys(positionScales(this.#program, mark)).length === 0) throw new TypeError("Zoom and pan require a continuous x or y scale.");
    return this.#addFeature({ kind: `axis-${kind}`, target: mark, factor: options.factor, drag: kind === "pan" });
  }

  #addControl(kind, parameter, options) {
    this.#requireScreen(kind === "slider" ? "addSlider" : "addDropdown");
    const resource = findStoredResource(this.#program, "parameter", parameter);
    if (resource === undefined) throw new TypeError(`Unknown parameter "${parameter}".`);
    const control = createControl(this.#canvas, kind, { ...options, value: resource.result.value },
      value => { try { this.#replace(this.#program.editParameter({ target: parameter, value })); } catch (error) { this.#emit("error", error); } });
    this.#controls.push(control);
    return this;
  }

  // Native binding list for the current features. Drag tools share the pointer:
  // the first owns a plain drag, later ones require Shift, Alt, then Ctrl. With a
  // click selection present, every drag tool requires a modifier.
  #bindings() {
    const bindings = [], click = this.#features.some(feature => feature.kind === "select");
    let drag = click ? 1 : 0;
    if (this.#features.some(feature => feature.kind === "tooltip" || feature.kind === "hover")) bindings.push({ type: "inspect" });
    for (const feature of this.#features) {
      const modifiers = feature.drag ? DRAG_MODIFIERS[drag++] : undefined;
      if (feature.drag && modifiers === undefined) throw new TypeError("At most four drag interactions can share one chart.");
      feature.modifiers = modifiers;
      const gesture = modifiers === undefined || Object.keys(modifiers).length === 0 ? {} : { modifiers };
      if (feature.kind === "select") bindings.push({ type: "select", target: feature.target, selection: feature.selection, mode: feature.mode, onMiss: "clear" });
      else if (feature.kind === "brush") bindings.push({ type: "brush", target: feature.target, selection: feature.selection, axis: feature.axis, mode: feature.mode, ...gesture });
      else if (feature.kind === "lasso") bindings.push({ type: "lasso", target: feature.target, selection: feature.selection, mode: feature.mode, ...gesture });
      else if (feature.kind === "legend") bindings.push(feature.effect === "visibility"
        ? { type: "legend", effect: "visibility", target: feature.target, channel: feature.channel, scaleDomain: "all-data" }
        : { type: "legend", effect: "selection", target: feature.target, channel: feature.channel, selection: this.#selectionId(feature.target) });
      else if (feature.kind === "moveNode") bindings.push({ type: "moveNode", target: feature.target, ...gesture });
      else if (feature.kind === "navigate") bindings.push({ type: "navigate", target: feature.target, mode: "pan", scaleExtent: feature.scaleExtent,
        initial: getProjectionView(this.#program, { target: feature.target }).parameters, ...gesture });
    }
    return bindings;
  }

  // Rebuild the session for the current program and features. A program that
  // cannot be made interactive yet keeps its features until a later call succeeds.
  #rebuild() {
    this.#detachInteractions();
    if (this.#canvas === undefined) return;
    this.#pendingError = null;
    const bindings = this.#bindings();
    if (bindings.length > 0) {
      let session;
      try {
        session = createInteractionSession({ program: this.#program, bindings });
        session.subscribe(event => this.#onSession(event));
        this.#unmount = session.mount(this.#canvas);
        this.#session = session;
      } catch (error) { session?.destroy(); this.#unmount = undefined; this.#pendingError = error; }
    }
    if (this.#features.some(feature => feature.kind === "tooltip")) this.#tooltip = createTooltip(this.#canvas);
    const hover = this.#features.find(feature => feature.kind === "hover");
    if (hover !== undefined) this.#marker = createHoverMarker(this.#canvas, hover.color);
    this.#attachAxisNavigation();
    this.#draw();
  }

  #detachInteractions() {
    this.#unmount?.(); this.#session?.destroy();
    this.#unmount = undefined; this.#session = undefined;
    this.#tooltip?.remove(); this.#marker?.remove(); this.#tooltip = undefined; this.#marker = undefined;
    if (this.#wheel) this.#canvas.removeEventListener("wheel", this.#wheel);
    if (this.#pan) for (const [type, listener] of this.#pan) this.#canvas.removeEventListener(type, listener);
    this.#wheel = undefined; this.#pan = undefined;
  }

  #detachScreen() {
    this.#detachInteractions();
    for (const control of this.#controls) control.remove();
    this.#controls = [];
    if (this.#canvas !== undefined && this.#canvas !== this.#element) this.#canvas.remove?.();
    this.#canvas = undefined; this.#element = undefined; this.#svg = undefined;
  }

  // Axis charts zoom and pan by editing their continuous position scales.
  #attachAxisNavigation() {
    const zoom = this.#features.find(feature => feature.kind === "axis-zoom"), pan = this.#features.find(feature => feature.kind === "axis-pan");
    const point = event => { const box = this.#canvas.getBoundingClientRect(); return { x: event.clientX - box.left, y: event.clientY - box.top }; };
    const edit = (target, change) => {
      let next = this.#program;
      for (const [channel, scale] of Object.entries(positionScales(next, target))) next = next.editScale({ id: scale.id, domain: change(channel, scale), nice: false });
      this.#replace(next);
    };
    if (zoom !== undefined) {
      this.#wheel = event => {
        event.preventDefault?.();
        const at = point(event), factor = event.deltaY > 0 ? zoom.factor : 1 / zoom.factor;
        try { edit(zoom.target, (channel, scale) => zoomDomain(scale, at[channel], factor)); } catch (error) { this.#emit("error", error); }
      };
      this.#canvas.addEventListener("wheel", this.#wheel, { passive: false });
    }
    if (pan !== undefined) {
      const wanted = event => Object.entries(pan.modifiers ?? {}).every(([key, value]) => Boolean(event[`${key}Key`]) === value);
      const down = event => { if (event.button === 0 && wanted(event)) this.#panStart = { at: point(event), program: this.#program }; };
      const move = event => {
        const start = this.#panStart;
        if (start === undefined) return;
        const at = point(event), base = start.program;
        try {
          let next = base;
          for (const [channel, scale] of Object.entries(positionScales(base, pan.target))) next = next.editScale({ id: scale.id, domain: panDomain(scale, at[channel] - start.at[channel]), nice: false });
          this.#replace(next, { record: false });
        } catch (error) { this.#panStart = undefined; this.#emit("error", error); }
      };
      const up = () => {
        const start = this.#panStart;
        if (start !== undefined && this.#program !== start.program) { this.#history.push(start.program); this.#future.length = 0; }
        this.#panStart = undefined;
      };
      this.#pan = [["pointerdown", down], ["pointermove", move], ["pointerup", up], ["pointercancel", up]];
      for (const [type, listener] of this.#pan) this.#canvas.addEventListener(type, listener);
    }
  }

  #onSession(event) {
    const state = event.state;
    if (event.phase === "commit" && state.program !== this.#program) {
      const previous = this.#program;
      this.#program = state.program; this.#history.push(previous); this.#future.length = 0;
      this.#emit("change", { program: state.program, previous });
      this.#emit("select", { program: state.program, selected: this.#selected() });
      this.#propagateLinks();
    }
    if (event.phase === "error") this.#emit("error", event.error);
    if (event.type === "inspect" || event.type === "leave") this.#onHover(event.type === "inspect" ? state.hit?.target ?? null : null);
    this.#draw(state.previewFrame ?? state.previewProgram ?? state.animationFrame ?? state.program);
  }

  #itemsOf(program) {
    let index = this.#items.get(program);
    if (index === undefined) {
      index = new Map();
      for (const view of exportAccessibleData(program, { format: "items" }).views) for (const item of view.items) index.set(JSON.stringify([view.ownerId, item.key]), item);
      this.#items.set(program, index);
    }
    return index;
  }

  #onHover(hit) {
    const tooltip = this.#features.find(feature => feature.kind === "tooltip"), hover = this.#features.find(feature => feature.kind === "hover");
    const relevant = feature => hit !== null && (feature?.target === undefined || feature.target === hit.ownerId);
    const item = hit === null ? undefined : this.#itemsOf(this.#program).get(JSON.stringify([hit.ownerId, hit.itemKey]));
    if (this.#tooltip !== undefined) {
      if (relevant(tooltip) && item !== undefined) this.#tooltip.show(hit.screenPoint, describe(item, tooltip));
      else this.#tooltip.hide();
    }
    if (this.#marker !== undefined) {
      if (relevant(hover)) this.#marker.show(hit.screenPoint); else this.#marker.hide();
    }
    this.#emit("hover", { item: item ?? null, hit });
  }

  #selected() {
    const result = {};
    for (const view of exportAccessibleData(this.#program, { format: "items" }).views) {
      const id = this.#selectionId(view.ownerId), items = view.items.filter(item => item.selectedBy?.includes(id));
      if (items.length) result[view.ownerId] = items.map(item => item.fields);
    }
    return result;
  }

  // Linked charts select the items whose shared field values match.
  #propagateLinks() {
    if (this.#applyingLink || this.#links.size === 0) return;
    const field = this.#linkField, values = new Set(Object.values(this.#selected()).flat().map(fields => fields[field]));
    for (const other of this.#links) other.#selectByValues(field, values);
  }

  #selectByValues(field, values) {
    this.#applyingLink = true;
    try {
      let next = this.#program;
      for (const feature of this.#features) {
        if (!["select", "brush", "lasso"].includes(feature.kind)) continue;
        const view = exportAccessibleData(next, { format: "items" }).views.find(value => value.ownerId === feature.target);
        const items = (view?.items ?? []).filter(item => values.has(item.fields[field])).map(item => item.key);
        next = next.editMarkSelection({ selection: feature.selection, items });
      }
      this.#replace(next, { origin: "linked" });
      this.#emit("select", { program: this.#program, selected: this.#selected() });
    } catch (error) { this.#emit("error", error); }
    finally { this.#applyingLink = false; }
  }

  #draw(frame = this.#program) {
    if (this.#canvas === undefined) return;
    try {
      if (this.#svg !== undefined) this.#svg.innerHTML = renderToSVG(frame).replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, "");
      else render(frame, this.#canvas.getContext("2d"), { pixelRatio: this.#pixelRatio });
    } catch (error) { this.#pendingError ??= error; }
  }

  #emit(event, value) {
    for (const handler of this.#listeners.get(event) ?? []) {
      try { handler(value); } catch (error) { if (event !== "error") this.#emit("error", error); }
    }
  }
}

function describe(item, { fields, format }) {
  if (format !== undefined) return String(format(item.fields));
  const names = fields ?? Object.keys(item.fields);
  return names.filter(name => Object.hasOwn(item.fields, name)).map(name => `${name}: ${item.fields[name]}`).join("\n");
}

function playOn(view, from, to, draw, { duration, easing }) {
  const plan = planTransition({ from, to, options: { durationMs: duration, easing } });
  const player = createAnimationPlayer({ plan, clock: frameClock(view), render: draw });
  player.play();
  return player.finished.finally(() => player.dispose());
}

// Every authoring action of the engine program, under the same name.
for (let owner = Object.getPrototypeOf(programChart()); owner !== null && owner !== Object.prototype; owner = Object.getPrototypeOf(owner)) {
  for (const name of Object.getOwnPropertyNames(owner)) {
    const action = Object.getOwnPropertyDescriptor(owner, name).value;
    if (name === "constructor" || typeof action !== "function" || getWrappedActionMetadata(action) === undefined || Object.hasOwn(LiveChart.prototype, name)) continue;
    Object.defineProperty(LiveChart.prototype, name, { configurable: true, writable: true,
      value: function (...args) { return this.edit(program => program[name](...args)); } });
  }
}

export function chart() { return new LiveChart(); }

export function playAnimation(from, to, element, { duration = 500, easing = "cubic-in-out", pixelRatio } = {}) {
  const start = from instanceof LiveChart ? from.program : from, end = to instanceof LiveChart ? to.program : to;
  if (!(start instanceof ChartProgram) || !(end instanceof ChartProgram)) throw new TypeError("playAnimation requires two charts or programs.");
  const context = element.getContext("2d"), view = element.ownerDocument?.defaultView ?? globalThis;
  const ratio = pixelRatio ?? view.devicePixelRatio ?? 1;
  return playOn(view, start, end, frame => render(frame, context, { pixelRatio: ratio }), { duration, easing });
}
