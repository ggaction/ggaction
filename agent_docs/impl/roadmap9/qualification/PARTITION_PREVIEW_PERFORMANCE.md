# Partition preview 성능 — 2026-11-04

## 진행 상태

- [x] 원10k 기능 검증(설치 archive, current/rebase/offline/offline-rebase). [기록](partition-10k-evidence/README.md)
- [x] 정본 partition P95 측정(archive `787e6d78…`).
- [x] 정확한 prepared track의 재준비 제거.
- [ ] 1k·10k gesture preview 33ms.

## 정본 P95 (archive `787e6d78…`, source `72bd39e39`)

`node scripts/benchmark-native.js --workload=partition`, Chromium, 5 warmup + 30 측정. [report](partition-preview-evidence/report.json.gz).

| 크기 | layout(목표) DPR1 / DPR2 | gesture preview(목표 33ms) DPR1 / DPR2 |
| --- | --- | --- |
| 100 | 2.4 / 2.4 ms (10) | 3.4 / 3.4 ms |
| 1k | 19.7 / 19.8 ms (50) | **35.9 / 36.1 ms** |
| 10k | 224.0 / 224.7 ms (300) | **366.4 / 359.7 ms** |

Layout은 세 크기 모두 통과했다. Preview는 1k에서 근소하게, 10k에서 약 11배 미달이다. 이 측정은 사용자 GUI 앱이 켜진 상태에서 했으므로 최종 exclusive 창에서 다시 잰다.

## 귀속과 수리

Node CPU profile(10k, 설치본)의 sample 1회 약 400ms 중 `ownDataProperties`가 134ms였다. 상위 호출자는 다음 두 가지였다.

1. `samplePartitionInterpolation`이 sample마다 `preparePartitionInterpolation(input.from, input.to)`을 다시 실행해 두 endpoint 전체(각 10k node)를 재검증한다. 입력이 이 모듈이 방금 만든 정확한 plan이어도 마찬가지다.
2. Prepared bend `calculate`가 cell 내부 리터럴 점마다 `validateBendPoint`(own-data 레코드 + 범위)를 실행한다.

1은 positions의 `preparedPositions`와 같은 원칙으로 수리했다. `preparePartitionInterpolation`의 결과만 module-private WeakSet에 기록하고, sample이 그 정확한 plan을 받으면 재준비를 건너뛴다. 복원·복사·caller-frozen plan은 기존 전체 검증과 진단 순서를 유지한다. 반례 시험은 `test/unit/animation/partition.test.js`의 `only the exact prepared track skips repeated admission`이다.

2는 시도했다가 되돌렸다. `test/unit/grammar/partition-cell-calculation.test.js`가 prepared `calculation.point`도 추가 속성 거부를 포함해 일반 경로와 같은 진단을 내야 한다고 고정한다. 이는 이전에 채택된 계약이므로 약화하지 않는다.

source 기준 Node 중앙값(35회 중 앞 5회 제외): 1k 35.4 → 31.6ms, 10k 403.9 → 338.6ms.

## 남은 병목

수리 뒤 profile의 최상위는 `freezeOwned`(WeakSet add)다. 매 frame마다 cell 1만 개의 path 명령·속성·node 객체(frame당 약 10만 개)가 owned로 등록됐다가 다음 frame에 버려진다. [Point 진단](POINT_REHASH_DIAGNOSIS.md)과 같은 전역 registry 단명 등록이며, Node p95가 수 초로 튀는 원인이다. 10k를 33ms 안에 넣으려면 points의 format6 circle-batch처럼 partition cell을 행 열(batch) 표현으로 그리는 구조 변경이 필요하다. 이는 공개 scene/primitive schema에 닿는 결정이라 별도 설계 기록으로 다룬다.
