# R38 — 결합 범례의 channel block별 편집

원래 감사 번호: **38**. Primary owner: **Phase 8**. 상태: **Proposed / 구현 전**.
아래 세부 API·수치 정책의 Gate는 승인됐다. 상태의 `Proposed`는 제품 구현·검증이 아직 완료되지 않았다는 뜻이다.

## 목적과 현재 연결점

하나의 legend 안에서 색·크기 설명을 각각 편집한다. semantic block identity를 도입하되 raw graphic selector나 전체 복수 guide API로 확장하지 않는다.

현재 파일(저장소 root 상대 경로):
- `src/actions/guides/legends/blocks.js` — 이 작업에서 추가할 private descriptor·override owner
- `src/actions/guides/legends/edit.js`
- `src/actions/guides/legends/target.js`
- `src/actions/guides/legends/transition.js`
- `src/actions/guides/legends/lifecycle.js`
- `src/actions/guides/legends/categorical/actions.js`
- `src/actions/guides/legends/categorical/recipes.js`
- `src/actions/guides/legends/size.js`
- `src/actions/guides/legends/strokeWidth.js`
- `src/actions/guides/legends/continuous/opacity.js`
- `src/actions/guides/legends/continuous/interval.js`
- `src/actions/guides/legends/continuous/stroke.js`
- `src/materialization/legends.js`
- `src/materialization/facetGuides/preparation.js`
- `src/materialization/facetGuides/placement.js`
- `src/actions/theme/reconcile.js`

관련 항목: R37. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래 API는 승인된 R38 구현 계약이다. R38 checkpoint에서는 `labelMap`을 받지 않으며 R39가 같은 options type에 `labelMap?: DisplayLabelMap | "auto"`를 추가한다. R39 전에는 `labelMap`을 무시하지 말고 unknown key로 거부한다.

```ts
editLegendBlock({target: string, channel: LegendChannel,
  title?:string, values?:readonly number[]|"auto", count?:number,
  order?:readonly CategoryValue[], gap?:number,
  text?:LegendTextPatch, symbol?:LegendSymbolPatch})
// target은 기존 legend owner target; channel은 현재 block identity.
// 전체 block 집합/위치 변경은 기존 editLegend channels/layout을 사용.
```

## 값·기본값·오류 계약

- channel은 현재 존재하는 logical block을 정확히 선택. 없는 block을 자동 생성하지 않는다. graphic child ID나 index로 select 금지.
- title은 빈 문자열 허용(제목 숨김), values/count는 R37 지원 channel만. order는 categorical block만, symbol/text는 현재 channel에서 지원하는 속성만.
- 여러 channel이 하나의 merged categorical symbol block이면 어느 member channel로 호출해도 같은 block 전체를 선택한다. 순차 호출은 정상적인 전체-block replacement다. 충돌 거부는 서로 다른 old block의 override가 하나의 new block으로 합쳐지는 structural transition에만 적용한다.
- gap은 block 내부 요소 간격, root legend 위치/방향을 바꾸지 않는다. blocks 자유 x/y 배치와 general guide identity(#30)는 제외.
- 기존 editLegend({channels})는 최종 content 집합 변경이다. block이 제거되면 해당 overrides 삭제. reorder는 channel identity로 보존. type migration으로 option이 불가능해지면 사전 오류; 조용히 다른 block에 적용 금지.

## 저장 결과와 생명주기

각 현재 legend kind config 안의 `blockOverrides[key]`에 stable channel-set identity별 override를 저장한다. 별도 `materializationConfigs.guides.legendBlocks` 저장소는 만들지 않는다. key는 canonical sorted channel membership으로 만들고 display index와 분리한다. renderer child IDs를 public binding으로 저장하지 않는다. 재생성 시 base recipe → root common appearance → block override → computed geometry 순으로 적용한다.

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

private descriptor의 최소 shape는 `{target,key,channels,kind,family,scaleIds,config}`다. key는 ASCII sorted channel 집합을 JSON 배열 문자열로 encode한다. 예: `["color","shape"]`. channel 순서가 달라도 같은 key다. 이 key는 private이고 사용자가 직접 입력하지 않는다. recipe를 descriptor에 복제하지 않는다.

| field | 허용 조건 |
| --- | --- |
| title:string | 모든 block,빈 문자열로 숨김 |
| values/count | R37 sampled continuous block |
| order:CategoryValue[] | categorical,현재 domain의 정확한 permutation |
| gap:finite>=0 | block 내부 item gap |
| text | fontSize,fontFamily,fontWeight,color |
| symbol | size,fill,stroke,strokeWidth,opacity 중 실제 recipe에서 지원되는 것 |
| labelMap | R39 categorical block |

symbol.size는 point glyph의 면적px²(finite>=0)이며 radius가 아니다. fill은 filled glyph에만, stroke/strokeWidth는 실제 outline이 있는 glyph에만, opacity는[0,1]에서 허용한다. text.fontSize는finite>0,fontFamily는nonempty,fontWeight/color는기존validator를사용한다. symbol override가 그 block의 data mapping channel을 덮는 경우 거부한다. size block의 symbol.size,opacity block의 symbol.opacity,strokeWidth block의 symbol.strokeWidth,color block의 symbol.fill,stroke block의 symbol.stroke는 충돌이다. text/symbol 객체는 전체 교체하며 미지정 property는 root 공통 스타일로 돌아간다.

R38의 `text`는 **item label style만** 뜻한다. `labels.offset`과 numeric `format`은 바꾸지 않고 `fontSize`, `fontFamily`, `fontWeight`, `color`만 덮는다. title의 문자열은 `title`이 소유하고 title font style은 이번 API 범위가 아니다. `text:{}`와 `symbol:{}`는 해당 partial override를 빈 객체로 교체해 그 객체의 모든 속성을 root/common fallback으로 되돌린다. top-level omission은 기존 override를 보존한다.

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


## 현행 코드에 대조한 무추론 구현 명세

이 절은 구현자가 새 저장 구조나 다른 전환 의미를 고안하지 않도록 실제 source owner를 기준으로 고정한다. 위 계약과 이 절이 달라 보이면 이 절의 더 구체적인 규칙을 적용하고 같은 checkpoint에서 다른 Roadmap 7 문서도 동기화한다.

### 1. 공개 타입과 등록 위치

R38에서 `types/program.d.ts`에 다음 closed types를 추가한다. tuple 표기는 declaration에서 길이 1 이상을 표현하기 위한 것이며 runtime은 일반 배열을 받아 동일한 길이 검사를 수행한다.

```ts
export type LegendChannel = NonNullable<LegendOptions["channels"]>[number];

export type LegendBlockTextPatch = {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
};

export type LegendBlockSymbolPatch = {
  size?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
};

export type EditLegendBlockOptions = {
  target: string;
  channel: LegendChannel;
  title?: string;
  values?: readonly [number, ...number[]] | "auto";
  count?: number;
  order?: readonly CategoryValue[];
  gap?: number;
  text?: LegendBlockTextPatch;
  symbol?: LegendBlockSymbolPatch;
};
```

- `target`과 `channel`은 필수다. `editLegendBlock({channel:"size", ...})` 같은 target 추론을 추가하지 않는다.
- `src/actions/guides/legends/blocks.js`가 `editLegendBlock` action을 export한다.
- `src/actions/guides/legends/index.js`의 `registerLegendActions`에만 등록한다. `src/actions/guides/basic.js`에는 등록하지 않는다.
- Full `ChartProgram` declaration에만 method를 추가하고 Basic declaration·prototype의 method inventory는 그대로 둔다.
- R39가 구현되기 전 `labelMap`은 `validateOptionObject`에서 unknown key다. R39 checkpoint에서만 위 options를 확장한다.

### 2. descriptor 생성 규칙

`src/actions/guides/legends/target.js`에 아래 역할의 pure helpers를 둔다. 함수 이름은 충돌이 없으면 그대로 사용하고, 기존 이름과 충돌하면 의미를 유지한 하나의 이름으로 바꾼 뒤 이 문서도 수정한다.

```js
legendBlockChannels(kind, config)
legendBlockKey(channels)
describeLegendBlock(program, kind, config)
legendBlockDescriptors(program, target)
resolveLegendBlock(program, {target, channel}, operation)
```

`legendBlockChannels`의 반환표는 다음과 같다.

| kind | channels source | family |
| --- | --- | --- |
| `series`, `color`, `stroke` | `config.channels` | `categorical` |
| `size` | `["size"]` | scale type에 따라 `sampled` 또는 `discrete-size` |
| `opacity` | `["opacity"]` | `sampled` |
| `strokeWidth` | `["strokeWidth"]` | `sampled` |
| `gradient` | `["color"]` | `gradient` |
| `interval` | `["color"]` | `interval` |
| `strokeGradient` | `["stroke"]` | `gradient` |
| `strokeInterval` | `["stroke"]` | `interval` |

구현 규칙:

1. channel 정렬은 locale API를 쓰지 않고 `(a < b ? -1 : a > b ? 1 : 0)` ASCII 비교를 사용한다.
2. key는 `JSON.stringify(sortedChannels)`다. target이나 kind를 key 문자열에 추가하지 않는다. target은 config owner가, kind는 descriptor가 이미 소유한다.
3. descriptor의 `channels`는 clone/freeze한 정렬 배열이다. 기존 config 배열을 sort해 바꾸지 않는다.
4. `scaleIds`는 categorical이면 `config.scales`, 나머지는 `config.scale` 한 개다. 존재하지 않는 scale은 descriptor 생성 단계에서 오류다.
5. `legendBlockDescriptors`는 `LEGEND_CONFIG_KINDS` 순서로 현재 target의 config만 읽는다. object insertion order에 의존하지 않는다.
6. 한 target에서 같은 key가 두 번 나오면 첫 block을 고르지 말고 internal state ambiguity 오류를 낸다.
7. `resolveLegendBlock`은 `validateUserId(target)`, `LEGEND_CHANNELS` membership, 현재 descriptor membership을 차례로 검사한다. graphic child ID는 legend target 목록에 없으므로 `Unknown legend target`으로 거부한다.

Descriptor의 최소 shape는 다음과 같다.

```js
{
  target,
  kind,
  family,
  key,
  channels,
  scaleIds,
  config
}
```

`contentRecipe`나 `styleRecipe`라는 별도 복제 객체는 만들지 않는다. 현재 config와 semantic guide가 이미 그 owner다.

### 3. canonical requested state

Override owner는 descriptor가 가리키는 현재 kind config 한 곳이다.

```js
materializationConfigs.guides.legend[kind] = {
  ...existingConfig,
  blockOverrides: {
    '["color","shape"]': {
      title: "분류",
      text: { fontSize: 14, color: "#334155" },
      symbol: { strokeWidth: 2 },
      gap: 28
    }
  }
};
```

고정 규칙:

- 한 config의 `blockOverrides`에는 현재 descriptor key 하나만 남는다. key가 유지되면 같은 entry를 갱신하고, structural transition이면 transition plan이 새 key로 옮기거나 거부하며 old key를 삭제한다.
- override entry에는 `values`, `count`, `order`, resolved domain, mapped radius/opacity/width, formatted label, graphic ID를 저장하지 않는다.
- `values/count`는 R37 `config.sampling`, `order`는 `semanticSpec.guides.legend[kind].order`가 유일 owner다.
- top-level patch의 `title`, `gap`은 명시될 때만 기존 값을 교체한다. `text`, `symbol`은 명시될 때 객체 전체를 교체한다.
- patch 결과 override가 빈 객체면 key와 `blockOverrides` property를 제거한다. `{}`를 장기 상태로 보존하지 않는다.
- 모든 entry와 nested object는 기존 `_withLegendConfig`/materialization state 경로가 clone/freeze하도록 plain object로 전달한다. caller 객체 참조를 저장하지 않는다.
- `text:{}`와 `symbol:{}`는 각각 기존 nested override를 삭제한다. 다른 top-level field가 없으면 결과 entry도 삭제한다. root/common fallback과 동일한 뜻을 가진 빈 nested object를 persisted state에 남기지 않는다.

### 4. title의 빈 문자열 의미

Semantic guide title validator는 빈 문자열을 허용하지 않으므로 `title:""`를 semantic title에 쓰지 않는다.

- override `title:""`는 effective `titleVisible:false`를 뜻한다.
- config와 `semanticSpec.guides.legend[kind].title`에는 마지막 nonempty base/effective title을 유지한다.
- title graphic이 있으면 action commit에서 제거하고, replay에서도 만들지 않는다.
- 이후 `title:"규모"`를 호출하면 override를 교체하고 `inferredTitle:false`, `titleVisible:true`, semantic title `"규모"`로 맞춘다.
- root `editLegend`나 theme가 base title/style을 바꿔도 nonempty block title override 또는 hidden override가 우선한다.

### 5. patch 정규화와 family별 허용표

`editLegendBlock`의 allowed keys는 정확히 `target`, `channel`, `title`, `values`, `count`, `order`, `gap`, `text`, `symbol`이다. target/channel을 제외한 키가 하나도 없으면 오류다.

- `title`: string만 허용. `""` 포함. `false`, `"auto"`, null은 R38에서 오류다.
- `gap`: finite number, `>=0`. effective config의 `itemGap`으로만 적용한다.
- `text`: plain object, closed keys 4개. `fontSize>0`, nonempty `fontFamily`, 현재 legend fontWeight validator, nonempty color validator를 사용한다.
- `symbol`: plain object, closed keys 5개. `size>=0` area px², `strokeWidth>=0`, `opacity`는 0..1, fill/stroke는 nonempty string이다.
- `values/count`: descriptor family가 `sampled`일 때만 R37 `normalizeLegendSampling`에 전달한다. `size`가 `discrete-size`이면 둘 다 오류다.
- `order`: descriptor family가 `categorical`일 때만 허용하며 현재 resolved raw domain과 typed identity가 같은 exact permutation이어야 한다. 자동 sort/dedupe나 display label 비교를 하지 않는다.

`order`의 canonical 변환은 다음 순서를 따른다.

1. 일반 배열이며 길이가 1 이상인지 검사한다.
2. 각 값에 기존 `isNominalValue`를 적용한다. 즉 string, boolean, finite number만 허용하고 `null`, `undefined`, `NaN`, `Infinity`, object를 거부한다.
3. 중복은 `Object.is`로 검사한다. 따라서 number `1`과 string `"1"`은 다르고 `0`과 `-0`도 다르다.
4. 현재 descriptor의 첫 scale domain과 길이가 같고 양방향으로 정확히 같은 typed value 집합인지 검사한다. 일부 값만 지정한 기존 category-order 동작을 이 action에서는 허용하지 않는다.
5. 저장 값은 raw 배열이 아니라 기존 `LegendOrder` schema의 frozen `{ values: clonedOrder }`다. 기존 `{channel:...}` order가 있었다면 이 값으로 전체 교체한다.
6. `order`가 생략되면 기존 semantic order를 그대로 둔다. R38 block API에는 reset sentinel이 없으므로 reset은 기존 `editLegend({order:"scale"})`를 사용한다.

Symbol property는 아래 표에서 `허용`인 경우에만 적용한다. 한 property가 descriptor의 data mapping과 충돌하면 recipe layer 지원 여부와 관계없이 오류다.

| block | size | fill | stroke | strokeWidth | opacity |
| --- | --- | --- | --- | --- | --- |
| categorical point layer | 허용: area→`sqrt(area/π)` radius | color member면 충돌, 아니면 filled point만 | stroke member면 충돌, 아니면 outline point만 | outline point만 | 허용 |
| categorical swatch layer | 오류 | color member면 충돌 | stroke member면 충돌, 아니면 outline | 허용 | 허용 |
| categorical line layer | 오류 | 오류 | stroke member면 충돌, 아니면 허용 | line `lineWidth`에 적용 | 허용 |
| sampled size | mapping 충돌 | 허용 | 허용 | 허용 | 허용 |
| sampled opacity | 허용: area→radius | 허용 | 허용 | 허용 | mapping 충돌 |
| sampled strokeWidth | 오류 | 오류 | 허용 | mapping 충돌 | 허용 |
| color interval | 오류 | mapping 충돌 | 허용 | 허용 | 허용 |
| stroke interval | 오류 | 허용 | mapping 충돌 | 허용 | 허용 |
| color/stroke gradient | 전 property 오류 | 전 property 오류 | 전 property 오류 | 전 property 오류 | 전 property 오류 |

Categorical recipe가 여러 layers를 가지면 각 property를 지원하는 모든 layer에 적용한다. 지원 layer가 0개면 오류다. 일부 layer에만 적용 가능하다는 이유로 다른 property를 묵시적으로 버리지 않는다. normalized categorical private point `size`는 현재 radius 단위이므로 public area를 반드시 한 번 변환한다.

### 6. effective config accessor

`src/actions/guides/legends/blocks.js`에 `resolveEffectiveLegendBlockConfig(program, kind, config)`를 둔다. 저장 config를 직접 바꾸지 않고 다음 순서로 ephemeral config를 반환한다.

1. 현재 config의 base content/layout/style.
2. combined size의 기존 `inheritAppearance` root labels/titleStyle 계산.
3. 현재 descriptor key에 해당하는 block override.
4. `title`, `gap→itemGap`, `text→labels`, `symbol→family recipe` 적용.
5. layout/materializer가 계산할 resolved domain, formatted text, mapped geometry.

`text`는 2단계에서 얻은 현재 labels에 merge한다. 따라서 override에 없는 font/color는 이후 theme 변경을 따라간다. `symbol`도 현재 inferred/base recipe 위에 merge한다. 저장 시점의 완성 style snapshot을 override에 복사하지 않는다.

모든 legend layout/materializer가 effective config를 읽도록 연결하되, rematerializer가 `_withLegendConfig`로 다시 저장할 때 ephemeral `labels`, `symbol`, `itemGap`, `titleVisible`을 base에 덮어쓰지 않는다. scale ID/domain/inferred title처럼 기존 rematerialization이 갱신하던 base field만 갱신하고 `blockOverrides`는 그대로 보존한다. 이 구분이 없으면 첫 replay 후 root fallback과 override provenance가 사라진다.

Horizontal combined size layout에서 현재 categorical `itemGap`을 size block에 강제하는 경로는 effective size `itemGap`을 사용하도록 고친다. position/align/direction/columns/titlePosition/offset은 root lane을 계속 따르고, size item 사이 gap만 size block override를 따른다.

### 7. public action transaction

Action body는 아래 순서 그대로 수행한다.

1. options plain/closed-key 검증.
2. required target/channel과 editable-field 존재 검증.
3. descriptor resolve. 아직 clone/write/child action을 호출하지 않는다.
4. 기존 override와 patch를 normalize한다.
5. values/count/order의 canonical owner 후보를 만든다.
6. candidate kind config에 새 `blockOverrides`를 적용한 discarded view를 만든다.
7. candidate semantic order/title과 sampling을 view에 적용하고 effective config를 resolve한다.
8. 해당 family layout resolver와 전체 `rematerializeLegend`를 discarded view에서 실행해 Canvas bounds, scale, recipe, shared lane 오류를 모두 preflight한다.
9. 원본 program에 canonical semantic/config 변경을 한 번 적용한다.
10. title/background/symbol graphic existence를 reconcile하고 `rematerializeLegend()`를 한 번 실행한다.

오류 후 rollback 코드를 쓰지 않는다. 8단계 이전에 원본 program이 바뀔 수 없고 immutable candidate만 폐기한다. 성공 전후에 caller options와 이전 program의 semanticSpec, graphicSpec, resolvedScales, materializationConfigs, children, compositionSpec, context, trace를 비교한다.

Action export는 기존 trace wrapper를 그대로 사용한다.

```js
export const editLegendBlock = action(
  {
    op: "editLegendBlock",
    description: "Edit one logical legend block selected by channel."
  },
  withGuideLayoutValidation(function (args = {}) {
    // 위 1..10 transaction. 이 wrapper 안에서 다른 public action을
    // validation 용도로 호출해 중첩 trace를 만들지 않는다.
  })
);
```

오류 문자열 전체를 tests에 고정하지 않는다. 대신 `editLegendBlock`, target 또는 channel, 실패 field(`values`, `order`, `symbol.size` 등)를 포함하는지 검사한다. internal ambiguity와 transition conflict는 old/new block key도 포함한다. 이 규칙은 구현자가 기존 validator의 유용한 prefix를 유지하면서 원인을 숨기는 범용 오류로 바꾸지 못하게 한다.

### 8. structural transition plan

`src/actions/guides/legends/transition.js`에 기존 color family transition과 함께 block transition pure plan을 둔다. 호출자는 `editLegend({channels})`, categorical revision, `removeLegend`, `removeEncoding`, color/stroke scale family migration이다.

Old/new descriptor의 channel 교집합으로 bipartite components를 만든 뒤 component별로 다음 표를 적용한다.

| old 수 | new 수 | 처리 |
| --- | --- | --- |
| 1 | 1, key 동일 | full override와 canonical values/order owner 보존 |
| 1 | 0 | override 삭제. 재추가 시 복구 금지 |
| 0 | 1 | default/root 상태로 생성. 과거 key 검색 금지 |
| 1 | 1, key 다름 | `text/symbol/gap`만 새 block에서 모두 valid하면 이동. `title`이 있거나 explicit order/content가 분배 모호하면 오류 |
| 1 | N>1 | 위 compatible style만 각 new block에 복사. title/order/values/labelMap이 있으면 오류 |
| N>1 | 1 | incoming override와 explicit content를 canonical deep equality로 비교. 모두 같고 새 family에 valid할 때만 하나로 합침; absent와 present도 충돌 |
| N>1 | M>1 | 각 connected component를 위 규칙으로 분해할 수 없으면 명시 오류 |

Deep equality는 object key canonicalization 후 scalar/array의 typed identity를 비교한다. JSON stringify만으로 `-0`, `NaN`, object key order를 숨기지 않는다. public validator가 NaN을 거부하더라도 plan helper는 normalized state만 받는다는 invariant를 assert한다.

전환은 전체 final descriptors와 configs를 먼저 만들고 모든 component plan을 검증한 뒤 한 번 commit한다. 한 component를 먼저 옮긴 뒤 다음 충돌에서 실패하는 순차 mutation은 금지한다. 오류 메시지는 target, old keys, new key, 충돌 field를 포함하되 graphic ID는 제안하지 않는다.

### 9. lifecycle 연결표

| 진입점 | 필수 처리 |
| --- | --- |
| `editLegendBlock` | 같은 key override patch, canonical sampling/order 전달, full preflight |
| `editLegend` root style/layout | base/root config만 갱신, `blockOverrides` 보존, effective replay |
| `editLegend({channels})` | old/new descriptor transition을 remove/create 전에 preflight |
| `removeLegend({channels})` | removed descriptor override 삭제; partial categorical revision은 transition 적용 |
| `removeEncoding` | categorical remaining channels revision 전에 transition 적용; specialized block 삭제와 override cleanup |
| `editScale` type migration | 기존 `planColorLegendTransitions`에 override compatibility를 포함하고 remove/recreate 전에 검증 |
| source/reencode | rematerialize가 같은 key를 다시 resolve; key 변화 시 transition 없이는 silent 이동 금지 |
| `editCanvas`/layout | effective text/symbol/gap으로 occupied bounds 재계산 |
| `applyTheme`/`removeTheme` | block explicit property를 override registry에 추가; omitted property의 root fallback만 recolor |
| facet child replay | kind config 안 `blockOverrides`가 기존 config copy와 함께 이동 |
| shared facet legend | child별 descriptor keys, sampling, override를 compatibility 비교하고 promoted source의 effective graphics 사용 |

### 10. 테스트 파일과 literal fixtures

새 `test/contracts/legend-blocks.test.js`가 R38 cases를 소유한다. production descriptor/normalizer/materializer를 expected 생성에 호출하지 않는다.

공통 fixture는 Canvas `760×600`, margin `{top:140,right:240,bottom:140,left:90}`, point rows 세 개를 사용한다.

```js
[
  { x: 0, y: 0, group: "A", value: 0 },
  { x: 1, y: 1, group: "B", value: 50 },
  { x: 2, y: 0, group: "C", value: 100 }
]
```

Point target id는 `points`; x/y quantitative, color/shape/stroke는 동일 `group` field의 ordinal scales, size는 domain `[0,100]`, range `[0,100 * Math.PI]`다.

필수 test 묶음:

1. **R38-N01 separate color+size**: combined legend 생성 후 size block title `"규모"`, values `[10,50,100]`, text `{fontSize:14,color:"#334455"}`, gap 36. color block title `"분류"`. size labels 3개, radius `[sqrt(10),sqrt(50),10]`; color domain/items/scale/mark graphics 불변.
2. **R38-N02 merged member selector**: color+shape series block을 color로 title `"A"`, shape로 title `"B"` 순차 edit. 같은 key `'["color","shape"]'` 하나, title graphic 하나, 최종 text `"B"`.
3. **R38-E01 merge conflict**: 같은 target의 separate color/stroke blocks에 서로 다른 title 또는 text override를 저장하고 channels를 하나로 merge. 원본 canonical state와 caller input이 byte-equivalent인 채 오류.
4. **R38-L01 identity lifecycle**: `["color","shape"]`→`["shape","color"]` reorder 후 key/override 동일. size block 제거 후 같은 channel 재생성 시 old title/text/gap/sampling이 부활하지 않음.
5. **R38-E02 validation**: absent channel, graphic child target, sampled size `symbol.size`, categorical `values`, gradient symbol, negative/NaN gap, unknown nested key, invalid opacity, order missing/extra/typed mismatch를 각각 atomic error로 검증.
6. **root/theme/Canvas replay**: root legend move와 label style, dark→light theme, Canvas width 변경 후 explicit block 속성은 유지되고 omitted 속성은 새 root/theme를 따름.
7. **source/encoding/scale**: category order, channel removal, color ordinal↔sequential migration의 compatible/invalid transition을 검증. R37 samples는 singleton size key에서 유지.
8. **facet**: shared facet legend의 모든 child block override가 같으면 promote; 한 child만 다르면 compatibility 오류. independent children은 local override 유지.
9. **renderers**: Canvas calls, SVG title/labels, PNG/PDF signatures와 bounds. approved combined-block target은 literal `createGraphics/editGraphics` primitive program과 public program의 graphic equivalence 및 same-run decoded PNG pixel hash를 비교한다.
10. **types/package**: root package에서 positive options, readonly arrays, empty text/symbol을 compile; missing target/channel, labelMap-before-R39, invalid symbol key를 `@ts-expect-error`. packed install에서 Full method 존재·Basic method 부재와 실제 N01 호출을 실행한다.

Visual primitive는 R38 public action이나 production block helper를 호출해 만들지 않는다. literal x/y/text/style expected를 test에 직접 고정하고, public result를 expected 생성기로 재사용하지 않는다.

### 11. public surface 동기화 목록

제품 코드와 같은 checkpoint에서 다음을 모두 갱신한다.

- `types/program.d.ts`와 root type exports.
- `agent_docs/contract/ACTION_INDEX.json`의 direct Full action.
- 현재 guide contract, action catalog, relationship metadata와 compact card metadata.
- `docs/api/legends/editing.md`, `docs/reference/actions/guides.md`, generated reference/types/actions/search/LLM artifacts.
- `scripts/package-consumer.js`, `test/browser/package-consumer.browser.js`, MCP/card routing fixture.
- package entry/size ceiling은 실제 `npm pack` 결과가 기존 ceiling을 넘을 때만 검토 가능한 최소 단위로 올린다.

### 12. 실행 순서와 종료 명령

1. descriptor와 validation unit tests.
2. effective config accessor와 각 family unit tests.
3. `editLegendBlock` transaction과 N01/N02/E02.
4. transition planner와 E01/L01, remove/reencode/scale tests.
5. theme/facet/Canvas/renderer parity.
6. types/current contracts/catalog/cards/MCP/docs/package consumers.
7. generated artifacts 생성 후 freshness tests.
8. focused → unit → contracts → docs → render/browser → installed package 순서로 실행.

R38를 `Implemented-primary`로 바꾸려면 R38-N01/N02/E01/L01/E02가 모두 현재 revision에서 passed이고, Full/Basic surface 경계·same-run pixel parity·packed consumer가 통과해야 한다. R39 `labelMap`, R43 advanced facet family, R47 custom theme token 소비는 pending integration으로 남기되 R38 동작을 미리 stub으로 만들지 않는다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
