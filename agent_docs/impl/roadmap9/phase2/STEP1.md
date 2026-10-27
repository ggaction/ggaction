# STEP-010–012 — 복합 경로

## 진행 상태

- [x] 기존 validator·bounds·clip·renderer·저장 owner 조사
- [x] 순수 subpath 분리·조립 kernel 및 독립 면적/좌표 시험
- [x] 6개 primitive target과 공개 호출안 작성
- [x] SVG·Canvas·PNG·PDF native primitive 검사
- [x] 같은 clean revision에서 누적 검사 및 원격 검토 checkpoint
- [x] G-PATH D1–D6와 시각 target 명시 승인 (2026-10-27, 사용자 “네”)
- [x] STEP-010 공개 schema/primitive validation 연결
- [x] STEP-011 flatten·arc·winding·distance·stroke/clip bounds 연결
- [x] STEP-012 네 제품 renderer·scene·persistence 및 문서 통합
- [x] 전체 소비자 검증 및 AT-11/12 closure

상태: **STEP-010–012 및 AT-11/12 완료**. 최종 통합 결과와 재현 경로는 [GOAL](GOAL.md), 기계 검증 결과는 [completion-validation](completion-validation.json)이 소유한다.

## 구현 및 집중 검증

`grammar/pathTopology.js`가 dense M/L/C/Z schema와 subpath를 검증한다.
`grammar/pathGeometry.js`는 기존 exact extrema와 adaptive flatten·arc·winding·distance를 소유한다.
Named path/item의 fillRule, path owner clip, 각 subpath cap/join bounds를 공통 schema에 연결했다.
Canvas/SVG/PNG/PDF와 두 scene 형식, editable4/graphic1 저장 및 legacy1–3 rejection이 연결되어 있다.
Graphic/legend translation은 공통 clip 이동 owner를 사용한다.

승인된 예제는 `examples/compound-path/program.js`, 독립 primitive와 여섯 renderer pair는
`test/charts/compound-path/`로 옮겼다. 활성 검토 Gate subtree와 review 이미지는 제거했다.
검토 원문·기존 evidence는 당시 commit을 가리키는 역사 자료로 유지한다.
새 출력은 `.artifacts/test/png/charts/path-geometry/compound-path/`에 생성한다.

집중 검사: 공개/primitive 구조·trace, 불변 편집·저장·fresh process, 네 backend exact pixels,
Canvas/SVG JSON scene replay, 중첩 fractional clip, native preflight, 번역·범례 이동,
mark identity/accessibility 및 rematerialization을 검사한다. 정상 unit 누적 4,737개가 통과했다.
변경 중 실행은 clean revision 자격 증거로 재사용하지 않으며 마지막 구현 checkpoint에서 필수 검사를 재실행한다.

## 최종 통합 검증

실행계획의 coverage·realistic 두 shard·browser·render/gallery·installed package·artifact·metadata·docs를
같은 clean commit `53f251a336b1a0e3764fed115d9ec4c35d8cfdfc`에서 모두 통과했다.
CI coverage 원본과 로컬 font 보완 검증을 포함한 [통합 집계](integration-results.json)로 소비자 표와 AT-11/12를 닫았다.
