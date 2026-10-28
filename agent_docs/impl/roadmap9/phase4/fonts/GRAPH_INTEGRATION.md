# Font와 GraphPlot 통합

## 진행 상태

- [x] Font 통합 `21f5c80eb`와 GraphPlot `af05c7dd8`의 runtime/type/Current/문서 합집합 보존
- [x] Tree/treemap/graph label의 exact font 연결과 typography dependency closure 검증
- [x] 새 layout 계산 없이 font 교체·제거·codec·renderer 소비 검증
- [ ] Source commit 고정 및 canonical provenance 재생성
- [ ] 고정 artifact의 최종 설치 증거와 remote checkpoint 기록

기존 blanket 승인 `b758b912` 범위의 통합이다. 새 API나 저장 필드를 추가하지 않으며,
STEP033–035 theme 작업은 이 checkpoint에 포함하지 않는다. Main 통합은 parent가 소유한다.

## 발견한 교차 누락

Graph/tree/treemap은 concrete Text를 직접 만들었지만 exact font binder를 호출하지 않았다.
공통 typography 계획도 이 mark들을 포함하지 않아 exact width query가 준비되지 않았고,
font 교체 뒤에도 resource-backed label을 갱신하지 못했다. 각 materializer는 기존
`bindTextFontProperties`를 사용하며, typography 계획은 기존 `materializeGraphPlot`,
`materializeTreePlot`, `materializeTreemapPlot`를 실행한다. Layout resource와 결과 객체는
그대로 유지한다. Layout/force solver를 재실행하는 경로는 추가하지 않았다.

신규 회귀 6개는 실제 font query·누락 편집 원자성·provider revision·profile 제거·offline
복원·Canvas/PNG 동일 픽셀·SVG embedded font·PDF vector text·Canvas scene을 검증한다.
이는 모든 backend의 antialiasing이 같다는 주장이 아니다.

## 검증 범위

- 병합 focused 68/68, exact label와 기존 font/resource lifecycle 53/53.
- 변경 materializer instrumentation 42/42. Graph plot 100/100/100,
  hierarchy plot 100/98.18/100, typography 95.35/96.15/100으로 기존 해당 floor를 유지한다.
- Source/type/discovery/compact action card 41/41, package 및 action hierarchy 16/16.
- 기존 theme/composition/scoped typography 회귀 51/51.
- Public docs 최초 131개 중 130 통과. 유일 실패는 source commit 전 branch에 새 GraphPlot
  example이 없어 exact source-link를 찾지 못한 것으로, commit 후 owning 검사로 다시 검증한다.
- 같은 고정 tar Node22: 최종215/215 Node 사례,76/76 tutorials, 나머지6 qualification group 통과.
- 공개 union inventory는317 actions /27,999 option paths / renderer 제외33,693 ledger entries다.
- 전체 font와 GraphPlot source 검사는 각 원 checkpoint의 증거를 유지한다. 부분 검사를
  합성 전체 coverage 비율로 바꾸지 않는다. 공통 realistic 3파일은 Flow/Partition을 포함한
  parent 최종 합산에서 실행하며 여기서 중복 corpus 실행을 하지 않는다.

## Artifact와 실패 보존

고정 검증 tar SHA256은 `0ab70b40e7ea3e16ab7543c6f33c1d6992e6662b096d857d19673b3e3b49ae0c`다.
821 entries / Node22 1,205,559 packed / 5,551,125 unpacked bytes이며, 같은 staged source의
Node20 packed는 1,208,302 bytes다. 최소 한도821/1,209,000/5,552,000으로 조정했다.
Node20 Full/Basic/SVG gzip600,160/348,432/19,199 bytes에 맞춰601,000/349,000/25,000을
사용한다. Search index는912,833bytes이며 최소913,000bytes로 조정했다.

설치 첫 실행215개 중214개가 통과했다. 신규 fixture가 `prepareTextMetrics` host에 불필요한
`load`를 넣어 closed record 검증에서 거부되었다. Fixture만 고치고 같은 tar의 Node 사례를
다시 실행하여215/215 통과했다. 첫 실행의 나머지6 qualification group과76 tutorial은 통과했으며 최초 오류와
수정 후 증거를 분리한다. 생성 과정의 불완전 합집합 실패도 로그로 보존한다.
