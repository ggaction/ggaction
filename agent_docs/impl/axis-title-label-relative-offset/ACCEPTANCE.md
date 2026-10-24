# 구현 후 검증 계획

상태는 **planned**다. 아래 검사를 아직 실행·통과했다고 주장하지 않는다. 먼저
[PROPOSAL.md](PROPOSAL.md)의 정확한 입력·저장·시각 설계를 ROOT가 검토하고 원격 Gate
checkpoint를 남겨야 한다. 기존 protected tests, package ceiling, numerical/DOM 허용오차를
이번 기능을 위해 바꾸지 않는다.

## 최소 동작과 반례

새 테스트는 데이터셋 이름이나 외부 chart library에 의존하지 않는 공개 의미 fixture로 만든다.
예정 위치는 `test/unit/actions/guides/axis-title-label-relative-offset.test.js`와 관련 persistence,
facet, browser, packed-consumer owner다. 실제 기존 directory convention에 맞춰 배치한다.

| 범위 | 반드시 확인할 성공 / 거부 |
| --- | --- |
| 기본 호환 | offset 생략의 X42/Y52 floor와 inference flags, 명시 numeric signed offset(0·음수 포함), edit에서 offset 생략, 기존 오류/snapshots가 그대로다. |
| 전환 | create/edit의 객체→숫자→객체, omitted edit의 객체 보존, remove/recreate의 기존 자동 모드 복구가 성공한다. caller 객체·이전 program은 변하지 않는다. |
| 문법 | 정확한 `{from:'labels',gap:0}`와 finite nonnegative gap만 허용한다. null/array/빈 객체/빠진 key/unknown key/from 오기/문자열/음수/NaN/Infinity/overflow는 거부한다. |
| 소유권 | canonical X/Y 및 named Cartesian owner별 실제 label만 사용한다. 다른 owner·다른 side label, title만 존재, 모든 nonempty labels 제거는 거부한다. |
| 원자적 삭제 | 객체 title과 마지막 labels를 함께 없애는 whole-axis edit 및 전체 axis 제거는 최종 유효 상태로 성공한다. 실패 편집에는 부분 semantic/graphic/trace 변경이 없다. |
| geometry | bottom/top/left/right, scale reverse, arbitrary rotation/align/baseline/at/alongOffset, hard-break labels/title, gap0을 기존 occupied text bounds로 계산한다. 축간 개별 충돌·Canvas 경계 검사를 유지한다. |
| 빈 레이블 | 빈 text와 모든 hard-break line이 빈 item은 기준에서 제외한다. nonempty item이 한 개도 없으면 거부한다. opacity/color는 기존 occupied-bounds 정책이며 새 paint-alpha 해석기를 만들지 않는다. |
| 충돌 | `overlap:'allow'`가 문법/owner 부재/Canvas/다른 owner 충돌을 면제하지 않는다. 큰 gap을 줄이거나 Canvas/폰트를 임의 확대·축소하지 않는다. |
| 비Cartesian | Polar/Parallel title offset 객체는 create/edit/persistence/type에서 거부한다. 기존 숫자형 동작은 유지한다. |

## 저장과 파생 상태

1. `guideConfigs.axis[id].title.offset`에 객체 의도가 한 번만 남고, 객체 모드는
   `inferredOffset:false`다. resolved number나 새 병렬 metadata를 저장하지 않는다.
2. persistence export/import/replay에서 객체와 owner/coordinate/scale binding을 보존하고
   복원 뒤 현 label 폭으로 같은 concrete graphics를 만든다. object+inferredOffset:true,
   부정확한 side/owner/shape, nonCartesian persisted object를 거부한다.
3. `editXAxisLabels`/`editYAxisLabels`의 format, labelMap, ticks 연계, font family/weight/size,
   rotation, align, offset, alongOffset, text-metric profile 편집 후 제목이 다시 계산된다.
4. scale domain/nice/tick-count, data revise/derived-data replay, Canvas/plot layout,
   `applyTextMetrics`, theme 변경 시 현재 label 폭을 사용한다. 오래된 title geometry를
   explicit-fixed preflight로 오인해 유효한 편집을 거부하지 않는다. 최종 상태 collision은 검사한다.
5. full-data unit→facet shared/independent domain 전환과 `editFacetSource` 후 child별로
   같은 gap 의도가 유지된다. 작은 domain과 넓은 domain 모두 한 객체에서 서로 다른
   numeric distance를 얻으며 retained source와 derived children의 숫자를 혼동하지 않는다.
6. direct focused, complete axes, `createAxes`, `createGuides.axes`, whole-axis title 편집은
   한 validator와 한 materialization 의미를 사용한다. Basic complete-axis 입력의 type와
   런타임을 확인하되 기존 Basic에 없는 focused editor를 새로 추가하지 않는다.
7. renderer는 concrete graphicSpec만 읽는다. title offset 객체가 SVG/PNG/PDF renderer,
   generic graphic properties 또는 primitive-edit API로 새어 나오면 실패다.

## 정확한 시각 목표

현재 rendered primitive 기준은 [fixture.json](fixture.json),
[primitive-reference-v2.mjs](primitive-reference-v2.mjs),
[REFERENCE_EVIDENCE.json](REFERENCE_EVIDENCE.json)이다. 새 공개 facet 경로는
[proposed-public.mjs](proposed-public.mjs)를 구현한 뒤 실행한다.

| child | 공개 gap | resolved distance | local title anchor x / y | composition x |
| --- | --- | --- | --- | --- |
| narrow-a | 3.421875 | 20.9833984375 | 13.0166015625 /159.5 | 0 |
| wide-a | 3.421875 | 26.544921875 | 7.455078125 /159.5 | 258 |
| wide-b | 3.421875 | 26.544921875 | 7.455078125 /159.5 | 516 |
| narrow-b | 3.421875 | 20.9833984375 | 13.0166015625 /159.5 | 774 |

- 네200×200 plot, origin(34,59), reference1016×302를 유지한다. 위 binary geometry 값을
  exact 비교한다. 경계 gap은 기존 layout box에서 계산하며 font ink와 혼동하지 않는다.
- 같은 실행의 numeric reference와 새 public facet output의 decoded RGBA를 모든 픽셀에서
  exact 비교한다. source IDs/resource namespace만 다른 SVG 문자열을 정규화한 것을
  숫자/픽셀 검증의 대체 증거로 쓰지 않는다.
- primitive reference1016×302는 원래 전체 그림1140×302의 대체 결과가 아니다. source1930을
  재검증할 때 원본1584행·전체 line vertices·12legend entries·header·title·plot border·Canvas를
  별도로 검사한다. 이번 axis-only proof로 전체 source 완료를 신고하지 않는다.
- default 숫자 모드를 쓰는 기존 browser/render snapshots는 그대로 통과해야 한다. raw SVG,
  layout geometry, graphicSpec, guide ownership, source provenance의 기존 Gate를 생략하지 않는다.

## normal / packed / browser / docs

다음 CLI는 구현 후 실행할 계획이며, 이 Gate 작성 시점의 실행 결과가 아니다. 로컬에서는
P의 storage guard를 통해 각 명령을 실행한다. `--prefix`로 I의 script를 지정하고 병렬 slot
상한3을 지킨다. `TRANSLATION_WORKSPACE`는 storage guard가 있는 P의 절대경로다.

```sh
cd "$TRANSLATION_WORKSPACE"
npm run storage:run -- npm --prefix ../ggaction-release1336-integration run test:unit
npm run storage:run -- npm --prefix ../ggaction-release1336-integration run test:contracts
npm run storage:run -- npm --prefix ../ggaction-release1336-integration run test:charts
npm run storage:run -- npm --prefix ../ggaction-release1336-integration run test:gates
npm run storage:run -- npm --prefix ../ggaction-release1336-integration run test:browser
npm run storage:run -- npm --prefix ../ggaction-release1336-integration run test:package
npm run storage:run -- npm --prefix ../ggaction-release1336-integration run package:check
npm run storage:run -- npm --prefix ../ggaction-release1336-integration run package:bundle
npm run storage:run -- npm --prefix ../ggaction-release1336-integration run docs:verify
```

- 빠른 변경 검증은 `node scripts/run-tests.js unit <test-relative-selector>`의 기존 selector를
  사용한다. 위 suite 전체 검증과 필요한 render suite는 coherent implementation checkpoint에서
  한 번 수행하며, 새 오류나 변경 없이 같은 큰 작업을 반복하지 않는다.
- canonical builder가 만든 **실제 archive**를 consumer에 설치해 full/Basic types, create/edit,
  persistence, facet child rematerialization, SVG/PNG/PDF 경로를 검사한다. source checkout만
  통과한 결과를 packed consumer 통과라고 쓰지 않는다. artifact SHA·relative-path inventory·
  installed file SHA를 결합한다. 기존 file/byte ceilings는 별도 측정·검토 없이는 올리지 않는다.
- 지원 Node22/24 및 기존 플랫폼/browser matrix에서 기존 regression을 확인한다. browser
  font 환경은 기록하고 exact-pixel 기준은 같은 환경 안의 numeric/reference pair로 둔다.
- current contract `AXES.md`, public axis docs, `types/program.d.ts`, action input metadata,
  machine docs/search/action cards/signatures/snippets, 필요시 SECOND_ARCHITECTURE의 single-intent
  원칙 설명을 함께 갱신한다. 문서 예제는 실제 실행해 저장/replay 의미와 일치시킨다.
- public docs에는 dataset ID나 외부 구현 이름·내부 translation workaround를 넣지 않는다.
  관계형 offset이 필요한 일반 독립축 예제로 설명한다.
- ROOT의 package/docs isolated 준비, 기존 전체 cohort 호환·actual 신완료 가족 호환·활성 pin·
  School 재개·viewer/공개 release는 뒤의 별도 Gate다. 실행 중인55c8 actual controls와 기존
  frozen helper는 이 구현 packet 때문에 수정하지 않는다.
