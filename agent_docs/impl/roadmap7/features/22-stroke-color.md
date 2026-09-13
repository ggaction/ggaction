# R22 — 필드 기반 stroke 색상

원래 감사 번호: **22**. Primary owner: **Phase 5**. 상태: **Implemented-primary**.
구현 checkpoint는 `3fc40a66`이다. R22의 독립 기능·생명주기·패키지 검증은 완료됐고,
R19의 다중 채널 원자적 재인코딩 payload와 field→constant stroke 전환은 `58d9e51a`, 최종 legend/label/reference 소비는 `8c4b56ad`에서 검증됐다.

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
- Point, Line, Area, Bar, Rect, Arc, Rule, Tick에 구현 고정 명세의 grain으로 적용한다. Text는 이번 stroke encoding 지원에서 제외한다. 지원 없는 primitive는 명시 거부; 조용히 fill로 대체 금지.
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

## 구현 고정 명세 — stroke의 독립 channel

### baseline와 새 지원행렬

현재 encodeStroke는 ruleAppearance.js의 Rule constant-only action이다. 기존 encodeStroke({value})가 이미 모든 marks를 지원한다고 문서화하지 않는다. 이 기능에서 value와 field 양쪽을 다음 지원행렬로 확장한다.

| semantic family | stroke 대상 grain | 지원 |
| --- | --- | --- |
| point,bar,rect,arc,rule,tick | final item | constant/field |
| line,area (Polar/Parallel line 포함) | 최종 series | constant/field; series 내 값 일정 |
| text | 없음 | 이번 신규 stroke encoding은 명시 거부 |

Text의 concrete outline schema를 추가하는 일은 선택된 기능에 포함하지 않는다. filled marks의 stroke:false는 기존 mark style 문법이며 encodeStroke value의 새 union으로 추가하지 않는다. value는 기존 stroke color validator가 허용하는 string이다.

새 export StrokeEncodingOptions는 value branch와 field branch를 never로 배타화한다. field branch의 fieldType/temporalUnit/scale union은 ColorEncodingOptions에서 같은 조건으로 파생한다. EditStrokeScaleOptions는 target 필수 및 color-compatible patch다.

### 전환 및 우선순위

1. field 호출: 기존 constant stroke override를 해당 owner에서 제거하고 encoding.stroke={field,fieldType,scale,…필요한 temporalUnit} 기록. constant 호출: stroke semantic encoding 제거, 기존 stroke legend dependency 해제, constant config 저장.
2. data stroke가 있을 때 style edit으로 field mapping을 몰래 덮지 않는다. field에서 constant로 전환하는 domain action은 encodeStroke({value})다. generic mark edit의 충돌 정책은 기존 encoded appearance 규칙과 맞춰 사전 오류를 낸다.
3. fill color와 stroke는 독립 ID가 기본. explicit scale.id 공유 시 공통 color mapping capability를 검증하고 color/stroke가 섞인 소비자라는 이유만으로 editStrokeScale를 거부하지 않는다.
4. Line/Area에서 color도 stroke에 그려지는 기존 의미는 유지한다. 양쪽 channel이 설정되면 stroke가 선 outline의 최종 paint, color의 semantic binding/legend는 보존한다. 실제 sample은 동일 appearance resolver를 사용한다.
5. strokeWidth0 또는 stroke paint 투명값을 자동 보정하지 않는다. item filter 후 최종 eligible series grain에서 field 일관성을 검증한다.

### 연결점 전수 점검

ruleAppearance registrar, shared channel vocabulary, semantic encoding validation/types, scale consumers, pathSeries appearance, 각 mark materializer, legend family resolver/sample style, selector channel union, facet scale resolution, theme reconcile, R19 payload를 모두 수정한다. R43의 stroke shared/independent은 color와 같은 compatibility 원칙을 사용한다.

### 고정 인수 사례

- R22-N01: Point fill field f=[A,A],stroke field s=[U,V] → 동일 fill, 서로 다른 outline.
- R22-N02: Line group g=[A,A,B,B],stroke s=[U,U,V,V] 성공; [U,V,V,V]는 A series 오류.
- R22-N03: quantitative stroke domain[0,10] endpoints/midpoint는 existing color mapper와 같음.
- R22-L01: field→value→field 시 stale legend/scale refs가 없고 fill은 유지.
- R22-E01: field+value,Text target,invalid color,temporalUnit on nominal → 오류.
- R22-L02: Rule constant-only 기존 호출의 요청/graphic/trace 호환 fixture를 별도 보존한다.

## 완료 조건

- [x] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [x] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [x] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [x] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [x] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [x] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
