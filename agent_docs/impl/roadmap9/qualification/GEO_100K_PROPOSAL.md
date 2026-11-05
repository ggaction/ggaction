# Geo 100k camera preview 제안 — 2026-11-05

## 진행 상태

- [ ] 사용자 확인 필요: 아래 선택지 중 하나.
- [ ] 구현·시험·benchmark.

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
