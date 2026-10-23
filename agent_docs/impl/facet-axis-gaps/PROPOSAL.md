# Facet의 가로·세로 간격을 독립적으로 지정

## 진행 상태와 승인 경계

- [x] 원본 두 건의 plot 크기·원점·서로 다른 두 축 간격 측정
- [x] 현재 scalar gap, content kernel, 저장 validator, action/materialization 경계 읽기
- [x] 공개 입력·저장·검증·호환 범위의 구체 설계
- [x] ROOT 설계 검토 및 기존 승인 근거 기록
- [ ] 구현·회귀 검사·source별 새 native qualification
- [ ] 정확한 package/docs 준비와 기존 번역 호환 검증 후 런타임 채택

Gate 상태: `approved` (2026-10-23, ROOT가 문서 전체와 구체 API·저장·검증 범위를 검토).
사용자의 기존 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함”과 번역 중 필요한
ggaction/파이프라인 수정을 계속하라는 명시 승인을 이 동일 범위에 재사용했다.
새 사용자 승인이나 배포 완료를 주장하지 않는다. 이 docs-only Gate를 commit/push한
remote checkpoint 뒤 구현한다. 설치 runtime activation은 별도의 ROOT 검증 단계다.
원본·숫자 허용오차·보존 코드·셀 순서는 바꾸지 않는다. 새 이미지/VLM 검사는 하지 않는다.

## 문제와 관측 근거

동일한 행·열 격자에서도 plot 사이 가로 간격과 세로 간격이 다른 입력이 있다.
`gap: number`는 두 방향에 같은 값을 적용하므로 `spacing:"plot"`만으로는 두 거리를
동시에 지정할 수 없다. 간격 두 개는 사용자의 디자인 결정이며 셀별 절대 좌표가 아니다.

| 원본 ID | 외부 Canvas | 각 plot | plot 원점: 첫 행 / 둘째 행 | 필요한 gap.x / gap.y |
| --- | --- | --- | --- | --- |
| 0999 | 394×388 | 120×120 | (64,73), (266,73) / (64,240), (266,240) | 82 / 47 |
| 0557 | 481×410 | 200×130 | (30,70), (273,70) / (30,252), (273,252) | 43 / 52 |

0999의 두 첫 행 header top은 51 / 46이고, 둘째 행은 218 / 218이다.
0557은 47.868600845336914 / 46.23636436462402와 225 / 225다.
각 header의 기존 native content/view anchor와 유지된 축 경계를 계속 사용해야 한다.
간격 확장은 이들 glyph의 개별 위치가 이미 일치한다는 주장이 아니다.

보존 증거는 번역 workspace의 다음 경로에 있다.

- `tmp/v13-source0999-original-dom-v1/source0999-original-dom-v1.json`
- `tmp/v13-original-candidate-readiness-v1/vl_0999/`의 원문·26행 CSV·compiled·reference
- `tmp/v13-source0999-private-feasibility-v1`부터 `v7`까지의 PRIVATE 준비 기록
- `reports/v13-source0557-private-layout-feasibility-hold-v1.json`

0999는 26행을 원래 fold 순서로 104행으로 만들며, 2020 Brazil의 빈 값 한 개는 원문에
그대로 남는다. 파생 numeric 값에만 null을 쓰고 기존 `line.missing:"break"`를 적용한다.
0557은 151행을 604행으로 fold한다. 이 데이터 의미는 간격 기능과 독립이다.

0999의 canvas-spacing PRIVATE 출력 한 건은 407×414, 열 원점 차이208.5/행180이었다.
현재 `anchor:"view"`는 plot/content spacing을 요구하므로 이 canvas 배치를 header
위치 보존 대안으로 확정할 수 없었다. scalar plot-gap82 전체 probe는 부모 제목 생성의
`Facet parent title places text outside the Canvas` 오류에서 끝났다. 따라서 그 probe의
완료된 plot 좌표나 새 기능 적용 후의 완성 차트 일치는 아직 주장하지 않는다.
0557의 기존 plot/content probe도 원본 전체 배치와 일치하지 않았다. 이는 모든 기존
API 조합이 불가능하다는 증명은 아니다. 이번 기능의 수용 조건은 새 native 실측이다.

관련 기존 요구는 #258에 있으며, 이번 설계는 독립 gap만 다룬다. 부모 제목의 배치와
header 실측이 여전히 실패하면 별도 원인을 기록한다. gap 확장만으로 전체 원본을
복원했다고 보고하지 않는다.

## 확정 제안: 기존 gap에 닫힌 객체를 추가

```ts
export type FacetGap = number | Readonly<{ x: number; y: number }>;
```

```js
program
  .facet({ field: "group", columns: 2, gap: { x: 82, y: 47 } })
  .editCompositionLayout({ spacing: "plot", topLane: "shared" });

// 이후 편집도 두 축을 한 번에 명시한다.
program.editCompositionLayout({ gap: { x: 43, y: 52 } });
// 숫자를 지정하면 기존처럼 두 축에 같은 간격을 적용한다.
program.editCompositionLayout({ gap: 16 });
```

- `x`와 `y`가 모두 있는 plain object만 받는다. 두 값은 각각 유한한 0 이상의 숫자다.
- `{x:10}`, `{y:10}`, `{}`, unknown key, null, array, NaN, Infinity, 음수, 문자열은 거부한다.
- 객체 편집은 전체 gap 교체다. 생략한 축을 이전 값에서 보충하는 partial merge는 없다.
- `gap` 전체를 생략하면 기존 생성 기본값/편집 보존 동작을 그대로 따른다.
- 한 행·한 열이어도 두 축 값 모두 검증한다. 사용하지 않는 축의 잘못된 값도 받지 않는다.
- 기존 숫자값, 기본값, 저장 표현, 오류 문구·기존 오류 상세와 계산 순서는 보존한다.
- `{x:g,y:g}`의 배치는 숫자 `g`와 같아야 한다. 저장 표현은 서로 다르므로 객체를
  숫자로 축약하거나 기존 숫자를 객체로 다시 저장하지 않는다.

### 적용 표면

| 표면 | 객체 지원 | 기존 spacing 범위 |
| --- | --- | --- |
| `facet` 및 그 결과의 `editCompositionLayout` | 지원 | canvas / plot / content |
| `repeatCharts` 및 그 파생 facet의 편집·replay | 지원 | canvas / plot / content |
| `facetGrid` 및 그 결과의 편집·replay | 지원 | canvas / plot |
| horizontal/vertical concat 생성·편집 | 지원하지 않음 | 기존 숫자 gap만 유지 |

`facetGrid`에 content spacing을 새로 허용하지 않는다. Unified ChartProgram의
`editCompositionLayout` 선언은 union을 받되, concat receiver에서 객체는 명시적으로
거부한다. concat 안에 facet child가 있을 때에는 기존 child 편집 경로로 해당 facet만
변경하며 parent concat의 숫자 간격 의미는 유지한다. Polar/parallel template을 포함한
기존 facet family도 같은 grid 배치를 사용하므로 객체를 일관되게 받는다. 이미 금지된
family/spacing 조합을 새로 허용하지 않는다.

## 배치 의미와 겹침 검사

- canvas: 열 slot 간격에는 x, 행 slot 간격에는 y를 사용한다.
- plot: data region의 열 track 간격은 x, 행 track 간격은 y다. plot 크기·child margin·
  topLane·외곽 header·부모 제목·범례 예약 소유권은 기존 규칙 그대로다.
- content: 기존 retained-content kernel의 가로 누적에 x, 세로 누적에 y를 사용한다.
  논리 row-major 순서, ceil 정책, ragged row, shared footer의 마지막 소유자는 바꾸지 않는다.
- header/guide의 최소 가로 clearance는 x, 최소 세로 clearance는 y와 각각 비교한다.
  다른 축의 큰 값으로 부족한 간격을 상쇄하지 않는다. 기존 최종 concrete overlap 검사도
  계속 실행한다. 객체 지원을 이유로 기존 guard·폰트·축·stroke bounds를 완화하지 않는다.
- 각 축의 누적 좌표·폭·높이 overflow는 유한성 검사로 거부한다. 유한 입력끼리의 합이
  Infinity가 되는 경우도 실패한다.

순수 plot-layout 수용 목표는 0999 크기의 네 plot과 기존 외곽 margin을 사용했을 때
원점이 (64,73)/(266,73)/(64,240)/(266,240)인 것이다. 0557은 위 표의 원점 네 개다.
이 값은 원본에서 측정한 검증 목표이며 공개 API로 셀 좌표 배열을 전달하지 않는다.
실제 mark/guide/header/title까지 같은 경계에 놓이는지는 source별 native oracle로
별도 검증한다. 두 source는 새 candidate package/docs와 기존 번역 호환 검증 후 실제 School
normal/cold/final 검증까지 통과하면 집계할 수 있다. 공개 issue의 released 처리·종료는
1400 milestone의 registry release 이후다. source 집계에 공개 배포를 선행 조건으로 두지 않는다.

## 소유권·저장·불변성

현재 [아키텍처](../../SECOND_ARCHITECTURE.md)의 action → 명시적 materialization →
backend-neutral graphicSpec 경계를 유지한다. renderer에 gap 해석을 추가하지 않는다.

- `layout/composition.js`의 기존 숫자 spacing validator는 concat·padding·제목 등에 그대로 둔다.
- facet 전용 순수 gap validator/resolver를 한 곳에 둔다. 생성·편집·순수 grid/content layout·
  저장 복원이 같은 규칙을 호출한다. 기존 모듈에 둘지 작은 전용 모듈로 둘지는 구현 시
  현재 의존 경계를 보고 정하되 서로 다른 validator 복사본을 만들지 않는다.
- `layout/facets.js`의 grid track과 두 방향 header 최소값을 분리한다.
  `layout/facetContentFlow.js`의 누적·결과 metadata도 number/object 원형을 보존한다.
- `actions/facets`의 facet/grid/repeat recipe와 `actions/composition`의 편집이 gap을
  명시 저장하고 현재 materializer를 호출한다. `core/compositionState.js`는 facet일 때만
  union을 검증한다. concat 저장 validator는 숫자 전용이다.
- `composition.gap` 한 곳에 원래 입력 형태를 보존한다. 별도 `gapX/gapY` 중복 저장 필드나
  파생 좌표를 공개 스키마에 추가하지 않는다. materialization 시에만 축별 수치를 해결한다.
- object 입력과 변경 경로를 구조 복사·freeze하여 이전 program과 호출자 객체를 보존한다.
  실패한 편집은 이전 상태·trace·graphic을 변경하지 않는다.
- 숫자 상태의 기존 save/restore/replay 결과와 action trace를 유지한다. 새 object 상태는
  새 지원 runtime에서 round-trip한다. 객체를 모르는 구버전이 읽을 수 있다고 주장하지 않는다.
- 데이터·scale·guide·header·title·theme·metrics 편집, row 수/columns 변경, child 교체와
  nested composition materialization에서도 같은 recipe의 객체 간격을 보존한다.

객체 오류는 기존 diagnostics 구조를 재사용한다. 잘못된 객체 형식은 `optionPath:"gap"`,
축 값/최소 clearance 오류는 `gap.x` 또는 `gap.y`를 쓴다. clearance 오류의 `actual`은
요청한 해당 축 값, `limit`은 해당 방향 최소값이다. 숫자의 기존 `optionPath:"gap"`와
기존 최소값/메시지는 바꾸지 않는다. 새 source ID나 외부 라이브러리 이름을 오류에 넣지 않는다.

## 완료에 필요한 검증과 문서

1. 순수 grammar: 숫자·동일 객체·비대칭 객체·0·부분/unknown/비유한 입력, 입력 불변성.
2. 순수 layout: 네 plot의 두 목표 좌표, 서로 다른 child 크기·정렬·padding·ragged row·
   keyed sparse/full grid, X-only/Y-only 편집의 단조성, 축별 overflow, 두 방향 overlap 실패.
3. 공개 action: facet/repeat/grid × 기존 spacing 조합, 숫자↔객체 편집, 부모/child 소유권,
   named axes·shared footer/legend·topLane·header view/content anchor·부모 제목의 재배치.
4. 저장: 숫자 원형 불변, 객체 round-trip, 잘못된 persisted object와 concat 객체 거부,
   immutable revisions 및 replay/child/source/scale/theme/metrics 편집.
5. SVG/PNG/PDF/browser: 동일 fully materialized graphicSpec에서 출력, viewport clipping과
   실제 Canvas 경계 확인. 기존 숫자 fixtures는 같은 실행에서 byte/pixel 회귀를 확인한다.
6. 타입·Current COMPOSITION 계약·관련 action 가이드·action cards·검색 index·package
   consumer를 같은 개념 변경에서 갱신한다. 유효 타입 예제 및 concat runtime 거부 예제 포함.
7. focused tests 후 필수 전체/보호 package 검사를 수행한다. 실측 없는 크기 한도 증가는 하지 않는다.
8. 0999/0557 각각 새 native/source/normal/mutation/protocol qualification을 수행한다.
   기존 실패/PRIVATE proof는 보존한다. 축·문자·막대/선·원문 lineage 검사는 그대로다.
9. 새 candidate의 정확한 package/docs snapshot과 현재 모든 accepted program 호환 검증이
   끝나기 전에는 해당 runtime으로 School authoring하지 않는다. ROOT만 activation/admission/count를 쓴다.

큰 build/render/replay/docs 작업은 번역 workspace의 `npm run storage:run -- COMMAND ...`로
실행한다. 새 worktree와 전체 workspace 복사본은 만들지 않는다. 공개 릴리즈·뷰어 동기화는
현재 1400-family milestone의 별도 ROOT 검증·배포 단계다.
