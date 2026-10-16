# 독립 위치 척도를 위한 명명된 Cartesian 축

## 진행 상태와 Gate

- [x] 기존 공개 API와 현재 저장/그래픽 소유자 조사
- [x] 데이터와 척도는 독립적으로 유지되지만 두 번째 같은 채널 축 생성은 거절되는 공개 재현
- [x] 다섯 독립 참조의 원본/원시 행/컴파일 결과/실제 SVG 해시 확보
- [x] 구체적 공개 계약, 호환성, materialization, consumer 회귀 범위 제안
- [ ] 명시적 사용자 승인
- [ ] 승인 범위 구현 및 통합 검증

Gate: **ready-for-review**. 이 문서는 제안이며 런타임 구현은 없다. 루트 `AGENTS.md`의 material public API / persisted schema 승인 규칙을 적용한다. PR, 패키지 출판, 문서 배포는 포함하지 않는다.

## 문제와 기존 경로

같은 플롯의 서로 다른 수량을 왼쪽과 오른쪽의 독립 척도로 표시해야 한다. 기존 위치 encoding의 명명된 scale은 이 의미를 이미 표현한다. 그러나 현재 Cartesian guide는 채널마다 하나의 `guide.axis.y`와 `yAxisLine`, `yAxisTicks`, `yAxisLabels`, `yAxisTitle`만 소유한다. 두 번째 `createYAxis`는 `createYAxisLine requires a missing y-axis line.`으로 원자적으로 실패한다. 첫 축을 제거하고 두 번째를 만들면 오른쪽 축만 남는다. 기존 immutable program은 보존된다.

`reproduce.mjs`는 독립적인 합성 세 행과 기존 public actions만 사용한다. `replacement-evidence.json`에 실패, 두 개의 독립 mark/scale 유지, 왼쪽 x=60 / 오른쪽 x=380 위치와 남은 축 수를 기록했다. 렌더링 primitive나 참조 차트 replay를 사용하지 않았고 차트 픽셀을 보지 않았다. `hconcat` / `vconcat` / `facet`은 서로 다른 패널을 만들기 때문에 같은 플롯의 두 축을 대체할 수 없다. 역사적 roadmap의 `multiple-axes-per-channel` 명시적 deferred 항목을 새 Gate 없이 암묵적으로 구현하지 않는다.

## 제안: 기존 축 actions의 명명된 리소스 지원

1. 기존 `createXAxis` / `createYAxis`에 선택적 `id`를 추가한다. 생략한 경우 기존 canonical `x` / `y` 정체성과 graphic IDs를 그대로 사용한다. 명명된 ID는 `validateUserId`를 통과해야 하며 중복 명명 ID는 원자적으로 거절한다.
2. 기존 complete-axis / line / ticksAndLabels / ticks / labels / title editors 및 removers에 선택적 `target`을 추가한다. `target`은 mark나 scale ID가 아니라 **축 리소스 ID**다. 채널 불일치와 존재하지 않는 ID는 오류다. `target` 생략은 기존 canonical 축이 있을 때 그 축을 선택하고, canonical이 없으면 해당 채널의 유일한 축만 선택한다. 여러 후보에서 첫 항목을 임의 선택하지 않는다.
3. `createAxes`와 그 객체를 전달하는 `createGuides.axes`의 `x` / `y`는 기존 한 객체/`false` 외에 **명명된 complete-axis 객체의 비어 있지 않은 배열**을 받는다. 배열의 모든 항목에는 `id`가 필요하다. 모든 축을 완전한 상태로 선언한 후 기존 focused editors로 편집하는 흐름이다. 최상위 action 옵션 수를 늘리지 않는다.
4. 최소 범위는 Cartesian x/y, 각 coordinate의 물리적 면당 하나의 축이다. 같은 coordinate와 같은 면에 두 번째 축을 암묵적으로 밀어내지 말고 거절한다. 양쪽 Y / 위아래 X 조합을 지원한다. Polar / Parallel guide, 자동 다중 축 추론, 축별 새 offset/position 문법은 포함하지 않는다.

제안 공개 흐름:

```js
chart()
  // Canvas, datasets, two semantic marks and their independent position scales...
  .createAxes({
    x: { scale: 'time', title: { text: 'Time' } },
    y: [
      { id: 'quantity', scale: 'quantityScale', position: 'left',
        title: { text: 'Quantity', color: 'teal' } },
      { id: 'share', scale: 'shareScale', position: 'right',
        title: { text: 'Share', color: 'purple' } }
    ]
  })
  .editYAxis({ target: 'share', ticksAndLabels: { labels: { format: '.0%' } } })
  .editYAxisTitle({ target: 'share', color: 'purple' });
```

배열 선언과 단일 `createYAxis({id, ...})`는 같은 리소스/graphic 결과를 만들어야 한다. 선택한 축 외의 선/틱/레이블/제목/순서와 mark encoding에는 변화가 없어야 한다. 기존 세 옵션 선호는 생성자 객체에 필요한 binding/geometry를 임의로 떼어내는 이유가 아니다. 위 aggregate creator로 완전한 축을 한 action에 선언할 수 있다.

## 저장 상태와 명시적 materialization

- `semanticSpec.guides.axis`를 축 리소스 ID로 키를 갖는 하나의 canonical map으로 확장한다. 기존 `x` / `y` entry와 출력은 byte-identical하게 유지한다. 기존 entry의 채널은 key에서 결정하고, 새 명명 entry는 명시적 `channel: 'x' | 'y'`를 저장한다. scale/coordinate/position은 해당 entry 소유다. 같은 의미를 다른 보조 map에 중복 저장하지 않는다.
- guide materialization config도 축 ID가 소유한다. named axis의 concrete component는 충돌하지 않는 namespace로 생성하고, default canonical IDs는 변경하지 않는다. 새 action이 의미를 저장한 뒤 해당 component를 명시적으로 materialize한다. renderer는 materialized `graphicSpec`만 읽는다.
- 각 축은 기존 positional scale/coordinate의 guide consumer다. 가짜 mark/dataset을 추가하지 않는다. 데이터/scale/coordinate/Canvas/theme 변경의 consumer plan은 영향을 받는 모든 축을 갱신한다. targeted edit/remove는 같은 채널의 다른 축을 건드리지 않는다.
- 배열은 하나의 immutable guide transaction이다. 모든 ID/binding/side/geometry를 검증하고 명시된 순서대로 materialize한다. 실패 시 earlier program, caller arrays와 nested styles가 바뀌지 않는다. named-axis 추가/편집/제거/정렬의 trace ownership을 유지한다.
- default canonical scale 추론은 기존 동작을 유지한다. named-only 여러 scale 중 기본 grid/axis binding이 결정되지 않으면 명시적 scale/coordinate/target을 요구한다. guide/legend occupied-lane layout은 실제 같은 면의 해당 축 bounds를 모두 읽는다.

이 변경은 guide identity와 consumer resolution의 소유 경계를 확장하므로 구현 checkpoint에서 `SECOND_ARCHITECTURE.md`와 owning current axis contract를 함께 갱신한다.

## 호환성 및 검증 계획

1. 기존 단일 축의 semantic/graphic/SVG/Canvas/PNG/PDF, ids, persistence round-trip, action trace와 기본 omitted-target 동작은 그대로다. 기존 duplicate canonical creator 오류도 유지한다.
2. 두 개의 독립 Y와 두 개의 독립 X 각각에서 서로 다른 domain/format/fonts/title/colors를 검증한다. default+named / named-only 배열 / 각각의 creator가 같은 결과를 내는지 검사한다.
3. 전체/그룹/focused editors와 component/whole-axis removers를 명명 target으로 검사한다. 모든 unrelated axes/marks/scale definitions는 exact-equal이어야 한다. axis-channel mismatch, unknown/duplicate ID, ambiguous omitted target, duplicate same-side, malformed array는 원자적으로 실패해야 한다.
4. raw/derived-data update, scale domain/range, coordinate/resize, theme/text metrics, grid/legend reflow, clipping, import/export, source-independent installed ESM/TypeScript/MCP consumer를 검사한다.
5. 실제 bounds를 이용해 두 축의 labels/titles와 plot/Canvas/side legends 충돌을 검사한다. 새로운 primitive가 아니라 기존 선/텍스트의 동일한 시각 계약을 재사용한다. 별도 drawing primitive API나 renderer semantic dependency는 추가하지 않는다.
6. 선언/schema/현재계약/action cards/API metadata/공개 docs/examples/generated references를 한 checkpoint로 동기화하고 focused + full unit/contracts/docs/package-consumer 검사를 통과한다. 해당 다섯 참조는 model-authored code만 재시도하고 각 family's 모든 단계가 동일한 출력을 내는지 다시 검증한다.

## 현재 제외 범위

임의 개수의 같은 면 축과 자동 lane offset, 비선형 축 간 변환, 데이터 값 보정, primitive overlay로 축을 그리는 우회는 이 제안에 포함하지 않는다. 승인 전에는 다섯 참조만 개별 보류하고 다른 번역을 계속한다.
