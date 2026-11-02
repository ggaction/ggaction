# Point node 지역 동결 구현

진행 상태: source·회귀·원100k·동일 archive 소비자 검증을 마감한 개념 checkpoint. 전체57–77 closeout은 남는다.

2026-11-02 Root는 [검토안](frame-node-local-freeze-review.md)의 node-owned/conditional-vector
안만 [기존 승인](../AUTHORIZATION.json)의 remainingApproval로 채택했다. 생성한 point frame의
finite tuple만 지역 동결하며 properties와 node의 기존 core ownership을 유지한다.
모든 emission·exit와 key/node 검산 뒤 nodes.every(isOwned)인 경우에만 vector root를 완성한다.
Raw Geo/GeoText/axis emission은 기존 scene clone fallback으로 끝낸다.

에이전트 사용량 중단 때 남긴 source/test와 실패 원문을 보존하고 root가 이어받았다.
새 mixed 회귀는 margin20에서 축 생성 자체가 거부되어40으로 교정했으며, point·GeoText·
axis·hit·path clip·timeline·immutability·caller/clone 권한·offline·rebase 검산을 유지했다.
제품 owning761/761, sample.js100/98.14/100, 경계37/37, render52/52를 통과했다.

실제1k old/new의 full frame/meaning/timeline/fallback/mixed/rebase/batch와 v3/v4 모든 wire/work가
같다. Core clone11036→6035, owned registration13048→10048, 전체 WeakSet.add24085→16084다.
이는 연산 감소이며 속도 향상 비율은 아니다.

원100k의 native/offline·rebase 각각 전체 좌표, whole-frame deepEqual과 replay, batch50 원 work
거부를 검산했다. Native33703073B/rebase41202280B 및 원 작업량이 같다. 실행은 기존6144MiB
한 process로 했으며 입력과 phase를 줄이지 않았다. Sample phase1592.74ms는 좌표 검산을
포함하고 다른 소형 작업과 CPU를 공유한 기능 진단이다. 순수 sampler50ms/P95 결과가 아니다.

같은 고정 archive의 Node20/22/24 public runtime·strict types·7 docs·optional peers·6bundle,
production-minified 설치 browser v3/v4×DPR1/2를 검산했다. 원 Node20 artifact 초과를 보존하고
실제값을 포함하는 최소 artifact ceiling만 조정했다. Runtime guard 변경0.
[정확 source/hash/명령/판정](point-node-merged-evidence/qualification.json)을 따른다.

다음은 scalar mapping의 singleton 배열·pair 반복 검산과 frame meaning 비용 조사다.
Geo format5, route 비동기 작업, 전체 수명100cycle 및 최종9명령도 별도 진행한다.
