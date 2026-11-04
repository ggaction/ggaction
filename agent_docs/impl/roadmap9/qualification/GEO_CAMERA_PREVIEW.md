# Geo camera preview

## 진행 상태

- [x] 10k 한 frame 귀속(Node source).
- [x] 검증 의미를 바꾸지 않는 네 가지 비용 제거.
- [x] 전체 검증과 정본 Geo benchmark(archive `864ae6c7…`).
- [ ] 10k 33ms, 100k 50ms. 100k hit 20ms.

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
