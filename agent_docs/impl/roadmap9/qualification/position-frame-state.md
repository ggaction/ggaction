# Point frame positions의 local freeze 검증

상태: 구현·소형·원100k 검증 완료, source pin 마감 중. 기준 `2fb36c76d`.
기존 [설계](frame-local-freeze-design.md#2026-11-02-첫-단계-채택)와
`AUTHORIZATION.json#remainingApproval`을 Root가2026-11-02 구체 채택했다.
이 checkpoint는 설계 첫 단계만 구현하며 node/properties/scene/decision/core/renderer,
public API/types/schema, grammar 수식과 원 canonical work는 바꾸지 않는다.

`sample.js`의 semantic-point 성공 branch가 방금 만든 row/x/y 세 record를 bottom-up
`Object.freeze`한다. 자손은 finite 값 primitive와 exact owned scale뿐이다. Exact/enter/exit
row는 planner 전체 preparedPositions clone 경계를 통과한 값이며, 나머지 family/추가
geographic/axis emission은 null slot이다. 모든 emission·exit·기존 key/node 검사 후 vector
root만 기존 `freezeOwned`로 완성한다. `registerAnimationFrame`의
`cloneAndFreeze(input.positions)`는 변경하지 않아 완성된 root를 그대로 재사용한다.
Endpoint side 단축 경로는 그대로다. 외부 shallow freeze/copy/core-owned clone에
native/frame authority를 발급하지 않는다. 새 cache/provenance field/과거 plan 또는 frame
참조도 없다. 후속 의미를 clone하는 일반 경계는 unowned local child를 기존처럼 복제한다.

## 실제 소형 검산

[실제 비교 harness](position-frame-state-evidence/product-compare.mjs.txt)는 같은 저장 native
program을 두 child에 전달한다. Before는 기준 commit의 sample.js 하나만 loader로 읽고,
after는 현재 실제 제품 경로를 읽는다. Counter는 core clone/owned registration 관측만
추가하며 제품 source나 한도를 바꾸지 않는다. 원1k 모든 time/좌표와 full native/offline
frame·positions 의미·batch·rebase를 deepEqual 및 독립 literal 좌표식으로 검산했다.

| 1k 중간 sample | Before | After |
| --- | ---: | ---: |
| core cloned objects/arrays | 14,037 | 11,036 |
| core owned registrations | 16,048 | 13,048 |
| native preparation work | 771,686 | 771,686 |
| sampled rebase preparation work | 451,681 | 451,681 |

v3 native1,822,845B/rebase2,381,600B, v4 native345,803B/rebase422,310B 모두 bytes/SHA
그대로다. 각 restored→reserialized wire도 정확히 같다. [원 결과](position-frame-state-evidence/product-compare.json).
이 수치는 operation 절감이며 속도 향상 비율·50ms/P95·retained heap 성공이 아니다.
Root의 장수명 WeakSet rehash OS sample 관측은 독립 가설로 남긴다.

새 회귀2개는 ordered enter/exit/exact+nested·null slots·deep immutability와 mutable caller/
frozen clone/core-owned clone authority·offline/rebase/batch 의미를 검증한다. Animation owning
759/759; affected sample.js critical line100/branch98.09/function100이다. Canonical boundary
45개 중 최초44통과/1artifact cap 실패를 보존하고, 최소 cap 교정 후 해당7개가 통과했다.
문서 coverage18/18. 같은 archive source-free Node20.20.2/22.23.1/24.22.1에서 각 기존 runtime
및 Full/Basic replay·strict types·7 animation docs·optional peers·6 bundles가 통과했다.
같은 archive production-minified installed browser는 v3/v4×DPR1/2와 rootsrc input0을 검산했다.

Archive SHA256 `38c8c8180472902af0f7dbbe270fac213ffa896c709965c10f79fa01c67f473f`,
1256entries/packed1,805,223B/unpacked8,140,092B. 최초8,140,000cap 실패 후 측정값을 포함하는
최소100B단위 cap8,140,100으로 artifact 도구만 조정했다. Runtime guard0변경이며 animation
최대gzip339,684B는 기존339,700cap 안이다. [설치 결과](position-frame-state-evidence/consumer-24.22.1.json).

## 원100k와 남은 범위

원 phased harness는 기존6144MiB heap·원100k 입력·모든 coordinate/full deepEqual/offline/
rebase/batch50 rejection을 유지한다. 한 prepared plan씩 직렬 phase로 검사하며 큰 프로세스는
한 개다. 최종 receipt는 아래에 고정했다. Timing은 기능 진단이며 공통sample50ms,
retained heap/P95 또는 전체 Roadmap 완료를 뜻하지 않는다.

다음 node/frame local freeze 및 scalar mapper는 별도 검토이며 이 구현에 포함하지 않았다.


### 최종 실제 제품 receipt

Node24.22.1 PID10024는 정상 종료했고 large 슬롯을 반환했다. 원입력 SHA256은
`b68cab72c1abb6094e715d6e5caa84c54aacf18750ad4a22fb63e3b8c5b2c39f`다.
[전체 receipt](position-frame-state-evidence/product-100000-phased.json)와
[실행 원문](position-frame-state-evidence/product-100000-phased.log)은14개 source/type hash,
각 phase memory와 codec 확장 회계를 포함한다. 원100000좌표/wholeframe offline deepEqual,
rebase 전체좌표/wholeframe offline deepEqual, restored replay exact, batch50 원 work 거부가
모두 통과했다. 1k positions 의미 전수 deepEqual은 위 독립 old/new 비교가 검증한다.

| 경로 | 원 work | wire bytes |
| --- | ---: | ---: |
| native prepare | 78,333,686 | 33,703,073 |
| native offline restore | 97,911,711 | 33,703,073 |
| sampled rebase prepare | 46,333,687 | 41,202,280 |
| sampled rebase offline restore | 133,456,501 | 41,202,280 |

원 bounds를 그대로 검사했고 native/rebase bytes는 기준 b′와 동일하다. 새 sample 관측은
1,609.258ms이며 독립 반복/P95 또는 같은 환경 전후 timing 비교가 아니다. 실행 중 작은
source-free3Node/문서/브라우저 검증이 병행됐고 다른 대형 검사는 없었다. Heap 추가 상향0,
원 phase/입력/ID/scale/검산 축소0이다. 원 공통sample50ms와 retained heap 의무는 남는다.

Root의 직접 read-only 검토에서 새blocking finding0을 확인했다. 구현 source는
`src/animation/sample.js` 하나이며 SHA256은
`c569a02ba99e46cae93cf63cb5dcbfb2d8b39e482c8f7a2f3bbaba6fc7e406e3`이다.
