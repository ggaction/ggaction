import { normalizeAnnotationMovement, resolveAnnotationMovement, prepareAnnotationMovement, annotationMovementCommand } from "./annotationMovement.js";
import { normalizeNodeMovement, resolveNodeMovement, prepareNodeMovement, nodeMovementCommand } from "./nodeMovement.js";
import { normalizeLegendVisibility, resolveLegendVisibility, legendVisibilityCommand } from "./legendVisibility.js";
import { normalizeClickSelection, clickSelectionCommand, resolveClickSelection } from "./clickSelection.js";
import { normalizeLegendSelection, resolveLegendSelection, legendSelectionCommand } from "./legendSelection.js";
import { prepareSelectionCapture } from "./pointerCapture.js";
import { normalizeRegionBinding, resolveRegionBinding, prepareRegionGesture, regionGestureCommand } from "./regionSelection.js";
import { materializeRegisteredSelectionPreview } from "../materialization/selection/expression.js";
import { normalizeSelectionPolicy, reconcileSelections } from "./reconciliation.js";
import { prepareNearestSelection } from "./nearest.js";
import { ownHitScene } from "./sceneFrame.js";
import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { ownArray } from "../core/ownData.js";
import { createInteractionHistory, INTERACTION_HISTORY_TYPES } from "./history.js";
import { createInteractionPreparation, interactionResourceRevisions } from "./preparation.js";
import { interactionOptions as options, snapshotInteractionInput, interactionOrigin, interactionTransactionMetadata } from "./input.js";
import { prepareInteractionEdit, interactionTransaction, INTERACTION_EDIT_TYPES } from "./selection.js";
import { getErrorDetails } from "../core/diagnostics.js";
import { resolveHitCoordinates, transformHitPoint } from "../grammar/hitCoordinates.js";
import { normalizeHitQuery } from "../grammar/hitShapes.js";
import { prepareProgramHitFrame, rebindProgramHitFrame } from "./hitProgram.js";
import { createHitFrameBridge } from "./hitFrame.js";
import { normalizeSelectionLinks, inspectSelectionLinks, applySelectionLinks, selectionLinksNeedUpdate } from "./bindings.js";

function resolvePointerSelection(program, binding, allowMissing) {
  return binding.type === "legend" ? (binding.effect === "visibility" ? resolveLegendVisibility : resolveLegendSelection)(program, binding, allowMissing)
    : resolveClickSelection(program, binding.target, binding.selection, allowMissing);
}

const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);
const MAX_DISPATCHES = 256;
function bindings(program, value) {
  if (value === undefined) value = [{ type: "inspect" }];
  if (!Array.isArray(value) || value.length > 259) throw new TypeError("Interaction bindings exceed the binding limit.");
  ownArray(value, "Interaction bindings");
  const inspect = [], context = [], linked = [], selected = [], regions = [], nodes = [], annotations = [];
  for (const binding of value) {
    const head = options(binding, ["type"], ["events", "slop", "hitInvisible", "id", "sources", "target", "selection", "resolve", "mode", "onMiss", "axis", "channels", "channel", "effect", "scaleDomain"], "Interaction binding");
    (head.type === "annotate" ? annotations : head.type === "moveNode" ? nodes : head.type === "contextMenu" ? context : ["linkSelection", "linkFilter"].includes(head.type) ? linked : ["select", "legend"].includes(head.type) ? selected : ["brush", "lasso"].includes(head.type) ? regions : inspect).push(head);
  }
  if (inspect.length > 1 || context.length > 1 || selected.length + regions.length + nodes.length + annotations.length > 1) throw new TypeError("Interaction bindings support at most one inspect, one context menu and one editing pointer binding.");
  const links = normalizeSelectionLinks(program, linked);
  return { annotation: annotations.length ? normalizeAnnotationMovement(program, annotations[0]) : undefined, node: nodes.length ? normalizeNodeMovement(program, nodes[0]) : undefined, linked: links, select: selected.length ? (selected[0].type === "legend" ? (selected[0].effect === "visibility" ? normalizeLegendVisibility : normalizeLegendSelection) : normalizeClickSelection)(program, selected[0], links) : undefined,
    region: regions.length ? normalizeRegionBinding(program, regions[0], links) : undefined, inspect: freezeOwned([...inspect, ...context].map(binding => {
    const contextual = binding.type === "contextMenu";
    const request = options(binding, ["type"], contextual ? ["slop", "hitInvisible"] : ["events", "slop", "hitInvisible"], "Inspection binding");
    if (!contextual && request.type !== "inspect") throw new TypeError("Unsupported interaction binding type.");
    const events = contextual ? ["contextmenu"] : request.events === undefined ? ["pointermove", "click"] : request.events;
    ownArray(events, "Inspect binding events");
    if (!events.length || events.length > 2 || new Set(events).size !== events.length || events.some(event => !(contextual ? ["contextmenu"] : ["pointermove", "click"]).includes(event))) {
      throw new TypeError("Inspect binding events require distinct pointermove or click values.");
    }
    const query = normalizeHitQuery({ ...(request.slop === undefined ? {} : { slop: request.slop }),
      ...(request.hitInvisible === undefined ? {} : { hitInvisible: request.hitInvisible }) });
    return cloneAndFreeze({ type: request.type, events, ...(request.slop === undefined ? {} : { slop: query.slop }), hitInvisible: query.hitInvisible });
  })) };
}
function pointerCoordinates(element, event, transform) {
  const bounds = element.getBoundingClientRect();
  return resolveHitCoordinates({ point: { x: event.clientX, y: event.clientY },
    rect: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
    rootTransform: transform, childTransforms: [] });
}
function nextInteger(value) {
  if (value === Number.MAX_SAFE_INTEGER) throw new RangeError("Interaction frame counter is exhausted.");
  return value + 1;
}
const outcome = status => freezeOwned({ status });
const emptyHit = (frameVersion, diagnostics) => cloneAndFreeze({ target: null, candidates: [], diagnostics,
  statistics: { visited: 0, tested: 0, work: 0 }, frameVersion });

/** Browser-safe inspection and atomic authoring command lifecycle. */
export function createInteractionSession(input) {
  const request = options(input, ["program"], ["bindings", "selectionPolicy", "historyLimit", "assetResolver"], "Interaction session");
  const configured = bindings(request.program, request.bindings), selectionPolicy = normalizeSelectionPolicy(request.selectionPolicy);
  const managedSelections = configured.linked.filter(link => !link.filter);
  let program = request.program, base = prepareProgramHitFrame(program), bridge = createHitFrameBridge(base);
  let linkedSelections = inspectSelectionLinks(program, configured.linked);
  let selectionRecords = reconcileSelections(program, [], selectionPolicy, { initialize: true }).records;
  let rootTransform = IDENTITY, mounted, destroyed = false, destroyRequested = false, generation = 0, lastHit = null, processing = false;
  let state, revision = 0, transactionSequence = 0, ignoredClick, previewProgram = null;
  const committedSnapshot = () => ({ program, selectionRecords, linkedSelections });
  const history = createInteractionHistory(committedSnapshot(), request.historyLimit);
  const drainedTransactions = new Set();
  const queue = [], listeners = new Set();
  const preparation = createInteractionPreparation(request.assetResolver, operation => perform(operation), () => snapshot());
  const snapshot = () => state = freezeOwned({ program, previewProgram, scene: bridge.getState().scene, ...preparation.inspect(),
    frameVersion: bridge.getState().version, generation, revision, hit: lastHit, linkedSelections, history: history.inspect(), mounted: mounted !== undefined, destroyed });
  snapshot();
  const live = () => { if (destroyed) throw new Error("Interaction session is disposed."); };
  const publish = (type, details) => {
    if (details?.transactionId !== undefined && details.phase !== "preview") drainedTransactions.add(details.transactionId);
    const event = freezeOwned({ type, ...details, state: snapshot() });
    for (const listener of [...listeners]) if (listeners.has(listener)) listener(event);
  };
  const perform = operation => {
    live();
    if (queue.length >= MAX_DISPATCHES) throw new RangeError("Interaction dispatch queue exceeds its work budget.");
    queue.push(operation);
    if (processing) return outcome("queued");
    processing = true;
    let first, count = 0;
    try {
      while (queue.length) {
        if (++count > MAX_DISPATCHES) throw new RangeError("Interaction dispatch queue exceeds its work budget.");
        const result = queue.shift()();
        first ??= result;
      }
      return first;
    } catch (error) {
      // A queued destroy is terminal even when the requesting subscriber throws.
      // Preserve that original exception while finishing every owned disposer.
      if (destroyRequested && !destroyed) { try { close(); } catch {} }
      throw error;
    } finally { processing = false; queue.length = 0; drainedTransactions.clear(); }
  };
  const inspect = (point, query = {}, type = "inspect") => {
    lastHit = bridge.hit(point, query); publish(type); return outcome("applied");
  };
  const clear = () => { lastHit = null; publish("leave"); return outcome("applied"); };
  const detach = (lease, reason = "unmount") => {
    let failure;
    try { lease.capture?.dispose(reason); } catch (error) { failure = error; }
    for (const [event, listener] of lease.listeners) {
      try { lease.element.removeEventListener(event, listener); } catch (error) { failure ??= error; }
    }
    lease.listeners.length = 0; lease.element = undefined; lease.capture = undefined;
    if (failure) throw failure;
  };
  const close = () => {
    let failure;
    try { preparation.dispose(); } catch (error) { failure = error; }
    try { if (mounted !== undefined) detach(mounted, "destroy"); } catch (error) { failure ??= error; }
    mounted = undefined; lastHit = null; destroyed = true; history.dispose();
    try { publish("destroy"); } catch (error) { failure ??= error; }
    finally { listeners.clear(); bridge.dispose(); base = null; rootTransform = IDENTITY; queue.length = 0; selectionRecords = []; ignoredClick = undefined; }
    if (failure) throw failure;
    return outcome("applied");
  };
  const prepareAssets = (candidate, metadata, handlers, vector) => {
    const previous = program, sessionGeneration = generation, baseRevision = revision;
    return preparation.start(candidate, { sessionGeneration, transactionId: metadata.transactionId, baseRevision }, {
      current: tags => !destroyed && program === previous && generation === tags.sessionGeneration && revision === tags.baseRevision,
      ...handlers
    }, vector);
  };
  const publishAssets = (status, tags, diagnostics = []) => publish("assets", { status, preparation: tags, diagnostics: cloneAndFreeze(diagnostics) });
  const assetHandlers = prepare => ({ prepare,
    cancel: (reason, tags) => publishAssets("cancelled", tags, [{ code: "preparation-cancelled", message: reason }]),
    error: (error, tags) => publishAssets("error", tags, [{ code: getErrorDetails(error)?.code ?? "asset-preparation-failed", message: String(error?.message ?? error) }]) });
  const prepareEdit = command => {
    let prepared = prepareInteractionEdit(program, prepareNearestSelection(program, command, bridge));
    if (prepared.program === program) return null;
    const initial = reconcileSelections(prepared.program, selectionRecords, selectionPolicy, { managed: managedSelections });
    prepared = applySelectionLinks(initial.program, configured.linked, linkedSelections, [...prepared.affectedOwners, ...initial.affectedOwners], command, selectionPolicy, initial.records);
    const reconciled = reconcileSelections(prepared.program, prepared.records, selectionPolicy, { verify: true });
    const selectionChanges = [...initial.changes, ...prepared.selectionChanges, ...reconciled.changes];
    const version = nextInteger(bridge.getState().version), nextGeneration = nextInteger(generation), nextRevision = nextInteger(revision);
    const candidate = prepareProgramHitFrame(prepared.program, version);
    const frame = rebindProgramHitFrame(candidate, candidate.scene, version, rootTransform);
    const resourceRevisions = preparation.enabled ? interactionResourceRevisions(prepared.program) : undefined;
    return { prepared, reconciled, selectionChanges, nextGeneration, nextRevision, candidate, frame, resourceRevisions };
  };
  const edit = (command, draft) => {
    if (drainedTransactions.has(command.transactionId)) return outcome("stale");
    drainedTransactions.add(command.transactionId);
    const previous = program, previousSnapshot = committedSnapshot();
    let prepared, nextGeneration, nextRevision, candidate, frame, reconciled, resourceRevisions, selectionChanges = [];
    const details = (phase, affectedOwners, diagnostics = []) => freezeOwned({
      transactionId: command.transactionId, origin: command.origin,
      ...(command.causeTransactionId === undefined ? {} : { causeTransactionId: command.causeTransactionId }),
      phase, revision, affectedOwners, previous, current: program, diagnostics: cloneAndFreeze(diagnostics), selectionChanges: cloneAndFreeze(phase === "error" ? [] : selectionChanges)
    });
    try {
      const result = draft ?? prepareEdit(command);
      if (result) {
        ({ prepared, nextGeneration, nextRevision, candidate, frame, reconciled, selectionChanges, resourceRevisions } = result);
        if ((configured.node || configured.annotation) && previewProgram !== null) nextInteger(nextInteger(bridge.getState().version));
      }
    } catch (error) {
      publish(command.type, details("error", Object.freeze([]), [{ code: getErrorDetails(error)?.code ?? "interaction-command-failed", message: error.message }]));
      throw error;
    }
    if (!prepared) { preparation.cancel("superseded"); return outcome("unchanged"); }
    const prepareCommit = () => {
      // Host mount/frame changes while assets load do not invalidate an immutable
      // candidate. Rebind its concrete geometry to the current host transform.
      frame = rebindProgramHitFrame(candidate, candidate.scene, nextInteger(bridge.getState().version), rootTransform);
      return () => {
        mounted?.capture?.cancel("updateProgram"); previewProgram = null;
        if (frame.version <= bridge.getState().version) frame = rebindProgramHitFrame(candidate, candidate.scene, nextInteger(bridge.getState().version), rootTransform);
        bridge.updateFrame(frame); base = candidate; program = prepared.program;
        linkedSelections = prepared.projections; selectionRecords = reconciled.records;
        generation = nextGeneration; revision = nextRevision; lastHit = null;
        history.record(previousSnapshot, prepared.affectedOwners);
        publish(command.type, details("commit", prepared.affectedOwners));
        publish(command.type, details("settled", prepared.affectedOwners));
        return outcome("applied");
      };
    };
    if (preparation.enabled) {
      mounted?.capture?.cancel("updateProgram"); previewProgram = null;
      return prepareAssets(prepared.program, command, {
        prepare: prepareCommit,
        cancel: reason => publish(command.type, details("cancel", [], [{ code: "preparation-cancelled", message: reason }])),
        error: error => publish(command.type, details("error", [], [{ code: getErrorDetails(error)?.code ?? "asset-preparation-failed", message: String(error?.message ?? error) }]))
      }, resourceRevisions);
    }
    return prepareCommit()();
  };
  const restore = command => {
    if (drainedTransactions.has(command.transactionId)) return outcome("stale");
    drainedTransactions.add(command.transactionId);
    const previous = program, previousSnapshot = committedSnapshot(), entry = history.target(command.type);
    if (!entry || entry.state.program === program) {
      preparation.cancel("superseded");
      mounted?.capture?.cancel("updateProgram");
      return outcome("unchanged");
    }
    const details = (phase, diagnostics = []) => freezeOwned({ ...interactionTransactionMetadata(command), phase,
      revision, previous, current: program, affectedOwners: phase === "error" ? Object.freeze([]) : entry.affectedOwners,
      diagnostics: cloneAndFreeze(diagnostics), selectionChanges: Object.freeze([]) });
    let candidate, frame, nextGeneration, nextRevision, resourceRevisions;
    try {
      const version = nextInteger(bridge.getState().version);
      nextGeneration = nextInteger(generation); nextRevision = nextInteger(revision);
      candidate = prepareProgramHitFrame(entry.state.program, version);
      frame = rebindProgramHitFrame(candidate, candidate.scene, version, rootTransform);
      resourceRevisions = preparation.enabled ? interactionResourceRevisions(entry.state.program) : undefined;
      if ((configured.node || configured.annotation) && previewProgram !== null) nextInteger(nextInteger(bridge.getState().version));
    } catch (error) {
      publish(command.type, details("error", [{ code: getErrorDetails(error)?.code ?? "interaction-history-failed", message: error.message }]));
      throw error;
    }
    const prepareCommit = () => {
      frame = rebindProgramHitFrame(candidate, candidate.scene, nextInteger(bridge.getState().version), rootTransform);
      return () => {
        mounted?.capture?.cancel("updateProgram"); previewProgram = null;
        if (frame.version <= bridge.getState().version) frame = rebindProgramHitFrame(candidate, candidate.scene, nextInteger(bridge.getState().version), rootTransform);
        bridge.updateFrame(frame); base = candidate;
        ({ program, selectionRecords, linkedSelections } = entry.state);
        generation = nextGeneration; revision = nextRevision; lastHit = null;
        history.accept(command.type, previousSnapshot, entry.affectedOwners);
        publish(command.type, details("commit")); publish(command.type, details("settled"));
        return outcome("applied");
      };
    };
    if (preparation.enabled) {
      mounted?.capture?.cancel("updateProgram"); previewProgram = null;
      return prepareAssets(entry.state.program, command, { prepare: prepareCommit,
        cancel: reason => publish(command.type, details("cancel", [{ code: "preparation-cancelled", message: reason }])),
        error: error => publish(command.type, details("error", [{ code: getErrorDetails(error)?.code ?? "asset-preparation-failed", message: String(error?.message ?? error) }])) }, resourceRevisions);
    }
    return prepareCommit()();
  };
  const dispatch = command => {
    live();
    // Inspect the envelope before reading type; queued edits snapshot all payload data.
    const envelope = options(command, ["type"], ["point", "pointerType", "slop", "hitInvisible", "scene", "version", "generation", "target", "payload", "transactionId", "origin", "causeTransactionId"], "Interaction command");
    if (INTERACTION_HISTORY_TYPES.includes(envelope.type)) {
      const owned = options(envelope, ["type"], ["transactionId", "origin", "causeTransactionId"], "History command");
      transactionSequence = nextInteger(transactionSequence);
      const command = freezeOwned({ type: owned.type, ...interactionTransactionMetadata(owned, `interaction-${transactionSequence}`) });
      return perform(() => restore(command));
    }
    if (INTERACTION_EDIT_TYPES.includes(envelope.type)) {
      const owned = snapshotInteractionInput(envelope, "Interaction command");
      transactionSequence = nextInteger(transactionSequence);
      const editCommand = interactionTransaction(owned, `interaction-${transactionSequence}`);
      return perform(() => edit(editCommand));
    }
    const head = options(command, ["type"], ["point", "pointerType", "slop", "hitInvisible", "scene", "version", "generation"], "Interaction command");
    if (head.type === "inspect" || head.type === "contextMenu") {
      const c = options(head, ["type", "point"], ["pointerType", "slop", "hitInvisible"], "Inspect command");
      const point = transformHitPoint(IDENTITY, c.point), query = normalizeHitQuery(Object.fromEntries(
        ["pointerType", "slop", "hitInvisible"].filter(key => Object.hasOwn(c, key)).map(key => [key, c[key]])));
      return perform(() => inspect(point, query, c.type));
    }
    if (head.type === "leave") { options(head, ["type"], [], "Leave command"); return perform(clear); }
    if (head.type === "frame") {
      const c = options(head, ["type", "scene", "version", "generation"], [], "Frame command");
      if (![c.version, c.generation].every(value => Number.isSafeInteger(value) && value >= 0)) throw new TypeError("Frame command counters must be non-negative safe integers.");
      // Snapshot current host data at dispatch; a late result is never inspected.
      const scene = c.generation === generation && c.version > bridge.getState().version ? ownHitScene(c.scene) : undefined;
      return perform(() => {
        if (c.generation !== generation || c.version <= bridge.getState().version) return outcome("stale");
        let frame = rebindProgramHitFrame(base, scene, c.version, rootTransform);
        if ((configured.node || configured.annotation) && previewProgram !== null) nextInteger(nextInteger(bridge.getState().version));
        mounted?.capture?.cancel("updateProgram");
        if (frame.version <= bridge.getState().version) frame = rebindProgramHitFrame(base, scene, nextInteger(bridge.getState().version), rootTransform);
        bridge.updateFrame(frame); lastHit = null; publish("frame"); return outcome("applied");
      });
    }
    throw new TypeError("Unsupported interaction command type.");
  };
  const session = Object.freeze({
    getState() { return state; },
    whenSettled() { return preparation.whenSettled(); },
    dispatch,
    updateProgram(next, configuration = {}) {
      live();
      const config = options(configuration, [], ["history", "origin"], "Interaction update");
      const policy = config.history === undefined ? "reset" : config.history, origin = interactionOrigin(config.origin);
      if (!["reset", "record"].includes(policy)) throw new TypeError("Unknown interaction update history policy.");
      return perform(() => {
        const previousSnapshot = committedSnapshot();
        const version = nextInteger(bridge.getState().version), nextGeneration = nextInteger(generation), nextRevision = nextInteger(revision);
        const reconciled = reconcileSelections(next, selectionRecords, selectionPolicy, { managed: managedSelections });
        let linked = { program: reconciled.program, projections: inspectSelectionLinks(reconciled.program, configured.linked, undefined, linkedSelections, selectionPolicy) };
        if (reconciled.affectedOwners.length || selectionLinksNeedUpdate(linked.projections, linkedSelections)) {
          linked = applySelectionLinks(linked.program, configured.linked, linkedSelections, reconciled.affectedOwners, { type: "program" }, selectionPolicy, reconciled.records);
        }
        if (configured.select) resolvePointerSelection(linked.program, configured.select, true);
        if (configured.region) resolveRegionBinding(linked.program, configured.region, true);
        if (configured.node) resolveNodeMovement(linked.program, configured.node, true);
        if (configured.annotation) resolveAnnotationMovement(linked.program, configured.annotation, true);
        const verified = reconcileSelections(linked.program, linked.records ?? reconciled.records, selectionPolicy, { verify: true });
        const selectionChanges = cloneAndFreeze([...reconciled.changes, ...(linked.selectionChanges ?? []), ...verified.changes]);
        const candidate = prepareProgramHitFrame(linked.program, version);
        let frame = rebindProgramHitFrame(candidate, candidate.scene, version, rootTransform);
        if ((configured.node || configured.annotation) && previewProgram !== null) nextInteger(nextInteger(bridge.getState().version));
        const prepareCommit = tags => {
          frame = rebindProgramHitFrame(candidate, candidate.scene, nextInteger(bridge.getState().version), rootTransform);
          return () => {
            mounted?.capture?.cancel("updateProgram");
            if (frame.version <= bridge.getState().version) frame = rebindProgramHitFrame(candidate, candidate.scene, nextInteger(bridge.getState().version), rootTransform);
            bridge.updateFrame(frame); base = candidate; program = linked.program; generation = nextGeneration; revision = nextRevision; lastHit = null;
            linkedSelections = linked.projections; selectionRecords = verified.records;
            if (policy === "reset") history.clear();
            else if (program !== previousSnapshot.program) history.record(previousSnapshot, Object.freeze([]));
            publish("program", { origin, history: policy, selectionChanges });
            if (tags) publishAssets("settled", tags);
            return outcome("applied");
          };
        };
        if (preparation.enabled) {
          mounted?.capture?.cancel("updateProgram"); transactionSequence = nextInteger(transactionSequence);
          return prepareAssets(linked.program, { transactionId: `interaction-${transactionSequence}` }, assetHandlers(prepareCommit));
        }
        return prepareCommit()();
      });
    },
    subscribe(listener) {
      live(); if (typeof listener !== "function") throw new TypeError("Interaction subscriber must be a function.");
      listeners.add(listener); return () => listeners.delete(listener);
    },
    mount(element, configuration = {}) {
      live();
      const config = options(configuration, [], ["rootTransform"], "Interaction mount");
      const matrix = config.rootTransform === undefined ? IDENTITY : config.rootTransform;
      transformHitPoint(matrix, { x: 0, y: 0 });
      const transform = cloneAndFreeze(matrix);
      if (!element || !["addEventListener", "removeEventListener", "getBoundingClientRect"].every(key => typeof element[key] === "function")) {
        throw new TypeError("Interaction mount requires an event surface with a client rectangle.");
      }
      const lease = { element, listeners: [] };
      perform(() => {
        const version = nextInteger(bridge.getState().version);
        const frame = rebindProgramHitFrame(base, bridge.getState().scene, version, transform);
        const candidate = createHitFrameBridge(frame);
        try {
          for (const binding of configured.inspect) for (const event of binding.type === "contextMenu" ? binding.events : [...binding.events, "pointerleave"]) {
            const listener = event === "pointerleave" ? () => { if (!destroyed && mounted === lease) dispatch({ type: "leave" }); }
              : eventObject => {
                if (destroyed || mounted !== lease) return;
                if (binding.type === "contextMenu") eventObject.preventDefault();
                const coordinates = pointerCoordinates(element, eventObject, transform);
                const query = normalizeHitQuery({ pointerType: eventObject.pointerType || "mouse", hitInvisible: binding.hitInvisible,
                  ...(binding.slop === undefined ? {} : { slop: binding.slop }) });
                perform(() => {
                  if (destroyed || mounted !== lease) return outcome("stale");
                  if (coordinates.localPoint !== null) return inspect(coordinates.screenPoint, query, binding.type);
                  lastHit = emptyHit(bridge.getState().version, coordinates.diagnostics); publish(binding.type); return outcome("applied");
                });
              };
            lease.listeners.push([event, listener]); element.addEventListener(event, listener, { passive: binding.type !== "contextMenu" });
          }
          if (configured.region || configured.node || configured.annotation) {
            const binding = configured.region ?? configured.node ?? configured.annotation, moving = binding.type === "moveNode" || binding.type === "annotate", eventType = moving ? binding.type : "select";
            const movement = binding.type === "annotate" ? { prepare: prepareAnnotationMovement, command: annotationMovementCommand }
              : { prepare: prepareNodeMovement, command: nodeMovementCommand };
            const scheduler = element.ownerDocument?.defaultView ?? element;
            if (typeof scheduler.requestAnimationFrame !== "function" || typeof scheduler.cancelAnimationFrame !== "function") throw new TypeError("Editing gestures require host animation-frame scheduling.");
            let gesture;
            const discard = (token, restore = true) => {
              try {
                if (token?.raf !== undefined) scheduler.cancelAnimationFrame(token.raf);
                if (moving && restore && token?.previewed) bridge.updateFrame(rebindProgramHitFrame(base, token.scene, nextInteger(bridge.getState().version), transform));
              }
              finally { if (token) token.raf = undefined; gesture = undefined; previewProgram = null; }
            };
            const details = (token, phase, diagnostics = []) => ({ transactionId: token.transactionId, origin: "user", phase, revision,
              affectedOwners: freezeOwned([binding.target]), previous: token.previous, current: program,
              diagnostics: cloneAndFreeze(diagnostics), selectionChanges: Object.freeze([]) });
            const failure = (token, error) => {
              discard(token);
              publish(eventType, details(token, "error", [{ code: getErrorDetails(error)?.code ?? "selection-gesture-failed", message: String(error?.message ?? error) }]));
            };
            const preview = token => {
              if (token.previous !== program) throw new Error("Selection gesture baseline is stale.");
              const result = (moving ? movement.command : regionGestureCommand)(token.context, token.points);
              const command = interactionTransaction(result.command, token.transactionId), draft = prepareEdit(command);
              previewProgram = moving ? draft.prepared.program : materializeRegisteredSelectionPreview(draft?.prepared.program ?? program, result.overlay);
              if (moving) { nextInteger(nextInteger(draft.frame.version)); bridge.updateFrame(draft.frame); token.previewed = true; lastHit = null; }
              publish(eventType, { ...details(token, "preview"), affectedOwners: draft?.prepared.affectedOwners ?? freezeOwned([binding.target]) });
              return { command, draft };
            };
            lease.capture = prepareSelectionCapture(element, {
              binding: { id: "selection", kind: binding.type },
              current: () => !destroyed && mounted === lease,
              perform,
              point: event => { const coordinates = pointerCoordinates(element, event, transform); return coordinates.localPoint === null ? null : coordinates.screenPoint; },
              begin: point => {
                const scene = bridge.getState().scene;
                const context = moving ? movement.prepare(program, binding, base, scene, transform, point, bridge.hit(point, { slop: 0 }))
                  : prepareRegionGesture(program, binding, base, scene, transform, point);
                if (!context) return null;
                preparation.cancel("gesture");
                transactionSequence = nextInteger(transactionSequence);
                return gesture = { transactionId: `interaction-${transactionSequence}`, previous: program, context, points: [point], scene, previewed: false, raf: undefined };
              },
              sample: (token, point) => {
                const previous = token.points.at(-1);
                if (previous.x === point.x && previous.y === point.y) return;
                if (moving || binding.type === "brush") token.points = [token.points[0], point];
                else {
                  if (token.points.length >= 10_000) throw new RangeError("Lasso exceeds its screen point budget.");
                  token.points.push(point);
                }
              },
              preview: token => {
                if (token.raf !== undefined) return;
                token.raf = scheduler.requestAnimationFrame(() => {
                  token.raf = undefined;
                  if (destroyed || mounted !== lease || gesture !== token) return;
                  perform(() => {
                    if (gesture !== token) return;
                    try { preview(token); } catch (error) { lease.capture.fail(error); }
                  });
                });
              },
              drag: (token, _point, _pointerType, gestureKind) => {
                if (moving && gestureKind === "click") {
                  discard(token); publish(eventType, details(token, "cancel", [{ code: "gesture-cancelled", message: "movement" }]));
                  return outcome("unchanged");
                }
                let result;
                try {
                  if (token.raf !== undefined) scheduler.cancelAnimationFrame(token.raf);
                  token.raf = undefined;
                  result = preview(token);
                  discard(token, false);
                } catch (error) { failure(token, error); throw error; }
                return edit(result.command, result.draft);
              },
              cancel: (token, reason) => {
                discard(token);
                publish(eventType, details(token, "cancel", [{ code: "gesture-cancelled", message: reason }]));
              },
              error: failure,
              blockClick: pointerId => { ignoredClick = pointerId; }
            });
          }
          if (configured.select) {
            const binding = configured.select, eventType = binding.effect === "visibility" ? "setVisibility" : "select";
            const select = (point, pointerType, transactionId) => {
              const query = normalizeHitQuery({ pointerType, hitInvisible: binding.hitInvisible,
                ...(binding.slop === undefined ? {} : { slop: binding.slop }) });
              const command = (binding.type === "legend" ? (binding.effect === "visibility" ? legendVisibilityCommand : legendSelectionCommand) : clickSelectionCommand)(program, binding, bridge.hit(point, query));
              if (!command) return outcome("unchanged");
              if (transactionId === undefined) { transactionSequence = nextInteger(transactionSequence); transactionId = `interaction-${transactionSequence}`; }
              return edit(interactionTransaction(command, transactionId));
            };
            lease.capture = prepareSelectionCapture(element, {
              current: () => !destroyed && mounted === lease,
              perform,
              point: event => { const coordinates = pointerCoordinates(element, event, transform); return coordinates.localPoint === null ? null : coordinates.screenPoint; },
              begin: () => {
                if (!resolvePointerSelection(program, binding, true)) return null;
                preparation.cancel("gesture");
                transactionSequence = nextInteger(transactionSequence);
                return freezeOwned({ transactionId: `interaction-${transactionSequence}`, previous: program });
              },
              select: (token, point, pointerType) => select(point, pointerType, token.transactionId),
              cancel: (token, reason) => publish(eventType, {
                transactionId: token.transactionId, origin: "user", phase: "cancel", revision,
                affectedOwners: freezeOwned([binding.target]), previous: token.previous, current: program,
                diagnostics: freezeOwned([freezeOwned({ code: "gesture-cancelled", message: reason })]), selectionChanges: Object.freeze([])
              }),
              error: (token, error) => publish(eventType, {
                transactionId: token.transactionId, origin: "user", phase: "error", revision,
                affectedOwners: Object.freeze([]), previous: token.previous, current: program,
                diagnostics: freezeOwned([freezeOwned({ code: "pointer-capture-failed", message: String(error?.message ?? error) })]), selectionChanges: Object.freeze([])
              }),
              blockClick: pointerId => { ignoredClick = pointerId; }
            });
            const listener = event => {
              if (destroyed || mounted !== lease || (event.button !== undefined && event.button !== 0)) return;
              if (event.detail !== 0 && ignoredClick !== undefined && (event.pointerId === undefined || event.pointerId === ignoredClick)) { ignoredClick = undefined; return; }
              const coordinates = pointerCoordinates(element, event, transform);
              const pointerType = event.pointerType || "mouse";
              perform(() => {
                if (mounted !== lease || coordinates.localPoint === null) return outcome("unchanged");
                return select(coordinates.screenPoint, pointerType);
              });
            };
            lease.listeners.push(["click", listener]); element.addEventListener("click", listener, { passive: true });
          }
        } catch (error) { detach(lease); candidate.dispose(); throw error; }
        let failure;
        try { if (mounted !== undefined) detach(mounted); } catch (error) { failure = error; }
        bridge.dispose(); bridge = candidate; mounted = lease; rootTransform = transform; lastHit = null;
        try { publish("mount"); } catch (error) { failure ??= error; }
        if (failure) throw failure;
        return outcome("applied");
      });
      return () => {
        if (destroyed || mounted !== lease) return false;
        perform(() => {
          if (mounted !== lease) return outcome("stale");
          const version = nextInteger(bridge.getState().version), frame = rebindProgramHitFrame(base, bridge.getState().scene, version);
          let failure;
          try { detach(lease); } catch (error) { failure = error; }
          bridge.updateFrame(frame); mounted = undefined; rootTransform = IDENTITY; lastHit = null;
          try { publish("unmount"); } catch (error) { failure ??= error; }
          if (failure) throw failure;
          return outcome("applied");
        });
        return true;
      };
    },
    destroy() {
      if (destroyed || destroyRequested) return false;
      destroyRequested = true;
      perform(close);
      return true;
    }
  });
  if (preparation.enabled) prepareAssets(program, { transactionId: "interaction-initial" }, assetHandlers(tags => () => publishAssets("settled", tags)));
  return session;
}
