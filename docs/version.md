---
layout: default
title: Documentation Version
---

# Documentation Version

The current site describes a **{{ site.data.provenance.status }}** contract.
The package metadata still says **{{ site.version }}**; that number alone does not
mean every documented action is available in the published npm artifact.

| Identity | Value |
| --- | --- |
| Contract fingerprint | `{{ site.data.provenance.contractId }}` |
| Example and dataset source | `{{ site.data.provenance.exampleSourceRef }}` |
| Runtime source commit | `{{ site.data.provenance.sourceCommit }}` |
| Published comparison baseline | `{{ site.data.provenance.baseline.tag }}` |
| Declared actions here | {{ site.data.provenance.actionCount }} |
| Declared actions in that release | {{ site.data.provenance.baseline.actionCount }} |

## Choose the matching documentation

- Read [the v0.0.13 release documentation at its immutable commit](https://github.com/ggaction/ggaction/tree/6115fdd286303fc77e60a92fa3baf634cb282b8c/docs) when using that installed release.
- Use this site's action entries for the development contract shown above. Entries
  distinguish actions available by v0.0.13 from actions added after it.
- Review the [changelog](https://github.com/ggaction/ggaction/blob/main/CHANGELOG.md)
  and [migration notes](#migration-from-v0013) before depending on development behavior.

The machine-readable [provenance manifest](./doc-provenance.json) records the same
contract fingerprint, runtime source revision, baseline, and action availability.
The full LLM bundle and its section manifest carry that identity too. The fingerprint
covers runtime code, declarations, and public package configuration; documentation
edits alone do not change the chart API fingerprint.

## Migration from v0.0.13 {#migration-from-v0013}

Check your installed declarations before using `encodeChannels`, focused derived-data
editors, normalization/completion/imputation, selected-label editors, or the new guide
component editors. A method absent from your installed release will not become
available by copying a newer example.

Source datasets remain immutable. Transform edits require a stable owner target and
reject unchanged requests. Downstream transforms reject edits by default; explicitly
request `dependents:"recompute"` to rebuild them. Creating replacement source rows
uses a new dataset, followed by a supported owner edit or independent mark rebind.

Display label maps retain raw category identity. Numeric or temporal formatter tokens
must match the scale field type. Explicit label text does not rename categories for
selection, grouping, or scale-domain lookup.

Field-driven stroke has its own scale and legend, independent from fill/color. Point
size ranges express **area**, and switching to a discrete size family requires the
new domain and nondecreasing area range. `encodeColor({ value })` is not a constant
fill assignment; use the mark's style editor or the supported stroke/opacity channel
forms described in their references.
