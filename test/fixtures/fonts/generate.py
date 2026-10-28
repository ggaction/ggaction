"""Original geometric font fixture. Rebuild with fonttools==4.60.1."""
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

font = FontBuilder(1000, isTTF=True)
order = [".notdef", "space", "A", "B", "acutecomb"]
font.setupGlyphOrder(order)
font.setupCharacterMap({32: "space", 65: "A", 66: "B", 0x301: "acutecomb"})
widths = {".notdef": 500, "space": 250, "A": 600, "B": 800, "acutecomb": 0}
glyphs = {}
for name in order:
    pen = TTGlyphPen(None)
    if name != "space":
        x, y, width, height = (-200, 740, 100, 80) if name == "acutecomb" else (50, 0, widths[name] - 100, 700)
        pen.moveTo((x, y))
        pen.lineTo((x + width, y))
        pen.lineTo((x + width, y + height))
        pen.lineTo((x, y + height))
        pen.closePath()
    glyphs[name] = pen.glyph()
font.setupGlyf(glyphs)
font.setupHorizontalMetrics({name: (widths[name], -200 if name == "acutecomb" else 0 if name == "space" else 50) for name in order})
font.setupHorizontalHeader(ascent=850, descent=-150)
font.setupNameTable({
    "familyName": "ggaction Metric Fixture",
    "styleName": "Regular",
    "uniqueFontIdentifier": "ggaction-metric-fixture-1",
    "fullName": "ggaction Metric Fixture Regular",
    "psName": "ggactionMetricFixture-Regular",
    "version": "Version 1.0"
})
font.setupOS2(sTypoAscender=850, sTypoDescender=-150, usWinAscent=850, usWinDescent=150)
font.setupPost()
font.font["head"].created = font.font["head"].modified = 2082844800
font.font.recalcTimestamp = False
font.save(Path(__file__).with_name("metric-fixture.ttf"))
