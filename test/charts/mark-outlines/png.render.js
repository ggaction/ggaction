import { GlobalFonts } from "@napi-rs/canvas";
import { fileURLToPath } from "node:url";
import { after } from "node:test";
import { fontFamily } from "../../../examples/mark-outlines/data.js";
import { registerVisualVariantTests } from "../../support/visual-variants.js";
import { visualVariants } from "./manifest.js";
const font = GlobalFonts.registerFromPath(fileURLToPath(new URL("../../fixtures/fonts/metric-fixture.ttf", import.meta.url)), fontFamily);
after(() => GlobalFonts.remove(font));
registerVisualVariantTests(visualVariants);
