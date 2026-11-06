# Native consumer 해당 없음 판정 — 2026-11-06

## 진행 상태

- [x] 사용자 확인: "결정 2: A"(2026-11-06). [승인 기록](PUBLIC_APPROVAL_20261106.json) 계약 근거가 있는 칸만 해당 없음으로 닫는다. 있는 기능은 빼지 않는다.
- [ ] 계약 문장 추가와 `test/native-capabilities.json` 반영.

## 원칙

- 해당 없음은 "그 계열이 그 소비 영역의 공개 기능을 제공하지 않는다"는 현재 계약 사실이다. 판정이 기능을 없애거나 막지 않는다.
- 각 칸은 그 계열의 current 계약 문서에 근거 문장이 있어야 한다. 문장이 없던 계약에는 현재 동작을 적는다(동작 변경 없음).
- 현재 동작의 증거: 일반 encode action(`encodeColor`, `encodeX` 등)과 범례 action은 이 계열의 layer를 encoding 대상 mark로 보지 않고 "Unknown … mark target"으로 거부한다. 칠은 계열 action의 고정 paint와 node별 override, 강조는 공통 selection/highlight가 맡는다. 축·범례가 필요하면 별도 일반 mark·guide와 composition한다.

## 판정 칸 (7계열 × 3칸 = 21칸)

| 계열 | encodings | scales | guides | 근거 계약 |
| --- | --- | --- | --- | --- |
| partition-cartesian | N/A | N/A | N/A | PARTITION.md |
| partition-polar | N/A | N/A | N/A | PARTITION.md |
| tree | N/A | N/A | N/A | HIERARCHY.md |
| treemap | N/A | N/A | N/A | HIERARCHY.md |
| graph-nodes | N/A | N/A | N/A | GRAPHS.md (이미 "Position encoding/axes/scale legend는 stored layout에 적용되지 않는다") |
| sankey-dag | N/A | N/A | N/A | FLOWS.md (이미 "일반 x/y/size/offset encoding 적용 안 함, axis/legend 자동 생성 안 함") |
| sankey-cyclic | N/A | N/A | N/A | FLOWS.md |

(image의 encodings·scales·guides 3칸은 이미 해당 없음이다.)

## 해당 없음이 아닌 칸

나머지 소비 영역(생성·편집·데이터 개정·composition·선택/강조·hit·animation·네 renderer·저장·타입·패키지·문서·접근성)은 모든 계열에서 필수로 남는다. 각 칸은 owner 계약·설치본 시험·독립 기대값 증거로 닫는다.
