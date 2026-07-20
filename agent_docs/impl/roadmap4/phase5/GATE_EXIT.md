# Gate P5-Exit — Phase 5 cumulative closeout

## 상태

- Gate: `P5-Exit`
- 상태: `ready-for-review`
- 검토 대상 remote checkpoint: `5a31adc` (`origin/main`)
- 승인 전 차단: Phase 6 linear-gradient 구현

## 승인 대상

Phase 5의 Window, rectangular 2D-bin과 binned heatmap vertical slice가 임시 Gate 자산이 아니라 현재
architecture의 정식 capability로 닫혔는지를 검토한다.

- `createWindowData`는 partition-local stable ordering, sequential operation과 source-order output을 immutable
  named dataset으로 저장한다.
- `createBin2DData`는 requested/resolved grid provenance, deterministic edge membership, revision/rebind/release와
  facet child replay를 canonical derived-data lifecycle에 연결한다.
- `createHeatmap({ bin })`은 위 data action을 wrapped child로 호출하고 ranged rect/count color/guides를 명시적으로
  materialize한다. 기존 pre-gridded mode는 유지된다.
- Browser와 PNG renderer는 Window 또는 bin 계산을 하지 않고 완성된 `graphicSpec`만 소비한다.

## Lifecycle와 architecture evidence

- Filtered source를 explicit하게 사용하는 2D-bin과 source replacement limitation을 검증한다.
- 동일 logical 2D-bin owner의 immutable revision, direct layer rebind, orphan revision release와 earlier-program
  보존을 검증한다.
- Facet child는 whole-source cell을 필터하지 않고 child-local source에서 automatic extent를 다시 resolve하며,
  generated dataset과 layer reference가 child-local identity를 사용한다.
- Window는 source partition 뒤 canonical materializer를 replay하며 output source order를 보존한다.
- Runtime registrar, strict declarations, package root, transform registry, Current action inventory와 public docs가
  같은 현재 vocabulary를 사용한다.
- `SECOND_ARCHITECTURE.md`에 Window, 2D-bin revision/facet replay와 두 complete vertical slice를 기록했다.

## Stable vertical slices

Active Gate 슬라이스를 다음 정식 owner로 분리했다.

- `test/charts/cars-window-rank-scatterplot/`
- `test/charts/cars-binned-heatmap/`
- `examples/cars-window-rank-scatterplot/`
- `examples/cars-binned-heatmap/`

각 차트는 canonical public program, independent primitive baseline, numeric reference test, exact semantic/graphic/
renderer parity, Node PNG와 public Browser Canvas lifecycle을 가진다. `test/gates/`에는 executable slice가 없고
active-review gallery도 0개다.

## 누적 검증 증거

- Full normal suite: `1647/1647` pass.
- Browser Canvas와 packed-browser consumer: `33/33` pass.
- Node PNG render suite: `116/116` pass.
- Approved artifact gallery: `115` variants verified.
- Active-review artifact gallery: `0` variants verified.
- Coverage: lines `94.74%`, branches `90.05%`, functions `98.6%`; critical floors `55/55` pass.
- Documentation source/generator suite: `32/32` pass.
- Generated signatures, capability matrix, action metadata/reference, page metadata, search, images와 LLM docs: refreshed.
- Package artifact: `ggaction@0.0.4`, `337` entries, packed `298982` bytes, unpacked `1395276` bytes.
- Installed-package Node/extension/PNG/TypeScript/tutorial/private-export consumer: pass.
- Package SHA-256: `292987faced700e137389b4b3b8ef38968644a528e16642ab528611b50e2f6f6`.

현재 workstation의 full Jekyll verification은 source failure가 아니라 documentation preflight에서 차단됐다.
설치된 Ruby는 `2.6.10`이고 locked GitHub Pages bundle은 Ruby `3.2+`를 요구한다. Markdown, generated docs와
docs contract suite는 모두 통과했으며, built-site 검증은 compatible Ruby environment 또는 CI evidence로
확인해야 한다.

## Visual evidence

### Binned heatmap

- Logical/physical size: `700×500` / `1400×1000`
- Cells: `80`; eligible/count sum: `398/398`
- Primitive/public PNG exact SHA-256:
  `a2f7a9c223296044e6882e53bbeea93cc4568f1195119e315f4fc2f25be4b81c`
- Stable artifacts:
  `.artifacts/test/png/charts/rect-heatmap/cars-binned-heatmap/weight-mpg-counts/`

### Window-rank scatterplot

- Logical/physical size: `760×500` / `1520×1000`
- Materialized points: `47`
- Primitive/public PNG exact SHA-256:
  `dd5358e8a386222489decd5276eec532cd1d74850b2588971f87dc06a378453a`
- Stable artifacts:
  `.artifacts/test/png/charts/window-data/cars-window-rank-scatterplot/top-horsepower-by-origin/`

## 승인 후 작업

P5-Exit가 승인되면 Roadmap 4 Phase 5를 `completed`로 닫고 Phase 6 NCP-002 linear-gradient fill 계획을
구체화할 수 있다. 승인 전에는 Phase 6 production source를 변경하지 않는다.
