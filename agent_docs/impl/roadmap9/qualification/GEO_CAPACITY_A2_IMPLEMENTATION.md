# Geo A2 C안 구현과 검증

## 채택 및 체크포인트

Root의 2026-11-02 최종 go는 [AUTHORIZATION.remainingApproval](../AUTHORIZATION.json)을 재사용하여 [C안 제안](GEO_CAPACITY_A2_PROPOSAL.md)을 채택했다. 새 managed WT는 root source `1e743f08b`에서 시작하며 기존 A1/A2 설계와 hit/consumer 작업은 원 branch에 보존한다. 추가 승인 질문이 필요한 새 API 범위를 만들지 않는다.

1. Private columns@2: 같은 column owner에서 별도 v2 reader/writer 진입만 추가한다. 기존 v1 reader/writer의 header/byte/오류순서는 그대로다. 중간 checkpoint는 format5 공개 지원이 아니다.
2. Public `formatVersion:5` + native-geo-camera@2: 명시 own5만 새 형식을 선택하며 node 옵션 추가 의무는 없다. default 각각10000/기존 명시 최대를 유지한다. Native exact capacity group만@2에서 정책을 전달하고 default aggregate10000·전체work10M·batch10M을 유지한다. 실제 native/restore/rebase/timeline/4backend closure 뒤 Current/type/docs/설치 증거와 함께 공개 checkpoint를 닫는다.

두 단계 모두 physical64MiB/1M/depth128, scoped expanded12M/cell+descriptor16M/prepared140M을 바꾸지 않는다. Generic encodeValue/core/renderer의 semantic 조회 변경0. 원100k large는 root 슬롯 승인 뒤 단독 직렬 실행하며 P95와 기능 admission을 구분한다.

## Legacy baseline

기준1e743의 현재 작은 3point geographic line을 실제 v3/v4로 준비·중간샘플·serialize/restore했다. 기본 binding은 typed native-geo이며, own capacity1000/200000을 명시한 binding은 양 버전 모두 성공하되 `edited-geo-graphics` crossfade다. 새 버전 연결 때 이 원래 fallback을 강한 reject로 바꾸지 않는다. 너무 낮은 capacity10은 planner 이전 native create의 refined-points guard에서 실패한다.

원 영수증·전송문자열·각 시각의 전체 frame hash·낮은 정책 최초 stack을 `geo-capacity-columns2-evidence/legacy*`에 보존한다. 생성된 원 native logical IDs를 문자열 안에 그대로 저장했으므로 새 reader의 byte 동일 왕복을 직접 검증할 수 있다. 임의 finite endian 변조가 모두 검출된다고 주장하지 않는다. Binary는 fixed little-endian 해석, digest는 전송 무결성, native forward proof는 입력 의미/그래픽 정합을 각각 담당한다.

## Private columns@2의 최소 책임

- 기존 Node variant를 유지한다. Singleton compound와 constant compound를 literal 아래 숨기지 않고 같은 array/object/records 노드로 내려간다. Scalar/mixed/nonfinite/holes의 기존 값과 순서는 정확 보존한다.
- Numeric vectors만 닫힌 `{kind:'float64-le',length,base64}`로 무손실 저장한다. 작은 `numericColumns.js`는 고정LE·canonical base64·finite IEEE754 검사만 소유한다. 새로운 geometry 계산이나 source recipe가 아니다.
- Writer는 packed payload를 만들기 전에 기존 physical/encoded/byte의 retained lower bound와 declared storage cell 비용을 검산한다. Reader는 모든 vector의 선언길이/padding/문자 길이 및 unused pool 포함 storage 비용을 먼저 합산한다. 실제 selector와 raw tree 복원 전에 원 logical occurrence·reference cell·descriptor 증폭을 검산한다.
- Reader의 packed scalar 조회는 고정8byte scratch로 정확LE 값을 읽을 수 있어 전체 vector buffer를 먼저 할당하지 않는다. 최종 raw tree 할당은 모든 root expansion 검증 뒤다. 저장 pool 반복참조가 logical 비용을 숨기지 못한다.
- 기존 v1 진입은 version2를 받지 않으며 새 진입은 version1을 자동 승격하지 않는다. Public format5 선택·kernel manifest는 후속 planner의 닫힌 책임이다.

## 진행 상태

- [x] 기존 승인 재사용과 C안 채택 기록
- [x] 제품 변경 전 legacy capacity fallback/byte/frame baseline
- [x] private columns2 구현·엄격 수치/변조/증폭·기존 columns1 회귀·critical 검사
- [ ] private checkpoint commit/push
- [ ] 공개 format5/Geo2 연결과 전체 소비자 closure
- [ ] 동일 archive3Node·실제 browser·원100k 및 batch 가드 검증

## Private 검증 결과

- Node20.20.2/22.23.1/24.22.1 각57개: 기존 columns1, 새 numeric columns, 실제1000vertex Geo native/current rebase 전송, 기존 scope/capacity/envelope, 고정 v3/v4 여섯 payload 회귀.
- 변경2owner critical: columnCodec 100/98.33/100, numericColumns 100/100/100. 전역 coverage나 공개 format5 통과 주장이 아니다.
- source/package/discovery37 + package artifact/documentation10 통과. 새 공개 export/type 없음.
- Package1259entries/unpacked8156156; packed Node22 1809598, Node20·24 1812879. 최초 entry/unpacked/Node20 packed 초과 로그를 보존하고 실측 최소 cap1259/1812900/8156200만 정합했다. 이 값은 제품의 node/work/byte 한도를 바꾸지 않는다.
- 실제 Geo 전송의 첫 음성시험은 테스트 자체가 `geos.state.groups`로 잘못 접근하여 실패했다. 실제 저장 owner `geos.groups[].presentation.geometry.parameters`로 고친 뒤 변조 거부를 확인했다. 원 실패 로그를 보존하며 제품 수리로 주장하지 않는다.
- 여섯 legacy JSON은 `test/fixtures/animation/legacy-geographic/`의 안정 runtime fixture이며 일반 시험은 이 record를 import하지 않는다.
- 이번 private checkpoint는 실제100k·publicformat5·Geo@2·source-free4renderer·설치 archive/P95 검증이 아니다. 이 후속은 다음 공개 checkpoint에서 닫는다.
