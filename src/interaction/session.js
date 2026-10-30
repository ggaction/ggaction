import { normalizeKeyboardBinding, prepareKeyboardFrame, reconcileKeyboardFocus, normalizeFocusCommand, moveKeyboardFocus, keyboardActivation, keyboardKeyCommand } from "./keyboardFocus.js";
import { normalizeCameraNavigation, resolveCameraNavigation, prepareCameraNavigation, joinCameraNavigation, cameraNavigationDraft, navigationCenter, cameraWheelCommand, cameraKeyboardCommand } from "./cameraNavigation.js";
import { normalizeAnnotationMovement, resolveAnnotationMovement, prepareAnnotationMovement, annotationMovementCommand } from "./annotationMovement.js";
import { normalizeNodeMovement, resolveNodeMovement, prepareNodeMovement, nodeMovementCommand } from "./nodeMovement.js";
import { normalizeLegendVisibility, resolveLegendVisibility, legendVisibilityCommand } from "./legendVisibility.js";
import { normalizeClickSelection, clickSelectionCommand, resolveClickSelection } from "./clickSelection.js";
import { normalizeLegendSelection, resolveLegendSelection, legendSelectionCommand } from "./legendSelection.js";
import { prepareEditingCapture, pointerBindingChooser } from "./pointerBindings.js";
import { normalizeGestureBindings } from "./gestures.js";
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
import { prepareProgramHitFrame, rebindProgramHitFrame, prepareAnimationHitFrame, requireAnimationFrameProgram } from "./hitProgram.js";
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
  const inspect = [], context = [], linked = [], editing = [], keyboard = [];
  for (const binding of value) {
    const head = options(binding, ["type"], ["events", "slop", "hitInvisible", "id", "sources", "target", "selection", "resolve", "mode", "onMiss", "axis", "channels", "channel", "effect", "scaleDomain", "scaleExtent", "initial", "rotationStepDeg", "priority", "modifiers", "targets"], "Interaction binding");
    (head.type === "keyboard" ? keyboard : ["select", "legend", "brush", "lasso", "moveNode", "annotate", "navigate"].includes(head.type) ? editing : head.type === "contextMenu" ? context : ["linkSelection", "linkFilter"].includes(head.type) ? linked : inspect).push(head);
  }
  if (inspect.length > 1 || context.length > 1) throw new TypeError("Interaction bindings support at most one inspect and one context menu.");
  if (keyboard.length > 1) throw new TypeError("Interaction bindings support at most one keyboard binding.");
  const links = normalizeSelectionLinks(program, linked);
  const policies = normalizeGestureBindings(editing.map((head, index) => ({ id: `pointer-${index}`, kind: head.type === "navigate" ? "pan" : head.type === "legend" ? "select" : head.type,
    ...(head.priority === undefined ? {} : { priority: head.priority }), ...(head.modifiers === undefined ? {} : { modifiers: head.modifiers }), ...(head.type === "navigate" ? { pinch: true } : {}) })));
  const pointers = editing.map((head, index) => {
    const { priority, modifiers, ...domain } = head;
    const normalize = head.type === "navigate" ? normalizeCameraNavigation : head.type === "annotate" ? normalizeAnnotationMovement : head.type === "moveNode" ? normalizeNodeMovement
      : ["brush", "lasso"].includes(head.type) ? normalizeRegionBinding : head.type === "legend" ? (head.effect === "visibility" ? normalizeLegendVisibility : normalizeLegendSelection) : normalizeClickSelection;
    return { binding: normalize(program, domain, links), policy: policies[index] };
  });
  return { pointers, linked: links, keyboard: keyboard.length ? normalizeKeyboardBinding(program, keyboard[0], links) : null, inspect: freezeOwned([...inspect, ...context].map(binding => {
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
function pointerModifiers(event) { return { alt: !!event.altKey, ctrl: !!event.ctrlKey, meta: !!event.metaKey, shift: !!event.shiftKey }; }
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
  const hasMoving = configured.pointers.some(({ binding }) => ["moveNode", "annotate", "navigate"].includes(binding.type));
  const managedSelections = configured.linked.filter(link => !link.filter);
  let program = request.program, base = prepareProgramHitFrame(program), bridge = createHitFrameBridge(base), displayed = base;
  const keyboardFrames = new WeakMap();
  const keyboardFrameFor = (current, frame) => {
    if (configured.keyboard === null) return null;
    const cached = keyboardFrames.get(frame);
    if (cached?.program === current) return cached;
    const model = prepareKeyboardFrame(current, configured.keyboard, frame);
    keyboardFrames.set(frame, model); return model;
  };
  let keyboardFrame = keyboardFrameFor(program, base), focus = null;
  const adoptKeyboardFrame = model => { focus = reconcileKeyboardFocus(model, focus); keyboardFrame = model; };
  const setFrame = (frame, current = program) => {
    const model = keyboardFrameFor(current, frame), result = bridge.updateFrame(frame);
    if (result.applied) { displayed = frame; adoptKeyboardFrame(model); }
    return result;
  };
  let linkedSelections = inspectSelectionLinks(program, configured.linked);
  let selectionRecords = reconcileSelections(program, [], selectionPolicy, { initialize: true }).records;
  let rootTransform = IDENTITY, mounted, destroyed = false, destroyRequested = false, generation = 0, lastHit = null, processing = false;
  let state, revision = 0, transactionSequence = 0, ignoredClick, previewProgram = null, previewFrame = null, previewPreparation = null, animationFrame = null, framePreparation = null, frameRequestVersion = -1;
  const committedSnapshot = () => ({ program, selectionRecords, linkedSelections });
  const history = createInteractionHistory(committedSnapshot(), request.historyLimit);
  const drainedTransactions = new Set();
  const queue = [], listeners = new Set();
  let assetResolver = request.assetResolver;
  const preparation = createInteractionPreparation(assetResolver, operation => perform(operation), () => snapshot());
  let activePreparation = preparation;
  const snapshot = () => state = freezeOwned({ program, previewProgram, previewFrame, scene: bridge.getState().scene, ...preparation.inspect(),
    previewAssets: previewPreparation?.inspect().assets ?? null,
    animationFrame, frameAssets: framePreparation?.inspect().assets ?? null,
    preparation: previewPreparation?.inspect().preparation ?? framePreparation?.inspect().preparation ?? preparation.inspect().preparation,
    frameVersion: bridge.getState().version, generation, revision, hit: lastHit, focus, linkedSelections, history: history.inspect(), mounted: mounted !== undefined, destroyed });
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
    try { lease.observer?.disconnect(); } catch (error) { failure ??= error; }
    lease.observer = undefined;
    for (const [event, listener] of lease.listeners) {
      try { lease.element.removeEventListener(event, listener); } catch (error) { failure ??= error; }
    }
    lease.listeners.length = 0; lease.element = undefined; lease.capture = undefined;
    if (failure) throw failure;
  };
  const close = () => {
    let failure;
    try { if (mounted !== undefined) detach(mounted, "destroy"); } catch (error) { failure = error; }
    try { preparation.dispose(); } catch (error) { failure ??= error; }
    try { releaseAnimationFrame(); } catch (error) { failure ??= error; }
    mounted = undefined; lastHit = null; focus = null; destroyed = true; assetResolver = undefined; history.dispose();
    try { publish("destroy"); } catch (error) { failure ??= error; }
    finally { listeners.clear(); bridge.dispose(); base = null; displayed = null; keyboardFrame = null; rootTransform = IDENTITY; queue.length = 0; selectionRecords = []; ignoredClick = undefined; }
    if (failure) throw failure;
    return outcome("applied");
  };
  const cancelFramePreparation = reason => framePreparation?.cancel(reason);
  const detachAnimationFrame = () => {
    const previous = framePreparation;
    framePreparation = null; animationFrame = null;
    frameRequestVersion = bridge.getState().version;
    return () => previous?.dispose();
  };
  const releaseAnimationFrame = () => detachAnimationFrame()();
  // Candidate index and keyboard models are prepared before a renderer lease can
  // be published. The actual swap has no fallible geometry work or host callback.
  const prepareFramePublication = (frame, sample) => {
    const model = keyboardFrameFor(program, frame), candidate = createHitFrameBridge(frame);
    return () => {
      const previous = bridge; bridge = candidate; displayed = frame; animationFrame = sample;
      adoptKeyboardFrame(model); lastHit = null; previous.dispose();
      publish("frame"); return outcome("applied");
    };
  };
  const prepareAssets = (candidate, metadata, handlers, vector) => {
    const previous = program, sessionGeneration = generation, baseRevision = revision;
    cancelFramePreparation("native-update");
    activePreparation = preparation;
    return preparation.start(candidate, { sessionGeneration, transactionId: metadata.transactionId, baseRevision }, {
      current: tags => !destroyed && program === previous && generation === tags.sessionGeneration && revision === tags.baseRevision,
      ...handlers
    }, vector);
  };
  const publishAssets = (status, tags, diagnostics = []) => publish("assets", { status, preparation: tags, diagnostics: cloneAndFreeze(diagnostics) });
  const assetHandlers = prepare => ({ prepare,
    cancel: (reason, tags) => publishAssets("cancelled", tags, [{ code: "preparation-cancelled", message: reason }]),
    error: (error, tags) => publishAssets("error", tags, [{ code: getErrorDetails(error)?.code ?? "asset-preparation-failed", message: String(error?.message ?? error) }]) });
  const prepareEdit = (command, native) => {
    let prepared = native ?? prepareInteractionEdit(program, prepareNearestSelection(program, command, bridge));
    if (prepared.program === program) return null;
    const initial = reconcileSelections(prepared.program, selectionRecords, selectionPolicy, { managed: managedSelections });
    prepared = applySelectionLinks(initial.program, configured.linked, linkedSelections, [...prepared.affectedOwners, ...initial.affectedOwners], command, selectionPolicy, initial.records);
    const reconciled = reconcileSelections(prepared.program, prepared.records, selectionPolicy, { verify: true });
    const selectionChanges = [...initial.changes, ...prepared.selectionChanges, ...reconciled.changes];
    const version = nextInteger(bridge.getState().version), nextGeneration = nextInteger(generation), nextRevision = nextInteger(revision);
    const candidate = prepareProgramHitFrame(prepared.program, version);
    const frame = rebindProgramHitFrame(candidate, candidate.scene, version, rootTransform);
    keyboardFrameFor(prepared.program, frame);
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
        if (hasMoving && (previewProgram !== null || previewFrame !== null)) nextInteger(nextInteger(bridge.getState().version));
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
      keyboardFrameFor(prepared.program, frame);
      return () => {
        mounted?.capture?.cancel("updateProgram"); previewProgram = null; previewFrame = null;
        if (frame.version <= bridge.getState().version) frame = rebindProgramHitFrame(candidate, candidate.scene, nextInteger(bridge.getState().version), rootTransform);
        setFrame(frame, prepared.program); base = candidate; program = prepared.program;
        const releaseFrame = detachAnimationFrame();
        linkedSelections = prepared.projections; selectionRecords = reconciled.records;
        generation = nextGeneration; revision = nextRevision; lastHit = null;
        history.record(previousSnapshot, prepared.affectedOwners);
        try { publish(command.type, details("commit", prepared.affectedOwners));
          publish(command.type, details("settled", prepared.affectedOwners)); } finally { releaseFrame(); }
        return outcome("applied");
      };
    };
    if (preparation.enabled) {
      mounted?.capture?.cancel("updateProgram"); previewProgram = null; previewFrame = null;
      return prepareAssets(prepared.program, command, {
        prepare: prepareCommit,
        cancel: reason => publish(command.type, details("cancel", [], [{ code: "preparation-cancelled", message: reason }])),
        error: error => publish(command.type, details("error", [], [{ code: getErrorDetails(error)?.code ?? "asset-preparation-failed", message: String(error?.message ?? error) }]))
      }, resourceRevisions);
    }
    cancelFramePreparation("native-update"); preparation.cancel("superseded");
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
      keyboardFrameFor(entry.state.program, frame);
      resourceRevisions = preparation.enabled ? interactionResourceRevisions(entry.state.program) : undefined;
      if (hasMoving && (previewProgram !== null || previewFrame !== null)) nextInteger(nextInteger(bridge.getState().version));
    } catch (error) {
      publish(command.type, details("error", [{ code: getErrorDetails(error)?.code ?? "interaction-history-failed", message: error.message }]));
      throw error;
    }
    const prepareCommit = () => {
      frame = rebindProgramHitFrame(candidate, candidate.scene, nextInteger(bridge.getState().version), rootTransform);
      keyboardFrameFor(entry.state.program, frame);
      return () => {
        mounted?.capture?.cancel("updateProgram"); previewProgram = null; previewFrame = null;
        if (frame.version <= bridge.getState().version) frame = rebindProgramHitFrame(candidate, candidate.scene, nextInteger(bridge.getState().version), rootTransform);
        setFrame(frame, entry.state.program); base = candidate;
        const releaseFrame = detachAnimationFrame();
        ({ program, selectionRecords, linkedSelections } = entry.state);
        generation = nextGeneration; revision = nextRevision; lastHit = null;
        history.accept(command.type, previousSnapshot, entry.affectedOwners);
        try { publish(command.type, details("commit")); publish(command.type, details("settled")); } finally { releaseFrame(); }
        return outcome("applied");
      };
    };
    if (preparation.enabled) {
      mounted?.capture?.cancel("updateProgram"); previewProgram = null; previewFrame = null;
      return prepareAssets(entry.state.program, command, { prepare: prepareCommit,
        cancel: reason => publish(command.type, details("cancel", [{ code: "preparation-cancelled", message: reason }])),
        error: error => publish(command.type, details("error", [{ code: getErrorDetails(error)?.code ?? "asset-preparation-failed", message: String(error?.message ?? error) }])) }, resourceRevisions);
    }
    cancelFramePreparation("native-update"); preparation.cancel("superseded");
    return prepareCommit()();
  };
  const prepareReplacement = (next, policy, origin) => {
    const previousSnapshot = committedSnapshot();
    const version = nextInteger(bridge.getState().version), nextGeneration = nextInteger(generation), nextRevision = nextInteger(revision);
    const reconciled = reconcileSelections(next, selectionRecords, selectionPolicy, { managed: managedSelections });
    let linked = { program: reconciled.program, projections: inspectSelectionLinks(reconciled.program, configured.linked, undefined, linkedSelections, selectionPolicy) };
    if (reconciled.affectedOwners.length || selectionLinksNeedUpdate(linked.projections, linkedSelections)) {
      linked = applySelectionLinks(linked.program, configured.linked, linkedSelections, reconciled.affectedOwners, { type: "program" }, selectionPolicy, reconciled.records);
    }
    for (const {binding} of configured.pointers) {
      const resolve = binding.type === "navigate" ? resolveCameraNavigation : binding.type === "annotate" ? resolveAnnotationMovement : binding.type === "moveNode" ? resolveNodeMovement
        : ["brush", "lasso"].includes(binding.type) ? resolveRegionBinding : resolvePointerSelection;
      resolve(linked.program, binding, true);
    }
    const verified = reconcileSelections(linked.program, linked.records ?? reconciled.records, selectionPolicy, { verify: true });
    const selectionChanges = cloneAndFreeze([...reconciled.changes, ...(linked.selectionChanges ?? []), ...verified.changes]);
    const candidate = prepareProgramHitFrame(linked.program, version);
    let frame = rebindProgramHitFrame(candidate, candidate.scene, version, rootTransform);
    keyboardFrameFor(linked.program, frame);
    if (hasMoving && (previewProgram !== null || previewFrame !== null)) nextInteger(nextInteger(bridge.getState().version));
    const prepareCommit = tags => {
      frame = rebindProgramHitFrame(candidate, candidate.scene, nextInteger(bridge.getState().version), rootTransform);
      keyboardFrameFor(linked.program, frame);
      return () => {
        mounted?.capture?.cancel("updateProgram");
        if (frame.version <= bridge.getState().version) frame = rebindProgramHitFrame(candidate, candidate.scene, nextInteger(bridge.getState().version), rootTransform);
        setFrame(frame, linked.program); base = candidate; program = linked.program; generation = nextGeneration; revision = nextRevision; lastHit = null;
        const releaseFrame = detachAnimationFrame();
        linkedSelections = linked.projections; selectionRecords = verified.records;
        if (policy === "reset") history.clear();
        else if (program !== previousSnapshot.program) history.record(previousSnapshot, Object.freeze([]));
        try { publish("program", { origin, history: policy, selectionChanges });
          if (tags) publishAssets("settled", tags); } finally { releaseFrame(); }
        return outcome("applied");
      };
    };
    return { linked, prepareCommit };
  };
  const prepareUpdate = (produce, config) => {
    const metadata = interactionTransactionMetadata(config, `interaction-${nextInteger(transactionSequence)}`);
    transactionSequence = nextInteger(transactionSequence);
    return perform(() => {
      if (drainedTransactions.has(metadata.transactionId)) return outcome("stale");
      const vector = interactionResourceRevisions(program);
      drainedTransactions.add(metadata.transactionId);
      mounted?.capture?.cancel("updateProgram"); previewProgram = null; previewFrame = null;
      const report = (status, tags, diagnostics = []) => publish("update", { ...metadata, status, preparation: tags, diagnostics: cloneAndFreeze(diagnostics) });
      let replacement;
      return prepareAssets(program, metadata, {
        async produce(request, resolveAssets) {
          const next = await produce(request);
          request.signal.throwIfAborted();
          perform(() => { replacement = prepareReplacement(next, config.history, metadata.origin); });
          request.signal.throwIfAborted();
          if (!resolveAssets) return { dispose() {} };
          const candidate = replacement.linked.program;
          return resolveAssets(freezeOwned({ ...request, program: candidate, resourceRevisionVector: interactionResourceRevisions(candidate) }));
        },
        prepare: tags => {
          const commit = replacement.prepareCommit();
          return () => { const result = commit(); report("settled", tags); return result; };
        },
        cancel: (reason, tags) => report("cancelled", tags, [{ code: "update-cancelled", message: reason }]),
        error: (error, tags) => report("error", tags, [{ code: getErrorDetails(error)?.code ?? "update-failed", message: String(error?.message ?? error) }])
      }, vector);
    });
  };
  const focusCommand = command => {
    const next = moveKeyboardFocus(keyboardFrame, focus, command);
    if (JSON.stringify(next) === JSON.stringify(focus)) return outcome("unchanged");
    focus = next; publish("focus"); return outcome("applied");
  };
  const activate = (parent = false) => {
    if (configured.keyboard === null) throw new Error("Activation requires a keyboard binding.");
    const command = keyboardActivation(keyboardFrame, focus, parent);
    if (command === null) return outcome("unchanged");
    transactionSequence = nextInteger(transactionSequence);
    return edit(interactionTransaction(command, `interaction-${transactionSequence}`));
  };
  const dispatch = command => {
    live();
    // Inspect the envelope before reading type; queued edits snapshot all payload data.
    const envelope = options(command, ["type"], ["point", "pointerType", "slop", "hitInvisible", "scene", "frame", "version", "generation", "target", "payload", "transactionId", "origin", "causeTransactionId", "itemKey", "move"], "Interaction command");
    if (envelope.type === "focus") {
      const owned = normalizeFocusCommand(program, configured.keyboard, envelope);
      return perform(() => focusCommand(owned));
    }
    if (envelope.type === "activate") { options(envelope, ["type"], [], "Activation command"); return perform(() => activate()); }
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
    const head = options(command, ["type"], ["point", "pointerType", "slop", "hitInvisible", "scene", "frame", "version", "generation"], "Interaction command");
    if (head.type === "inspect" || head.type === "contextMenu") {
      const c = options(head, ["type", "point"], ["pointerType", "slop", "hitInvisible"], "Inspect command");
      const point = transformHitPoint(IDENTITY, c.point), query = normalizeHitQuery(Object.fromEntries(
        ["pointerType", "slop", "hitInvisible"].filter(key => Object.hasOwn(c, key)).map(key => [key, c[key]])));
      return perform(() => inspect(point, query, c.type));
    }
    if (head.type === "leave") { options(head, ["type"], [], "Leave command"); return perform(clear); }
    if (head.type === "frame") {
      const c = options(head, ["type", "version", "generation"], ["scene", "frame"], "Frame command");
      if (Object.hasOwn(c, "scene") === Object.hasOwn(c, "frame")) throw new TypeError("Frame command requires exactly one scene or authentic frame.");
      if (![c.version, c.generation].every(value => Number.isSafeInteger(value) && value >= 0)) throw new TypeError("Frame command counters must be non-negative safe integers.");
      const stale = () => c.generation !== generation || c.version <= Math.max(bridge.getState().version, frameRequestVersion);
      // A stale object is never inspected, including nested accessors or forged samples.
      const sampled = Object.hasOwn(c, "frame"), scene = !stale() && !sampled ? ownHitScene(c.scene) : undefined;
      return perform(() => {
        if (stale()) return outcome("stale");
        const current = program, sessionGeneration = generation, baseRevision = revision;
        if (sampled) requireAnimationFrameProgram(c.frame, current);
        const bind = version => sampled ? prepareAnimationHitFrame(c.frame, version, rootTransform)
          : rebindProgramHitFrame(base, scene, version, rootTransform);
        const initial = bind(c.version);
        // Preflight before cancelling any pending native or frame work.
        keyboardFrameFor(current, initial); const check = createHitFrameBridge(initial); check.dispose();
        if (hasMoving && (previewProgram !== null || previewFrame !== null)) nextInteger(nextInteger(bridge.getState().version));
        mounted?.capture?.cancel("updateProgram");
        frameRequestVersion = c.version;
        preparation.cancel("frame");
        const prepare = () => prepareFramePublication(bind(Math.max(c.version, nextInteger(bridge.getState().version))), sampled ? c.frame : null);
        if (!sampled || !preparation.enabled) {
          const commit = prepare(), releaseFrame = detachAnimationFrame();
          try { return commit(); } finally { releaseFrame(); }
        }
        if (framePreparation === null) framePreparation = createInteractionPreparation(assetResolver, operation => perform(operation), () => snapshot());
        activePreparation = framePreparation;
        transactionSequence = nextInteger(transactionSequence);
        return framePreparation.start(current, { sessionGeneration, baseRevision, frameVersion: c.version, transactionId: `interaction-${transactionSequence}` }, {
          current: tags => !destroyed && program === current && generation === tags.sessionGeneration && revision === tags.baseRevision && frameRequestVersion === tags.frameVersion,
          produce: (request, resolveAssets) => resolveAssets(freezeOwned({ ...request, frame: c.frame })),
          prepare,
          cancel: (reason, tags) => publishAssets("cancelled", tags, [{ code: "frame-preparation-cancelled", message: reason }]),
          error: (error, tags) => publishAssets("error", tags, [{ code: getErrorDetails(error)?.code ?? "frame-preparation-failed", message: String(error?.message ?? error) }])
        });
      });
    }
    throw new TypeError("Unsupported interaction command type.");
  };
  const session = Object.freeze({
    getState() { return state; },
    whenSettled() { return activePreparation.whenSettled(); },
    dispatch,
    updateProgram(next, configuration = {}) {
      live();
      const deferred = typeof next === "function";
      const config = options(configuration, [], deferred ? ["history", "origin", "transactionId", "causeTransactionId"] : ["history", "origin"], "Interaction update");
      const policy = config.history === undefined ? "reset" : config.history, origin = interactionOrigin(config.origin);
      if (!["reset", "record"].includes(policy)) throw new TypeError("Unknown interaction update history policy.");
      if (deferred) return prepareUpdate(next, { ...config, history: policy, origin });
      return perform(() => {
        const { linked, prepareCommit } = prepareReplacement(next, policy, origin);
        if (preparation.enabled) {
          mounted?.capture?.cancel("updateProgram"); transactionSequence = nextInteger(transactionSequence);
          return prepareAssets(linked.program, { transactionId: `interaction-${transactionSequence}` }, assetHandlers(prepareCommit));
        }
        cancelFramePreparation("native-update"); preparation.cancel("superseded");
        return prepareCommit()();
      });
    },
    subscribe(listener) {
      live(); if (typeof listener !== "function") throw new TypeError("Interaction subscriber must be a function.");
      listeners.add(listener); return () => listeners.delete(listener);
    },
    mount(element, configuration = {}) {
      live();
      const config = options(configuration, [], ["rootTransform", "observeResize"], "Interaction mount");
      if (config.observeResize !== undefined && typeof config.observeResize !== "boolean") throw new TypeError("observeResize must be boolean.");
      const matrix = config.rootTransform === undefined ? IDENTITY : config.rootTransform;
      transformHitPoint(matrix, { x: 0, y: 0 });
      const transform = cloneAndFreeze(matrix);
      if (!element || !["addEventListener", "removeEventListener", "getBoundingClientRect"].every(key => typeof element[key] === "function")) {
        throw new TypeError("Interaction mount requires an event surface with a client rectangle.");
      }
      const ResizeObserver = config.observeResize ? element.ownerDocument?.defaultView?.ResizeObserver : undefined;
      if (config.observeResize && typeof ResizeObserver !== "function") throw new TypeError("Resize observation requires the mounted element's host ResizeObserver.");
      const lease = { element, listeners: [] };
      perform(() => {
        const version = nextInteger(bridge.getState().version);
        let frame = rebindProgramHitFrame(displayed, bridge.getState().scene, version, transform);
        const candidate = createHitFrameBridge(frame);
        let candidateKeyboard;
        try { candidateKeyboard = keyboardFrameFor(program, frame); } catch (error) { candidate.dispose(); throw error; }
        try {
          if (configured.keyboard !== null) {
            const listener = event => {
              if (destroyed || mounted !== lease || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
              // Host controls nested form elements; keyboard handling owns only
              // the explicit surface, never text entry or descendant controls.
              if (event.target !== undefined && event.target !== element) return;
              const command = keyboardKeyCommand(keyboardFrame, focus, event.key);
              if (command === null) return;
              perform(() => {
                if (destroyed || mounted !== lease) return outcome("stale");
                event.preventDefault();
                if (event.key === "Escape" && lease.capture?.cancel("Escape")) return outcome("applied");
                return command.type === "activate" ? activate(command.parent === true) : focusCommand(command);
              });
            };
            lease.listeners.push(["keydown", listener]); element.addEventListener("keydown", listener, { passive: false });
          }
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
          const editing = [];
          for (const { binding, policy } of configured.pointers.filter(({ binding }) => !["select", "legend"].includes(binding.type))) {
            const navigating = binding.type === "navigate", moving = navigating || binding.type === "moveNode" || binding.type === "annotate", eventType = navigating ? "setViewport" : moving ? binding.type : "select";
            const movement = binding.type === "annotate" ? { prepare: prepareAnnotationMovement, command: annotationMovementCommand }
              : { prepare: prepareNodeMovement, command: nodeMovementCommand };
            const scheduler = element.ownerDocument?.defaultView ?? element;
            if (typeof scheduler.requestAnimationFrame !== "function" || typeof scheduler.cancelAnimationFrame !== "function") throw new TypeError("Editing gestures require host animation-frame scheduling.");
            let gesture;
            const discard = (token, restore = true) => {
              try {
                if (token?.raf !== undefined) scheduler.cancelAnimationFrame(token.raf);
                if (moving && restore && token?.previewed) setFrame(rebindProgramHitFrame(token.frame, token.scene, nextInteger(bridge.getState().version), transform));
              }
              finally {
                if (token) token.raf = undefined; gesture = undefined; previewProgram = null; previewFrame = null;
                const previous = previewPreparation; previewPreparation = null; snapshot(); previous?.dispose();
              }
            };
            const details = (token, phase, diagnostics = []) => ({ transactionId: token.transactionId, origin: "user", phase, revision,
              affectedOwners: freezeOwned([binding.target]), previous: token.previous, current: program,
              diagnostics: cloneAndFreeze(diagnostics), selectionChanges: Object.freeze([]) });
            const failure = (token, error) => {
              try { discard(token); } catch { /* Preserve the original error after cleanup. */ }
              publish(eventType, details(token, "error", [{ code: getErrorDetails(error)?.code ?? "selection-gesture-failed", message: String(error?.message ?? error) }]));
            };
            const preview = (token, final = false) => {
              if (token.previous !== program) throw new Error("Selection gesture baseline is stale.");
              const result = navigating ? cameraNavigationDraft(token.context, token.pointers) : (moving ? movement.command : regionGestureCommand)(token.context, token.points, final);
              const command = interactionTransaction(result.command, token.transactionId), draft = result.frame && !final ? null : prepareEdit(command, result.prepared);
              if (final && preparation.enabled) return { command, draft };
              const next = moving ? draft?.prepared.program ?? program : materializeRegisteredSelectionPreview(draft?.prepared.program ?? program, result.overlay);
              const accept = () => {
                let frame;
                if (result.frame) {
                  frame = prepareAnimationHitFrame(result.frame, nextInteger(bridge.getState().version), transform);
                  nextInteger(nextInteger(frame.version));
                } else if (moving && draft) {
                  frame = rebindProgramHitFrame(draft.candidate, draft.candidate.scene, nextInteger(bridge.getState().version), transform);
                  nextInteger(nextInteger(frame.version));
                } else if (navigating && token.previewed) frame = rebindProgramHitFrame(token.frame, token.scene, nextInteger(bridge.getState().version), transform);
                const frameProgram = result.frame ? program : draft?.prepared.program ?? program;
                if (frame) keyboardFrameFor(frameProgram, frame);
                return () => {
                  previewProgram = result.frame ? null : next; previewFrame = result.frame ?? null;
                  if (frame) { setFrame(frame, frameProgram); token.previewed = true; lastHit = null; }
                  publish(eventType, { ...details(token, "preview"), affectedOwners: draft?.prepared.affectedOwners ?? freezeOwned([binding.target]) });
                };
              };
              if (preparation.enabled) {
                const owner = token.preparation;
                activePreparation = owner;
                owner.start(result.frame ? program : next, { sessionGeneration: generation, transactionId: token.transactionId, baseRevision: revision }, {
                  current: tags => !destroyed && mounted === lease && gesture === token && program === token.previous && generation === tags.sessionGeneration && revision === tags.baseRevision,
                  ...(result.frame ? { produce: (request, resolveAssets) => resolveAssets(freezeOwned({ ...request, frame: result.frame })) } : {}),
                  prepare: accept,
                  cancel() {},
                  error: error => { try { lease.capture.fail(error); } catch (failure) { if (failure !== error) throw failure; } }
                }, draft?.resourceRevisions);
              } else accept()();
              return { command, draft };
            };
            editing.push({ policy,
              current: () => !destroyed && mounted === lease,
              perform,
              point: event => { const coordinates = pointerCoordinates(element, event, transform); return coordinates.localPoint === null ? null : coordinates.screenPoint; },
              candidate: point => {
                if (preparation.enabled && preparation.inspect().assets === null && framePreparation?.inspect().assets == null) return null;
                const scene = bridge.getState().scene;
                const context = navigating ? prepareCameraNavigation(program, binding, base, scene, transform, point) : moving ? movement.prepare(program, binding, base, scene, transform, point, bridge.hit(point, { slop: 0 }), displayed)
                  : prepareRegionGesture(program, binding, base, scene, transform, point, displayed);
                return context;
              },
              begin: (point, _pointerType, context) => {
                preparation.cancel("gesture"); cancelFramePreparation("gesture");
                transactionSequence = nextInteger(transactionSequence);
                const scene = bridge.getState().scene;
                if (preparation.enabled) previewPreparation = createInteractionPreparation(assetResolver, operation => perform(operation), () => snapshot());
                return gesture = { preparation: previewPreparation, transactionId: `interaction-${transactionSequence}`, previous: program, context, points: [point], scene, frame: displayed, previewed: false, raf: undefined };
              },
              join: navigating ? (token, pointers) => { token.context = joinCameraNavigation(token.context, pointers); } : undefined,
              joinCandidate: navigating ? point => prepareCameraNavigation(program, binding, base, base.scene, transform, point) !== null : undefined,
              sample: (token, point) => {
                if (navigating) return;
                const previous = token.points.at(-1);
                if (previous.x === point.x && previous.y === point.y) return;
                if (moving || binding.type === "brush") token.points = [token.points[0], point];
                else {
                  if (token.points.length >= 10_000) throw new RangeError("Lasso exceeds its screen point budget.");
                  token.points.push(point);
                }
              },
              preview: (token, pointers) => {
                if (navigating) token.pointers = pointers;
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
              drag: (token, _point, _pointerType, gestureKind, pointers) => {
                if (navigating) token.pointers = pointers;
                if (moving && gestureKind === "click") {
                  discard(token); publish(eventType, details(token, "cancel", [{ code: "gesture-cancelled", message: "movement" }]));
                  return outcome("unchanged");
                }
                let result;
                try {
                  if (token.raf !== undefined) scheduler.cancelAnimationFrame(token.raf);
                  token.raf = undefined;
                  result = preview(token, true);
                  // Asset preparation may defer the final commit; its displayed
                  // baseline must be the committed frame throughout that wait.
                  discard(token, navigating || preparation.enabled);
                } catch (error) { failure(token, error); throw error; }
                if (navigating && result.draft === null) { publish(eventType, details(token, "cancel", [{ code: "gesture-cancelled", message: "movement" }])); return outcome("unchanged"); }
                return edit(result.command, result.draft);
              },
              cancel: (token, reason) => {
                try { discard(token); }
                finally { publish(eventType, details(token, "cancel", [{ code: "gesture-cancelled", message: reason }])); }
              },
              error: failure,
              blockClick: pointerId => { ignoredClick = pointerId; }
            });
          }
          const navigation = configured.pointers.filter(({ binding }) => binding.type === "navigate");
          if (navigation.length) {
            const navigate = (event, wheel) => {
              if (destroyed || mounted !== lease || event.defaultPrevented || (!wheel && configured.keyboard !== null) || (!wheel && (event.altKey || event.ctrlKey || event.metaKey))) return;
              if (!wheel && !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "_", "Home"].includes(event.key)) return;
              perform(() => {
                if (destroyed || mounted !== lease) return outcome("stale");
                const candidates = navigation.map(({binding, policy}) => ({binding, policy, candidate: () => {
                  if (!resolveCameraNavigation(program, binding, true)) return null;
                  const point = wheel ? pointerCoordinates(element, event, transform).screenPoint : navigationCenter(base, binding.target, transform);
                  return prepareCameraNavigation(program, binding, base, previewProgram === null ? bridge.getState().scene : base.scene, transform, point);
                }}));
                const selected = pointerBindingChooser(candidates)(null, event.pointerType || "mouse", pointerModifiers(event));
                if (!selected) return outcome("unchanged");
                lease.capture.cancel("movement");
                const context = selected.context;
                const command = wheel ? cameraWheelCommand(context, event.deltaY, event.deltaMode, element.getBoundingClientRect().height) : cameraKeyboardCommand(context, event.key);
                if (!command) return outcome("unchanged");
                event.preventDefault();
                transactionSequence = nextInteger(transactionSequence);
                return edit(interactionTransaction(command, `interaction-${transactionSequence}`));
              });
            };
            for (const [type, listener] of [["wheel", event => navigate(event, true)], ["keydown", event => navigate(event, false)]]) {
              lease.listeners.push([type, listener]); element.addEventListener(type, listener, { passive: false });
            }
          }
          const selections = [];
          for (const {binding, policy} of configured.pointers.filter(({binding}) => ["select", "legend"].includes(binding.type))) {
            const eventType = binding.effect === "visibility" ? "setVisibility" : "select";
            const commandAt = (point, pointerType) => {
              const query = normalizeHitQuery({ pointerType, hitInvisible: binding.hitInvisible,
                ...(binding.slop === undefined ? {} : { slop: binding.slop }) });
              return (binding.type === "legend" ? (binding.effect === "visibility" ? legendVisibilityCommand : legendSelectionCommand) : clickSelectionCommand)(program, binding, bridge.hit(point, query), displayed);
            };
            const select = (point, pointerType, transactionId) => {
              const command = commandAt(point, pointerType);
              if (!command) return outcome("unchanged");
              if (transactionId === undefined) { transactionSequence = nextInteger(transactionSequence); transactionId = `interaction-${transactionSequence}`; }
              return edit(interactionTransaction(command, transactionId));
            };
            const selection = { policy, selectPoint: select,
              current: () => !destroyed && mounted === lease,
              perform,
              point: event => { const coordinates = pointerCoordinates(element, event, transform); return coordinates.localPoint === null ? null : coordinates.screenPoint; },
              candidate: (point, pointerType) => resolvePointerSelection(program, binding, true) && commandAt(point, pointerType),
              begin: () => {
                preparation.cancel("gesture"); cancelFramePreparation("gesture");
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
            };
            selections.push(selection); editing.push(selection);
          }
          if (editing.length) lease.capture = prepareEditingCapture(element, editing);
          if (selections.length) {
            const choose = pointerBindingChooser(selections);
            const listener = event => {
              if (destroyed || mounted !== lease || (event.button !== undefined && event.button !== 0)) return;
              if (event.detail !== 0 && ignoredClick !== undefined && (event.pointerId === undefined || event.pointerId === ignoredClick)) { ignoredClick = undefined; return; }
              const coordinates = pointerCoordinates(element, event, transform), pointerType = event.pointerType || "mouse";
              perform(() => {
                if (mounted !== lease || coordinates.localPoint === null) return outcome("unchanged");
                const selected = choose(coordinates.screenPoint, pointerType, pointerModifiers(event));
                return selected ? selected.entry.selectPoint(coordinates.screenPoint, pointerType) : outcome("unchanged");
              });
            };
            lease.listeners.push(["click", listener]); element.addEventListener("click", listener, { passive: true });
          }
          if (ResizeObserver) {
            let measured;
            lease.observer = new ResizeObserver(entries => {
              if (destroyed || mounted !== lease) return;
              if (!Array.isArray(entries) || entries.length > MAX_DISPATCHES) throw new RangeError("Resize observations exceed the entry budget.");
              const matching = entries.filter(entry => entry.target === lease.element);
              if (matching.length > 1) throw new TypeError("Resize notification contains duplicate surface measurements.");
              if (!matching.length) return;
              const { width, height } = matching[0].contentRect;
              if (![width, height].every(value => typeof value === "number" && Number.isFinite(value) && value >= 0)) throw new TypeError("Resize measurements require finite non-negative CSS dimensions.");
              perform(() => {
                if (destroyed || mounted !== lease || measured?.width === width && measured?.height === height) return outcome("unchanged");
                measured = freezeOwned({ width, height });
                publish("resize", { size: measured });
                return outcome("applied");
              });
            });
            if (typeof lease.observer.observe !== "function" || typeof lease.observer.disconnect !== "function") throw new TypeError("Resize observer requires observe and disconnect methods.");
            lease.observer.observe(element, { box: "content-box" });
          }
        } catch (error) { try { detach(lease); } catch {} finally { candidate.dispose(); } throw error; }
        let failure;
        try { if (mounted !== undefined) detach(mounted); } catch (error) { failure = error; }
        // Detaching an active native preview restores its pre-gesture scene.
        // The new surface must bind that restored scene, not the earlier draft.
        if (candidate.getState().scene !== bridge.getState().scene) {
          const restored = rebindProgramHitFrame(displayed, bridge.getState().scene, nextInteger(bridge.getState().version), transform);
          candidateKeyboard = keyboardFrameFor(program, restored); candidate.updateFrame(restored); frame = restored;
        }
        bridge.dispose(); bridge = candidate; displayed = frame; adoptKeyboardFrame(candidateKeyboard); mounted = lease; rootTransform = transform; lastHit = null;
        try { publish("mount"); } catch (error) { failure ??= error; }
        if (failure) throw failure;
        return outcome("applied");
      });
      return () => {
        if (destroyed || mounted !== lease) return false;
        perform(() => {
          if (mounted !== lease) return outcome("stale");
          const version = nextInteger(bridge.getState().version);
          let frame = rebindProgramHitFrame(displayed, bridge.getState().scene, version), failure;
          try { detach(lease); } catch (error) { failure = error; }
          if (frame.scene !== bridge.getState().scene) frame = rebindProgramHitFrame(displayed, bridge.getState().scene, nextInteger(bridge.getState().version));
          setFrame(frame); mounted = undefined; rootTransform = IDENTITY; lastHit = null;
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
