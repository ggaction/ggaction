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
