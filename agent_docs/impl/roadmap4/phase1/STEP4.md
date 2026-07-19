# Step 4 — B-004 line encoding order

## 목표

Quantitative line의 x/y partial semantic state를 안전하게 허용하고, position이 완성되기 전에는
materialization만 유예한다.

## 진행 상태

- [x] x→y 실패와 y→x 성공 재현
- [x] partial quantitative x semantic/scale 상태 허용
- [x] direct quantitative pair와 aggregate line validation 분리
- [x] 두 호출 순서의 layer, scale set, resolved scale, graphic 동등성 검증
- [x] target inference와 earlier-program immutability 검증
- [x] temporal, aggregate, grouped, Polar line 회귀 실행
- [x] Browser Canvas와 Node PNG 검증
- [x] 전체 1559 tests 실행
- [x] P1-C 사용자 승인

## Gate

Incomplete state 허용이 invalid complete state를 묵인해서는 안 된다. 두 번째 position channel이
완성되는 순간 mark compatibility를 검증하고 실패는 immutable해야 한다.

Quantitative x partial은 semantic과 x scale만 저장하고 line graphic을 비워 둔다. Quantitative y가
추가되면 direct pair를 완성한다. 반대로 y partial 후 x를 추가하는 기존 경로와 final layer,
ID-normalized semantic scale set, resolved scales와 `graphicSpec`이 같다. `semanticSpec.scales` 배열의
resource 생성 순서는 authoring history이므로 비교 시 ID로 정규화하며, 전역 resource ordering은 이
finding의 범위에서 바꾸지 않는다.

Quantitative x 뒤에 aggregate y를 붙이는 invalid complete state는 temporal x 요구 오류로 원자적으로
거부한다. 기존 temporal aggregate, grouped Cartesian과 Polar line 정책은 유지한다.
