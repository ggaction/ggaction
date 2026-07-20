# Step 5 — Inference, lifecycle와 consumer matrix

## 진행 상태

- [x] direct x/y, target inference와 ambiguity error
- [x] create-before-encode와 encode-before-create convergence
- [x] vertical/horizontal orientation과 scale edit rematerialization
- [x] Canvas/data/profile edit order convergence
- [x] selection/highlight final category-strip grain
- [x] highlight opacity/offset baseline-paint preservation과 explicit fill replacement
- [x] text/guide applicability와 drawing order
- [x] facet child-local profile replay와 generated identity
- [x] previous program, caller rows/options와 sibling immutability

GradientPlot을 단일 예제 shortcut으로 두지 않고 categorical uncertainty family의 첫 reusable consumer로 완결한다.

## Consumer matrix

| Consumer/change | Required behavior |
| --- | --- |
| `encodeX`/`encodeY` | categorical/quantitative role을 순서와 무관하게 완성; ambiguity는 error |
| `editScale` | body bounds, sample offsets, paint endpoints, center와 guide를 deterministic rematerialize |
| `editCanvas` | plot bounds 기반 strip/paint/guide/title를 stale graphic 없이 갱신 |
| source/filter/profile edit | raw source에서 새 revision을 만들고 category item 수/order를 다시 계산 |
| selection/highlight | category strip grain; baseline paint 보존과 exact restore |
| text attachment | structured fill의 renderer-side contrast 추론 금지; documented fallback 사용 |
| axes/grid/legend | resolved position/value/intensity scale owner와 draw order를 보존 |
| facet | cell-local profile revision/identity를 보존하고 shared guide policy를 따름 |

## 완료 조건

- Explicit target → current eligible target → unique eligible target 외 임의 선택이 없음
- Vertical/horizontal, normal/reversed scale와 create/encode order 조합이 같은 final contract로 수렴
- Inapplicable consumer는 누락하지 않고 명시적 validation 또는 documented non-goal로 고정
