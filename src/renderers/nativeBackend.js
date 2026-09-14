export async function loadNativeBackend() {
  try {
    return await import("@napi-rs/canvas");
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND" && error.message.includes("@napi-rs/canvas")) {
      throw new Error("PNG/PDF output requires @napi-rs/canvas. Install it with: npm install ggaction @napi-rs/canvas", { cause: error });
    }
    throw error;
  }
}
