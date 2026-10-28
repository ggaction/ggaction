# Fixed Korean and emoji font subsets

These are small, renamed subsets for the font preparation example, with the
original SIL Open Font License texts retained beside the binaries. They cover
the example's text only. They are not general purpose fallback fonts.

- Korean source: [Noto Sans KR Regular](https://github.com/notofonts/noto-cjk/blob/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Sans/SubsetOTF/KR/NotoSansKR-Regular.otf), revision `f8d157532fbfaeda587e826d4cd5b21a49186f7c`.
- Emoji source: [Noto Emoji variable](https://github.com/google/fonts/blob/9862abc066c9b83bf84c3e8ed1fc2d8d48f9bbf0/ofl/notoemoji/NotoEmoji%5Bwght%5D.ttf), revision `9862abc066c9b83bf84c3e8ed1fc2d8d48f9bbf0`, instantiated at weight 400.

`manifest.json` records both original and subset SHA256 values and literal
horizontal advances read from the font tables. These Korean syllables advance
920 units in a 1,000-unit em. The emoji fixture is monochrome and retains the required shaping
tables for joined emoji and the Danish flag.

To reproduce, save the two upstream binaries with the names in `subset.py`
under `.artifacts/font-public/upstream/`, then run:

```sh
uv run --with fonttools==4.60.1 python examples/font-assets/fonts/subset.py
```

The script verifies original hashes before subsetting, fixes timestamps and
renames the font families. FontTools is a fixture-generation dependency only.
