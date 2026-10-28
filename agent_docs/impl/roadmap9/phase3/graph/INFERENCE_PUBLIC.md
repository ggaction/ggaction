# 그래프 추론 공개 checkpoint

## 진행 상태

- [x] 여섯 inference rule의 공개 생성·수정과 exact source/candidate binding
- [x] graph→inferred graph→layout→plot 갱신의 사전 검증과 단일 revision
- [x] 저장 검증·선택·inspection·접근성·엄격한 타입·Full/Basic 경계
- [x] 동일 package archive의 Node20/22/24 설치 실행
- [x] 실제 데이터·문서·생성 inventory와 변경 owner의 coverage
- [ ] induced-view/recompute filter, controller orphan event 및 최종 교차 통합

[전체 승인](../../AUTHORIZATION.json)을 재사용한다. 구현 commit은 `f07681cdc`,
최종 공개 metadata와 generated descriptor를 포함한 source commit은 `009b16ed1`이다.
[Manifest](inference-public-evidence/manifest.json)는 source 입력800개의 hash, 원본 실패와
보정 로그, 설치 receipt를 보존한다. 이 기록은 STEP-029–032 및 전체 Roadmap9 완료 선언이 아니다.

## 구현과 검증

`createInferredGraphData`와 `editInferredGraphData`는 knn/radius/similarity/mst/group/sequence를
기존 공통 graph model로 저장한다. 명시 exact/approximate search, typed tie, zero/negative
similarity, missing/limit 정책을 보존한다. 원 source row와 candidate graph의 exact revision을
추적하며 source chain을 갱신할 때 각 graph/layout/plot을 한 번만 materialize한다.
저장 복원은 model·diagnostics·source의 일관성을 검사하며 pair search나 solver를 다시 돌리지 않는다.

- 최종 집중 검사64/64. 새 inference/state/context의 lines/functions100%, inferred state branches92.89%;
  selector를 포함한 aggregate99.78/94.23/100. 적용되는 critical owner6개의 기존 floor를 모두 유지했다.
- 타입·action card·descriptor·source/package 경계34/34. 최종 package 한도 변경 뒤 owning7/7.
- 실제 데이터5종×knn/MST/sequence3종은 canonical bounded runner15/15.
  변경된 generated inventory도 같은 bounded runner7/7이다. 앞선 bounded 인자를 생략한 실행7/7는
  별도 기록이며 canonical 증거로 대체해 주장하지 않는다.
- 전체 unit 첫 실행5601/5602, contract722/723. 실패는 새 realistic 파일의 timing manifest와
  discovery 예상 개수 각1건이다. 실제 측정값을 등록한 뒤 owning20/20 통과했다.
  전체 suite 재실행이나 통합 branch의 전수 통과로 표시하지 않는다.
- 공개 inventory317actions/28,111option paths/18,935required/9,176excluded,
  ledger33,859requirements를 실제 inventory에서 확인했다.
- 문서172/172, built155pages/1,331LLM artifacts, desktop search와 전체 문서320/390/768px,
  키보드·Axe 검사를 통과했다. 초기 search payload, changelog 명칭, 실행 예제 등록의 실패4개도 보존했다.

Source commit으로 문서 provenance를 다시 고정한 뒤 owning33/33을 확인했고,
source/type800개 입력 hash는 고정 archive와 일치한다.

## 고정 설치 artifact

최종 archive SHA256은 `a23c6d9edb737270909fe774372dc99412217f3fffde978e217876502831b858`이다.
Node20.20.2/22.23.1/24.22.1에서 각각 runtime213/213, tutorials76/76, qualification7/7을 통과했다.
모든 실행의 시작·종료 hash가 같다. 이전 archive `9b4832e…`의 성공 receipt와 최종 artifact는
서로 구분하며, metadata 보정 뒤 새 archive를 다시 세 환경에 설치했다.

최종 archive는814entries, packed1,200,162/unpacked5,535,332bytes다. Node20으로 별도 packing하면
같은 입력의 gzip 차이로1,203,209bytes여서 packed 한도를1,204,000으로 최소 조정했다.
Unpacked 한도5,536,000, entries814. Full613,000/Basic346,000/SVG25,000 gzip 한도는 유지했다.
Node20의 이전 packed 한도 실패도 보존했다. Registry publish 및 docs deploy는 실행하지 않았다.

## 남은 통합

GraphPlot의 topology 보존 induced-view filter와 explicit recompute를 연결해야 한다.
Orphan selection drop event는 후행 controller에서 닫는다. Fonts/theme/Partition/Flow/paint의
공통 branch 합류 뒤 shared realistic lifecycle3파일과 전수 source coverage를 다시 검증한다.
단독 inference checkpoint의 설치 결과를 그 후속 통합 결과로 간주하지 않는다.
