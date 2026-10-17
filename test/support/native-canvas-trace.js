import { createHash } from "node:crypto";
import { createCanvas } from "@napi-rs/canvas";
import { render } from "../../src/index.js";

// Real surfaces are required for isolated glyph painting. Keep the lightweight
// mock unchanged so unsupported-context rejection tests remain meaningful.
export function renderWithNativeTrace(program, { width, height }) {
  const canvas = createCanvas(width, height), context = canvas.getContext("2d"), calls = [];
  const recorded = new Proxy(context, {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      if (typeof value !== "function") return value;
      return (...args) => {
        calls.push({ op: key, args: args.map(argument => typeof argument?.getContext === "function" ? {
          width: argument.width, height: argument.height,
          rgba: createHash("sha256").update(argument.getContext("2d")
            .getImageData(0, 0, argument.width, argument.height).data).digest("hex")
        } : argument) });
        return value.apply(target, args);
      };
    },
    set(target, key, value) {
      calls.push({ op: "set", key, value });
      return Reflect.set(target, key, value, target);
    }
  });
  render(program, recorded);
  return { calls, rgba: context.getImageData(0, 0, width, height).data };
}
