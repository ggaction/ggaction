# Phase 5 W2 C2 — Continuous legend option parity

기준 `980e9b2b1a9c4f4823ca87be4fc16d182118d36a`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md)과 [계약](CONTRACT_W2_OPTION_PARITY.md) 아래 [#103](https://github.com/ggaction/ggaction/issues/103)을 수정·검증했다. W2 전체와 실제 0.0.13 릴리즈는 미완료다.

## 발견과 수정

- Gradient/opacity × left/right edge × left/right align8cases는 정렬을 저장하지만 center와 정확히 같은 graphicSpec을 반환했다. 기존 categorical/item legend와 동일하게 side alignment는 center만 허용하도록 공통 normalizer에서 거절한다. Horizontal left/center/right는 유지하며 side로 이동할 때 explicit center를 같은 edit에 요청해야 한다.
- Gradient/opacity/interval의 titleStyle.offset은 생성·편집6cases에서 저장 후 무시됐다. Shared title normalizer가 color/fontSize/fontFamily/fontWeight만 허용한다. Size/width의 기존 검증도 같은 owner로 연결하고 labels.offset은 유지한다. Categorical의 기존 title-style 계약은 그대로다.
- Gradient createLegend는 titlePosition top을 받지만 editLegend/editLegendLayout은 거절했다. 두 편집 route도 같은 top title-position을 허용하고 left는 계속 거절한다. Hidden title을 보존하며 복원/scale transition도 같은 계약을 따른다.

기존 유효한 geometry, default, renderer는 변하지 않는다. Validation/route parity 수정이므로 새 시각 목표를 만들지 않고 기존 literal primitive/public regression을 실행했다. Public surface의 signature에는 새 parameter가 없고 지원되는 값의 경로 일치를 바로잡았다. Types의 side alignment 설명, current contract, continuous/editing API와 생성 문서를 갱신했다.

## 검증

- `.artifacts/roadmap6-authoring/audit-legend-options.mjs`: baseline21cases 중 ignored input14,valid top edit의 잘못된 거절2를 재현했다. 수정 후21cases는 invalid18거절/valid3허용으로 모두 일치한다. 기존 interval side 거절4cases는 control이다.
- `test/unit/actions/guides/legend-option-parity.test.js`: Full7/Basic5family의 side create/aggregate 및 Full edit/focused edit, style key, label offset, horizontal→side 명시적 복구, Canvas replay, hidden restore와 gradient↔interval scale 전환을 검증한다. 이전 JSON state의 불변성을 확인한다.
- Focused continuous/size/width/option regression27/27 PASS.
- Real Cars392rows: 12valid edge/replay와24invalid option rejection PASS.
- 기존 literal primitive/public 계약3tests,9variants PASS: occupied alignment3,interval4,hidden categorical2. Graphics/order와 same-run PNG 일치.
- Packed Node/types/SVG/PNG/PDF/MCP/tutorial consumers PASS. Full/Basic side alignment·title offset 거절과 Full top title edit 동등성 포함.
- Docs generate/preflight/build/built PASS,125pages.

[Package 원장](package-legend-option-parity-results.json): SHA-256 `53123774df4f7c28b7bf9f35b2766e0ed945d2263ebc1e34ee1cbad7a71f399f`,452entries,packed509943,unpacked2437523,gzip Full254092/Basic140272/SVG6437. Full이 기존254000한도를92bytes 초과해 전체 승인 아래255000으로 조정하고 current architecture를 동기화했다. Package와 Basic/SVG 한도는 유지한다. 현재0.0.12는 개발 checkpoint다.

초기 집중 검사는 labels.offset의 focused editor 지원을 잘못 가정한 test 한 곳을 드러냈다. 기존 public editLegend({labels:{offset}}) 경로로 바꿔 label 간격 계약을 검증했다. Focused label API를 임의 확장하지 않았다. 최초 normal/coverage는 side alignment를 잘못 저장한 뒤 scale transition에서 거절하던 기존 fixture1개가 실패했다. 이제 legend edit에서 즉시 거절하므로 해당 test도 초기 거절과 immutable state를 검증한다. 최종 normal2898/2898,coverage lines95.41%/branches92.28%/functions99.02%와86critical floors,동일 artifact의 Chromium Canvas/SVG1/1,closeout21/21을 모두 통과했다.

## 남은 범위

큰 sample/font의 내부 간격, 전체 family×edge lifecycle와 W2 통합을 계속 검증한다. W3 labels/reference/format, W4 theme, W5 fitting, Phases6–11과 실제0.0.13 release는 남아 있다. 이번 옵션 일치만으로 W2 전체를 완료로 기록하지 않는다.
