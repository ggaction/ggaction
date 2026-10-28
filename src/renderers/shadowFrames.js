import { shadowBlurSupport } from "../grammar/shadow.js";
import { planShadowComposite } from "../grammar/shadowComposite.js";
import { normalizeMarkShadow } from "../grammar/markShadow.js";

// All inputs use root coordinates except the returned local raster origin. The
// inverse effect expansion retains source outside the clip that casts inside it.
export function planShadowFrame(bounds, frame, shadow, pixelRatio) {
  const style = normalizeMarkShadow(shadow);
  const { offset, clip } = frame;
  const padding = shadowBlurSupport(style.blurRadius, pixelRatio).padding / pixelRatio;
  const contribution = {
    left: Math.min(clip.left, clip.left - style.offsetX - padding),
    right: Math.max(clip.right, clip.right - style.offsetX + padding),
    top: Math.min(clip.top, clip.top - style.offsetY - padding),
    bottom: Math.max(clip.bottom, clip.bottom - style.offsetY + padding)
  };
  const left = Math.max(bounds.left + offset[0], contribution.left);
  const right = Math.min(bounds.right + offset[0], contribution.right);
  const top = Math.max(bounds.top + offset[1], contribution.top);
  const bottom = Math.min(bounds.bottom + offset[1], contribution.bottom);
  if (clip.right <= clip.left || clip.bottom <= clip.top || right <= left || bottom <= top) return undefined;
  // One coverage pixel beyond exact analytic ink bounds keeps raster edge samples.
  const x = Math.floor(left * pixelRatio) - 1, y = Math.floor(top * pixelRatio) - 1;
  const width = Math.ceil(right * pixelRatio) + 1 - x, height = Math.ceil(bottom * pixelRatio) + 1 - y;
  const composite = planShadowComposite({ width, height, pixelRatio, ...style });
  return Object.freeze({ left: x / pixelRatio - offset[0], top: y / pixelRatio - offset[1],
    width: width / pixelRatio, height: height / pixelRatio, pixelRatio, composite });
}
