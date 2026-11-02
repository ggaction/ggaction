# Native route continuation 합산 검증

기존 route/source DAG와 Canvas/screen/guide/responsive owner의 private generator 단계를 통합했다. 동기 v1은 같은 순서를 즉시 소비하며 native v2 준비만 실제 계산 완료 경계에서 대기한다. Exact constructor 등록과 원 primitive proof, receiver 검사, abort·ledger 경계, wrapped child action을 유지한다. Basic에는 graph solver나 host 의존성을 추가하지 않았다.

[합산 증거](route-stages-merged-evidence/qualification.json)는 변경된 runtime source가 upstream e5e71407f와 일치함을 검산한다. 합산 owning 1,423개 및 focused 23개, source/package/discovery 경계가 통과했다. 동일 canonical archive를 Node20/22/24에 설치하여 각각 public8·private9 cases, strict types와6bundles를 검증했다. Chromium minified 실제 worker7개가 모두 종료되었고 listener0과 abort publication0을 확인했다. 잘못 지정한 존재하지 않는 test selector의 최초 실패 로그도 보존한다.

Package1268entries/unpacked8,227,339bytes, Node22packed1,826,695·Node24packed1,830,363bytes다. 합산 Full793,118/Basic426,399/animation343,663/interaction140,166gzipbytes를 측정해 기존 artifact ceiling만 정합했다. Runtime quota·원 workload·SLO는 변경하지 않았다.

이는 private native continuation의 통합 checkpoint다. 공개 B update, 전체 consumer union, fit/data/composition, 원 route capacity, 전체100ms와 최종P95·100cycle lifetime은 미완료이며 STEP057–070/077 완료로 세지 않는다.
