# 기존 막대 blend의 multiply·screen 연결

## 진행 상태

- [x] 기존 시각 승인 `90f5f67e` 재사용: source-over/multiply/screen/difference 수식과 opaque backdrop native 합성
- [x] 기존 `editBarMark`에 multiply/screen 추가, normal reset 및 semantic 단일 소유 유지
- [x] Concrete rect/path, Browser Canvas·SVG·Node PNG·PDF 연결
- [x] 독립 수식, 기존 primitive/public exact, 저장·재계산·facet 및 declaration 검사
- [ ] 전체 STEP017 consumer 및 transparent isolated group의 공통 PNG lowering — 다음 연결 의무

이 checkpoint는 새 action·group schema·effect 옵션을 만들지 않는다. 기존 P1/P2 공개 제안과 별도로 이미 승인한
blend 집합을 현재 bar editor에 연결한다. 사용자의 `두 검토 대상 모두 승인`은 blend `90f5f67e`와
outline/halo `ca064947`를 대상으로 했으며 [정확한 승인 기록](../blends/REVIEW-EVIDENCE.json)을 재사용한다.

## 현재 결과

```js
program.editBarMark({blend:"multiply"});
program.editBarMark({blend:"screen"});
program.editBarMark({blend:"normal"});
```

생략은 유지, normal은 optional semantic intent 제거다. Mark creation/facade와 다른 mark family의 새 옵션은
이 checkpoint에서 추가하지 않는다. 실행 계약은 [Current MARKS](../../../../contract/current/MARKS.md)의
`editBarMark`, concrete 허용 범위는 [Current PRIMITIVES](../../../../contract/current/PRIMITIVES.md)가 소유한다.

공통 pure `isBlendMode`가 계산·action·저장 검증·renderer의 닫힌 vocabulary를 소유한다. Canvas는 이미 있던
visible stroke bounds의 임시 glyph surface에서 fill과 기존 stroke를 합친 후 opacity와 blend를 한 번 적용한다.
SVG는 검증한 mode만 mix-blend-mode로 쓰고 root isolation을 명시한다. Native PDF의 glyph source만 raster이며
page 전체를 rasterize하지 않는다. Renderer는 semanticSpec을 읽지 않는다.

## 검증 의미

- 기존 canonical `examples/bar-compositing/program.js`의 기본 difference 출력은 그대로다. 명시 blend 옵션으로
  multiply/screen을 같은 source에 적용한다.
- Stable manifest는16개의 contrasting 표본이다. Screen over white는 수학적으로 완전 흰색이라 시각 표본에서는
  제외하고 Browser96조합과 PDF24조합의 수치 검사에는 포함한다. Plot ink 의무를 느슨하게 바꾸지 않았다.
- 16표본은 literal extension primitive와 public chart의 graphic 속성·order·Canvas calls·decoded RGBA가 exact다.
- Browser96조합은 DOM/Offscreen Canvas, 독립 native primitive, SVG 독립 primitive가 exact이며3개 내부/외곽
  표본에서 Canvas/SVG가 exact다. PDF24조합은 opaque/alpha exact, 기존 반투명 RGB±1 byte 정책을 유지한다.
- Normal reset은 이전 semanticSpec/graphicSpec/markConfigs와 exact다. Gradient/rounded path, Canvas/scale/data/theme/
  highlight/facet replay, editable restore, malformed stored value와 unsupported contexts의 preflight를 확인한다.
- 공통 compositing와 Canvas isolated owner의 집중 coverage는 lines/branches/functions100/100/100이다.

## 남은 전체 paint 의무

이 native bar 확장만으로 승인된 transparent isolated group의 공통 Float64→RGBA8→PNG lowering을 완료했다고
세지 않는다. 해당 group의 최초 native 양자화 실패는 기존 blend 검토 자료에 보존되어 있다. Common image I3/I4,
outline/halo·shadow의 alpha 한 번 적용, 추가 mark applicability, scene/hit/selection/legend, public same-run equivalence와
최종 패키지 통합을 이어서 닫아야 한다. P1/P2와 추가 ellipse의 미정 공개/시각 승인은 별도 기록을 따른다.

명령·artifact hash·정확한 source revision은 `BAR_BLEND-EVIDENCE.json`에서 기록한다. 이 변경은 배포나 publish가 아니다.
