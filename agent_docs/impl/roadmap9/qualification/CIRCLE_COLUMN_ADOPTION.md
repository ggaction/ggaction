# Circle 숫자 열 구조 증거 채택

## 진행 상태

- [x] [구체 검토](circle-column-proof-review.md)와 [proposal patch](circle-column-proof-evidence/proposal.patch.gz)를 root가 읽고 채택 결정 기록(2026-11-04).
- [x] 합산 source에 3파일 patch 적용. positions의 이미 동결된 열에 대한 중복 `freezeOwned` 호출도 patch대로 제거했다.
- [x] 영구 반례 `test/unit/grammar/circle-batch-column.test.js` 7/7. animation·circle owner 867/867, circleBatch 100/100/100(기준 95/90/100), positions 100/98.10/100, batchSample 100/90.91/100, pointState 100/100/100.
- [x] 전체 일반 10530/10530, browser 529/529, 생성 문서 재생성. Basic/svg/interaction 상한만 실측값으로 조정(+24/+15/+38B); Full −316B, animation −143B.
- [x] 같은 archive `c6a41e0d…` Node20/22/24 설치 소비자 통과.
- [x] 최종 null-prototype source의 원100k 단일 sample 재측정(아래).

## 결정

승인 근거는 [AUTHORIZATION.json](../AUTHORIZATION.json)의 `remainingApproval`이다. 이 변경은 public API·저장 schema·type·renderer 경계를 바꾸지 않는 private 내부 구조 증거다. 새 사용자 승인 질문을 만들지 않는다.

채택 대상은 검토 문서의 **최종 null-prototype 후보**다. `new Array`와 index 대입을 쓰는 첫 후보는 inherited numeric setter 반례로 기각했고, 일반 `{length}` array-like는 inherited `Symbol.iterator` 반례로 기각했다. 채택본은 `Array.from({ __proto__: null, length }, …)`로 own data property만 만든다.

채택 범위는 세 파일이다.

| 파일 | 변경 |
| --- | --- |
| `src/grammar/schemas/circleBatch.js` | private `createCircleBatchColumn(length, valueAt)`이 길이 1..10000을 먼저 확인하고, 숫자 primitive 결과만 받아 완성된 배열을 `freezeOwned`로 동결한 뒤 module-private WeakSet에 기록한다. `validateCircleBatchColumn`은 그 WeakSet에 있는 배열만 `ownArray` 구조 검사를 건너뛴다. |
| `src/grammar/animation/positions.js` | `samplePositionBatch`의 positions 열을 creator로 만든다. 비유한·RangeError 위치는 내부 sentinel로 기존 `nonfinite-position` fade를 유지한다. |
| `src/animation/batchSample.js` | radius 열을 creator로 만든다. 행별 exact correspondence 검사와 오류 순서는 그대로다. |

유지하는 것: finite/음수/길이/appearance 검산과 그 순서, caller·copied·frozen·forged 배열의 전체 `ownArray` 경계(`isOwned`만으로 통과 불가), maxOutputNodes, native provenance, 네 renderer 공통 validator, global owned registry, 작업 한도와 원 workload.

## 기대 효과와 한계

검토 기록의 직전 후보 원100k 단일 sample은 93.92ms(profiled 74.68ms)로 기준 132.58ms보다 줄었지만 **50ms 목표에는 못 미친다**. 최종 null-prototype source의 측정은 아래에 있다. 이 채택은 공통 sampler 비용 일부를 줄이는 단계이며, 50ms·P95·100cycle 또는 같은 프로세스 rebase-offline Rehash 해결을 뜻하지 않는다. 다음 후보인 compiler keyspace cache는 별도 검토 대상으로 남긴다.

## 원100k 측정 — 2026-11-04

같은 장비·같은 harness(`circle-column-product-evidence/run.mjs.gz`)·같은 입력(100,000점, 입력 SHA256 `b68cab72c1abb609…`가 원 format6 sampler receipt와 일치)으로 기준과 후보를 교차 2회 실행했다. 타이머 안에서 완전히 물질화된 frame을 만들고, 타이머 밖에서 100,000좌표를 모두 검산했다. 다른 무거운 작업은 없었다. 단일 실행 값이며 P95가 아니다.

| source | 1차 무계측 sample | 2차 profiled sample |
| --- | --- | --- |
| 기준 `d8b48c2ee` | 132.14 / 132.06 ms | 112.41 / 112.43 ms |
| 채택본 | 96.32 / 92.86 ms | 69.15 / 71.05 ms |

약 28% 줄었으나 **원 50ms 목표는 미달**이다. 채택본 profile의 self time(inspector post 238.4ms 제외)은 creator 15.2ms와 callback 7.6ms, compiler `concreteEntries` 12.1ms·`compile` 3.0ms, 남은 `ownDataProperties` 11.9ms, GC 7.2ms 순이다. 다음 후보는 compiler 구조 검산과 남은 own-data 검사의 출처 귀속이다. P95·100cycle·같은 프로세스 rebase-offline Rehash는 열려 있다.
