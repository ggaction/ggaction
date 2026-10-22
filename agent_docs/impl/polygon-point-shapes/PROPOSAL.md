# 명시적 다각형 point shape

## 진행 상태

- [x] 원본 1735의 정상 렌더와 필요한 세 단순 다각형 확인
- [x] 기존 PointShape/shape scale/legend/selection/materialization consumer 조사
- [x] 단순 다각형 validation과 기존 면적 정규화 연결
- [x] 상수 shape, field range/unknown, legend, highlight, replay/persistence 집중 검증
- [x] 선언·Current 계약·공개 문서·생성 문서·package 검증
- [ ] 새 local candidate 호환 검증과 source1735 실제 번역

## 승인 근거

사용자는 필요한 ggaction 및 파이프라인 수정을 계속하도록 요청했고 “지금까지 모든 질문,
앞으로 할 모든 질문 승인함”으로 이 번역 작업 범위의 결정을 승인했다. 이 근거를 재사용해
반복 승인 질문 없이 아래 구체적 지원을 구현한다. 원본 차트의 세 shape가 시각 목표다.
이미지/VLM 검사는 하지 말라는 사용자 지시에 따라 원본 SVG 경로와 좌표를 독립적으로 검사한다.
공개 배포는 다음 1,350개 milestone이며, 먼저 검증된 local candidate로만 사용한다.

## 공개 계약

새 action 없이 기존 `PointShape`를 14개 named shape 또는 다음 단순 다각형으로 확장한다.

```ts
{ polygon: readonly { x: number; y: number }[]; normalization?: "area" | "radius" }
```

- polygon과 선택적 normalization 이외 key를 거부한다. 좌표 object도 x/y 이외 key를 거부한다.
- 3~1,024개 유한 vertex, 각 좌표 절댓값 <=1,000,000. 끝점이 첫점과 같으면 한 번 제거해 canonical 저장한다.
- 0 길이 edge, 겹침·교차·비인접 접촉, 인접 edge의 역주행과 0/nonfinite area는 거부한다.
  단순한 concave polygon과 양쪽 winding은 허용한다. 내부 구멍, SVG 문자열, 곡선은 이번 지원에 없다.
- 입력 좌표계의 (0,0)이 mark anchor다. 임의로 이동하거나 centroid로 recenter하지 않는다.
- 기본 area는 기존 `sqrt(requestedArea/rawArea)` 면적 정규화와 clockwise angle 회전을 재사용한다.
- 명시적 radius는 입력 좌표를 `sqrt(requestedArea/PI)`로 확대한다. 좌표 한 단위가 logical radius
  한 단위다. 이 선택은 실제 채움 면적이 아니라 reference circle area를 size 값으로 삼는다.
  원본 1735의 point와 legend가 같은 literal glyph를 서로 다른 radius로 그리므로 이 선택이 필요하다.
  범례와 mark에 별도의 size 배열을 주입하거나 여러 shape별 생성 action을 추가하지 않는다.
- highlight의 size/offset은 기존 실제 도형 변환을 유지한다. shape 교체에 radius-normalized polygon을
  명시하면 기존 계산 면적을 reference circle area로 해석하는 동일한 glyph 생성 규칙을 적용한다.
- Layer별 custom polygon command work는 기존 공통 10,000,000 work limit을 재사용한다.
  Highlight polygon 교체도 선택된 새 경로와 남아 있는 기존 path의 총 command를 생성 전에 검사한다.
- 상수 create/edit, encodeShape의 explicit ordinal range/unknown, 관련 facade, legend sample,
  point highlight와 원래 public replay/persistence가 같은 shared validator/materializer를 사용한다.
- 자동 shape range는 현재 14개 문자열과 순서를 그대로 보존한다. Renderer에는 기존 concrete closed path만 전달한다.
- 원본 point rows나 categorical domain을 바꾸지 않는다. Raw 데이터를 새 shape 좌표로 대체하지 않는다.

## 책임 경계

순수 point polygon grammar가 검증, canonical immutable copy와 raw area 계산을 소유한다.
Mark/scale/unknown validator는 그 owner를 호출한다. 기존 point glyph materializer는 normalized
closed line commands를 만든다. Polygon geometry를 renderer나 shape 이름 문자열에 숨기지 않는다.
기존 mutation/order/selection 및 persistence 규칙을 유지하고 default named-shape 출력은 바꾸지 않는다.

## 검증

독립 shoelace literal과 SVG mark 좌표로 raw/normalized area, bounding extent, rotation과 anchor를 검사한다.
Constructor/editor, range/unknown과 legend glyph를 비교하고, invalid polygon rejection의 atomicity,
caller input mutation, Canvas/scale/data revision, highlight/remove, editable persistence와
SVG/PNG/PDF concrete 출력, strict declarations, normal suite, package/source proof를 검증한다.

source1735는 기존 406행을 유지하고 원본 year filter와 missing-position eligibility로 29점을 그린다.
세 path의 필요한 기하를 단순 다각형으로 정확히 표현할 수 있어야 한다. 기능과 native/source 검증이
끝나기 전에는 source admission이나 School 호출을 하지 않는다. 미래의 임의 SVG/curve 제안까지
구현됐다고 주장하지 않는다.

## 검증 checkpoint

`EVIDENCE.json`에 전체 normal5291/browser163/package consumer69와 새 grammar의
line100%/branch98.46%/function100%를 기록했다. 원본 1735의 private 수치 검증도
29점/110vertex/3legend glyph를 확인했지만 전체 source qualification/실제 School
번역은 아직 아니다. 기존 번역 runtime은 그대로이며 issue는1350공개까지 유지한다.
