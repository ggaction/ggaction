# P14-Exit — Basic Chart facade consistency closeout

## 상태

- Gate: `P14-Exit`
- 상태: `approved`
- 승인: 2026-07-21 사용자 승인
- Runtime checkpoint: `94befe8` (`align box plot facade behavior`)
- P14-B approval checkpoint: `450d269` (`approve basic chart facade gate b`)
- Closeout checkpoint: `b48e2cb` (`prepare basic chart facade exit gate`)
- Remote: `origin/main`
- 승인 전 차단: 없음; Phase 15는 별도 요청으로 개방

## 완료 범위

Roadmap 4가 소유한 여덟 chart-authoring facade를 하나의 Current product surface로 닫았다.

```text
createScatterPlot
createLinePlot
createBarPlot
createHistogram
createHeatmap
createGradientPlot
createBoxPlot
createParallelCoordinates
```

- Six aggregate create-only facades는 mark/encoding/scale/guide actions가 edit handoff를 소유한다.
- Gradient/Box mutable composites는 owner edit action을 유지한다.
- Box만의 historical opt-in guide lifecycle을 명시적으로 보존했다.
- 모든 facade는 runtime, strict declaration, root-importable public option type, Current contract와 canonical example을 가진다.
- Planned basic facade gap이나 duplicate Current owner는 남지 않았다.

## Public/package closeout

- `COMPOSITE_MARKS.md`가 Box data/target/guide inference와 ambiguity를 canonical하게 소유한다.
- `BoxPlotOptions`와 `guides?: false | CreateGuidesOptions`가 package declarations와 generated type reference에 있다.
- Box API, recipe, Supported Features, split action reference, search와 LLM bundle이 같은 opt-in guide 계약을 설명한다.
- Canonical Cars Box example과 displayed visual call chain이 facade-owned guides를 사용한다.
- Package artifact와 isolated Node/extension/PNG/TypeScript consumer가 통과했다.
- Documentation image manifest는 current runtime source hash로 재생성했다. Site deployment는 수행하지 않았다.

## 누적 검증 증거

- Normal suites: 1829/1829 pass
- Coverage: 94.64% lines, 89.96% branches, 98.72% functions; 68 critical floors pass
- Browser Canvas: 47/47 pass
- Full Node PNG/render: 124/124 pass
- Approved artifact gallery: 123 variants; active review gallery: 0 variants
- Documentation source: 35/35 pass
- Built docs: 110 pages; desktop search와 320px/390px/768px viewport pass
- Action catalog freshness and package artifact check: pass
- Isolated package consumer including TypeScript: pass
- Generated signatures/capabilities/action metadata/reference/page metadata/search/images/LLM: fresh
- `git diff --check`: pass

## 호환성 및 non-goals

- Existing Box omission result, canonical graphics와 pixels는 변경하지 않았다.
- No aggregate edit facade, new chart type, semantic schema or renderer branch was added.
- Package version/tag/npm publish/GitHub Pages deployment는 이 Phase 범위가 아니다.
- Phase 15 public docs/release-readiness 검증은 P14-Exit 승인 전 시작하지 않는다.

## 승인 요청 범위

1. P14-R1~R4와 8-facade lifecycle matrix를 Current로 확정
2. Box opt-in guide compatibility와 public documentation closeout 확정
3. Phase 14를 completed 처리하고 Phase 15 진입을 허용
