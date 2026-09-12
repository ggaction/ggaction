# R38 — 결합 범례의 channel block별 편집

원래 감사 번호: **38**. Primary owner: **Phase 8**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

하나의 legend 안에서 색·크기 설명을 각각 편집한다. semantic block identity를 도입하되 raw graphic selector나 전체 복수 guide API로 확장하지 않는다.

현재 파일(저장소 root 상대 경로):
- `src/actions/guides/legends/edit.js`
- `src/actions/guides/legends/target.js`
- `src/actions/guides/legends/transition.js`
- `src/materialization/legends.js`

관련 항목: R37. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
editLegendBlock({target: string, channel: LegendChannel,
  title?:string, values?:readonly number[]|"auto", count?:number,
  order?:readonly Scalar[], gap?:number,
  text?:LegendTextPatch, symbol?:LegendSymbolPatch})
// target은 기존 legend owner target; channel은 현재 block identity.
// 전체 block 집합/위치 변경은 기존 editLegend channels/layout을 사용.
```

## 값·기본값·오류 계약

- channel은 현재 존재하는 logical block을 정확히 선택. 없는 block을 자동 생성하지 않는다. graphic child ID나 index로 select 금지.
- title은 빈 문자열 허용(제목 숨김), values/count는 R37 지원 channel만. order는 categorical block만, symbol/text는 현재 channel에서 지원하는 속성만.
- 여러 channel이 하나의 merged categorical symbol block이면 channel 하나의 edit를 해당 merged block 전체에 적용한다. channel별로 서로 다른 title/content를 요청하려면 먼저 기존 channels recipe로 별도 block을 만들 수 있는지 확인; 현재 분리 불가능하면 conflicting patch를 거부하고 block membership을 알려준다.
- gap은 block 내부 요소 간격, root legend 위치/방향을 바꾸지 않는다. blocks 자유 x/y 배치와 general guide identity(#30)는 제외.
- 기존 editLegend({channels})는 최종 content 집합 변경이다. block이 제거되면 해당 overrides 삭제. reorder는 channel identity로 보존. type migration으로 option이 불가능해지면 사전 오류; 조용히 다른 block에 적용 금지.

## 저장 결과와 생명주기

requested legend recipe에 stable channel-set identity와 block override map을 저장한다. key는 canonical sorted channel membership으로 만들고 display index와 분리. renderer child IDs를 public binding으로 저장하지 않는다. 재생성 시 base recipe → root common appearance → block override → computed geometry 순으로 적용한다.

## 구현 순서와 action 계층

1. 현재 combined legend merger가 산출하는 logical block descriptors를 분리해 expose-to-internals.
2. selector resolver와 channel-specific patch validator 작성.
3. override 저장/transition migration/cleanup 정책 구현.
4. materialization text metrics와 occupied layout이 변경 block bounds를 포함하도록 갱신.

## 독립 oracle와 인수 테스트

- color+size legend에서 size title="규모", values[10,50,100], color title="분류": 독립 결과.
- root legend move/resize/theme 후 override 유지. channels reorder 후 title가 다른 block으로 이동하지 않음.
- size block 제거 후 재추가 시 stale title/value 부활 없음.
- merged color+shape block에서 color 또는 shape로 title을 편집하면 동일 block title을 교체한다. 서로 다른 old block overrides가 merge되는 transition의 충돌은 거부한다.
- categorical에 values, absent channel, symbol unsupported property, oversized label occupied bounds 오류/검증.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — merged block identity와 편집

EditLegendBlockOptions의 target은 기존 legend API와 같은 semantic owner selector이고 channel은 현재 logical block의 member다. graphic ID/index를 새 selector로 받지 않는다. editable field가 하나 이상 있어야 한다.

### block descriptor와 patch whitelist

private descriptor={key,channels,kind,scaleIds,contentRecipe,styleRecipe}. key는 ASCII sorted channel 집합을 JSON 배열 문자열로 encode한다. 예: ["color","shape"]. channel 순서가 달라도 같은 key다. 이 key는 private이고 사용자가 직접 입력하지 않는다.

| field | 허용 조건 |
| --- | --- |
| title:string | 모든 block,빈 문자열로 숨김 |
| values/count | R37 sampled continuous block |
| order:Scalar[] | categorical,현재 domain의 정확한 permutation |
| gap:finite>=0 | block 내부 item gap |
| text | fontSize,fontFamily,fontWeight,color |
| symbol | size,fill,stroke,strokeWidth,opacity 중 실제 recipe에서 지원되는 것 |
| labelMap | R39 categorical block |

symbol.size는 point glyph의 면적px²(finite>=0)이며 radius가 아니다. fill은 filled glyph에만, stroke/strokeWidth는 실제 outline이 있는 glyph에만, opacity는[0,1]에서 허용한다. text.fontSize는finite>0,fontFamily는nonempty,fontWeight/color는기존validator를사용한다. symbol override가 그 block의 data mapping channel을 덮는 경우 거부한다. size block의 symbol.size,opacity block의 symbol.opacity,strokeWidth block의 symbol.strokeWidth,color block의 symbol.fill,stroke block의 symbol.stroke는 충돌이다. text/symbol 객체는 전체 교체하며 미지정 property는 root 공통 스타일로 돌아간다.

### merged block 편집 의미 정정

merged color+shape에서 channel:"color"와 channel:"shape"는 **같은 block을 선택**한다. 한 호출은 그 block 전체를 편집한다. 뒤 호출에서 title을 바꾸면 전체 block의 title을 교체한다. channel별 독립 title을 저장하지 않는다.

초안의 "shape를 다른 title로 지정하면 오류"는 순차 patch인지 독립 title 요청인지 모호했다. 하나의 public patch에는 독립 title 두 개를 표현할 수 없으므로, 정상 순차 편집은 허용한다. 서로 다른 membership에서 유입된 override를 merge하는 transition에서만 충돌을 거부한다. 이는 Proposed 상세 정책의 명료화이며 현재 동작 변경 완료가 아니다.

### transition 표

- key 그대로,root reorder/layout/theme 변경 → override 유지.
- block 제거 → override 제거; 재추가해도 부활하지 않음.
- split/merge로 membership 변경 → old override의 적용 가능성을 field별 검사. 한 old block→여러 new blocks는 compatible style만 복사하고 content title/order/values는 명시 재지정 필요하므로 기존 값이 있으면 transition 거부.
- 여러 old blocks→merged block: 동일한 compatible overrides만 합침; 다른 title/maps/style 또는 invalid field가 있으면 사전 오류. automatic last-wins 금지.
- scale type 변경으로 기존 values/order가 불가능해짐 → 오류, 명시 compatible content로 먼저 바꿔야 함.

### 고정 인수 사례

- R38-N01: color+size separate blocks → size title/values만 변경,color 유지.
- R38-N02: merged color+shape title을color로"A",shape로"B" → 하나의 title"B".
- R38-E01: incompatible overrides의 두 blocks merge → Error.
- R38-L01: reorder 후 overrides 동일;remove+readd 후 default.
- R38-E02: absent channel,size block의 symbol.size,categorical values → 오류.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
