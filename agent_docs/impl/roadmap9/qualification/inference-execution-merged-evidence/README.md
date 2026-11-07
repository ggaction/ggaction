# 명시 inferred graph 실행 정책 통합

기존 remainingApproval과32c26e969 구체안 채택을 재사용했다. 원10000nodes/k10 전체100000간선과 source rows·방향·typed key를 보존한다. 기본10M과 일반 layout/graphic/route 한도는 유지하며 명시 owner별 execution 정책만 전달한다. Native receiver/state와 renderer 경계는 기존대로다.

루트 source210, contracts31, coverage-policy7, docs242를 실제 실행했다. 일부 회귀와 owning 검사는 중복 범위로 합산하지 않는다. 동일 archive를 Node20/22/24 각각 설치해3runtime(원100k간선 포함), strict 타입·실행문서·optional peers·6entry bundle를 검증했다.16개 runtime owner는 incoming2f768950d와 byte-identical이라 기존 critical coverage를 재사용하고 root 전수 coverage를 새로 실행했다고 주장하지 않는다. 선언은 먼저 합친 point100k 추가를 보존한 채 inference execution 선언을 합쳤다.

최초 unmatched selector 오류, package entry/packed 상한 실패, 검색 크기로 실패한 문서2개를 원본 그대로 보존했다. 측정1246entries/Node20·24 packed1,791,515/unpacked8,062,345에 최소1246/1,791,600/8,062,400 상한, Full785,427에785,500, 검색1,091,539에1,091,600만 적용했다. 별도 runtime 작업량·P95·heap 기준은 변경하지 않았다.

기존 editable program86,871,543bytes exact roundtrip 증거는 source가 같은 upstream에서 재사용한다. 일반 program codec에64MiB 전역 guard가 없음을 유지한다. Worker 공개 통합과 실제 최종 AT82 성능 자격은 다음 작업이며 STEP077 전체 완료로 세지 않는다.
