# 축 레이블 폭을 따르는 축 제목 간격

## 진행 상태와 Gate

- [x] 기존 composition/selector/axis-title 계약과 실제 child 상태 조사
- [x] 기본 재계산과 명시 거리의 원인 구분
- [x] 현재 공개 숫자 offset으로 primitive 기준 그림 생성
- [x] 최소 공개 입력·저장·replay·반례·검사 설계
- [ ] ROOT의 이 정확한 packet 검토와 승인 기록
- [ ] 소스 작업자 checkpoint와 직렬화한 문서 commit/push
- [ ] 승인 후 구현·normal/packed/browser/docs 검사
- [ ] 새 package/docs와 기존 번역 호환 검증 후 ROOT 런타임 채택

Gate 상태: **`ready-for-review`**. 구현·API·공유 metadata·runtime·번역 입장은 변경하지 않았다.
검토 revision은 아직 원격 커밋 전이다. ROOT가 packet을 검토한 뒤 공유 HEAD 작업과
직렬화하여 commit/push하고, 그 원격 revision을 기록한 뒤 구현한다.

기존 사용자 지시는 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함”과 번역 중 필요한
라이브러리/파이프라인 수정을 계속하라는 승인이다. 이 Gate는 그 범위 안의 구체적인
API/저장/시각 기대를 ROOT가 검토하기 위한 것이다. 검토 전 새 구체 설계의 승인이나
새 public API 구현 완료를 주장하지 않는다. 사용자에게 중복 승인을 묻지 않는다.

내부 기록에는 원본 ID1930의 측정값을 쓰지만 라이브러리 코드·type·test·공개 문서는
외부 차트 라이브러리나 이 데이터셋 ID에 의존하지 않는다.

## 현재 동작: 재계산 누락이 아닌 기본 거리 정책

`src/actions/guides/axes/titles.js`의 `inferredTitleOffset`은 Y축 기본 거리52를 출발점으로
삼는다. 명시적 plot 크기가 있을 때 결과는 `52 + max(0, needed)`다. 레이블이 좁아져도
제목이52보다 가까워지지 않는다. X의 출발점은42다. 현재 계약에 적힌 동작이므로
이 기본값을 작게 바꾸거나 기존 생략 입력을 재해석하면 안 된다.

해당 네 child의 `inferredOffset:true`는 실제로 유지된다. `derive.applyResolvedDomains`
→ `planScaleGuideRematerialization`은 각 child의 tick/label/title을 편집하며,
`editYAxisLabels`도 inferred title을 갱신한다. 따라서 이번 현상을 stale child replay
bug로 설명하지 않는다. 큰 기본 거리 때문에 명시적 plot의 왼쪽 margin이34에서57.5로
늘어나는 현재 결과를 원본과 같다고 채택할 수도 없다.

현재 공개 API의 다른 경로도 확인했다.

- `selectMarks`는 최종 mark item 선택이다. 축이나 facet child의 그룹 선택이 아니다.
- 축 `target`은 한 unit의 axis ID다. unit action은 composition 부모에서 거부된다.
- `useProgram`은 보존 child의 trace marker이며 receiver를 바꾸지 않는다.
- `editFacetSource({action})`은 retained full-data unit에 한 번 실행하고 모든 cell을
  다시 파생한다. 일부 child만 선택하지 않는다.
- `replaceCompositionChild`는 facet 부모를 명시적으로 거부한다.
- 네 unit을 개별 숫자 offset으로 만든 뒤 standalone `hconcat`으로 합치는 기존 공개
  경로는 primitive 기준에 사용할 수 있다. 실제 번역 전체를 그 구조로 바꾸는 것은
  반복 authoring과 별도 nested-composition qualification이 필요하다. 전체 공개 API가
  표현 불가능하다는 주장은 하지 않는다.

## 최소 확장: 기존 title.offset의 닫힌 객체형

```ts
export type AxisTitleOffset = number | Readonly<{
  from: "labels";
  gap: number;
}>;
```

```js
// 축을 먼저 만들고 제목을 자세히 편집한다.
program
  .createYAxis({ title: { text: "Price, £" } })
  .editYAxisTitle({ offset: { from: "labels", gap: 3.421875 } });
```

같은 옵션을 `createXAxisTitle`, `createYAxisTitle`, 해당 editor, complete X/Y,
`createAxes`, `createGuides.axes`, whole-axis editor의 nested title에 전달한다.
새 action이나 child selector를 추가하지 않는다. 기존 Basic의 complete-axis 입력에는
같은 type이 적용되지만 현재 없는 focused editor를 Basic에 새로 노출하지 않는다.
Polar/Parallel title에는 이 객체형을 허용하지 않는다.

- 숫자는 기존 signed axis-frame distance 그대로다. 음수도 기존처럼 inward다.
- 전체 생략은 기존42/52 추론 그대로다. edit에서 생략하면 기존 숫자/객체 의도를 유지한다.
- 객체는 정확히 `from`과 `gap` 두 key의 plain object다. from은 `labels`만 허용한다.
- gap은 유한한0이상의 logical pixel이다. 0은 경계 접촉이며 충돌 검사를 끄지 않는다.
- 빈 객체, 빠진 key, unknown key, array, null, 문자열 gap, 음수, NaN, Infinity를 거부한다.
- 객체 편집은 전체 교체다. 숫자 편집은 객체 모드를 끝내고 기존 숫자 의도로 돌아간다.
- 자동 기본값 reset은 기존처럼 title 제거/offset 없이 재생성한다. 이번에 `"auto"`나
  reset용 undefined를 새로 도입하지 않는다.
- source 차트에서 측정한 의미 있는 간격을 입력할 수 있지만 concrete x/y나 renderer
  property를 공개하지 않는다.

## 거리의 정확한 의미

선택한 axis owner의 **같은 physical side**에 있는 기존 label item의 occupied layout
bounds를 기준으로 제목을 바깥쪽에 둔다. 문자열과 hard-break line이 모두 비어 있는
label item은 기준에서 제외한다. 그 밖의 색상/투명도는 기존 layout의 occupied-bounds
정책을 그대로 따른다. 색 해석기를 새로 만들어 alpha를 추정하지 않는다.

1. 현재 title style·rotation·align·baseline·실제 `at`/alongOffset으로 offset0의 title
   occupied bounds를 기존 `resolveTextBounds`/`axisTitleTextLines`에서 구한다.
2. 같은 owner label들의 occupied bounds를 기존 text-metric profile로 구한다.
3. 선택한 side의 바깥쪽 방향으로 gap만큼 떨어지는 **local semantic distance**를 구한다.
4. 그 거리로 기존 `resolveAxisTitleGeometry`와 materializer를 실행한다.
5. 기존 Canvas 이탈/개별 label/다른 owner/title/legend 충돌 검사를 그대로 적용한다.

| side | 해결할 거리 d (`T0`: title offset0 bounds, `L`: label union) |
| --- | --- |
| bottom | `L.bottom + gap - T0.top` |
| top | `T0.bottom - L.top + gap` |
| right | `L.right + gap - T0.left` |
| left | `T0.right - L.left + gap` |

수식의 결과도 finite여야 한다. 역방향 scale은 along 위치에만 영향을 주므로 physical
outward side의 의미를 뒤집지 않는다. 임의 회전·정렬·hard breaks는 같은 실제 layout
bounds를 사용하며 Y-left 전용 상수를 두지 않는다. renderer는 해결된 concrete 숫자만 읽는다.

### 명확한 실패 경계

- 같은 owner에 실제 기준이 될 nonempty labels가 없으면 객체 모드를 거부한다.
  label이 없는데 axis edge나 다른 축 label을 조용히 기준으로 삼지 않는다.
- title과 labels의 physical side가 다르면 거부한다. 기존 숫자형 canonical mixed-side
  behavior는 유지한다.
- title이 객체 모드인 채 마지막 nonempty label만 지우는 편집은 거부한다. title도 함께
  제거하는 유효한 whole-axis edit와 전체 axis 제거는 최종 상태 기준으로 성공해야 한다.
- `overlap:"allow"`는 현재 의미대로 own-label collision만 허용한다. 객체 문법 오류,
  owner/side 부재, Canvas 이탈, 다른 owner 충돌을 면제하지 않는다.
- gap이 커서 맞지 않으면 명확한 오류다. 새 모드 때문에 plot/폰트/Canvas를 축소하거나
  margin을 임의로 확대하는 별도 보정 정책을 넣지 않는다.

## 한 가지 저장 의도, 명시적 rematerialization

기존 `guideConfigs.axis[axisId].title.offset`이 숫자 또는 위 객체 의도를 **한 곳에** 보존한다.
객체를 마지막으로 해결한 숫자로 덮어쓰지 않고 `resolvedOffset` 같은 두 번째 저장
필드도 만들지 않는다. object creation/edit의 `inferredOffset`은 false이고 default inference와
구분한다. stored object와 inferredOffset:true의 모순 상태는 복원 시 거부한다.

새 모드의 실제 numeric distance는 materialization 도중의 지역값이다. `graphicSpec`에는
현재처럼 text x/y/font/rotation 등 concrete primitive만 저장한다. semantic axis title text,
axis/scale/coordinate identity와 renderer/package 책임 경계는 바뀌지 않는다.

- 순수 문법은 기존 `grammar/axisTextPlacement.js` 또는 그 작은 공통 helper에서 한 번
  검증한다. Cartesian title create/edit와 persistence가 같은 validator를 사용한다.
- `titles.js`가 label bounds와 거리를 해결하고 existing geometry/materializer를 호출한다.
- label 편집 후 title을 재생할 조건을 기존 inferred 모드 **또는** relative 모드로 확장한다.
  label-edit preflight가 old title을 explicit-fixed title로 오인해 유효한 최종 배치를
  조기 거부하지 않도록 같은 dependency predicate를 사용한다. 최종 충돌 검사는 유지한다.
- scale/data/Canvas/theme/text metrics/facet independent/shared/source-edit replay가 객체
  의도를 그대로 읽고 현재 label 폭으로 다시 계산한다.
- named owner, persistence, complete/whole/focused action이 같은 helper를 소비한다.
- caller object와 이전 program은 구조 복사·freeze 규칙을 지킨다. 실패한 편집에는 상태나
  trace의 일부만 남으면 안 된다.
- 기존숫자/생략 snapshot의 저장표현·default output·오류는 그대로다. 기존 source restoration의
  다른 inference flag 문제를 발견하더라도 이번 source-specific 기능에 끼워넣지 않는다.

## 정확한 시각 목표

기준은 새 기능이 아니라 **이미 있는 공개 숫자 offset**으로 만든 네 unit이다.
[fixture.json](fixture.json)과 [primitive-reference-v2.mjs](primitive-reference-v2.mjs)가
전체 입력과 call chain을 소유한다. [proposed-public.mjs](proposed-public.mjs)는 같은 결과를
한 high-level line + independent facet + 객체 offset으로 만드는 **아직 실행하지 않은** 목표다.
후자의 helper/배열 구성은 Gate fixture이며 실제 School authoring 결과를 주장하지 않는다.

| child | Y domain / ticks | 단일 공통 gap | 기대 numeric distance | local title anchor x | parent placement x |
| --- | --- | --- | --- | --- | --- |
| narrow-a | `[0,4.5]` /0..4 | 3.421875 | 20.9833984375 | 13.0166015625 | 0 |
| wide-a | `[0,28]` /0,5..25 | 3.421875 | 26.544921875 | 7.455078125 | 258 |
| wide-b | `[0,11]` /0,2..10 | 3.421875 | 26.544921875 | 7.455078125 | 516 |
| narrow-b | `[0,4.5]` /0..4 | 3.421875 | 20.9833984375 | 13.0166015625 | 774 |

각 plot은200×200, local origin(34,59), title y159.5다. 네 unit의 axis-only primitive
reference는1016×302다. 원래 전체1930의1140×302를 대신하는 번역 결과가 아니다.
원본의12개 범례와 header는 이 primitive 목표의 범위 밖이며 전체 source qualification에서
계속 독립 검사한다. 실제 source title global left는
5.9384765625 /258.376953125 /516.376953125 /779.9384765625다.

측정 profile은 원본 browser canvas에서 얻은11개 문자 폭 그대로다. 잘못된 측정값을
주입해 위치를 맞추지 않는다. 3.421875는 layout box와 실제 font ink 기준이 다르다는 것을
보존한 공개 layout 간격이다. source/native DOM의 glyph precision이나 숫자 비교 허용치는
늘리지 않는다. 표의 값은 private algebra와 기존 숫자형 public primitive에서 확인했다.
**새 객체 모드의 render·normal·source completion은 아직 통과하지 않았다.**

활성 시각 증거: `.artifacts/test/png/review/axis-title-label-relative-offset/four-independent-label-widths/`
안의 `reference.svg`, `reference.png`, `variant.json`, `proof.json`. 이미지를 열거나 VLM으로
검사하지 않았다. 숫자 geometry와 현재 public program의 렌더 성공만 확인했다.
승인 후에는 새 public 결과와 같은 실행에서 primitive의 decoded RGBA가 정확히 같아야 한다.
Resource namespace 때문에 SVG 문자열이 다를 수 있으나 이를 숫자/픽셀 오차 확대로 바꾸지 않는다.

초기 reference v1의 `chart().hconcat` 오기는 새 v2에서 기존 standalone `hconcat` export로
고쳤다. 실패 원문 두 파일과 [FAILED_REFERENCE_ATTEMPT_V1.json](FAILED_REFERENCE_ATTEMPT_V1.json)을
보존했으며 library 기능 부족으로 집계하지 않는다.

## 원격 재현과 검증 계획

[REPRODUCE.md](REPRODUCE.md)는 고정 baseline과 현재 reference를 재현하는 명령을 담는다.
[ACCEPTANCE.md](ACCEPTANCE.md)는 구현 후 normal·packed·browser·docs와 호환 matrix다.
[REFERENCE_EVIDENCE.json](REFERENCE_EVIDENCE.json)은 이번 existing-API 결과의 정확한 해시다.
로컬 큰 작업은 번역 workspace `npm run storage:run -- ...`에서 실행한다. 별도 설치 복사,
무제한 이미지 묶음, 임시 전체 workspace, 새 worktree는 만들지 않았다.

현재 package는 inherited manifest0.0.23의 **미출시 candidate55c8**다. npm0.0.23 registry와
같다고 부르지 않는다. 새 구현 후 package/docs 준비·기존 전체 번역 호환·활성 pin·School
입장·viewer/public release는 ROOT의 별도 checkpoint다. 이 문서는 그 변경을 수행하지 않는다.
