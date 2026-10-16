# Plot-anchored shared facet legends

## Scope

This repairs the existing outside shared-legend placement contract. It adds no public option or persisted state. Explicit child Canvas dimensions and margins remain intact. Promoted guide bounds use the translated plot union and the existing recipe offset; omitted offsets clear the actual retained axis/header lane. Explicit offsets remain fixed and reject real text collisions. The inferred parent Canvas contains both child snapshots and the concrete legend, translating the complete child placement for additional left/top space. Side legends retain complete-bound top alignment. Free/in-plot grouped guides keep their existing owner. Legacy inferred categorical appearance and spacing remain unchanged.

The existing explicit facet materializer invokes one private placement owner. The header materializer and the placement owner share the same pure resolved header-item geometry. No renderer, semantic state owner or public interface changes.

## Evidence

- Unit suite: **3,080 passed**.
- Contract suite: **533 passed**.
- Documentation suite: **120 passed**.
- Four focused placement cases cover categorical/gradient/size/opacity at all four edges, preserved child dimensions, occupied axis/header lanes, grouped blocks, free/corner group anchors, persistence and layout/scale/guide/title replay, and atomic explicit-collision rejection.
- The affected repeated-chart primitive/render checks both pass. Its canonical parent width is 688 instead of 838, with the corrected occupied legend placement; child panels are unchanged.
- Eight independent whole-graphic/semantic compatibility canaries match the unchanged baseline exactly: six standalone guide families/placements, the legacy inferred facet legend, and a facet with local guides.
- A four-panel, eight-row real-source canary keeps every bar coordinate, fill, raw row and 100x300 inner plot. Its occupied right legend gap changes from 128 to exactly 8; the complete legend top equals the plot-union top. Four explicit 240x340 child Canvases are preserved. The inferred parent width changes from 756 to 606. Global source-header/title fidelity remains a separate pipeline review; this library canary does not admit a translation.
- Installed package consumers pass, including a new public facet test for exact plot anchoring, retained child margins and persistence. No chart pixels were inspected.

## Footprint

The canonical package measures **567 entries / 795,791 packed bytes / 3,904,102 unpacked bytes**. One private placement owner is included in the existing package JavaScript compaction policy. Measured ceilings become 567 / 796,000 / 3,905,000. Installed browser gzip measures **391,525 Full / 189,258 Basic / 7,176 SVG** bytes, so only the Full ceiling increases to 392,000; Basic190,000 and SVG25,000 stay unchanged. These are measured growth adjustments, not claims that earlier ceilings passed.

This branch is an isolated development checkpoint. Active translation runtime integration, documentation deployment and package publication are separate operations.
