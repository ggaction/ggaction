# Curated data gallery

This development gallery renders twenty-two real-data charts, including fourteen new native chart types with the public chart actions, and copies existing feature previews into a self-contained static directory. It adds no library API or package export. CSV loading reuses the hash-verified full-source corpus loader; it does not use the smaller test samples.

```sh
npm run datasets:sync
node scripts/build-data-gallery.js .artifacts/chart-gallery
node scripts/serve-data-gallery.js .artifacts/chart-gallery 8770
```

`GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT` may select an existing verified cache. New native types appear first in their own tab. An optional `--pyramid /absolute/path/to/preview.png` includes an explicitly supplied work-in-progress image. It is labelled separately from main features.

The output contains only HTML, a provenance manifest and selected images. The loopback server serves only manifest-listed assets and the two entry files, accepts GET/HEAD, and handles concurrent image requests. Serve this directory rather than the repository root. All links and assets are relative so the gallery works under a Tailscale Serve path. Configure a new unused path while preserving existing Serve routes; no public Funnel is needed.

Real-data cards document source counts, selection and missing-value rules, original units, source hashes, and upstream links where recorded. Repository JSON snapshots use the exact local byte hash. PNG is rendered through Canvas at density 2 and SVG through the SVG renderer. Search and category controls filter gallery cards; they do not alter chart data.

Validate a build by checking all asset hashes and image loads, both image modes, dialog close/ESC, search/category controls, and overflow at narrow and wide widths. The gallery is a preview of pinned datasets, not a live feed or a package release.

Pinned daily IBM OHLCV, USGS event coordinates and Natural Earth land outlines live in `data/`, with upstream URLs and exact raw byte hashes in `data/manifest.json`. The build verifies those hashes before using any snapshot. Other charts reuse the full corpus snapshots. These are observed source data; all aggregations, width transforms, selected cohorts and missing-value rules are stated on each card.
