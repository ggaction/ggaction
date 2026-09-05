# Planned complete chart facades

상태: **Planned / accepted / NOT IMPLEMENTED**. 2026-09-05 사용자의 “승인한다”는
[고정된 Phase 3 A 계약](https://github.com/ggaction/ggaction/blob/bd18718a9c1aed5f91b485bc1aeab54616e9e5a3/agent_docs/impl/roadmap6/phase3/CONTRACT_REVIEW.md)의
P3-C01–C07 승인이다. 승인 기준 HEAD는 `0f3531ae9c242190df9457b1ed4289491963ba77`이다.
이 파일은 남은 두 신규 direct action의 활성 Planned owner다. 정확한 승인 signature·기본값·오류·하위 chain·
stored-result·migration·consumer matrix는 아래의 고정 chart 계약을 함께 적용한다.

세 facade는 full `ggaction` 전용이며 Basic에는 추가하지 않는다. 아래 두 action은 public runtime/declaration에 없으며,
승인된 primitive 시각 목표에 맞춰 public flow를 구현한다. 현재 guide/math/mark/renderer owner를 재사용하며
새 mark family·통계 default·semantic cache·renderer branch를 만들지 않는다.

Pie/Donut은 [Current owner](../current/COMPLETE_CHARTS.md#createpieplot)로 구현·검증과 함께 이관했다.

## `createDensityPlot`

승인 계약: [Density](https://github.com/ggaction/ggaction/blob/bd18718a9c1aed5f91b485bc1aeab54616e9e5a3/agent_docs/impl/roadmap6/chart/density.md).

`createDensityPlot({ id?, data?, coordinate?, field, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?,
as?, densityChannel?, valueScale?, densityScale?, color?, area?, guides? })`.
Lifecycle은 Aggregate create-only이며 default id는 `densityPlot`이다.

- Baseline placement만 지원한다. Density channel y는 x=value/y=density, x는 x=density/y=value다.
  Violin category placement·stack/center·tuple group·generic x/y는 이 facade에 포함하지 않는다.
- GroupBy 생략/false는 ungrouped, string은 explicit group. Color는 자동 추론하지 않으며 지정 시 retained group field와 같아야 한다.
  Raw metadata는 derived dataset에 자동 복사·join하지 않는다.
- Existing KDE bandwidth/extent auto, steps 100, gaussian, unit normalization과 finite-row filtering을 유지한다.
  유효 표본이 없거나 auto bandwidth를 정할 수 없으면 오류다. Singleton은 explicit bandwidth+extent로 작성한다.
- Value/density scale과 zero baseline은 기존 owner가 검증한다. Area opacity 기본 .2와 scalar/field fill 충돌을 유지한다.
- `createAreaMark → encodeDensity → encodeColor? → existing guide fulfillment` 계층이다.
  EncodeDensity가 derived data와 positions/group을 소유한다.
- Semantic은 source→density snapshot provenance와 ordinary area encodings다. Graphic은 closed paths와 applicable guides다.
- Statistics revision은 `editDensity`, appearance는 `editAreaMark`, 나머지는 scale/guide owner가 담당한다.
  새로운 densityChannel edit·metadata color·generic bind/filter lifecycle은 승인 범위 밖이다.

## `createHorizonPlot`

승인 계약: [Horizon](https://github.com/ggaction/ggaction/blob/bd18718a9c1aed5f91b485bc1aeab54616e9e5a3/agent_docs/impl/roadmap6/chart/horizon.md).

`createHorizonPlot({ id?, data?, coordinate?, x, y, groupBy?, bands?, baseline?, extent?, resolve?, missing?,
overflow?, palette?, area?, guides? })`. Lifecycle은 Aggregate create-only이며 default id는 `horizonPlot`이다.

- X/y는 필수다. Existing HorizonXEncoding의 temporalUnit과 HorizonYEncoding의 folded [0,1] scale 의미를 유지한다.
- 기존 bands 3, baseline 0, extent auto, shared resolution, missing break, overflow clip, sign별 palette를 유지한다.
- GroupBy는 string/false이며 새 mark의 생략은 ungrouped다. 여러 group은 하나의 coordinate에 overlay한다.
- Explicit coordinate는 `createCoordinate` child로 연결한다. `encodeHorizon`에 새 coordinate 옵션을 추가하지 않는다.
- Internal color는 palette가 소유한다. Area fill/generic color는 facade 옵션에 없다.
  Explicit opacity는 encoding의 opaque default 뒤 `editAreaMark` child로 적용한다.
- `createAreaMark → createCoordinate? → encodeHorizon → editAreaMark? → existing x guide fulfillment` 계층이다.
- H0 guide는 원본 x axis/vertical grid만. Folded y/horizontal grid/internal legend의 false 외 요청은 거부한다.
  Existing lower action으로 명시적으로 그 guide를 작성하는 경로는 변경하지 않는다.
- All-baseline은 x domain과 extent 0 provenance를 가진 정당한 empty collection이다.
- Semantic은 원본 field/unit·signed folding provenance와 ordinary area encodings다. Renderer는 concrete paths만 읽는다.
- `editHorizon` revision과 `editAreaMark`·x scale/guide editor를 사용한다. 새 amplitude guide·small multiples는 별도 owner다.

## 공통 지원 경계와 검증 상태

Data는 explicit/current/unique, coordinate는 explicit/bound/unique/family default를 기존 resolver로 선택한다.
모호한 resource를 첫 번째로 고르지 않는다. Resolved data를 mark child에 명시해 다른 mark의 encodings를 상속하지 않는다.
Caller 입력과 이전 program/trace를 보존한다. Unknown options, missing required roles, conflicting guide/scale는 오류다.

남은 두 action의 runtime/type/effect coverage는 미구현이다. A의 lower baseline 52건·관련 existing tests 176건은
재사용할 owner의 근거이며 신규 API coverage가 아니다. Primitive 9개 확인 뒤 public/primitive exact graphics·
draw order·Canvas calls·decoded pixels, numeric oracle, lifecycle/consumer·strict types·package·docs를 검증한다.
Implemented 승격 시 Current owner로 이관하고 각 Planned index entry를 제거한다.
