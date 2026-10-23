# Paper Nightingale rose sequence

`data.json` contains the 36 month/cause observations used in the paper teaser.
`program.js` retains each immutable revision while applying Canvas → data → rose
plot → radial values → cause color → sector spacing → title → Dark2 palette.

The paper's older `mapping: "direct"` call is expressed as `mapping: false` in the
current API, which clears the constructor's inherited count mapping before
encoding the source mortality values. The chart and margins are fitted to the
README frame; the action order, data, title, and final palette follow the teaser.

Run `npm run assets:readme` to regenerate the 960 × 540 GIF and PNG. The GIF has
eight stages over 15 seconds, with a longer final hold. Per-stage PNGs are written
to `.artifacts/docs/readme-rose/` for review. The generator uses the library's own
renderer, so the picture and displayed action sequence share one program source.
