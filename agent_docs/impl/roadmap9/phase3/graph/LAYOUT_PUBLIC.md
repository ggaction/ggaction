# Graph layout 공개 연결 검증

## 진행 상태

- [x] fixed/circular/force 공개 action, exact resource refs, editLayout facade, data revision closure
- [x] typed fixed positions, deterministic force pins/packing, immutable state and stored validation
- [x] current/type/source/docs/example source 동기화
- [x] 5개 실제 dataset × 3 methods 및 전체 direct lifecycle 검사
- [x] 같은 tar의 Node 20/22/24 설치 graph consumer 확인
- [ ] GraphPlot 통합 checkpoint에서 새 discovery summary override 누적 한도 문제 해결
- [ ] Graph 전체 consumer matrix, inference/facet/filter/후행 paint/controller 의무

## 고정 입력과 결과

Runtime source는 `cbcaaf991`이며 사용자 범위 승인은 `../../AUTHORIZATION.json`을 재사용했다.
[manifest](layout-public-evidence/manifest.json)는 최초 실패와 보정 뒤 결과를 모두 압축 보존한다.

- `graph-layout-coverage-final.log`: 25/25, 새 7개 critical owner 모두 policy floor 통과; aggregate 100/95.88/100.
- `graph-layout-boundaries.log`: 201/201. 이후 null/default와 stored limit 검증 보강은 final focused coverage에 포함했다.
- Types 2/2, 5개 실제 dataset의 세 layout methods 5/5.
- Canonical realistic runner에서 direct-lifecycle 및 feature inventory 26/26. 50개 dataset profile와 temporal-eligible profile를 포함한다. 전체 2,906,632ms의 종료 결과를 보존했다.
- Docs 최초169중167 통과 후 CHANGELOG/section 문제 수정, affected18/18. Built153pages/1302artifacts 및 desktop+320/390/768 browser 검증 통과.
- 고정 archive SHA256 `850bfed0f24df10c15b3ef4959004514345f97a3390fba81d4cb4051b88ed8c0`의 observed-graphs 설치 fixture를 Node20/22/24에서 통과했다. 이 fixture는 graph와3layouts, restore/edit/Basic 경계를 검증한다. 전체 installed matrix를 새로 실행했다는 뜻이 아니다.
- Node20 canonical package803entries, packed1,183,749/unpacked5,438,055; Node22 packed1,181,530이며 unpacked는 같다. 한도803/1,184,000/5,439,000.
- 같은 archive Node20 Full590,307/Basic342,113 gzip. 현재 한도591,000/343,000 안이다. Search900,853/901,000.

## 통합 시 확인할 항목

GraphPlot 작업의 전체 contract 검사에서 새 `layoutGraph` summary override가 기존20개 제한을 초과함을 발견했다. GraphPlot 브랜치에서 해당 불필요 override와 추가2개를 제거하여 일반 생성 경로로 복귀했다. 이 문서는 runtime 검증 증거를 보존하며 그 discovery 보수가 검증되기 전 전체 공개 graph checkpoint 완료를 선언하지 않는다.

현재 snapshot은 관측 graph→layout까지의 결과다. GraphPlot의 source revision rematerialization과 node/edge selection·rendering은 별도 구현으로 이어지며 STEP-021 전체 또는 Roadmap 9 완료를 뜻하지 않는다. Shared direct resource builder 변경 뒤 추가3개 realistic 파일은 최종 통합 상태에서 한 번 검증한다.
