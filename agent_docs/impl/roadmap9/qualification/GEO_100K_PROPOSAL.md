# Geo 100k camera preview 제안 — 2026-11-05

## 진행 상태

- [x] 사용자 확인: "결정 1: A"(2026-11-06). [승인 기록](PUBLIC_APPROVAL_20261106.json) 결과가 현재 경로와 비트 단위로 같을 때만 채택한다.
- [x] 구현·시험·benchmark(archive `6dca9128…`). 100k는 228 → 145ms로 줄었으나 50ms 미달을 알려진 한계로 기록한다.

## 현재 상태

기준은 camera preview frame P95 50ms(100k)다. Chromium은 228 / 232ms, Node는 약 230ms다. 1k·10k는 통과한다. [기록](GEO_CAMERA_PREVIEW.md)

100k 한 frame(선 1개, 점 10만 개)의 Node profile:

| 단계 | 비용 |
| --- | --- |
| 선분 세분·점 투영(`lineCoordinates`, `forwardPoint`, spherical midpoint) | 약 91ms |
| d3 stream의 antimeridian clip·resample(`streamGeometryMath`) | 약 52ms |
| 입력 geometry 사본(`snapshotGeometryJSON`) | 약 21ms |
| 경로 명령 생성·검증 등 나머지 | 약 30ms |

Precision resampling은 scale에 따라 달라지므로 이전 frame 결과를 다시 쓸 수 없다. 계산 자체를 4배 넘게 줄여야 한다.

## 선택지

1. **내부 열 계산 (공개 형식 변화 없음)**: 투영 경로를 typed array 열로 한 번에 계산한다. 세분·투영·antimeridian 처리를 한 pass로 합치고 점 리터럴·중간 배열을 만들지 않는다. 출력 경로 명령과 수치는 지금과 같아야 하며, 지금 d3 stream 경로와 bit 단위로 같음을 전수 대조한다. 위험은 d3-geo의 clip·resample 규칙을 직접 재현해야 한다는 점이다. 같지 않은 경우가 하나라도 있으면 채택하지 않는다.
2. **format6 geo 경로 열 표현 (공개 scene 확장)**: Partition의 `path-run`처럼 sample frame의 geo 선을 열로 내보낸다. 명령 객체 생성·검증 비용(약 30ms)만 줄고 투영 수학(약 140ms)은 그대로라 단독으로는 50ms에 닿지 않는다. 1과 함께여야 의미가 있다.
3. **보류**: 100k Geo camera를 이번 release 범위 밖의 알려진 한계로 기록한다.

권장: 1을 먼저 시도하고, 전수 대조로 같지 않으면 3으로 기록한다. 1은 공개 API·저장 형식을 바꾸지 않지만 geo 투영 핵심 경로를 새로 쓰는 일이므로 확인을 받는다.

## 구현 (선택지 A, 2026-11-06)

모든 변경은 기존 경로와 결과가 비트 단위로 같다. 기준 source(`23313e355`) 사본과 14개 투영 종류 × 두 설정, 선·다각형·multi line 6,000건(오류 30건 포함), source-segment·great-circle 보간에서 출력·진단·오류가 모두 같았다. `test/unit/geo/projection-fast-paths.test.js`가 같은 동치를 고정한다.

1. **구면 중점**: `geoInterpolate(a, b)(0.5)`의 연산을 같은 순서로 옮긴 `sphericalMidpointInto`. 클로저와 결과 배열을 만들지 않는다(d3와 2만 쌍 비트 동일).
2. **점 투영**: `forwardXY(x, y)`는 `forwardPoint(value).point`와 같은 검사·호출을 하되 중간 기록을 만들지 않는다. clip 각도·clip 범위가 없는 투영에서는 홀로 들어온 stream 점이 `projection(point)`와 같은 radians·회전·투영·변환을 거치고 버려지지 않으므로 직접 호출을 쓴다. 그 밖(orthographic, albers-usa 부분 투영, getter가 없는 투영)은 기존 stream을 쓴다.
3. **세분**: 대부분의 원 선분은 한 번에 통과하므로 분할할 때만 stack을 만든다. 처리 순서(왼쪽 반 먼저, LIFO)는 같다.
4. **경계**: 점마다 새 배열을 만들지 않고 같은 min/max 순서로 갱신한다.
5. **입력 재수용**: 소유 표시된 정확한 geometry tree의 완료된 수용 총량(값 수·work·깊이·최장 배열)을 tree에 기록하고, 다음 수용에서 모든 총량이 현재 한도 안일 때만 한 번에 재부과한다. 그렇지 않으면 전체 순회로 같은 오류를 낸다.

결과(Node, 100k camera preview p50): 약 230 → 134ms. 남은 비용은 d3 stream의 resampling·antimeridian 처리와 점마다의 투영·작은 배열(GC)이다. 같은 결과를 지키면서 50ms에 닿을 남은 경로는 d3 stream 자체를 다시 구현하는 것뿐이라, 이번 범위에서는 **50ms 미달을 알려진 한계로 기록한다**(승인 조건 C).

### 정식 측정 (archive `6dca9128…`)

`node scripts/benchmark-native.js --workload=geo`, Chromium, 5 warmup + 30 측정. [report](geo-fast-paths-evidence/report-geo.json.gz)

| 크기 | camera preview P95 DPR1 / DPR2 (기준) | hit P95 |
| --- | --- | --- |
| 1k | 1.7 / 1.7 ms (16.7) | 0.2 / 0.2 ms |
| 10k | **12.7 / 12.6 ms** (33, 이전 21.3) | 0.3 / 0.4 ms |
| 100k | **145 / 148 ms** (50, 이전 228 / 232) | 2.8 / 1.6 ms |

검증: 전체 시험 10,607개, coverage 97.45/95.61/99.32%(critical floor 789), browser 531/531, render 513/513, Node20/22/24 consumer 통과. [증거](geo-fast-paths-evidence/)
