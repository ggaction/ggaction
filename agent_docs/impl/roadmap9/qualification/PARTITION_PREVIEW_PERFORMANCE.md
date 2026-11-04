# Partition preview 성능 — 2026-11-04

## 진행 상태

- [x] 원10k 기능 검증(설치 archive, current/rebase/offline/offline-rebase). [기록](partition-10k-evidence/README.md)
- [x] 정본 partition P95 측정(archive `787e6d78…`).
- [x] 정확한 prepared track의 재준비 제거.
- [x] 1k gesture preview 33ms (6.1 / 6.0ms).
- [x] 셀 준비·보간 재검증·경로 복사 제거로 10k 366 → 66ms.
- [ ] 10k gesture preview 33ms (batch 표현 필요).

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

## 2차 수리 — frame 단위 셀 준비 (archive `6cd060f6…`)

[report](partition-cells-evidence/report.json.gz), 크기 상한 실측 `caps-20/22/24.json`.

| 크기 | layout DPR1 / DPR2 | gesture preview DPR1 / DPR2 |
| --- | --- | --- |
| 100 | 1.6 / 1.6 ms | 1.0 / 0.9 ms |
| 1k | 12.2 / 12.3 ms | **6.1 / 6.0 ms** (통과) |
| 10k | 119.7 / 120.2 ms | **65.8 / 70.2 ms** (미달) |

Node CPU profile(10k)에서 귀속한 비용과 수리는 다음과 같다. 모든 수리는 검증 범위를 줄이지 않고, 같은 사실을 한 번만 증명하도록 바꾼 것이다.

1. **셀 경계 리터럴**: `partitionCell`이 만든 `{u, v, bend}` 리터럴은 prepared calculation의 내부 `literal` 경로로 계산한다. 구조는 구성으로 성립하고 세 범위 검사는 그대로 수행한다. 공개 `calculation.point`와 `mapping.map`은 추가 속성 거부를 포함한 전체 검사를 유지한다(기존 계약 시험 불변).
2. **frame 단위 준비**: `preparePartitionBendCells(frame, bend, segments)`가 frame·kernel·mapping 검사를 한 번 하고 셀 빌더를 돌려준다. 이전에는 셀 1만 개마다 같은 frame을 다시 검사하고 mapping을 다시 준비했다. gap은 첫 셀의 범위 검사 뒤 한 번 검사해 셀 → gap 진단 순서를 지킨다. 모든 셀이 숨겨지면 frame을 검사하지 않는 계약도 빌더를 첫 visible 셀에서 지연 생성해 유지한다. `node(node)`는 owned node의 네 경계를 읽어 범위만 검사하고, owned가 아니면 한 번 읽은 리터럴을 전체 검사한다.
3. **보간 sample**: `samplePartitionInterpolation`의 결과는 이미 검증된 plan의 `from`에서 만들어지므로 레코드·키·부모 순서·visible은 구성으로 성립하고 작업량은 plan 예산 이하다. 보간된 bend, frame(`mapPartitionBendPoint`), gap, 모든 node 경계의 범위·순서는 다시 검사한 뒤 복사 없이 deep freeze한다.
4. **경로 명령**: 셀 경로는 기존 `buildLinearPathCommands`로 만든다. 이 함수의 결과는 하나의 M, 유한 L, 선택적 Z로 구성상 유효하므로 `validatePathCommands`의 owned 캐시에 등록한다. 용량(`maximum`) 검사는 캐시보다 먼저 수행되어 그대로 남는다.
5. **sample node**: 끝점 node가 모두 owned이고 속성 값이 owned 또는 원시값일 때만 sample node를 복사 없이 freeze한다. 그 외에는 기존 `cloneAndFreeze`다. owned 끝점의 paint 필터 결과는 properties별로 재사용한다.

반례 시험: `partition-cells.test.js`(prepared 셀이 일반 경로와 같은 결과, 범위·순서·gap·accessor 1회 읽기), `partition.test.js`(보간 node 범위·순서), `path-commands.test.js`(구성 경로 캐시와 용량 검사).

## 10k 남은 병목

수리 뒤 profile은 sample node 조립, canvas scene compile, 경로 생성, frame 의미 기록이 고르게 나눠 갖는 긴 꼬리다. 하나를 제거해 2배를 얻을 지점이 없다. 10k를 33ms 안에 넣으려면 points의 format6 circle-run처럼 partition 셀을 행 열(path-run) 표현으로 내보내는 구조 변경이 필요하다는 앞의 판단을 유지한다.
