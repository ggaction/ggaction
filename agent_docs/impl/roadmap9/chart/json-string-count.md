# JSON 문자열 byte 계산 owner 추출

## 진행 상태

- [x] 36de5a4f9 검토안 중 첫 제품 개념만 root가 채택했다.
- [x] 기존 [AUTHORIZATION.remainingApproval](../AUTHORIZATION.json)의 범위를 재사용한다.
- [x] 제품 추출과 source/critical/동일 archive 3Node 검증
- [x] source pin 및 문서 metadata 검증

승인 범위는 `countJSONStringBytes(text, encodedOffset, maxBytes, label)`의 비공개
source-neutral owner와 기존 inference 호출 연결이다. 문자열은 이미 확인한 primitive,
offset/maximum은 호출자의 기존 정책 값이다. 새로운 coercion/옵션/타입 검사를 추가하지 않는다.
기존 최소 byte 검사 → UTF16 scalar 계산 → 최종 byte 검사의 순서, 오류와 진단값을 유지한다.
추출한 모듈 한 곳만 escape/UTF8 width 규칙을 소유한다.

strict cursor, generic writer/state API, encodeValue/canonicalJSON 교체, 공개 API/schema,
전역 guard, route v2 정책은 이번 채택에 포함하지 않는다. 큰 입력 취소 지연이나 SLO를
보장하지 않는다. [검토안](tagged-cursor-review.md)의 넓은 descriptor 열거와 BigInt 변환
제한도 그대로 남는다.

검증은 native JSON.stringify + TextEncoder의 모든 단일 UTF16 값/혼합 surrogate,
offset 포함 exact/-1 quota, 최소 검사 시 scalar read·escape·UTF8 allocation 0,
기존 outer tag/키 순서/getter/byte/work/default 정책 및 hash 소비자를 사용한다.

## 구현 및 검증

`core/jsonText.js`는 count 함수 하나만 export한다. 기존 inference의 문자열 closure는
계산을 위임하고 반환된 문자열 byte 수만 누적한다. helper 안의 최소·최종 검사가 원래
각 한 번씩 실행되는 위치를 보존하므로 중복 quota 검사를 추가하지 않는다.
기존 `encodeValue`, `canonicalJSON`, `contentDigest`, SHA scalar는 변경하지 않았다.

- source 36개 통과, 변경한 core/grammar 두 owner 각각 100/100/100 coverage
- Node20/22/24 각각 전체 단일 UTF16 65,536개와 혼합/offset/거부/hash 16개 시험 통과
- 이전 source `36de5a4f9`와 868조합의 반환값·오류 class/message/진단 metadata exact, getter 0회
- source/package/발견/architecture 경계 38개, 작은 inference lifecycle/codec 10개 통과
  (명시 10k 실행 시험은 이번 작은 checkpoint 대상에서 제외)
- 같은 archive `69c45bcacf6c9290b2efbeed52fdf69d604a8be77d5e9d4012a9f8226037dc9d`를
  Node24→22→20에 순차 설치: 각각 기존 공개 runtime 12개, strict TypeScript,
  실제 문서 snippet, optional peers, 6개 entry bundle 통과
- package 계약 7개 통과. 새 파일 1개 때문에 최초 entries 1250>1249 실패를 보존했다.
  실제 unpacked 8,067,660bytes에 따라 cap을 8,067,700으로 조정했고 packed/bundle cap은 유지했다.
- source `f4b389117`로 문서 provenance/LLM metadata를 재생성하고 정합 18개를 통과했다.

실제 worker 작은 lifecycle은 transport 기본 정책에서도 `validateInferenceBytes`를
호출하므로 새 owner를 소비한다. 기존 공개 함수의 Full 권한·token·receiver·동기 비교·
codec·취소 검증을 그대로 실행했다. 정본 문서 snippet도 기존
`edge-route-analytical-comparison`을 사용한다.

실행 도구와 상세 결과는 [evidence](json-string-count-evidence/)에 보존한다.
기능 검증은 다른 agent의 작은/큰 검증과 CPU를 공유했으며, 시간 수치를 성능이나 SLO
증거로 사용하지 않는다. large fixture/100ms 취소/route v2 지원 증거는 0이다.

## 재현

```sh
node --test --experimental-test-coverage --test-coverage-include='src/core/jsonText.js' --test-coverage-include='src/grammar/graph/inferenceBudget.js' test/unit/core/json-text.test.js test/unit/core/content-digest.test.js test/unit/core/sha256.test.js test/unit/grammar/graph/inference-budget.test.js test/unit/grammar/graph/inference-job.test.js test/unit/resources/graph-inference-host.test.js
node agent_docs/impl/roadmap9/chart/json-string-count-evidence/compare.mjs
node agent_docs/impl/roadmap9/chart/json-string-count-evidence/freeze.mjs
node agent_docs/impl/roadmap9/chart/json-string-count-evidence/installed.mjs
node agent_docs/impl/roadmap9/chart/json-string-count-evidence/verify.mjs
```

각 Node 설치 재현은 그 executable의 dirname을 PATH 앞에 둔다.
기존 archive는 freeze를 다시 수행하지 않고 `.artifacts/json-string-count/fixed.json`으로
세 Node가 동일 파일을 읽었다. source-free runner는 10k case를 선택하지 않는다.
