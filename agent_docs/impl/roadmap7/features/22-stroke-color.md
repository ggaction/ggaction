# R22 — 필드 기반 stroke 색상

원래 감사 번호: **22**. Primary owner: **Phase 5**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

채우기와 테두리를 서로 다른 변수에 할당하는 흔한 저작을 지원한다. 테두리 색상 mapping을 style로 흉내 내거나 채우기 channel을 재사용하지 않는다.

현재 파일(저장소 root 상대 경로):
- `src/actions/encodings/index.js`
- `src/actions/scales/quantitativeColor.js`
- `src/actions/guides/legends/index.js`
- `src/renderers/svg.js`
- `src/renderers/pdf.js`

관련 항목: 공통 계약 C01–C12만 선행. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
encodeStroke({target?, value: string}) // 기존 고정값 그대로
encodeStroke({target?, field: string,
  fieldType?: "nominal"|"ordinal"|"quantitative"|"temporal",
  temporalUnit?: TemporalInputUnit, scale?: ColorScaleOptions})
editStrokeScale({target: string, ...ColorScaleEditPatch})
// 기존 createLegend/editLegend channels에 "stroke" 추가
```

## 값·기본값·오류 계약

- value와 field는 exclusive union. fieldType 추론과 temporalUnit 적용은 encodeColor와 같은 policy를 사용하고 불일치하면 오류. temporal 색상은 기존 continuous color temporal mapping을 재사용하고 nominal/ordinal에 temporalUnit을 주면 오류. 기존 color는 fill/기존 mark 역할 의미를 유지한다.
- 선을 그리는 모든 기존 mark family(Point, Line, Area, Bar, Rect, Arc, Rule, Tick, Text 중 현재 stroke를 지원하는 것)에 공통 적용. 지원 없는 primitive는 명시 거부; 조용히 fill로 대체 금지.
- line/area는 개별 segment마다 임의 stroke를 바꾸지 않는다. 기존 series/group grain에서 stroke 값이 일정해야 하며 다르면 group encoding을 요구한다. point/bar/rect/arc는 item grain.
- color와 stroke는 독립 scale identity를 기본으로 한다. 같은 scale ID를 explicit 공유하면 domain/type/palette compatibility 검증. encoding된 stroke를 style stroke로 override하는 기존 precedence를 결정표로 유지.
- categorical와 continuous stroke legends 모두 지원. sample은 실제 mark의 fill+stroke 조합을 보존하고 strokeWidth=0이면 보이지 않는 sample을 자동 굵게 만들지 않는다.

## 저장 결과와 생명주기

semantic encoding.stroke={field, type, scale} 및 style constant가 current grammar에 맞게 구분되어 저장된다. SCALED_ENCODING_CHANNELS, scale consumers, guide channel normalization, rematerialization registry, facets and themes에 동일 channel을 등록한다. stroke는 일반 color의 alias가 아니다.

## 구현 순서와 action 계층

1. literal stroke action과 current mark stroke support matrix를 고정한다.
2. 기존 color scale normalization/mapping을 channel-parameterized 내부 함수로 재사용.
3. mark materializer와 legend sample style path의 stroke data mapping을 연결.
4. editStrokeScale, shared consumers, R19 batch/facet/theme replay를 연결.

## 독립 oracle와 인수 테스트

- Point: color=groupA, stroke=groupB가 서로 다른 조합으로 나타나고 두 legend가 올바른 channel에 bind.
- Line: group별 일정 stroke는 성공; 한 series 내부 서로 다른 값은 오류. strokeWidth0 유지.
- quantitative stroke 도메인0..10의 endpoints/midpoint가 동일 ColorScale mapper 결과.
- encodeStroke({value}) 기존 semantic/graphic/trace 회귀, fill 보존, Canvas/SVG/PDF rendered outline 비교.
- nominal → quantitative scale edit, explicit shared color/stroke scale, facet shared legend 필수.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
