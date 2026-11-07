# Bounded native route v2 합산 검증

기존 compiler·format5·decoder 개선 위에 source a29ec070e/pin b86503b56의 명시 bounded-route@1을 통합했다. 37개 packed source hash가 upstream과 일치한다. 기존 v1 기본 동작과 sync/hash/guard는 유지한다. 공개 create/edit가 실제 worker completion을 private native plan으로 검증·물질화하며 입력 전체와 취소·deadline·최종 apply까지 기존 소유자를 유지한다.

[증거](route-v2-merged-evidence/qualification.json)는 owning181개, 최초 docs246통과/1실패 및 strict search cap 교정 뒤31개 통과를 보존한다. Search1,097,221bytes와 strict `<` 정책 때문에 cap을1,097,222로 맞췄다. 동일 canonical archive를 Node20/22/24에 설치해 각8개 실제 public case, strict types,6개 bundle을 확인했다. 각16worker가 전부 종료되고 listener0이었다. 동일 engine의 기존 v1과 v2 geometry hash는 모두 정확히 같다. Density의 Node24 차이는 upstream 숫자 비교 기록대로 보존하며 engine 사이의 bit 동일성을 주장하지 않는다.

실제 Chromium minified worker로 create/edit·Canvas/SVG·abort/deadline과 문서2블록을 실행했다.7worker가 모두 종료되고 listener0, 취소된 작업의 publication0이다. Full792,657/graph74,445/animation343,607 gzip bytes(Node20/24)를 확인했고 animation cap만 기존343,600에서 실측343,607로 갱신했다. Package는1267entries/unpacked8,208,038bytes, Node22packed1,822,674·Node24packed1,826,547bytes다. 실행 quota나 원 workload는 줄이지 않았다.

이는 route v2의 첫 native create/edit 통합 checkpoint다. 후행 route/source/screen/guide/fit/composition continuation, 다중 policy와 held sample, 원 density1k/10k, 전체100ms/P95 및100cycle retained lifetime은 미완료다. STEP057–070/077 전체 완료로 세지 않는다.
