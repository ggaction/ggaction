# Private immutable cursor 통합

## 진행 상태

- [x] Source `3f7b47813` / pin `207e18ac7`의 runtime3파일을 byte-exact 통합했다.
- [x] 기존 sampled metadata 재사용과 현재 package/source 경계를 보존했다.
- [x] Core3owner100/100/100, 설치 archive3Node 및 production-minified browser 검증
- [ ] Public route v2와 native job host의 단계별 실행 연결
- [ ] BigInt·wide record·snapshot·transport·materialization 및100ms 인수

구체 채택 범위는 [private cursor 계약](../chart/strict-value-cursor.md)과 기존
[remainingApproval](../AUTHORIZATION.json)에 있다. `core/jsonText.js`의 Unicode width owner를
count와 작은 writer가 공유하고, `core/valueEncoding.js`의 scalar/container/hole 정본을 사용하는
비공개 cursor를 추가했다. 기존 동기 codec·route v1·public API·schema·runtime guard는 그대로다.
새 cursor는 domain 권한을 부여하지 않으며 정확 immutable snapshot을 소비하는 기반이다.

[기계 기록](strict-cursor-merged-evidence/qualification.json)은 실제3 source SHA가 upstream 및
새 archive 내용과 같음을 검증한다. Root owning14, inference/host18, 경계·문서37,
ceiling 변경 뒤 문서3건이 통과했다. Core3owner line/branch/function 모두100이다.
Upstream compatibility56 및3Node native body/result/cancellation 검산은 해당 source가
그대로인 범위에서 재사용하며 새 전체 suite 통과로 계산하지 않는다.

Archive `339199dd6af48c97dcdccb754b7ce626a7493f8f6f8b34d5b9dd0d60d0037f37`를
Node20/22/24가 공유했다. 각 private14/public12·strict types·실행 문서1·6bundle과 browser의
UTF8 bytes/WebCrypto SHA·실제 timer 취소3개가 통과했다. Node20/24 interaction bundle의
137,519B는 기존137,500B ceiling을 넘었으며 실패 원문을 보존하고 같은 측정을 최소137,600B에
재검산했다. 이미 통과한 runtime을 새로 통과한 것처럼 다시 계산하지 않는다.

합산 package는1260entries/Node22packed1,811,311/Node20·24packed1,814,595/
unpacked8,161,542B다. 최소 artifact ceiling은1260/1,814,600/8,161,600으로 정합했다.
Runtime 자원 제한이나 원 workload·수식·iteration을 줄이지 않았다.

이 checkpoint는 현재 v1 전체 호출을 비동기로 바꾸지 않는다. 새 cursor만으로 초기 snapshot,
큰 BigInt 변환, 넓은 record 열거, worker transport, 최종 물질화의 취소 응답시간을 보장할 수 없다.
Route v2의 구체 opt-in 정책과 native 연결은 후속 구현 의무이며57–70/77 완료를 주장하지 않는다.
