export function assetError(code, message, cause, kind = "Image") {
  const error = new Error(message, cause === undefined ? undefined : { cause });
  error.name = code === "aborted" ? "AbortError" : `${kind}AssetError`;
  Object.defineProperty(error, "assetCode", { value: code, enumerable: true });
  return error;
}

function aborted(signal) {
  if (signal === undefined) return false;
  return Object.getOwnPropertyDescriptor(AbortSignal.prototype, "aborted").get.call(signal);
}

export function assertAssetActive(signal, kind = "Image") {
  if (aborted(signal)) throw assetError("aborted", `${kind} preparation was aborted.`, undefined, kind);
}

function isSecurityError(error) {
  if (error === null || (typeof error !== "object" && typeof error !== "function")) return false;
  try {
    const name = Object.getOwnPropertyDescriptor(error, "name");
    if (name) return "value" in name && name.value === "SecurityError";
    return Object.getOwnPropertyDescriptor(DOMException.prototype, "name").get.call(error) === "SecurityError";
  } catch { return false; }
}

// Race each host stage and remove its listener on success, failure, or abort.
export function assetHostStage(callback, request, signal, code, kind = "Image") {
  assertAssetActive(signal, kind);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (action, value) => {
      if (settled) return;
      settled = true;
      if (signal) EventTarget.prototype.removeEventListener.call(signal, "abort", onAbort);
      action(value);
    };
    const onAbort = () => finish(reject, assetError("aborted", `${kind} preparation was aborted.`, undefined, kind));
    if (signal) EventTarget.prototype.addEventListener.call(signal, "abort", onAbort, { once: true });
    Promise.resolve().then(() => {
      assertAssetActive(signal, kind);
      return callback(request);
    }).then(value => {
      if (aborted(signal)) onAbort(); else finish(resolve, value);
    }, error => {
      if (aborted(signal)) onAbort();
      else finish(reject, assetError(isSecurityError(error) ? "cors" : code, `${kind} ${code} failed.`, error, kind));
    });
  });
}


