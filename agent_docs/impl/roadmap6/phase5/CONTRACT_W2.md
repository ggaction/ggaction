# Phase 5 W2 — Legend content와 edge layout 계약

[전체 실행 승인](../APPROVAL.md)을 적용한다. 기준 `4d7e37d4`, W1은 완료했다. 각 변경을 구현·검증·commit/push한 뒤 다음 변경으로 간다. 아래 범위 전체가 W2이며 A만 구현한 상태를 W2 완료로 기록하지 않는다.

## A — Standalone sampled size 편집 복구

구현·검증 완료: [RESULTS_W2_SIZE.md](RESULTS_W2_SIZE.md).

[#85](https://github.com/ggaction/ggaction/issues/85)를 재현했다. 기존 generic/focused editor는 size config를 continuous editor에 넘겨 undefined 예외를 낸다.

`editLegend({target?,count?,title?,labels?,titleStyle?})`를 standalone size에 연결한다. Title은 custom/auto/false, omission은 보존이며 숨긴 제목은 편집으로 복원한다. Label/title partial style은 저장·병합하고 scale/Canvas/data replay에서도 유지한다. Count는 2..10,000, equal-area radius는 기존 scale mapper, 표시는 기존 continuous formatter를 유지한다.

기존 right geometry·default count5·size label font12/normal·title font13/600·symbol fill/opacity는 보존한다. Label offset의 기본값은 symbol center에서 28 logical px이며 기존 x=origin+44와 같다. Offset은 generic labels object로 편집할 수 있다. Title은 plot top+78, sample은 titleY+34+index*40이다. Actual four-edge placement는 C에서 변경한다.

기존 stroke-width와 같은 sampled content editor가 count/title/style 검증과 semantic/config/title graphic lifecycle을 소유한다. 각 family materializer는 자신의 radius/line width와 geometry를 소유한다. Size의 appearance inheritance는 같은 target의 categorical block에만 적용한다. 독립 target의 categorical block이 size 내용·배치를 결정해서는 안 된다. Generic/focused text·count는 허용하며 아직 지원하지 않는 layout/symbol/border/gradient/order는 구체적 오류로 거절한다.

기존 create count3 결과에 low-level title/label style을 적용한 primitive를 먼저 만들고 편집 결과와 graphic/renderer/pixels를 대조한다. 기존 combined defaults는 회귀 검사한다. 새 public entry는 없고 현재 editor 계약·docs/cards·package/browser evidence를 갱신한다.

## B — Content selection과 재작성

`removeLegend({target?,channels})`에서 categorical combined block의 일부 channel 제거를 atomic reauthor로 제공한다. Encodings/mark는 유지하고 남은 legend channels와 category-to-symbol mapping만 갱신한다. Empty remaining block은 제거한다. `editLegend({target?,channels})`는 같은 target의 명시적 supported channel selection으로 legend resource를 재작성하는 경로다. 기존 layout/text/visibility/compatible recipe/order를 보존하며 다른 kind로 바뀌어 해석할 수 없는 explicit settings는 오류로 알린다. Full/Basic이 실제 지원하는 channel/kind 경계를 유지한다.

[#86](https://github.com/ggaction/ggaction/issues/86)의 shape-only + unrelated line crash도 이 재작성 경로에서 제거한다. 자동 symbol과 explicit layered symbol의 provenance를 구분하여 남은 channel을 설명하는 recipe를 유지한다. Data/scale palette를 legend 순서에 맞춰 재할당하지 않는다. Color/shape/dash 일부 제거, size block 유지, hidden/custom/auto title, multiple target, inverse authoring order를 검증한다.

## C — 명시적 layout과 family×edge 수렴

[#87](https://github.com/ggaction/ggaction/issues/87)처럼 style edit가 bottom mode를 바꾸면 안 된다. `layout: "edge" | "legacy-bottom"`를 createLegend/editLegend/editLegendLayout과 nested guides에 제공한다. Default는 edge이며 legacy-bottom은 categorical bottom의 기존 compact 모양을 명시적으로 선택하는 compatibility mode다. 기존 legacy 의도 examples/primitive/call chain은 명시 옵션을 사용하도록 migration한다. No-option edit는 stored mode를 보존하고 mode 전환은 explicit request다.

Categorical, gradient, opacity, standalone size, standalone stroke-width, interval, combined point-series+size를 top/bottom/left/right에서 지원한다. Shared content bounds → single block edge placement → multi-block lane이 geometry 책임을 나눈다. Text/recipe 검증은 content owner에 둔다. Side flow는 vertical, horizontal edge는 direction/columns 정책을 가진다. Side alignment·title position·kind-inapplicable options는 실제 meaningful support만 공개하고 matrix에 이유를 적는다. Gradient의 continuous strip과 sampled/interval/categorical item grid의 차이는 유지한다.

Same-edge multi-block ordering, border grouping, title/axis collision과 bounded overflow, fixed Canvas/no auto fitting 정책을 유지한다. No renderer legend branch를 추가하지 않는다. Four-edge primitive targets를 먼저 작성·render하고 public create/edit/replay 결과와 exact equality를 검증한다. Scale kind transition이 layout contract를 보존할 수 있는 경우만 자동 전환하며 incompatible custom recipe를 버리지 않는다.

## 통합 검증과 남은 상태

각 kind×edge×create/edit/remove/recreate/scale/Canvas/encoding replay를 literal geometry와 state로 검사한다. 대표 primitive/public pairs, same tarball Node/types/MCP/browser, generated API/type/card matrix와 real data recipes를 함께 검증한다. 일부 기능의 green tests를 전체 matrix 완료로 대체하지 않는다. D08 및 W2 완료는 A/B/C와 통합 증거 후 기록한다. W3–W5와 후속 Phase, 0.0.13 release는 별도로 남는다.
