# STEP-010–012 — 복합 경로

## 진행 상태

- [x] 기존 validator·bounds·clip·renderer·저장 owner 조사
- [x] 순수 subpath 분리·조립 kernel 및 독립 면적/좌표 시험
- [x] 6개 primitive target과 공개 호출안 작성
- [x] SVG·Canvas·PNG·PDF native primitive 검사
- [x] 같은 clean revision에서 누적 검사 및 원격 검토 checkpoint
- [ ] G-PATH D1–D6와 시각 target 명시 승인
- [ ] STEP-010 공개 schema/primitive validation 연결
- [ ] STEP-011 flatten·arc·winding·distance·stroke/clip bounds 연결
- [ ] STEP-012 네 제품 renderer·scene·persistence 및 문서 통합
- [ ] 전체 소비자 검증 및 AT-11/12 closure

상태: STEP-010 in-progress, STEP-011/012 pending. kernel과 검토 출력은 제품 기능 완료가 아니다.

## 현재 구현

`src/grammar/pathTopology.js`는 M/L/C/Z를 subpath 범위로 분리하고, 단일 subpath 배열들을
복사·동결하여 합친다. 기존 command shape와 30,000개 한도의 owner를 재사용한다.
`pathCommands.js`의 기존 공개 grammar는 그대로 유지한다. 새 함수는 package export가 아니다.
`test/fixtures/geometry/compound-path.js`는 literal 입력, `test/oracles/geometry.js`는 독립 면적 계산을 소유한다.

새 모듈 때문에 package entry 실제값이 670→671로 늘어 entry 한도만 671로 조정했다.
측정값은 998,138 packed bytes / 4,667,546 unpacked bytes이며 기존 byte 한도를 유지한다.
초기 실패는 모듈 미존재, 후속 테스트 fixture의 잘못된 builder 입력, capability selector 미등록이었다.
올바른 30,001개 전체 한도 입력과 명시 selector로 수정했으며 검사 조건은 유지했다.

## 다음 구현 순서

승인되면 먼저 G-PATH 기록을 갱신한다. schema validation과 primitive 편집·선언·저장 validation을
하나의 연결된 변경으로 구현하고, exact extrema는 기존 owner를 확장한다.
adaptive flatten/arc와 winding/distance를 독립 수치 fixture로 검증한 뒤 stroke/clip 소비자와 renderer에 연결한다.
현재 검토용 target.program.js를 실제 공개 프로그램으로 전환하고 trace와 표시 호출을 비교한다.
승인된 slice는 stable capability 위치로 옮기며 임시 gate test와 selector를 제거한다.
