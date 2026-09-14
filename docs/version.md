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

## Paper compatibility

The [ggaction paper](https://www.hyeonjeon.com/assets/pdf/jeon27arxiv.pdf) explains
the grammar's design. Its examples, its fixed evaluation snapshot, and this
development contract have distinct provenance. The PDF inspected on September
14, 2026 has 21 pages and SHA-256
`081c873dab45b7855a87b57491533e2821c5918705ef0730f35ffb8d72303e53`.
Page numbers below count the first PDF page as page 1.

| Paper reference | Compatibility with current documentation |
| --- | --- |
| §3.2–3.4, pp.5–6: actions, program sequence, and progressive edits | [Actions and traces](./concepts/actions-and-trace.md) explains the model; the [hierarchical tutorial](./tutorials/hierarchical-authoring.md) demonstrates appending refinements to a high-level chart |
| §3.2, p.5: scatterplot, color, opacity, regression, guides | The current layout contract requires space for the legend. The [regression recipe](./recipes/regression-scatterplot.md) supplies explicit margins and data/rendering setup; the README's corresponding chain is checked with the repository's 406-row cars dataset |
| Figure 1, p.1: `editColorScale` | This method is available in the development contract and was added after the published v0.0.13 declarations; the paper's `...layout` is also a setup placeholder |
| §5.1, p.8: evaluation snapshot called v0.0.13 | The published comparison baseline is recorded above. The supplied paper does not pin the exact evaluation commit, so matching its version label alone does not establish that every paper figure uses that same release |
| Table 3, p.10: `removeMarks` spelling | No direct public action by that name exists in the checked release or current declaration. `removeMark` removes a layer, while `filterMarks` filters displayed items; substituting one name for the other does not establish an equivalent blank-data operation |
| Figure 3, p.7: internal legend components | The figure shows action decomposition, including [internal trace operations](./reference/runtime.md#internal-trace-operations); it is not a list of publicly callable methods |
| §8.2, p.18: `createLinearRegression` | This is a discussion example of a possible explicit name, not a current API. Use the documented `createRegression({ method: "linear" })` |

Current example source and runtime identities appear in the provenance table
above. Follow that example source revision when reproducing this site's charts.
These adaptations preserve the paper's authoring model without claiming an
exact reproduction of every paper figure or evaluation. The [research basis](./index.md#research-basis)
also distinguishes the paper's evidence from the separate MCP benchmark.
