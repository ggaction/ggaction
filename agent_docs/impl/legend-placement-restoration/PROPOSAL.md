# 범례 위치와 블록 배치 복원 제안

## 진행 상태

- [x] 기존 public API로 최소 재현
- [x] 실제 원본 SVG DOM 좌표·방향·해시 확인
- [x] API·저장 상태·기본값·호환성·검증 범위 구체화
- [x] 사용자 승인
- [x] 구현·현재 계약·타입·문서·회귀 검증
- [x] 최종 installed package 검증

번역 프로젝트의 정확한 runtime/docs pin과 기존 500개 재검증은 이 라이브러리 checkpoint 다음 작업이다.

Gate 상태: **approved**. 사용자가 검토 revision `705aa19f1e310ca7d7e653957aac37bce8ed2c57`에 대해 “설계대로 구현 (권장)”이라고 명시적으로 승인했다. 승인한 API와 target-owned group 상태를 구현했다. 현재 source의 Unit 2,891개, contract 531개, docs 120개, 영향받는 composition 117개와 chart 29개가 통과했고 최종 installed package 검증도 통과했다. 재현·검증 명령과 패키지 해시는 `implementation-evidence.json`에 있다. `decisions.json`이 승인 대상 결정을 기록하고, `reproduce.mjs`와 `evidence.json`이 승인 전 동작을 재현하는 역사적 증거다. 현재 동작의 규범은 current contract와 실행 테스트가 소유한다. 같은 설계에 대해 승인을 다시 요청하지 않는다.

루트 `AGENTS.md`는 public API·persisted schema·핵심 아키텍처의 미해결 중요 결정에 대해 구체적 제안과 명시적 승인을 요구한다. 이 제안의 두 필드, target 단위 그룹 상태, 상속·전환 규칙, 새 모서리 기본값이 그 결정이다. 독립적인 기존 기능 수정은 계속할 수 있다. 배포·출판·PR 생성 승인은 포함하지 않는다.

## 관찰된 요구와 현재 한계

동일 target의 색상·크기·불투명도 범례를 지정한 모서리 안에 함께 놓거나, 위·아래에서 가로 한 줄로 놓아야 한다. 항목을 배열하는 방향과 여러 범례 블록을 배열하는 방향은 다르다. 자유 위치는 마크 종류에 관계없이 plot 사각형 기준 논리 픽셀 좌표로 표현해야 한다.

실제 SVG DOM 측정값은 `evidence.json`에 원본·SVG SHA와 함께 있다. 이미지 픽셀은 보지 않았다.

| 참조 ID | 필요한 배치 | 범례 그룹 DOM 사각형 |
|---|---|---|
| 1725 | plot 안 오른쪽 아래, 세 블록이 나란히 | (117,166)–(321,292) |
| 1729 | plot 안 왼쪽 위, 세 블록이 나란히 | (57,27)–(261,153) |
| 1727 | plot 안 왼쪽 아래, 세 블록이 나란히 | (57,166)–(261,292) |
| 1726 | plot 아래, 항목도 블록도 가로 한 줄 | (39,359)–(771,397) |
| 1722 | plot 위, 항목도 블록도 가로 한 줄 | (39,4)–(771,42) |

앞 세 사례는 plot x39–339/y10–310 안에 놓인다. 각 블록 내부 항목은 세로이지만 세 블록은 가로로 배치된다. 뒤 두 사례는 plot 폭300보다 넓은732px 범례 줄을 이미 확보된 외부 Canvas에 놓는다. 다섯 사례 모두 이전에는 외부 오른쪽의 세로 stack으로 정규화되었다. 사용자의 최신 요청은 이 위치 정규화를 철회하고 원래 배치를 복원한다. 기본 간격 선호는 유지한다.

0946 자유 위치 사례는 plot 원점(109,22), 원본 그룹 원점 상대좌표(200,80)이다. 전체 그룹 DOM bounds는 (309,101)–(433,139.14355)이며 투명한 layout 배경을 포함한다. 실제 보이는 text·symbol의 보수적 bounds 합집합은 **(310,101)–(432.28125,139.14355)**이다. 아래 `at`의 의미를 occupied bounds 기준으로 고정하므로 이 사례의 대응 좌표는 **(201,79)**이다. 그룹 원점과 실제 occupied 원점을 혼동하지 않는다. 원형 좌표 전용 분기는 필요하지 않다.

현재 최소 재현 결과:

- 범주형 단독 범례는 기존 네 모서리 position을 지원한다.
- size/opacity는 같은 position 값을 `Unsupported legend position`으로 거부한다.
- 폭300 plot의 위·아래 복합 범례는 외부 Canvas가 충분히 넓어도 `Horizontal legend block requires more plot width`를 낸다.
- 기존 `direction`/`columns`는 블록 내부 항목 배열용이다. 블록 사이의 한 줄 배치를 표현하지 않는다.
- `blockLayout`, `at`는 현재 public 옵션이 아니므로 명시적으로 거부된다.

## 제안하는 public surface

새 action이나 renderer primitive를 추가하지 않는다. 기존 `LegendOptions`, `EditLegendOptions`, `EditLegendLayoutOptions`에 다음 두 옵션만 더한다.

```ts
blockLayout?: 'row' | 'column' | 'wrap';
at?: { x: number; y: number };
```

기존 `position`의 네 모서리를 size·opacity·stroke-width·interval·gradient에도 일관되게 지원한다. 모서리의 gradient는 세로다. 기존 gradient/opacity의 항목 `direction` 제한을 임의로 해제하지 않는다. 색상·선 색상 gradient, 범주형·크기·선 두께·구간 범례 모두 같은 occupied-bounds 배치 규칙을 따른다.

### 그룹과 저장 상태

- `blockLayout` 또는 `at`를 명시하면 선택된 **하나의 target**이 소유한 모든 범례 블록을 그룹으로 다룬다. 새로 지원하는 여러 블록의 모서리 배치도 그룹을 만든다.
- target이 유일하지 않으면 기존 규칙처럼 명시적 target이 필요하다. 첫 layer·scale·block을 조용히 선택하지 않는다.
- `blockLayout`만 지정했는데 기존 블록들의 anchor가 서로 다르면 새 position/at를 명시해야 한다. 유일 anchor가 있으면 그것을 사용한다.
- 확립된 그룹 뒤에 같은 target의 블록을 만들 때 placement 생략은 그 그룹 anchor와 정책을 상속한다. 새 블록의 명시적 anchor가 기존 그룹과 충돌하면 실패한다. 같은 at를 반복 지정하는 것은 허용한다.
- 명시적 그룹 편집은 모든 멤버를 원자적으로 함께 옮긴다. per-block placement를 서로 다른 상태로 남기지 않는다. 구성원은 현재 target의 owned blocks에서 도출하며 중복된 멤버 ID 목록을 따로 저장하지 않는다.
- 제안하는 저장 소유자는 기존 guide materialization 상태의 **`materializationConfigs.guides.legendGroups[target]`**이다. 그룹은 `placement: {position,...} | {at:{x,y}}`와 `blockLayout`을 기록한다. 실제 채널·scale·샘플 의미는 기존 semantic guide/블록 소유자에 남긴다. 렌더러는 기존대로 concrete graphicSpec만 읽는다.
- 기존 저장 결과에는 이 map이 없어도 된다. 새 필드 없는 기존 비그룹 프로그램은 그대로 해석하며 일괄 migration하지 않는다. 새 그룹 opt-in 이후에는 재생성·편집·재생에서도 그룹 계약을 유지한다.

### 배치와 기본값

- `row`: 완전한 블록들을 가로 한 줄로 놓고 occupied top을 맞춘다. plot 폭 때문에 임의 wrap하지 않는다.
- `column`: 완전한 블록들을 세로로 쌓는다.
- `wrap`: 기존 위치별 자동 배치를 보존한다. 위·아래는 plot 폭 기준 기존 wrap, 좌·우는 기존 column이다. 모서리에서 명시한 wrap은 inset 안의 폭으로 줄을 나눈다.
- 항목 `direction`, `columns`, sample values, 글꼴, 심볼, source data를 그룹 배치가 변경하지 않는다. 블록 순서는 기존 안정 순서인 categorical/color → size → opacity → stroke-width를 유지한다.
- 새 필드가 없는 기존 위·아래 기본 wrap과 좌·우 기본 column의 결과는 바꾸지 않는다. 새 multi-corner 그룹은 기본 row이고 각 블록 항목은 기본 vertical이다.
- **새 corner 기본 inset8px**는 기존 범주형 corner 기본값과 맞춘다. **corner row 블록 간격24px**는 기존 side-block gap을 재사용한다. **외부 row 블록 간격40px**는 기존 horizontal gap을 유지한다. 세 값은 이 승인 대상의 명시적 기본값이다. 별도 block-gap 옵션은 추가하지 않는다.
- 새 그룹이 모서리에 들어갈 때 명시적 새 offset이 없으면 새 corner 기본8을 사용한다. 이전 비그룹의 서로 다른 normalized default offset8/30을 충돌로 간주하거나 그대로 복제하지 않는다. 명시적 group offset은 유한한 0 이상 값이어야 한다.
- 외부 row의 폭은 plot보다 넓어도 Canvas에 들어가면 된다. 필요한 외부 Canvas 확장은 기존 Canvas 동작을 따르되 plot 크기는 보존한다.
- corner는 text, symbol, stroke, border padding까지 포함한 전체 occupied union을 inset 안에 고정한다. 한 줄이나 column이 들어가지 않으면 원자적 실패다. 항목 숨김·폰트 축소·샘플 변경·강제 wrap·오른쪽 fallback을 하지 않는다.

### 자유 좌표와 전환

- `at:{x,y}`는 전체 그룹 occupied top-left를 `(plot.left+x,plot.top+y)`에 둔다. 마크 종류와 무관하다.
- x/y는 유한한 논리 픽셀 수다. 음수도 최종 occupied bounds가 Canvas 안에 들어가면 허용한다. 누락 키·추가 키·NaN·Infinity는 거부한다.
- **같은 호출**에서 at와 position/align/offset을 함께 지정하면 거부한다. 기존 default-right 생성이 저장한 offset/alignment는 새 at 입력 충돌이 아니다.
- at 편집은 기존 edge anchor를 대체한다. 이후 명시적 position 편집은 at를 해제한다. 별도 `position:'none'`, `at:false`는 필요 없다.
- at 편집에서 blockLayout 생략은 확립된 그룹 정책을 유지한다. 새 free 그룹은 column이 기본이다. 전체 Canvas를 벗어나면 실패하며, plot 밖으로 놓는 것은 허용한다. 의도된 plot 내부의 마크와 범례 중첩 자체를 오역으로 간주하지 않는다.

## 간결한 public 호출 예시

실제 데이터셋의 수정 코드는 별도 지정 모델이 작성한다. 다음은 승인할 API 호출 형태이며 각 action은 최대3개 top 옵션이다. 기존 샘플·글꼴·축·마크를 그대로 둔 채 layout만 고치는 흐름이다.

```js
.editLegendLayout({position:'bottom-right',blockLayout:'row'})
.editLegendLayout({position:'top',blockLayout:'row'})
.editLegendLayout({position:'bottom',blockLayout:'row'})
.editLegendLayout({at:{x:201,y:79}})
```

생성 시에는 `createLegend({position:'top',blockLayout:'row'})`로 추론된 color+size를 만들고, `createLegend({channels:['opacity']})`로 명시적 그룹 정책을 상속할 수 있다. 스타일이 필요한 실제 프로그램은 기존 style editor/생성 옵션을 보존한다. 기존 생성에 그룹 상태가 없으면 여전히 기본 right다.

`wrap:false`는 column을 표현하지 못하고 항목 방향과 그룹 방향을 혼동하기 쉬워 채택하지 않는다. 별도 `createLegendGroup` action이나 primitive 좌표 조작도 불필요하다.

## 구현 후 검증 조건

1. 네 모서리 × 모든 범례 family의 public create/edit/layout parity. gradient는 새 모서리에서 세로이고 범주/샘플 항목 방향은 독립적이어야 한다.
2. 세 블록 row의 네 모서리 bounds와 전체 border/stroke union을 독립 literal 산식으로 검증한다. 내부 text-symbol·text-text 겹침과 Canvas clipping은 거부한다.
3. plot300/넓은 Canvas의 top·bottom row는 한 줄을 유지한다. 같은 row의 작은 Canvas는 원자적 실패다. 기존 wrap fixture는 그대로다.
4. at 단일/복합·음수 좌표·충돌 옵션·비유한 값·미지 target·at→position→at 전환·잘못된 멤버 anchor를 검증한다.
5. 입력/이전 ChartProgram 불변성, stable resource IDs, data/scale/Canvas/font/content 변경, 블록 제거·재생성, facet/repeat 재생, renderer parity를 확인한다. source expected 결과를 구현 helper로 생성하지 않는다.
6. 선언·current 계약·문서·generated catalog·macro architecture를 같은 checkpoint에서 동기화한다. trace는 기존 의미 action을 유지한다.
7. 원본 다섯 사례40단계와 자유 위치 사례4단계를 독립 correction overlay에서 재검증한다. 원본/기존 요청/usage/history를 보존하고 동일 family의 SVG/PNG/graphics 일치를 다시 확인한다. 다른 명시적 위치 사례는 별도 LIST 감사 후 범위를 기록한다.

## 승인 전 금지와 증거 한계

현재 패키지는 진단과 제안뿐이다. 새 기능을 구현하거나 실제 차트 코드를 수기로 고치지 않았다. 이미지 픽셀을 보지 않는다는 사용자 지시에 따라 원본 SVG DOM bounds와 public 호출의 구조적 결과를 증거로 삼았다. 새 runtime이 생기면 실제 렌더와 DOM 검증을 추가한다. 필요한 승인 없이 이를 이미 동작하는 API나 완성된 시각 결과로 설명하지 않는다.
