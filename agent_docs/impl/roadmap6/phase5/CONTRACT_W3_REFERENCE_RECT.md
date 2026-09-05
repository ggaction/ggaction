# W3 reference 기반 — Rect 상수 끝점과 plot span

[전체 승인](../APPROVAL.md)에 따라 reference line/band facade보다 먼저 하위 Rect position owner를 완성한다. 목표는 보조 데이터셋 없이 상수 구간을 표현하고 scale/Canvas/selection/text가 같은 최종 항목을 읽는 것이다.

## 계약

- Rect의 encodeX/encodeY/encodeX2/encodeY2는 field와 datum 중 정확히 하나를 받는다. Primary datum은 기존 Rule과 같은 scalar 추론, secondary는 기존 Rect처럼 primary fieldType을 기본으로 사용한다. 시간은 explicit temporal 의미와 temporalUnit을 사용한다.
- 모든 position/color가 상수이면 데이터 행 수와 관계없이 하나의 Rect를 만든다. Field가 하나라도 있으면 기존 row grain을 유지하며 상수는 각 유효 행에 broadcast한다. 내부 임시 row는 dataset이나 semantic branch로 저장하지 않는다.
- 기존 categorical x/y cell과 continuous/temporal x/x2+y/y2 rectangle은 유지한다. Continuous/temporal x/x2만 있고 y/y2가 없으면 plot 높이를 채운 band, y/y2만 있고 x/x2가 없으면 plot 너비를 채운 band다. 다른 부분 완료 조합은 빈 graphics를 유지한다.
- Scale mapping은 기존 owner를 사용하고 반대 방향 span만 현재 plot bounds에서 얻는다. Canvas margin/resize, reversed/range/transformed/time scale 편집 뒤 동일 owner가 rematerialize한다. 0 extent는 기존 ranged Rect처럼 빈 결과다.
- Scale domain은 기존 Rect consumer의 유효 행 정책을 유지한다. Constant-only는 한 datum 쌍, mixed mode는 유효한 field 행에 대응하는 constant만 domain에 기여한다.
- Selection/highlight/text는 같은 final Rect row resolution을 재사용한다. Temporal channel은 공통 selection resolver로 epoch milliseconds를 노출하고 원래 field 값은 보존한다. 기존 Rect의 raw channel 오류 #113을 함께 해결한다. Constant-only는 전체 dataset membership을 가지고 common field만 설명할 수 있다. 명시적 source text와 complete span의 source inference를 지원한다.
- Explicit range facade와 data/plot reference/annotation은 이후 W3 작업이다. 이 기반 완료를 전체 reference API 완료로 표시하지 않는다.

## 시각 목표 및 검증

구현 전에 x 구간 [2,6]을 plot y=[40,280]에 놓는 literal Rect primitive를 렌더한다. 같은 source data/scale를 사용하는 public datum+span 결과와 concrete graphics/order/Canvas/PNG를 비교한다. 양 방향·상수/mixed·빈 데이터·missing·시간/비선형·scale/Canvas 재생·텍스트/selection/highlight·실패 불변성을 검증하고 types/current docs/package/browser를 동기화한다.
