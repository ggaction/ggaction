# 공유 facet 범례의 척도별 자동 추론 (#231)

## 진행 상태
- [x] 공개0.0.21의 Lab 색상으로 독립 재현; explicit 기존 owner 경로는 정상이다.
- [x] 사용자 standing approval: 2026-10-18 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함”; 번역 프로젝트 reports/v12-sequential1500-standing-design-approval-and-200-family-releases-20261018.json. 재질문하지 않는다.
- [x] 구현 전 구체적 결정과 검증 범위를 기록한다.
- [x] focused13, unit3331/contracts576/docs120/charts620 =4647 PASS; 설치 소비자 SVG/PNG/import 및 package check PASS.
- [ ] source commit/push 뒤 docs provenance 재생성 및 metadata checkpoint.

## 결정
자동 shared-string facet에서 한 target의 color/stroke/shape/strokeDash를 일괄 categorical로 보내던 요청을 실제 scale family로 나눈다. 기존 ordinal 채널은 하나의 원래 categorical 요청으로 유지하고, continuous/discretized color와 stroke는 각각 기존 단일-channel createLegend 경로를 호출한다. 각 continuous 요청에만 기존 자동 gradient 스타일과 숫자 표기 보정을 적용한다. 기존 explicit owner promotion은 변경하지 않는다. 원시 데이터·척도·마크·렌더러·저장 schema·새 옵션은 변경하지 않는다. 애매한 target과 incompatible independent scale 거부는 유지한다.

이는 facet의 자동 요청 구성 오류를 고치는 범위다. 일반 unit createLegend의 explicit multi-channel mixed-family 선택 전체를 새로 확장하지 않는다. 해당 확장이 필요하면 별도 재현/설계로 추적한다. continuous+ordinal 동반 채널은 facet 자동 inference에서 각 기존 owner를 보존한다. 자동 parent styles는 기존 자동 경로 기본값을 유지하므로 explicit owner 기본 스타일과 무조건 byte-identical하다고 주장하지 않는다.

## 검증
원래 재현의 continuous color+stroke, color+shape, ordinal color+continuous stroke, interval color+stroke, 기존 ordinal series의 owner/scale/paint/순서/child 소유권을 검사한다. 데이터/척도/마크 불변, import/export, layout/guide replay, independent incompatibility/ambiguity atomicity를 확인한다. 대표적 실제 SVG/PNG 및 독립 numeric paint 기대값을 검사하며 chart pixels는 보지 않는다. 새 numerical tolerance를 추가하지 않는다. 이전 전체 chart suite로 기존 렌더링을 보호한다.

## 배포
검증 후보에 수집하고1413개 checkpoint에서 통합/공개한다. 현재 번역 runtime은 공개0.0.21 그대로이며 이슈를 미리 닫지 않는다.

여러 native block이 기존400px 임시 capture Canvas에 함께 들어가지 않는 추가 실패를 재현했다. 임시 capture 높이만400×요청 수로 확보하고 실제 child/parent plot 크기는 그대로 유지한다. 모든 owner 생성 후 기존 숫자 표기 보정을 적용하여 두 번째 생성의 lane replay가 첫 번째 보정을 지우지 않도록 한다. 이전 단일 요청은640×400 그대로다.
