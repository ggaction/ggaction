# 둥근 범례 표본의 기존 편집 계약 복원

## 진행 상태

- [x] 공개0.0.21재현 및 원인 범위 축소
- [x] 기존 계약/승인 범위 확인
- [ ] 회귀 테스트와 구현
- [ ] 변경 범위 검증/후보 commit push
- [ ] 정규200개 차트 릴리즈에서 통합·배포

이슈: https://github.com/ggaction/ggaction/issues/234

## 결정과 승인

사용자의 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는200개 단위로 하자” 지시를 이 진행 중 작업의 승인으로 기록한다. 이번 수정은 새 옵션/저장 schema/action을 만들지 않는다. Current LEGEND_AND_TITLE의 기존 “symbol recipe changes reconcile concrete graphic types without leaving stale objects” 동작을 복원한다. 새로운 시각 목표가 아니라, 동일 recipe를 처음부터 선언한 기존 공개 프로그램의 완전한 concrete 결과와 편집 결과를 일치시키는 목표다. 차트 이미지 관찰 제외 지시는 유지하고 graph/order/backend/decoded pixel 동등성으로 검증한다. 추가 승인 질문이나 개별 패치 릴리즈는 없다.

## 재현과 원인

`createBarPlot` 뒤 `editBarMark({cornerRadius:1})`와 categorical color/legend를 만들면 기본 swatch가 둥근 path를 담은 collection으로 실체화된다. 기존 `editLegendSymbols({symbol:{width:10,height:10}})` 또는 layered swatch는 radius 없는 rect recipe로 전환한다. `makeEditSymbol('swatch')`가 현재 collection을 잘못 거절한다. radius가0인 대조군은 성공한다. 최소 재현은 이슈 본문에 있다. 단순 default-circle 예제는 실패를 재현하지 않으므로 초기 진단에서 제외했다.

## 구현 경계

기존 swatch rematerializer는 rect/collection 모두를 유효한 이전 표본 소유자로 받아들인다. 최종 rect/rounded-path 선택과 stale property 정리는 기존 `replaceGraphicItems`/`materializeRectItem`에 맡긴다. Swatch의 전체 items를 이 owner가 치환하므로 그 전에 collection에 rect 전용 length 편집을 하지 않는다. Line/point/shape/clip의 기존 검사와 공개 오류는 유지한다. 명시적 domain action과 trace, immutable program, semantic/graphic/renderer 경계를 바꾸지 않는다.

## 완료 조건

둥근→직선 swatch, auto 복원, 반복 전환, mixed recipe, Full/Basic 공개 흐름, 이전 program 불변성, 전체 concrete graph/order와 birth-recipe 비교, persistence 및 facet replay를 검사한다. 별도 owner/신규옵션은 추가하지 않는다. 해당 guide normal tests/필요한 render 검증과 전체 normal suite를 실행한다. 이미 공개된 버전·번역 runtime은 유지한다. 정규 다음 checkpoint1413에서 후보를 통합하고 배포할 때 나머지 release checks를 수행한다.
