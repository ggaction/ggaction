# 명시적 fold 결과를 facet partition 경계로 사용 (#221)

## 진행 상태
- [x] 최신 issue221 OPEN 본문과 현재 dependency planner/child derivation/architecture/contract를 읽었다.
- [x] 기존 사용자 standing approval(2026-10-18 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함”)을 재사용한다. 승인 근거는 번역 프로젝트 reports/v12-sequential1500-standing-design-approval-and-200-family-releases-20261018.json. 재질문하지 않는다.
- [x] 구현 전 아래 구체적 경계와 수치 목표를 기록한다.
- [x] 공개21/현재 후보에서 두 오류를 재현했다. private planner preview는 정확한 네 값/원시2행/접힌4행/패널 순서 및 bar 좌표를 독립 수식으로 통과했다. 실제SVG SHA256 3572d809ad09e927c656262bff06e9280bb40fd39131dc19815a8361674e3f5a.
- [x] 구현/focused16 및 unit3342/contracts576/docs120/charts620 =4658 PASS. 설치 SVG/PNG/PDF/type/패키지 검사 PASS.
- [ ] source/docs checkpoint push 및 source commit 뒤 provenance 재고정.

## 결정
`facet`와 같은 planner를 쓰는 `facetGrid`에서 기존 `data` 옵션이 **모든 표시 layer의 공통 ancestor인 materialized fold dataset**을 명시하면 그 dataset 자체를 partition anchor로 허용한다. fold의 원래 wide source와 transform 정의/전체 materialized 행은 그대로 보존하고, 기존 filterData가 anchor 뒤에 cell별 view를 만든다. anchor 이후 dependency만 기존 wrapped replayDerivedData와 rebindLayerData로 재생한다. Fold를 raw row-preserving으로 재분류하지 않으며 다른 통계 transform을 anchor로 새로 허용하지 않는다. Omitted data의 기존 row-preserving inference 및 raw-field partition/replay는 그대로 유지한다. 원시/접힌 행의 multiplicity와 순서를 보존하며 표를 수동으로 대체하지 않는다.

별도 public 옵션, persisted key, action, renderer branch, private snapshot alias를 만들지 않는다. 저장된 기존 data/dependencies.anchor가 선택한 실제 fold snapshot을 참조한다. Missing/noncommon/nonmaterialized fold, field 누락, 서로 다른 원본과 다른 통계 anchor, cycle 및 unsupported transform 거부는 유지한다. Explicit source 및 derived revision은 기존 retained-template/DAG 교체로 재검증한다.

## 독립 수치/그래픽 목표
원본 [{country:USA,gold:10,silver:20},{country:Canada,gold:7,silver:26}] 두 행, fold gold/silver의 원래 네 행을 그대로 보존한다. `facet({field:k,data:long,columns:2})`의 패널 순서는 gold,silver이며 각 패널의 country 순서는 USA,Canada, 값은 [10,7] 및 [20,26]이다. Shared Y domain은 원래 전체표와 같아야 하며, 부모/child Canvas의 explicit dimensions/margins를 변경하지 않는다. 기존 field country facet 결과는 그대로다. 픽셀을 보지 않고 실제 source/transform/parent/child/mark/guide geometry와 SVG/PNG/PDF 및 저장 복원을 검증한다.

## 검사와 배포
집중 pure planner/parent-child lineage/descendant replay/negative atomicity/source+fold revision/grid/scales+guides/저장 회귀를 추가한다. 기존 전체 unit/contracts/docs/charts, 타입과 설치 소비자 검사를 수행한다. Source/architecture/current contract/공개 문서/생성 문서를 한 checkpoint로 동기화한다. 승인된200개 추가-family cadence에 따라1413개 시점의 배포 후보에 수집하며 현재 번역 runtime 공개0.0.21은 바꾸지 않는다. 새 numerical tolerance나 rowlimit 완화는 하지 않는다.

Private 수치 목표: sharedY[0,30], child plot105×200, baseline270, x52.35/104.85, width37.8; y=70+(200-200×(v/30)), height=270-y를 네 값 모두 exact IEEE 비교했다. source/child 크기160×320은 변하지 않는다. Proof SHA256 72a6357131f8de9f3f9ad4b676d7cd75ee4add4963da8b51b654f8b2025ae4a5.

첫 private target 확인은 값7에서 동치 실수식의 IEEE 연산 순서 차이로 실패했다. 로그를 보존하고, 표준 endpoint+delta×ratio affine 식으로 독립 수치 기대값을 명확히 했다. 오차 허용/데이터/렌더러는 바꾸지 않는다. 구현 후 첫 public 회귀의 추가 두 실패는 테스트의 잘못된 filter range 배열과 기존 band scale ID를 재사용한 mixed-point 설정이었다. 각각 문서화된 min/max 객체와 별도 명시 scale ID로 고친다. 성공은 후속 실제 실행으로만 기록한다.

정확한 private preview는 마지막성공 실행 private-preview-exact-target-corrected-v2.log와 private-preview-proof.json이다. 먼저 기록한 proof hash는 수치 assert 추가 전 rendered-only 산출물이며 private-preview-before-implementation-rendered-only.json으로 보존했다. 기존 후보 구현 전 재현 네 건은 private-preview.log에 보존한다. 첫 corrected 실행은 이미 수정한 live 후보를 실패해야 할 baseline으로 다시 실행하여 실패했고, 이후 baseline을 git HEAD의 변경 전 파일로 고정해 실제 공개21과 독립 preview를 확인했다. 모든 실패와 관찰을 보존하고 수치 성공을 부풀리지 않는다.

최종 exact target proof SHA256: 63165ca605af0e647f7899b15df690b38d11f188ee5ca4d05218de5a7247bd18. 수치 assert와 source/current-prefix 불변 검사가 성공한 corrected-v2 실행에 바인딩한다. Public+persistence/revision/grid/scales/duplicates/fold-edit9개와 pure planner7개, 합16개가 focused-expanded.log에서 통과했다.
