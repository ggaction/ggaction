# Route v2 구체안 채택

Root는 [제안](route-v2-proposal.md) revision
`f9aa772b60a1de6d96652468b48c10868ba648fc`의 opt-in policy/header/API와
원 registry·request aggregate ledger·worker deadline 설계를
[remainingApproval](../AUTHORIZATION.json#remainingApproval) 범위로 채택한다.
8B work/50M pairs/16Mi samples/128MiB buffer·packet은 명시 hard maxima이며 기본값 또는
density1k/10k 완주 증거가 아니다. 기존 v1 동기 API·수학·오류·guard·저장 bytes는 보존한다.

현재 root `8b5ebdeb7`에서 제안의 source29개와 evidence hash,3Node24native jobs·48chunk취소,
정적 숫자 ledger를 다시 검산했다. 검산 도구의 마지막 제품 diff 기준만 upstream207에서 현재
root HEAD로 바꿨다. 초기 실행은 임시 출력 폴더 누락, 다음은 오래된 전체 diff의 출력 버퍼
초과로 실패했다. Source/evidence 검사 완화는 없으며 새 large solver 실행도 없다.

첫 제품 checkpoint는 coherent v2 create/edit 준비·실행·검증·저장 경로를 연결해야 한다.
공개 stub나 schema만 추가한 상태를 기능 완료로 취급하지 않는다. 원 proof owner와 단일 요청
ledger를 유지하고, 완전 B native update union·초기 snapshot/wide key/BigInt/transport/최종
materialization의100ms·원100/1k/10k·P95·100cycle는 후속 의무로 남긴다. 제안의332후보를
wildcard 실행 권한으로 바꾸거나 기존 전체 요구를 축소하지 않는다.

## Native plan의 Full 연결 경계

구현 중 사전 esbuild 진단에서 `ggaction/graph`가 native consumer planner를 직접 import하면
461개 module·gzip264,752bytes로 커지고, compute-only worker는39개·23,925bytes로 남았다.
이는 최종 package 측정이 아닌 source 사전 진단이다. 같은 remainingApproval 범위로 다음
구체 경계를 선택한다. 기존 Full exact-constructor registration 패턴처럼 `registerEdgeRouteActions`
시점에 private route-preparation owner에 해당 constructor의 native plan 함수만 한 번 연결한다.
Graph prepare는 정확 클래스의 등록만 조회하며 superclass fallback이나 public registration은 없다.

등록 함수는 계획 계산의 소유자를 찾을 뿐이며 native job proof·prepared handle 권한을 발급하지
않는다. 원 validatedJobs와 prepared WeakMap, exact receiver/token/refs 검산 및 primitive context가
권한을 계속 소유한다. 다른 resource kind의 일반 plugin 옵션이나 compatibility layer를 만들지 않는다.
Native plan은 원 semantic/graphic preflight와 wrapped materialization operation 목록을 보관하며,
최종 apply는 기존 wrapped children·trace·theme completion을 실행한다. 미리 만든 program을 그대로
반환해 검산을 건너뛰지 않는다. 요청 ledger의 준비 누적값을 이어받고 각 apply의 실제 비용을 더한다.

제품 검증은 registration-once·constructor isolation·미등록/Basic 거부 및 source/package boundary를
포함한다. Full assembly/registrar/renderer/Node가 graph entry로 유입되지 않고 compute-only worker도
순수 계산 경계를 유지해야 한다. 전체 prepare deadline은 최초 시작부터 native 계획 완료까지이고,
handle 이후 동기 apply는 기존 original AbortSignal과 누적 ledger 검사를 유지한다.
