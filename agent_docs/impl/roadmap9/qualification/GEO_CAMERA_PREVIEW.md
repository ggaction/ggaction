# Geo camera preview

## 진행 상태

- [x] 10k 한 frame 귀속(Node source).
- [x] 검증 의미를 바꾸지 않는 네 가지 비용 제거.
- [x] 전체 검증과 정본 Geo benchmark(archive `864ae6c7…`).
- [x] 100k hit 20ms(아래 hit query 절).
- [ ] Camera preview 10k 33ms, 100k 50ms.

## 수리

1. **Stream 점 투영** (`grammar/geo/projections.js`, `stream.js`): 선분 세분은 frame마다 `[경도, 위도]` 리터럴을 새로 만들어 공개 `forward`로 넘겼고, 그때마다 caller 입력용 own-data 구조 검사가 돌았다. 내부 전용 `forwardPoint`는 구조 검사만 빼고 길이·유한성·위도 검사와 오류 문구·순서를 그대로 둔다. 공개 `createProjectionKernel`은 필드를 명시해 만들어 이 함수를 노출하지 않는다.
2. **Geometry snapshot 2단계** (`grammar/geo/input.js`): 검증과 예산 계량을 위한 전체 순회는 그대로 한 번 한다. 끝까지 재사용 가능한 소유 트리이면 입력을 반환하고, 아니면 검증이 끝난 입력을 기존과 같은 JSON 방식(alias는 분리 복사)으로 복사한다. 재사용 가능한 입력에 대해 버려질 사본을 만들던 비용이 사라진다. 호출 안에서만 쓰는 조상·방문 추적은 weak table 대신 일반 `Set`이다.
3. **예산 계량 label**: `count`가 값마다 만들던 kind별 limit key와 label 문자열을 모듈 로드 때 한 번 만든다.
4. **Projection stream sink 재사용**: 점마다 새 sink로 stream을 만들어 수학 라이브러리의 stream cache가 적중하지 않았다. Part별 sink 하나를 재사용한다. 단일 `point()` 호출은 stream 상태를 남기지 않는다.

시도했지만 측정 효과가 없어 되돌린 것: 소유된 위치 배열 공유, 정규화 위치 사본의 사전 표식, admission의 "정규형 증명 + 동일 예산 재부과". 이 workload의 frame 경로에서는 해당 값이 소유된 입력으로 도달하지 않았다.

반례: `test/unit/geo/projections.test.js`의 `stream point projection keeps value checks and stays out of the public kernel`(공개 kernel 필드, 값 검사 동일성, 공개 `forward`의 accessor 거부). Snapshot 동등성은 기존 `test/unit/geo/json-snapshot.test.js`의 소유/비소유 예산 동일성 검사가 통과한다. Geo owner 400/400, input·stream 100/100/100, projections 100/97.62/100.

## 결과

Node source 10k 한 frame 약 160 → 64ms, 100k 약 700ms. 정본 benchmark(Chromium P95, ms):

| 크기 | camera DPR1 / DPR2 (기준) | hit DPR1 / DPR2 (기준) |
| --- | --- | --- |
| 1k | 5.6 / 5.5 (16.7) | 0.7 / 0.7 (20) |
| 10k | 55.2 / 58.0 (33) | 2.5 / 2.3 (20) |
| 100k | 575.0 / 569.1 (50) | 21.1 / 21.0 (20) |

이전 `bc7633b5…`의 camera 14.0/131.8/1,345.9ms에서 줄었지만 10k·100k camera와 100k hit는 미달이다. 같은 source의 전체 coverage(일반 10548/10548) 97.42/95.69/99.36%, critical floor 785, browser 529/529, render 513/513, 같은 archive Node20/22/24 통과.

## 다음

10k frame(약 64ms)은 admission 약 29ms, 투영 약 31ms(선분 세분 16ms), 물질화 약 11ms로 나뉜다. 100k는 frame마다 path 명령 객체 10만 개를 만들고 검증하는 표현 자체가 비용이다. Points의 format6처럼 명령을 열(batch)로 다루는 표현을 검토해야 한다.

## Hit query의 평탄화 재사용

Geo 100k hit P95는 21.1ms로 기준 20ms를 근소하게 넘었다. Hit index가 후보 segment를 줄여도 `queryIndexedShape`의 채우기 포함 판정과 경계 거리가 query마다 `pathFillContains`/`pathStrokeDistance`를 통해 part의 명령 10만 개를 다시 평탄화·검증했다.

준비된 part의 명령은 private·불변이므로 `grammar/hitShapes.js`는 첫 query에서 `preparePathQueries`(`grammar/pathGeometry.js`)로 한 번 평탄화한 결과를 part별로 재사용한다. 매 query의 점 검사와 fill rule 검사는 그대로이고, 평탄화가 실패하면 기록하지 않아 같은 오류를 계속 낸다. 공개 `pathFillContains`/`pathStrokeDistance`는 기존대로 매번 평탄화한다.

반례: `test/unit/grammar/hit-focus.test.js`의 `repeated queries on one prepared path match freshly prepared shapes`(nonzero/evenodd, slop 0/5, 3회 반복, 비유한 점 거부). Hit·path owner 387/387, hitShapes 100/96.89/100, pathGeometry 98.53/97.67/100.

정본 benchmark(archive `242a7cc3…`): Geo hit 1k/10k/100k 0.2/0.4/1.9ms(이전 0.7/2.5/21.1), camera 5.6/58.3/574.3ms(변화 없음). Points 전 크기 통과 유지. 같은 source의 전체 coverage(일반 10549/10549) 97.42/95.69/99.36%, critical floor 785, browser 529/529, render 513/513, 같은 archive Node20/22/24 통과.

## Canonical 동등성 비교

10k frame profile에서 `canonicalJSON` 문자열 생성이 큰 몫이었다. Admission은 sample마다 정규화한 geometry와 입력 geometry를 각각 `canonicalJSON` 문자열로 만들어 비교한다(1만 좌표 두 벌). `core/contentDigest.js`의 `sameCanonicalJSON(a, b)`는 두 문자열을 만들지 않고 `canonicalJSON(a) === canonicalJSON(b)`와 정확히 같은 답을 낸다. 숫자 표기(-0, NaN·Infinity의 `null`), 빈 값(undefined·함수·symbol·배열 빈 칸)끼리의 일치, 원소 하나가 빈 값인 배열과 빈 배열의 일치까지 그대로다. Geo admission(`geoState`, `geoPresentation`, `geoTracks`)의 동등성 비교만 이것으로 바꿨다. 비교되는 값과 오류는 그대로다.

반례: `test/unit/core/same-canonical-json.test.js`(경계 사례 21쌍 양방향과 무작위 2만 쌍을 문자열 비교와 대조). 별도로 무작위 30만 쌍(동치 10만여 쌍)도 대조했다. Geo·animation 1114/1114.

정본 benchmark(archive `40ac9fe0…`, [report](geo-equality-evidence/report-geo.json.gz)): camera 1k/10k/100k DPR1 5.5/58.6/553.6ms, DPR2 5.2/50.7/550.2ms. Hit 0.2/0.5/2.5ms, 0.2/0.4/1.6ms. 개선은 작고(Node 63.7 → 60.4ms) 10k·100k camera는 여전히 미달이다.

남은 10k 비용은 sample마다 변하지 않는 1만 좌표 geometry 전체를 presentation snapshot(복사), group snapshot, 정규화 비교, 투영 입력 snapshot으로 다시 순회하는 admission과, 투영 결과 1만 명령의 검증·복사다. 앞서 "정규형 증명 + 동일 예산 재부과"는 frame 경로에서 소유된 입력이 도달하지 않아 효과가 없었다. Presentation snapshot이 사본을 만들어 소유 정체성을 끊기 때문이다. 다음 후보는 authentic sampled group(정확한 plan의 sample만 module-private로 기록)과, alias 없는 소유 subtree 예산의 정확한 재부과다. 재부과는 남은 한도가 모든 부과를 수용할 때만 쓰고, 아니면 기존 전체 순회로 같은 오류를 낸다. 이 둘을 함께 설계해야 한다. 100k는 명령 열(batch) 표현이 필요하다.
