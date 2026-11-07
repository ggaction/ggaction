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
- [x] private checkpoint commit/push (`e3ecebe47`, format5 branch 통합 시 owner57·경계23 재검증)
- [x] 공개 format5/Geo2 연결과 전체 소비자 closure
- [x] 동일 archive3Node·실제 browser·원100k 및 batch 가드 검증

## Private 검증 결과

- Node20.20.2/22.23.1/24.22.1 각57개: 기존 columns1, 새 numeric columns, 실제1000vertex Geo native/current rebase 전송, 기존 scope/capacity/envelope, 고정 v3/v4 여섯 payload 회귀.
- 변경2owner critical: columnCodec 100/98.33/100, numericColumns 100/100/100. 전역 coverage나 공개 format5 통과 주장이 아니다.
- source/package/discovery37 + package artifact/documentation10 통과. 새 공개 export/type 없음.
- Package1259entries/unpacked8156156; packed Node22 1809598, Node20·24 1812879. 최초 entry/unpacked/Node20 packed 초과 로그를 보존하고 실측 최소 cap1259/1812900/8156200만 정합했다. 이 값은 제품의 node/work/byte 한도를 바꾸지 않는다.
- 실제 Geo 전송의 첫 음성시험은 테스트 자체가 `geos.state.groups`로 잘못 접근하여 실패했다. 실제 저장 owner `geos.groups[].presentation.geometry.parameters`로 고친 뒤 변조 거부를 확인했다. 원 실패 로그를 보존하며 제품 수리로 주장하지 않는다.
- 여섯 legacy JSON은 `test/fixtures/animation/legacy-geographic/`의 안정 runtime fixture이며 일반 시험은 이 record를 import하지 않는다.
- 이번 private checkpoint는 실제100k·publicformat5·Geo@2·source-free4renderer·설치 archive/P95 검증이 아니다. 이 후속은 다음 공개 checkpoint에서 닫는다.

## 재개 통합 검증

Root `070bc048b` 기반 format5 branch에서 private source 두 파일을 그대로 병합했다. Node22 owner57/57 및 package/discovery23/23을 새로 통과했다. 원 three-Node/critical 결과는 동일 private source 증거를 재사용하며 새 공개 format5 결과로 확대하지 않는다.

## Public format5와 Geo2 기능 검증

명시 own `formatVersion:5`에만 `animation-columns@2`를 연결했다. 실제 own capacity를 가진 native Geo group이 있으면 `native-geo-camera@2`를 저장하며, 기본 group만 있으면 기존 Geo kernel을 유지한다. 원 v3/v4 선택·전송 bytes·fallback은 고정 legacy payload와 함께 검증했다. 타임라인·offline·현재 frame rebase에도 같은 exact closure와 원 quota를 적용하고, 복원된 frame은 native 의미 변경 권한을 얻지 않는다. Group별 path capacity 검사는 기존 node 순회에서 묶으므로 group×node 재탐색을 만들지 않는다.

최종 [qualification](geo-format5-evidence/qualification.json)의 archive SHA256은 `762a402903f0cd58172683aa916b3af7b645f7327fb9ab41a35f3b0e5e3fd64c`다. 이 실제 설치본으로 Node20/22/24에서 선택 runtime·strict type·animation 문서8개·6개 browser entry를 검증했다. Source-free production minified browser는 v3/v4/v5 각각 DPR1/2를 통과했으며, Geo2 native/offline Canvas PNG와 SVG 및 설치 소비자의 PDF vector를 비교했다.

- 원 A1 입력의 1k/10k/100k 점에서 각각1999/19999/199999 commands 전체와 모든 좌표를 독립 수식으로 검산했다. Native t0/.5/t1, 현재 frame rebase, 전체 offline frame 및 bytes 왕복이 통과했다. 최종100k 최대 좌표 오차는3.98e-13 미만이다.
- 원100k native10,682,358B/rebase10,686,134B이며 준비 work5,779,050, 실제 단일 sample callback work2,088,916이다. 기존 batch10M에서4개는 통과하고5개는 거부된다. 1k에서 기존 v3/v4/v5 callback 배열도 정확히 같다. 기본 aggregate10000·명시 group 정책·전체work10M·원 physical/expanded/storage/descriptor 한도를 변경하지 않았다.
- Animation owner810/810, 마지막 multiple-group/rebase 보강1/1, source/package/discovery37/37, artifact10/10, manifest1/1, docs247/247, final provenance/package9/9, budget docs3/3, renderer52/52를 통과했다. Cartesian·Polar·guide·GeoText·Graph·Partition의28 family fixture를 v3/v5 whole-frame 및 offline/rebase로 비교했다.
- 변경 source4owner critical line/function100%; branch는 planner94.47%, geoTracks100%, geoState97.96%, geoPresentation95.29%다. 전체 repository suite를 새로 완주했다는 주장은 아니다.
- 실제 package1260entries/unpacked8,163,107B, packed Node22 1,811,425B / Node20·24 1,814,701B에 cap1260/1,814,800/8,163,200을 적용했다. Animation gzip 최대342,693B에 cap342,700, 검색1,096,414B에 cap1,096,500을 적용했다. 최초 초과·시험 oracle 오류·optional peer 설치 누락 로그와 이전 archive 증거는 별도 보존했다.

재현 스크립트는 qualification 폴더의 `large.mjs`, `format5-installed.mjs` 및 압축된 browser helper다. 원 작업 위치는 각각 `.artifacts/format5-resume/large.mjs`, `.artifacts/format5-installed.mjs`, `.artifacts/format5-resume/browser-installed.mjs`이며 archive를 `.artifacts/format5-resume/extracted/package`에 풀어 실행한다. 압축 원 로그·영수증과 각 SHA는 qualification의 `evidenceFiles`에 있다.

이 checkpoint는 공개5/Geo2 기능 admission을 닫는다. Canvas 50ms/P95, 원100cycle, 큰 Geo hit/query, 전체 STEP077 통합 및 보호된 release는 별도 남는다.
