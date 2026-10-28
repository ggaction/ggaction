# Fixed font identity fixture

This original geometric test font is covered by the repository's MIT license.
It contains space, A, B and a combining acute accent; its rectangles are numeric
fixtures, not a typography demonstration or a general purpose font.

The font has 1,000 units per em. A advances 600 units, B advances 800, space 250
and the combining accent 0. At 20px, AB must measure 28px. These literal values
come from the fixture's declared metrics, independently of the rendering host.

Regenerate with:

```sh
uv run --with fonttools==4.60.1 python test/fixtures/fonts/generate.py
```

The generator fixes timestamps so the binary and its SHA256 are reproducible.
FontTools is used only to regenerate this checked-in test asset. Library and test
execution do not depend on Python or FontTools.
The generator follows the [FontBuilder API](https://github.com/fonttools/fonttools/blob/main/Lib/fontTools/fontBuilder.py).
