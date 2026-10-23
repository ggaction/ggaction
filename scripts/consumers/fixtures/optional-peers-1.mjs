import assert from "node:assert/strict";
    import { chart } from "ggaction";
    import { getErrorDetails } from "ggaction/diagnostics";
    import { chart as basic } from "ggaction/basic";
    import { renderToSVG } from "ggaction/svg";
    import { renderToPNGBuffer } from "ggaction/png";
    import { renderToPDFBuffer } from "ggaction/pdf";
    for (const name of ["@napi-rs/canvas", "@modelcontextprotocol/sdk"]) {
      assert.throws(() => import.meta.resolve(name), { code: "ERR_MODULE_NOT_FOUND" });
    }
    const program = chart().createCanvas();
    try { program.createData({ values: [], unexpected: true }); } catch (error) {
      assert.equal(getErrorDetails(error).code, "invalid-option");
    }
    assert.match(renderToSVG(program), /<svg/);
    assert.match(renderToSVG(basic().createCanvas()), /<svg/);
    for (const render of [renderToPNGBuffer, renderToPDFBuffer]) {
      await assert.rejects(render(program), error => error.message.includes("npm install ggaction @napi-rs/canvas"));
    }
