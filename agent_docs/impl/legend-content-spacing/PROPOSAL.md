# 범례 내용 간격 (#225)

## 진행 상태

- [x] 현행 계약·공통 item layout·opacity/gradient 예외 경로 조사
- [x] 구체적인 public/persisted 계약 작성
- [ ] 기존 primitive 시각 목표와 실패하는 현재 API 재현 검증
- [ ] 원격 review checkpoint 및 기존 명시적 승인 기록
- [ ] 구현·회귀·타입·persistence·문서·설치 consumer 검증
- [ ] 검증된 후보 commit/push; 정규 200-family checkpoint에서 통합

관련 이슈: <https://github.com/ggaction/ggaction/issues/225>.

## 승인 근거와 배포

사용자는 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”라고 명시했다.
진행 중인 번역·파이프라인·라이브러리 개선 범위의 구체적인 API/schema/시각 Gate에 이 승인을 적용한다.
구체적인 목표와 검증 자료를 먼저 준비하고 원격 checkpoint로 보존한 뒤 승인 근거를 기록한다.
이미 승인된 이 범위에 같은 질문을 반복하지 않는다. 원본 충실도나 검증 범위를 축소하지 않는다.
현재 공개 기준1213 families에200개를 추가하는1413 checkpoint 전에는 npm/tag/Pages를 배포하지 않는다.

## Public 계약

새 action 없이 기존 `createLegend`, 전체 `editLegend`, `editLegendLayout`에 다음 두 layout 옵션을 추가한다.
Facade/complete guides의 legend 선언도 같은 create 계약을 전달한다.

```ts
// Creation
rowPadding?: number;   // finite >= 0; item-based legends only
titlePadding?: number; // finite >= 0; every legend family

// Editing, including editLegendLayout
rowPadding?: number | "auto";
titlePadding?: number | "auto";
```

- `rowPadding`은 같은 legend block 안에서 인접한 **행의 실제 painted union** 사이 빈 논리 px이다.
  각 행에 속한 실제 sample/stroke/path/clip과 표시되는 label bounds를 합친다.
  다음 행 anchor는 `previousAnchor + previousBottom + rowPadding - nextTop`이다.
  최대 심볼 높이를 모든 행에 복제하지 않는다. 열이 여럿이면 각 행 전체 cell의 union을 사용하며 기존
  domain/fill 순서·열 폭·label column을 유지한다. Text-only summary 행에 가짜 sample 높이를 넣지 않는다.
  Text bounds는 기존 backend-neutral text measurement의 fontSize/명시적 줄바꿈 bounds를 뜻한다.
  브라우저별 glyph ink/ascent를 다시 측정하거나 새로운 수직 font-metric 계약을 추가하지 않는다.
- `itemGap`의 기존 의미와 저장값은 유지한다. `rowPadding`이 있으면 세로 행 간격만 그것이 우선하며,
  열/가로 item 간격은 계속 `itemGap`이 소유한다. 두 값을 함께 지정할 수 있다.
  `rowPadding`을 `"auto"`로 되돌리면 저장된 `itemGap`의 기존 uniform-pitch 동작이 복원된다.
- `titlePadding`은 visible title과 전체 body의 가장 가까운 painted bounds 사이 거리이다.
  Top/bottom title은 세로, inline-left title은 가로 거리이다. FontSize 기반 임의 보정이나 block 간
  `gap`/border padding/plot `offset`의 별칭으로 해석하지 않는다.
- 제목을 숨기면 title 간격을 예약하지 않으며 policy는 보존한다. 다시 표시하거나 multiline title,
  typography, sample stroke/clip을 편집하면 현재 실제 bounds로 다시 계산한다.
- 새 옵션 생략은 기존 저장값을 보존한다. Creation에서 생략하면 새 필드도 만들지 않고 기존 scene/
  SVG/trace를 유지한다. Edit의 `"auto"`는 해당 optional 필드를 삭제한다. Null/false/undefined를
  reset 별칭으로 추가하지 않으며 음수·NaN·Infinity·다른 문자열은 atomic 오류다.
- `editLegendLayout`이 두 layout 필드를 소유한다. `editLegendTitle`은 기존 title text/style만 유지한다.
  기존 `channel` 선택은 같은 block 하나에만 적용한다. Selector 없는 combined 편집은 기존 선택/
  propagation 계약에 따라 적용하고, root creation은 생성되는 각 호환 block에 같은 정책을 전달한다.

## 지원·전환·오류

- Item family: categorical color/series/stroke, ordinal/continuous/discrete size, interval,
  stroke-width, opacity, sampled continuous-color symbols, explicit color-size combination.
  현재 지원되는 edge/corner/free/group/column 배치를 유지한다. Opacity의 새 columns/direction이나
  새로운 combination을 이번 기능에 추가하지 않는다. 가로 단일 행에서도 row policy를 저장할 수 있다.
- Gradient strip에는 `titlePadding`만 적용한다. Strip/tick/label 전체 body bounds를 사용한다.
  `rowPadding`은 item row가 없으므로 명시적으로 거절한다. Symbols→gradient 전환에서 active row policy는
  같은 edit의 `rowPadding:"auto"` 또는 선행 reset을 요구한다. 의미 없는 설정을 조용히 삭제하지 않는다.
- 고정 좌표 계약인 `layout:"legacy-bottom"`은 두 새 옵션을 거절한다. 새 간격에는 명시적으로
  `layout:"edge"`를 사용한다. 이 제한은 기존 legacy 출력 변경을 피하는 명시적인 호환 경계다.
- Side 전체 occupied top은 계속 plot top에 맞춘다. Top/bottom edge, corner, free/group anchor와
  기존 align을 유지하며 바뀐 실제 block bounds로 border/lane/Canvas/plot fit/축 충돌을 검증한다.
  자동 축소·항목 삭제·Canvas 확대·다른 위치 fallback을 추가하지 않는다.
- Exact sample values/count, mapped color/size/opacity, raw data, semantic encodings, glyph shapes/styles,
  renderer 책임과 ID/trace hierarchy를 변경하지 않는다.

## 단일 소유권과 구현 방향

- 숫자로 정규화된 optional intent는 기존 `materializationConfigs.guides.legend[kind]`만 소유한다.
  `"auto"`나 계산된 row 좌표를 저장하지 않는다. Existing logical block replacement, focused edits,
  combined appearance/placement inheritance, shared facet promotion, remove/recreate, Canvas/data/scale/
  theme rematerialization, persistence read/write에서 보존·검증한다.
- 가장 작은 pure spacing validator와 occupied-row/title layout helper를 공유한다. 기존 item layout,
  별도 opacity layout, gradient title layout이 같은 의미를 사용한다. 새 옵션 없는 경로는 기존 좌표를
  그대로 반환한다. Border와 final placement는 기존 owner가 계산한다.
- Row/title 측정은 materialization 이전의 concrete recipe 단계에서 한다. Renderer는 완성된
  graphicSpec만 읽으며 spacing 의미를 새로 해석하지 않는다.
- 공개 계약·타입 Full/Basic의 기존 지원 범위·knowledge/API docs·current contracts·편집 전환·저장
  schema를 함께 갱신한다. 새 source owner가 생기면 architecture의 해당 경계만 갱신한다.

## 독립 시각 목표와 검증

기존 public size control과 primitive-only 목표를 같은 코드에서 출력한다. Proposed 옵션은 구현 전
거절하는지 확인한다. Runtime 구현은 아직 시작하지 않는다.

- Canvas320×240, plot `(40,30,140,160)`, 세 source point 위치 `(40,190)`, `(110,110)`, `(180,30)`.
- Size sample 반지름8/12/20, stroke2 → painted 높이18/26/42.
- `rowPadding:7`, `titlePadding:20`, title font14, labels font10.
- Side block top30, title center37, sample centers73/102/143 → 중심 거리29/41,
  실제 sample 경계 간격은 둘 다7. Title bottom44와 첫 sample top64 사이20.
- X sample center231, label column264, title X210. 데이터와 unrelated primitive는 control과 동일하다.

구현 뒤 primitive/public decoded pixels와 SVG를 정확히 비교한다. DPR1/2와 browser Canvas/SVG,
PNG/PDF, visible plot ink, 실제 trace와 public call chain도 검증한다. 기존 이미지의 no-opt-in parity,
다른 크기/글자 높이/stroke/clip/summary, rowPadding0/reset, title 숨김·복원·hard breaks,
multi-column 및 모든 지원 family, representation/content/combined/facet 전환, mutation/atomic rejection,
serialized restoration과 Canvas/scale/data/theme replay를 포함한다. 경계·충돌 오차를 늘리지 않는다.

개념 checkpoint에서 focused+unit/contracts/charts/docs/installed-consumer 및 관련 browser 검증을 수행한다.
패키지/카드/bundle budget은 실제 초과를 확인한 항목에만 기존 최소 단위로 조정하며 측정값과 실패를
보존한다. Node24 protected-release 재측정은1413 release checkpoint에서 별도로 수행한다.
