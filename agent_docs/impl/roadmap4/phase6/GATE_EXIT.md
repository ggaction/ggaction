# Gate P6-Exit — Phase 6 cumulative closeout

## 상태

- Gate: `P6-Exit`
- 상태: `ready-for-review`
- 검토 대상 remote checkpoint: `bcd922c` (`origin/main`)
- 승인 전 차단: Phase 7 ordered-path 구현

## 승인 대상

Phase 6의 backend-neutral `FillPaint` structured variant와 categorical GradientPlot이 임시 Gate 자산이 아니라
현재 architecture의 정식 vertical slice로 닫혔는지를 검토한다.

- `FillPaint = string | LinearGradientPaint`는 normalized item-local endpoints와 ordered concrete stops를 가진다.
- renderer는 backend gradient object를 program state에 저장하지 않고 완성된 `graphicSpec` paint만 변환한다.
- `createGradientPlot`은 BoxPlot과 같은 categorical/quantitative x/y family를 사용하고 category별 하나의 sampled
  profile strip과 optional center rule을 명시적으로 materialize한다.
- `editGradientPlot`은 appearance-only edit에는 profile revision을 유지하고 density/center statistic edit에는 raw
  source에서 새 immutable revision을 만든다.
- explicit target, current eligible target, unique eligible target 외에는 임의 resource를 선택하지 않는다.

## Lifecycle와 consumer evidence

- create-before-encode와 encode-before-create가 같은 최종 state로 수렴한다.
- Vertical/horizontal orientation, reversed scale, Canvas resize와 source/profile edit가 body, paint, center와 guide를
  stale graphic 없이 rematerialize한다.
- selection/highlight는 category strip grain을 사용한다. Opacity/offset은 structured baseline fill을 보존하고 explicit
  fill만 paint를 교체한다.
- Text attachment는 structured paint를 renderer-side contrast 계산에 사용하지 않고 명시적 또는 documented fallback
  color를 사용한다.
- Cartesian facet은 cell-local source에서 profile revision을 replay하고 child-local generated identity를 유지한다.
- Composite body에 대한 partial `filterMarks`는 silent partial update 대신 source-first `filterData` guidance error를 낸다.
- Earlier program, caller-owned rows/options와 sibling facet state의 immutability를 회귀 테스트로 고정했다.

## Stable vertical slice와 public surface

- Stable chart tests: `test/charts/cars-gradient-plot/`
- Runnable public example: `examples/cars-gradient-plot/`
- Public wiki: `docs/api/gradient-plots.md`
- Current contract: `agent_docs/contract/current/GRADIENT_PLOTS.md`
- Runtime registrar, strict declarations, root/extension package types, current/internal action inventory와 generated public
  reference가 같은 vocabulary를 사용한다.
- Active Gate Browser files는 제거했고 approved chart gallery로 승격했다. Active review gallery는 0개다.

## 누적 검증 증거

- Full normal suite: `1690/1690` pass.
- Contract suite: `122/122` pass.
- Browser Canvas와 packed-browser consumer: `34/34` pass.
- Node PNG render suite: `118/118` pass.
- Approved artifact gallery: `117` variants verified.
- Active-review artifact gallery: `0` variants verified.
- Coverage: lines `94.63%`, branches `89.94%`, functions `98.61%`; critical floors `56/56` pass.
- Documentation source/generator suite: `32/32` pass.
- Package artifact: `ggaction@0.0.4`, `350` entries, packed `310503` bytes, unpacked `1456597` bytes.
- Installed-package Node/extension/PNG/TypeScript/tutorial/private-export consumer: pass.
- Package SHA-256: `a17cb0ad393c923af035dabb474adceb95078fec79fa54458ebcca80cef127d2`.

현재 workstation의 full Jekyll verification은 source failure가 아니라 documentation preflight에서 차단됐다.
설치된 Ruby는 `2.6.10`이고 locked GitHub Pages bundle은 Ruby `3.2+`를 요구한다. Markdown, generated docs와 docs
contract suite는 모두 통과했으며 built-site 검증은 compatible Ruby environment 또는 CI evidence로 확인해야 한다.

## Visual evidence

- Logical/physical size: `620×460` / `1240×920`
- Categories/profile strips: `3`; samples per strip: `64`
- Independent primitive SHA-256:
  `f8a71f3217de314c6be66a5160f74062f4f891333af230db82c98a20e0a440d6`
- Expanded/public exact PNG SHA-256:
  `7a1bb40b471b4a5c8048d97f1c7f1e8f78028dfd9f9bd471e5982515ce64f885`
- Stable artifacts:
  `.artifacts/test/png/charts/chart-variants/cars-gradient-plot/`

## 호환성과 승인 후 작업

- 기존 string fill, mark/guide hierarchy와 renderer 동작은 유지된다.
- Structured fill과 `createGradientPlot`/`editGradientPlot`은 additive다.
- Shared facet density legend, subgroup offset, multiple profile overlay와 per-category intensity domain은 명시적
  limitation으로 남는다.

P6-Exit가 승인되면 Phase 6를 `completed`로 닫고 Roadmap 4 Phase 7 `encodePathOrder` 계획을 구체화할 수 있다.
승인 전에는 Phase 7 production source를 변경하지 않는다.
