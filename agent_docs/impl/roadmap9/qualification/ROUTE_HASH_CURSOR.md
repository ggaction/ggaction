# Route 결과 hash 직렬화 단축 — 2026-11-06

## 진행 상태

- [x] 원인 확인(Node CPU profile, 명시 최대 실행 예산).
- [x] 직렬화 cursor 변경과 예전 구현 대조(bytes·통계·오류 경로 동일).
- [x] 저장 결과 대조: density·force-directed·edge-path 저장 program bytes가 기준 commit과 같다.
- [ ] Chromium route benchmark(기본 한도 + 명시 예산 재측정).

## 왜 했나

기본 작업 한도(1천만)로는 density 100·1천·1만, force-directed 1천·1만이 명시 오류다. 계약의 v2 명시 실행 예산(`bounded-route@1`, 최대 maxWork 8e9 등)으로 Node에서 재 보니 시간이 기준을 크게 넘었다. Profile 결과 계산보다 결과 hash가 더 컸다.

| 경우 (Node, 1회) | 전체 | 결과 hash | 실제 계산 |
| --- | --- | --- | --- |
| density 100 | 15.0초 | 8.4초 | 4.2초 |
| force-directed 1천 | 10.7초 | 5.5초 | 3.0초 |

Hash는 job·완료·저장 검산마다 결과 전체를 태그 붙은 JSON bytes로 만들고 SHA-256을 낸다. 기존 cursor는 `,` `[` 숫자 하나, 문자열의 UTF-16 단위 하나마다 generator yield와 `TextEncoder` 할당을 했다.

## 바꾼 것

- `src/core/encodedValueCursor.js`: 토큰을 352바이트 재사용 버퍼에 모으고 288바이트(여유 64바이트)를 넘으면 내보낸다. 352바이트는 route hash scratch 예약(`routeHashScratchBytes`의 대기 조각 몫)과 같아 메모리 계량이 그대로다. 토큰마다 step·byte 검사를 쓰기 전에 하므로 한도 오류가 같은 토큰에서 같은 문구로 난다. 일반 JSON scalar(유한 숫자·불리언·null)는 `encodeValue`가 그대로 돌려주는 값이라 바로 쓴다. 나머지 scalar(undefined·bigint·-0·NaN·무한대)와 hole의 태그는 문자열 배열이므로 전용 writer로 쓴다. 한 traversal turn씩 내보내는 시험으로 대기 조각이 352바이트를 넘지 않음을 확인한다. 오류 경로 문자열은 오류가 날 때만 만든다. Owned 검사를 통과한 frozen 값은 data property만 가지므로 descriptor 대신 값을 바로 읽는다.
- `src/core/jsonText.js`: `writeJSONStringUnit` 추가. 이스케이프 없는 ASCII는 바로 쓰고, 나머지는 기존과 같은 native `JSON.stringify` 철자를 쓴다.
- `src/grammar/graph/routes/densityField.js`: 칸마다 `get`·`has` 두 번 조회를 `get` 한 번으로. 저장 값은 항상 유한 수라 `undefined`가 새 칸이다. 더하기 순서·값은 같다.

## 대조

- 예전 cursor와 새 cursor: 무작위 중첩 값 3,000개 × 한도 4종 × chunk 2종 = 24,000 조합에서 bytes·통계·오류(종류·문구·경로)가 모두 같다. 순환·class instance·symbol 오류 경로도 같다.
- 저장 결과: deterministic UUID로 density(60·40)·force-directed 200·edge-path 300을 만들어 기준 commit `e90f4c146`과 저장 program bytes가 같다(route 결과 hash 포함).
- 시험: `test/unit/core/encoded-value-cursor.test.js`에 중첩 값 bytes·통계·오류 경로 시험을 더했다.

## 결과 (Node, 1회)

| 경우 | 전 | 후 | 기준 |
| --- | --- | --- | --- |
| force-directed 100 | 0.79초 | 0.20초 | 0.5초 |
| force-directed 1천 | 10.7초 | 4.2초 | 5초 |
| density 100 | 15.0초 | 5.6초 | 0.5초 |

Density는 hash를 빼도 계산(100개에 8,700만 work, 20회 반복의 kernel 누적)이 기준보다 크다. 수학·반복 일정을 바꾸지 않는 한 알려진 한계다. Density 1천은 30초 deadline을, 1만은 표본 한도(16,777,216)를 넘는다.

## Benchmark 변경

`scripts/benchmarks/routes.browser.js`와 `scripts/benchmark-native.js`: 기본 한도에서 명시 오류인 경우를 계약 최대 실행 예산과 `deadlineMs: 30000`으로 한 번 더 잰다. 기본 한도 결과는 그대로 남기고, 명시 예산 행에는 `execution`과 `deadlineMs`를 적는다. 기준값·표본 수·seed는 그대로다.
