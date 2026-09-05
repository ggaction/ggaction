# W3 B1 — Final-item label content

상태: approved. [전체 승인](../APPROVAL.md)을 적용한다. W3 A의 explicit source 위에 `encodeText`의 semantic content를 먼저 제공하고, 후속 `createMarkLabels` facade가 이를 조합한다.

## 공개 계약

- `encodeText({ content: "category" | "value" | "share", normalizeBy?, format? })`를 추가한다. `field`, constant `value`, `content` 중 정확히 하나를 지정한다. `source`가 있는 text만 semantic content를 사용할 수 있다.
- `content:"category"`는 aggregate Bar의 category channel 또는 categorical Arc의 theta다. Histogram의 interval과 quantitative theta는 하나의 category로 추정하지 않는다.
- `content:"value"`는 final item의 의미값이다. Aggregate Bar는 final members에 source aggregate를 적용한 값이며 stack endpoint/normalized fraction이 아니다. Histogram은 final segment의 count다. Pie는 final sector의 count/weighted sum 또는 quantitative theta 값이다. Radial Arc는 final radius 값이다. Ranged Bar, Point, Rule, Rect는 단일 의미값이 불명확하므로 explicit field/constant를 사용한다.
- `content:"share"`는 위 value들의 비율이다. `normalizeBy:"source"`가 기본이며 현재 소스의 모든 final items를 분모에 포함한다. Bar만 `normalizeBy:"category"`를 지원하며 aggregate category 또는 histogram bin별로 나눈다. 이를 semantic text encoding에 저장한다. 다른 content에 normalizeBy를 주면 오류다.
- 분모는 raw dataset 전체가 아니라 current filtered/faceted source의 final items다. 같은 category의 서로 다른 series는 서로 다른 final item이며 중복 raw row를 label item으로 만들지 않는다. 현재 facet은 text가 있는 template을 거부하므로 child를 만든 뒤 해당 child program에 라벨을 추가하는 경로를 검증한다.
- Share는 finite non-negative value와 양수 합계를 요구한다. 음수, 미정의 statistic, 전체/범주 합계 0은 explicit error다. Empty final item set은 empty text다. 큰 finite 값의 합계 overflow는 최대값으로 정규화한 뒤 안정적인 합을 사용해 회피한다.
- Source가 미완성이면 content intent를 저장하고 완성 시 검증·계산한다. Source encoding/scale/filter/data revision에 기존 dependency plan을 통해 재계산한다. 새 source 구성이 content와 비호환이면 action 전체가 immutable rejection한다.
- `format`은 기존 omission-preserves 계약을 유지한다. 새 encoding은 `auto`이며 share도 fraction을 표현한다. `.0%`–`.12%` percent token을 추가해 표현 결정을 명시한다. 예: `encodeText({content:"share",format:".1%"})`.
- 기존 `field`의 source value 해석은 이 변경에서 유지한다. 새 `content:"value"`는 raw field, source aggregation, stack geometry를 명확히 구분하는 경로다.

## 구현 경계와 rationale

Final-item membership/anchor는 기존 selection/materialization owner를 재사용한다. Pure grammar는 source encoding과 final items를 받아 canonical aggregation과 share 계산을 수행한다. Dataset이나 extra label registry를 만들지 않는다. Renderer는 기존 text primitives만 읽는다. 낮은 층위의 semantic content를 완성한 후 createMarkLabels는 child actions를 조합한다.

## 증거와 후속 범위

Primitive text literal로 Pie share와 stacked Bar segment values를 먼저 렌더링·검토한 뒤 같은 위치/문자열의 public 결과를 비교한다. Count/sum/parameterized aggregate, normalization scopes, large/zero/negative values, source completion/rebinding/filter, TypeScript·installed package·browser·누적 회귀를 검증한다.

`createMarkLabels`, reference line/band, annotation과 shared axis/legend/text format 및 rotation 단위 정리는 계속 남는다. 이 계약만으로 W3/D13/F14/F18 완료를 주장하지 않는다.

## 발견한 prerequisite 오류 #111

Histogram에 기존 constant text만 붙여도 resize가 binned/unbinned consumer 혼합으로 실패했다. Source-owned text를 독립 bin 소비자에서 제외하고 domain은 실제 binned owners만 읽는다. 필터 후 source cardinality가 바뀔 때 position scale이 label을 source보다 먼저 갱신하는 경로도 유예하고 기존 dependency plan에서 source 뒤에 재생한다. 실제 independent unbinned text 혼합은 계속 거부한다.
