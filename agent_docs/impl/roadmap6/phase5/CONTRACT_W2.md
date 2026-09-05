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

B1 구현·검증은 [RESULTS_W2_CONTENT_CREATE.md](RESULTS_W2_CONTENT_CREATE.md)에 기록했다. [#90](https://github.com/ggaction/ggaction/issues/90)의 point omission inference는 [RESULTS_W2_INFERENCE.md](RESULTS_W2_INFERENCE.md)에서 수정·검증했다. B2 partial removal과 공통 재작성의 hidden title #91은 [RESULTS_W2_REMOVAL.md](RESULTS_W2_REMOVAL.md)에서 완료했다. Content 교체 편집과 companion style #92는 [RESULTS_W2_CONTENT_EDIT.md](RESULTS_W2_CONTENT_EDIT.md)에서 완료했다. Automatic recipe의 companion/data/scale replay와 #93은 [RESULTS_W2_RECIPE_REPLAY.md](RESULTS_W2_RECIPE_REPLAY.md)에서 수정·검증했다. C2는 미완료다.

B1은 [#88](https://github.com/ggaction/ggaction/issues/88)의 explicit selection부터 바로잡는다. 명시 channels는 생성할 설명의 정확한 집합이다. Point categorical+size는 `["color","shape","size"]`, `["color","size"]`, `["shape","size"]`로 분리 dispatch하며 size를 제외하면 companion/count를 자동 추가하지 않는다. Color-only는 다른 shape 인코딩의 존재와 무관한 swatch다. Omission의 기존 inferred point-series+size는 유지한다. Auto symbol은 inferredSymbol provenance를 저장하고 edit auto reset·encoding removal이 recipe를 재추론한다. Explicit recipe와 layer 순서는 보존한다. 이것은 B2 partial removal/target content edit 완료와 구분한다.

`removeLegend({target?,channels})`에서 categorical combined block의 일부 channel 제거를 atomic reauthor로 제공한다. Encodings/mark는 유지하고 남은 legend channels와 category-to-symbol mapping만 갱신한다. Empty remaining block은 제거한다. `editLegend({target?,channels})`는 같은 target의 명시적 supported channel selection으로 legend resource를 재작성하는 경로다. channels는 target 전체의 최종 content 집합이며 child selector가 아니다. 유지된 block의 layout/text/visibility/count를 보존한다. Categorical color↔series revision은 compatible recipe/order도 보존하며 incompatible explicit recipe는 오류다. 제외된 block과 그 설정은 제거하고 새 block은 creation defaults로 생성한다. 같은 호출의 patch는 최종 content에 적용한다. 이는 제거한 size 설정을 새 gradient에 임의로 이식하는 정책이 아니다. Full/Basic이 실제 지원하는 channel/kind 경계를 유지한다.

[#86](https://github.com/ggaction/ggaction/issues/86)의 shape-only + unrelated line crash는 [선행 수정·검증](RESULTS_W2_SHAPE.md)을 완료했다. 자동 symbol과 explicit layered symbol의 provenance를 구분하여 남은 channel을 설명하는 recipe를 유지한다. Data/scale palette를 legend 순서에 맞춰 재할당하지 않는다. Color/shape/dash 일부 제거, size block 유지, hidden/custom/auto title, multiple target, inverse authoring order를 검증한다.

## C — 명시적 layout과 family×edge 수렴

C1 categorical mode와 #87은 [구현·검증](RESULTS_W2_BOTTOM.md)했다. C2의 [item layout·interval 네 방향](RESULTS_W2_INTERVAL_EDGES.md)을 구현·검증했다. [세부 계약](CONTRACT_W2_ITEM_EDGES.md)을 적용했으며 나머지 family×edge 수렴과 collision/transition 통합은 남아 있다.

[#87](https://github.com/ggaction/ggaction/issues/87)처럼 style edit가 bottom mode를 바꾸면 안 된다. `layout: "edge" | "legacy-bottom"`를 createLegend/editLegend/editLegendLayout과 nested guides에 제공한다. Default는 edge이며 legacy-bottom은 categorical bottom의 기존 compact 모양을 명시적으로 선택하는 compatibility mode다. 기존 legacy 의도 examples/primitive/call chain은 명시 옵션을 사용하도록 migration한다. No-option edit는 stored mode를 보존하고 mode 전환은 explicit request다.

Categorical, gradient, opacity, standalone size, standalone stroke-width, interval, combined point-series+size를 top/bottom/left/right에서 지원한다. Shared content bounds → single block edge placement → multi-block lane이 geometry 책임을 나눈다. Text/recipe 검증은 content owner에 둔다. Side flow는 vertical, horizontal edge는 direction/columns 정책을 가진다. Side alignment·title position·kind-inapplicable options는 실제 meaningful support만 공개하고 matrix에 이유를 적는다. Gradient의 continuous strip과 sampled/interval/categorical item grid의 차이는 유지한다.

Same-edge multi-block ordering, border grouping, title/axis collision과 bounded overflow, fixed Canvas/no auto fitting 정책을 유지한다. No renderer legend branch를 추가하지 않는다. Four-edge primitive targets를 먼저 작성·render하고 public create/edit/replay 결과와 exact equality를 검증한다. Scale kind transition이 layout contract를 보존할 수 있는 경우만 자동 전환하며 incompatible custom recipe를 버리지 않는다.

## 통합 검증과 남은 상태

각 kind×edge×create/edit/remove/recreate/scale/Canvas/encoding replay를 literal geometry와 state로 검사한다. 대표 primitive/public pairs, same tarball Node/types/MCP/browser, generated API/type/card matrix와 real data recipes를 함께 검증한다. 일부 기능의 green tests를 전체 matrix 완료로 대체하지 않는다. D08 및 W2 완료는 A/B/C와 통합 증거 후 기록한다. W3–W5와 후속 Phase, 0.0.13 release는 별도로 남는다.

C2의 stroke-width 네 방향 생성·편집·재배치와 Canvas overflow #95 수정은 [RESULTS_W2_WIDTH_EDGES.md](RESULTS_W2_WIDTH_EDGES.md)에서 검증했다. Size/combined 및 전체 collision/transition matrix는 계속 미완료다.

Size standalone 네 방향과 독립 content owner, 큰 sample/label 간격 및 nested side border #96은 [RESULTS_W2_SIZE_EDGES.md](RESULTS_W2_SIZE_EDGES.md)에서 검증했다. Combined top/bottom group과 전체 collision/transition matrix는 계속 미완료다.

Combined horizontal group, 큰 label/title spacing과 생성 순서 #97은 [RESULTS_W2_COMBINED_EDGES.md](RESULTS_W2_COMBINED_EDGES.md)에서 검증했다. 전체 family collision/transition 통합과 W3–W5는 계속 미완료다.

Same-edge collision과 title-first placement #98/#99는 [RESULTS_W2_GUIDE_COLLISIONS.md](RESULTS_W2_GUIDE_COLLISIONS.md)에서 검증했다. Occupied alignment/transition matrix와 W3–W5는 남아 있다.

Compatible gradient↔interval 네 edge transition #100은 [RESULTS_W2_COLOR_TRANSITIONS.md](RESULTS_W2_COLOR_TRANSITIONS.md)에 기록한다. 최종 occupied alignment matrix와 W3–W5는 남아 있다.

Hidden categorical title 공간과 legacy visible-title 복원 #101은 [RESULTS_W2_HIDDEN_CATEGORICAL.md](RESULTS_W2_HIDDEN_CATEGORICAL.md)에 기록한다. 전체 occupied alignment 통합은 남아 있다.

Single horizontal occupied alignment/offset #102는 [RESULTS_W2_OCCUPIED_ALIGNMENT.md](RESULTS_W2_OCCUPIED_ALIGNMENT.md)에 기록한다. 큰 sample/font 내부 간격·side option과 전체 통합 matrix는 남아 있다.

Side alignment/title style/gradient title-position의 생성·편집 parity #103은 [RESULTS_W2_OPTION_PARITY.md](RESULTS_W2_OPTION_PARITY.md)에 기록한다. 큰 sample/font 내부 간격과 전체 통합 matrix는 남아 있다.

Opacity sample/stroke/font 간격과 mirrored side lane #104는 [RESULTS_W2_OPACITY_SPACING.md](RESULTS_W2_OPACITY_SPACING.md)에 기록한다. [C2 interval/width 실제 stroke spacing #105](RESULTS_W2_ITEM_STROKE_SPACING.md)를 수정·검증했다. [C2 categorical recipe/shape/font spacing #106](RESULTS_W2_CATEGORICAL_SPACING.md)을 수정·검증했다. [Opacity symbol TypeScript parity #107](RESULTS_W2_OPACITY_SYMBOL_TYPES.md)와 [categorical side option parity #108](RESULTS_W2_CATEGORICAL_SIDE_OPTIONS.md)를 수정·검증했다. Combined size default #109와 전체 통합은 남아 있다.
