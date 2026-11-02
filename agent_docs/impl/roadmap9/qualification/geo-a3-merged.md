# Geo path hit index와 raw projection 합산

Route v2/compiler/decoder 통합 위에 Geo A3 source dd1837f39/pin37d5fcfe4와 raw projection83b487740/pinccd1b2336를 통합했다. 명시 pathGeometry의 Morton index와 모든 indexed shape/clip/query 과금, exact scalar oracle, 원본순서 nearest를 유지한다. Bounds로 안전함을 증명할 수 없는 shape는 기존 full scan을 사용한다. 사전 index allocation guard도 그대로다. Projection의 단일 수학은 그대로 두고 stream에서 즉시 소비하는 중간 결과만 raw로 읽는다. 공개 반환과 최종 projected geometry는 기존 immutable owned 경계를 유지한다.

[합산 기록](geo-a3-merged-evidence/qualification.json): owning443개와 문서·경계279개 통과. 동일 canonical archive를 Node20/22/24에 설치해 실제 runtime/strict types/문서예제/6entry bundle과 Chromium DPR1·2를 확인했다. 원 owning source hash를 비교해 upstream 증거와 연결했다. Node20/24의 animation343,663/interaction140,172 gzip bytes만 실측 cap으로 반영했다.1268entries, unpacked8,223,452, Node22packed1,825,835/Node24packed1,829,581bytes로 archive cap을 동기화했다. 실행 budget과 workload는 그대로다.

Upstream 원100k native/current의 모든 좌표·scalar hit는 통과했지만 sequential 및 fresh rebase plan은 global ownedValues WeakSet rehash에서 멈췄다. 종료된 실행의 partial 결과와 stack은 원 증거에 남는다. 이 합산은 그 실패를 고쳤다는 증거가 아니다. 원100k rebase/offline·P95·100cycle 및 STEP057–070/077의 전체 완료 의무는 열린다. 후속 raw query 변경은 별도 checkpoint다.
