# Basic 인코딩의 같은 타입 scale 재할당

## 진행 상태

- [x] 변경 전49adee7d와 현재4c3cbb6d에서 공개 호출의 TypeError 확인
- [x] 기존 wrapped editScale owner를 Basic receiver에 호출하면 선/범례를 정확히 갱신함을 확인
- [x] 기존 사용자 standing approval과 구체 설계 기록
- [x] 공유 내부 dispatch 구현 및 Basic/Full 경계·동치·원자성 검사
- [x] Current 계약·공개 문서·선언 경계·설치 consumer 동기화
- [x] 전체 검사·패키지·문서·commit/push
- [ ] 기존1282families/9334actual programs의 순차 native 호환 검증과 로컬 후보 채택
- [ ] 다음1413정기 공개 통합 시 release/이슈 종료

이슈: https://github.com/ggaction/ggaction/issues/242

## 승인과 범위

사용자는 진행 중인 차트/파이프라인/ggaction 작업에 관한 기존 및 향후 질문을 모두 승인했다.
기존 명시적 승인을 재사용하며 추가 확인을 요청하지 않는다. 공개 릴리즈는200완료 차트마다다.
현재 공개1213, 다음1413이며1282완료 상태에서 이 변경만 별도 배포하지 않는다.

새 공개 action/option/저장 key/renderer는 없다. Basic의 공개 editScale·focused scale editors·
editLegend·removeLegend를 추가하지 않는다. 기존에 노출된 encode 호출로 같은 타입의 bound
scale을 재할당하는 경로만 복구한다. 일반 편집 lifecycle과 타입 전환의 Full 경계는 유지한다.
이미 지원하는 동일한 scale/mark/guide 결과를 재사용하므로 새 시각 목표는 없다.

## 원인과 구체 설계

`applyEncodingScale`이 재할당 시 `program.editScale`을 호출하지만 Basic은 그 공개 메서드를
등록하지 않는다. 필요한 검증·consumer 갱신 로직은 기존 wrapped editScale에 이미 있고,
Basic이 제공하는 rematerialization 경로로 같은 타입 range 변경을 수행할 수 있다.

1. 기존 `actions/scales/edit.js` owner에 작은 내부 `editScaleForEncoding(program,args)`
   dispatch를 둔다. 공개 method가 있으면 기존처럼 그 method를 호출해 Full subclass override를
   보존한다. 없으면 명시 ID의 기존 scale을 shared selector로 찾는다.
2. Basic에서 args.type이 기존 타입과 다르면 기존 오류 문구
   `Color scale type transitions require the Full ChartProgram; use a new scale id in Basic.`를
   유지하며 거부한다. 타입 생략/같은 타입이면 기존 wrapped `editScale.call(program,args)`를
   호출한다. 새로운 scale ID 생성은 기존 createScale 경로를 유지한다.
3. shared encoding 적용부의 기존 두 editScale 호출과 quantitative-color 타입 변경 분기는
   이 dispatch를 재사용한다. 같은 타입 quantitative color의 기존 설정 경로는 변경하지 않는다.
4. 새 검증/정규화/scale state/guide 계산을 복제하지 않는다. 기존 editScale이 모든 shared
   consumer·정확한 범례 sampling·좌표 의존성을 preflight하고 wrapped 재물질화를 수행한다.
5. 같은 타입 전환에는 범례 family 변경이 없으므로 Full-only legend editor/remover를
   Basic에 끌어오거나 숨겨 등록할 필요가 없다. Basic의 런타임·타입·action-card 공개 경계를
   모두 그대로 유지한다. 원본 program과 caller rows/options, 실패 trace는 불변이다.
6. 관측된 bundle/package 증가가 있다면 실제 installed consumer를 측정한 뒤 기존 최소
   1000byte 반올림 정책으로만 상한을 조정하고 이전 상한 통과로 보고하지 않는다.

## 검증 계획

- 일반 공개 재현 호출이 Full의 동일한 호출과 semantic/graphic/SVG/decodedCanvas 동치.
- Basic이 이미 제공하는 position/color/appearance/dash의 재할당 및 incomplete 순서 독립성.
- 공유 scale의 다른 mark/guide/legend 갱신과 invalid domain/range/unknown의 원자적 실패.
- 기존 quantitative-color 타입 전환의 Full-only 오류와 새 scale ID 대안 유지.
- Full override dispatch와 기존 Full 타입 전환·범례 lifecycle 회귀 유지.
- Basic에 공개 editScale/focused editors/editLegend/removeLegend가 생기지 않음을 runtime/type/
  installed consumer로 검증. Basic 저장은 내부 trace를 허용하고, deserializeProgram은 기존
  계약대로 editable Full을 반환한다. 복원 class/format을 변경하지 않는다.
- 전체 기존1282families/9334actual modules의 실제 순차 native SVG 호환성 검증 후에만 새
  package/docs candidate를 사용. 원본/source/authoring/cold epoch는 덮어쓰지 않는다.

## 저장 검사에서 확인한 내부 trace 등록

첫 기능 검사13개 중11개는 통과했으나, 새 내부 wrapped editScale이 Basic의 builtin trace
집합에는 없어 serializeProgram이 거부했다. 공개 method를 추가하지 않고 기존
`recordBuiltinActions(BasicChartProgram, additional)`의 내부 연산 목록에 기존 op `editScale`
하나를 기록한다. 저장 format/key/action 이름은 새로 만들지 않는다. Method/prototype/type/
MCP action-card 경계와 builtin trace 인식은 별개이며, 실제 편집 API는 계속 undefined다.
다른 미등록 op는 계속 거부하고, 각 기존 Basic 재할당 채널의 저장·복원도 추가 검증한다.
이는 승인된 같은 wrapped owner 재사용의 저장 완결성을 보장하는 구체 구현이며 standing
approval 범위 안에서 진행한다. 실패 기록은 보존한다.

저장 검증의 class 기대값도 기존 normative `docs/data-updates.md`와
`test/unit/persistence/program.test.js`에 맞춰 확인한다. 복원은 원래 Basic도 Full로 반환한다.
이를 Basic으로 바꾸는 새 schema/옵션은 추가하지 않는다. 최초 테스트의 잘못된 class 기대는
harness 문제로 수정하고 실제 Basic instance의 공개 method 부재와 저장 roundtrip 동치를
각각 검사한다.

## 구현 검증 수치

일반4873개/실패0, 새 기능·타입15개, 설치consumer62그룹과 빌드문서150페이지 검사가
통과했다. 실제604entries/853541packed/4130403unpackedbytes, Full423292/Basic213178/
SVG7567gzipbytes다. Unpacked4130000, 검색839000, Basic210000의 기존 한도 초과를
보존하고 각각4131000/840000/214000으로 최소1000bytes 단위만 조정했다. 나머지 한도와
시각·동작 오차는 그대로다. 학교 API 사용 및 새 차트 추가는 없다. 정확한 로그와 실패 원인은
`EVIDENCE.json`을 따른다. 전체1282가족/9334단계 native 호환성은 별도 채택 gate로 남긴다.

문서 desktop search·전 페이지320/390/768px containment·키보드·ARIA·자동 접근성
검사도 통과했다. 이미지 시각 검사는 수행하지 않았다. 다음은 검증된 구현 checkpoint와
clean-source 문서 provenance, 이후 전체 native 호환성이다.

구현8690369cf60ad24d871029b7d165444ad24abe0f를 push한 뒤 clean-source provenance로
문서를 재생성했고120개 문서 검사도 통과했다. 이 후속 checkpoint는 메타데이터만 바꾸며
실제 설치·기능 검사에서 검증한 패키지 내용은 그대로다. 다음 gate는1282/9334의 순차
native SVG 호환성과 로컬 채택이며,1413 전 공개 릴리즈·main 통합·이슈 종료는 하지 않는다.
