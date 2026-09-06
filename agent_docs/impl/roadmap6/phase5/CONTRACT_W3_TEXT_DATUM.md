# W3 annotation 기반 — independent Text datum position

[전체 실행 승인](../APPROVAL.md) 아래 `createAnnotation`보다 먼저 일반 Text position owner를 완성한다.

Explicit `data`로 만든 independent Text의 `encodeX`와 `encodeY`는 field 또는 datum 중 정확히 하나를 받는다.
Finite number는 quantitative, 다른 supported scalar는 nominal로 추론하며 temporal은 fieldType과 기존
temporalUnit grammar를 쓴다. Datum은 일반 scale consumer로 automatic domain에 참여하고 named scale,
explicit domain, reverse, Canvas resize를 그대로 따른다. Source-owned Text는 #115 계약대로 직접 position
교체를 계속 거부한다.

x, y, text 중 하나라도 field이면 dataset row grain을 사용하고 datum을 각 행에 broadcast한다. 세 encoding이
모두 상수면 dataset이 비었거나 여러 행이어도 정확히 한 Text item을 만든다. Dummy row나 annotation 전용
dataset/schema를 만들지 않는다. Field↔datum 재할당은 grain과 graphic을 즉시 다시 계산하며 원본 dataset과
이전 immutable program을 바꾸지 않는다.

Primitive target은 480×320, margin 40, x/y domain [0,10]에서 datum (8,9), dx=8, dy=-16인
`Peak · 9.0`을 (368,48)에 둔다. Literal graphic과 public lower chain의 semantic/graphic/order/Canvas 및
decoded PNG parity를 검증한다. Quantitative/category/time, empty/multi-row, mixed field/datum, field content,
domain sharing, resize, invalid input과 source-owned guard를 포함한다. 이 기반만으로 createAnnotation이나
W3/Phase 5 완료를 주장하지 않는다.
