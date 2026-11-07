# A3 소형 수학/footprint prototype

제품 source를 수정하기 전에 Node22 loader가 기존 hitShapes의 scalar state를 노출하고 후보 stroke 순회만 대체했다. 원 source는 `8682f89c5` 기반이며 채택 문서 commit은 `c61f8d07c`다. 원1k actual native path의3297 footprint 전체 SHA는 `156b572476f447f3be4456c6531e6679adeccf22b21321f7004e9dc9e278df88`이다.71개 일반질의와16개 극단수치 검산을 통과했다. Prepared index825nodes/buildwork52328, 최대472parts 방문은 소형 기능 관측이며 시간/P95/원100k 성공이 아니다.

별도20fixture(clip중첩/empty,nearest,no-hit,slop0/3/6,opacity/hitInvisible,반전/shear/singular,cap3×join3/odd dash,cubic/closed,zero/subnormal/extreme좌표)의1920개 전체query결과와20개focus anchor가 scalar와 exact 같다. Footprint701개 및fill/clip state도 전수 동일하다. Focus는 원 ordinal 알고리즘 자체를 유지했다. 후속제품에서 바뀌는 actual 비용과원자성은 아직 검증하지 않았다.

## 보수 하한의 좁은 수치 영역

Index는 polygon stroke이며 모든 bounds와 query의 절댓값이2^20 이하일 때만 가지치기한다. Circle의 analytic 판정은 flattened bounds만으로 증명하지 않으므로 전수 경로다. 영역밖/비유한 bounds도 원 ordinal 전수 경로로 돌아가며 기존 scalar 오류를 유지한다. Bounds 하한은 L∞ rectangle distance에서2^-10을 빼고0이하를0으로 둔다. 이 여유는 실제 footprint나hit tolerance에 적용하지 않고 pruning만 약화한다.

이 영역의 좌표차≤2^21, 길이≤2^22, 정규화된 direction의절댓값≤2, clamped along≤length다. segmentDistance의 subtraction/product/clamp/hypot에 발생할 수 있는 절대반올림을 보수적으로 각각2^-28 이하의 정상연산 단위보다 큰2^-20으로 상계하고32회 누적해도2^-15로2^-10보다 작다. Subnormal 방향오차가 상대적으로 커지는 경우 그 segment 자체 길이와곱은 정상영역의 절대상계보다 작다. Ray crossing의내삽은0..1 안의좌표쌍이며bounds외부에서 inside를 만들 수 있는 반올림도 같은 여유안이다. Bounds의L∞ 하한은 실제Euclidean 거리 이하이다. Overflow를 이영역에서허용하지 않으며 증명전제밖은lowerbound0이다. 이 분석은원scalar Math.hypot/IEEE754 연산을바꾸지 않는다.

후속 durable test는확정literal,랜덤 deterministic segment/quad,±0/subnormal/extremefinite와하한≤실제scalar거리 property를보강해야 한다. Full nearest clip는원 clippedBoundaryDistance를그대로호출한다. No-hit distance를slop에잘라반환하지않고현재최소distance보다하한이엄격히클때만생략한다. 동률은ordinal로정렬하며 Math.min의±0/Infinity결과를보존한다.

[원기록](geo-hit-a3-prototype/proof.json),[전체shape검산](geo-hit-a3-prototype/shape-proof.json). 재현은 세mjs를 `.artifacts/geo-hit-a3/`에복사하고 `node .artifacts/geo-hit-a3/proof.mjs`, `node .artifacts/geo-hit-a3/shape-proof.mjs`를실행한다. 초기loader의source Buffer에replace를호출한오류는별도로그에보존했고String변환후재실행했다. 제품기능/공개계약/large/budget/retention은후속checkpoint의의무다.
