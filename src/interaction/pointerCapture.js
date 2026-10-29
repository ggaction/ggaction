import { idleGestureState, reduceGesture } from "./gestures.js";

const CLICK = Object.freeze({ id: "selection", kind: "select" });

// A private DOM effect adapter shared by click, brush and lasso. Custom event
// surfaces retain click-only behavior; domain drags require capture support.
export function prepareSelectionCapture(element, callbacks) {
  const methods = ["setPointerCapture", "releasePointerCapture"].map(key => typeof element[key] === "function");
  if (!methods.some(Boolean) && callbacks.binding === undefined) return null;
  if (!methods.every(Boolean)) throw new TypeError("Pointer selection requires both capture and release methods.");
  let host = element, hooks = callbacks, current = idleGestureState(), active;
  const listeners = [];
  const valid = () => hooks !== null && hooks.current();
  const release = id => {
    if (typeof host.hasPointerCapture === "function" && !host.hasPointerCapture(id)) return;
    try { host.releasePointerCapture(id); } catch (error) { if (error.name !== "NotFoundError") throw error; }
  };
  const apply = result => {
    const token = active, terminal = result.effects.find(effect => effect.type === "cancel" || effect.type === "commit");
    current = result.state;
    if (terminal) { active = undefined; hooks.blockClick(terminal.pointers[0].id); }
    let failure;
    for (const effect of result.effects) if (effect.type === "release") {
      try { release(effect.pointerId); } catch (error) { failure ??= error; }
    }
    if (terminal) {
      try {
        if (terminal.type === "commit" && hooks.drag) hooks.drag(token, terminal.pointers[0].point, terminal.pointers[0].type, terminal.gesture);
        else if (terminal.type === "commit" && terminal.gesture === "click") hooks.select(token, terminal.pointers[0].point, terminal.pointers[0].type);
        else hooks.cancel(token, terminal.type === "cancel" ? terminal.reason : "movement");
      } catch (error) { failure ??= error; }
    } else if (result.effects.some(effect => effect.type === "preview")) {
      hooks.preview?.(token);
    }
    if (failure) throw failure;
  };
  const cancel = reason => {
    if (hooks === null || current.phase === "idle") return false;
    apply(reduceGesture(current, { type: "cancel", reason })); return true;
  };
  const fail = error => {
    if (hooks === null || active === undefined) throw error;
    const token = active, pointers = current.pointers;
    current = idleGestureState(); active = undefined; hooks.blockClick(pointers[0].id);
    for (const pointer of pointers) { try { release(pointer.id); } catch { /* Preserve the original failure. */ } }
    try { hooks.error(token, error); } finally { throw error; }
  };
  const pointer = event => {
    const point = hooks.point(event);
    return point === null ? null : { pointerId: event.pointerId, point };
  };
  const down = event => {
    if (!valid() || (event.button !== undefined && event.button !== 0)) return;
    const input = pointer(event), pointerType = event.pointerType || "mouse";
    if (input === null) return;
    hooks.perform(() => {
      if (!valid() || current.phase !== "idle") return;
      const result = reduceGesture(current, { type: "down", ...input, pointerType, binding: hooks.binding ?? CLICK });
      const token = hooks.begin(input.point, pointerType);
      if (token === null) return;
      current = result.state; active = token;
      try { host.setPointerCapture(input.pointerId); }
      catch (error) {
        current = idleGestureState(); active = undefined;
        try { release(input.pointerId); } catch { /* Keep the original capture failure. */ }
        try { hooks.error(token, error); } catch { /* Capture failure remains the primary error. */ }
        throw error;
      }
      hooks.blockClick(undefined);
    });
  };
  const motion = (event, type) => {
    if (!valid() || current.phase === "idle") return;
    const input = pointer(event);
    hooks.perform(() => {
      if (!valid() || current.phase === "idle") return;
      if (input === null) { cancel("pointercancel"); return; }
      try {
        if (current.pointers.some(pointer => pointer.id === input.pointerId)) hooks.sample?.(active, input.point);
        const result = reduceGesture(current, { type, ...input });
        if (!hooks.drag && type === "move" && result.state.phase === "dragging") {
          current = result.state; cancel("movement");
        } else apply(result);
      } catch (error) { if (hooks.drag && active !== undefined) fail(error); throw error; }
    });
  };
  const abort = (reason, pointerId) => {
    if (!valid()) return;
    hooks.perform(() => {
      if (valid()) apply(reduceGesture(current, { type: "cancel", reason, ...(pointerId === undefined ? {} : { pointerId }) }));
    });
  };
  const add = (target, type, listener) => {
    listeners.push([target, type, listener]); target.addEventListener(type, listener, { passive: true });
  };
  const remove = () => {
    let failure;
    for (const [target, type, listener] of listeners) {
      try { target.removeEventListener(type, listener); } catch (error) { failure ??= error; }
    }
    listeners.length = 0;
    if (failure) throw failure;
  };
  try {
    add(host, "pointerdown", down);
    add(host, "pointermove", event => motion(event, "move"));
    add(host, "pointerup", event => motion(event, "up"));
    add(host, "pointercancel", event => abort("pointercancel", event.pointerId));
    add(host, "lostpointercapture", event => abort("lostcapture", event.pointerId));
    const window = host.ownerDocument?.defaultView;
    const keyboard = window && typeof window.addEventListener === "function" && typeof window.removeEventListener === "function" ? window : host;
    add(keyboard, "keydown", event => { if (event.key === "Escape") abort("Escape"); });
    add(keyboard, "blur", () => abort("blur"));
  } catch (error) {
    try { remove(); } finally { hooks = null; host = null; }
    throw error;
  }
  return Object.freeze({
    cancel, fail,
    dispose(reason = "unmount") {
      if (hooks === null) return;
      try { cancel(reason); } finally {
        try { remove(); } finally { hooks = null; host = null; active = undefined; current = reduceGesture(current, { type: "destroy" }).state; }
      }
    }
  });
}
