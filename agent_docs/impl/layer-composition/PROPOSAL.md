# 일반 차트 레이어와 병치 확장 — 검토안

## 진행 상태

- [x] 현재 public constructor와 기존 follow-overlay의 차이 확인
- [x] 기존 공개 함수로 Beeswarm + Box, Violin + Box + Beeswarm 목표 그림 구성
- [x] 공통 좌표·척도, 독립 스타일 편집, resize, 저장/복원, 동일 PNG 검증
- [x] 앱 체크아웃에서 29종 × 29종 × 가로/세로 = 1,682개 독립 concat의 Canvas scene 생성 확인
- [x] Gate: 아래 신규 공개 API와 목표 그림 승인 (`approved`)
  - 사용자 명시 승인: 2026-10-24 “API 계약과 그림을 기준으로 구현 진행할까? -> 구현하자”. 검토 revision `773e7181` / 앱 `4634f0d`.
- [ ] 승인 후 native 구현·타입·inspection·저장/복원·문서 동기화
- [ ] 앱 Add overlay / Add adjacent 카드 연결, 편집 대상·Undo/Redo·Canvas transition 검증

사용자 요청(2026-10-24): 비스웜+박스플롯을 포함해 overlay/concat의 가능한 경우를 폭넓게 조사하고 일반적으로 지원한다. 이 요청은 기능 구현을 승인하지만 신규 공개 함수의 정확한 계약은 아직 확인되지 않았다. 루트 AGENTS의 공개 API 및 impl/AGENTS의 visual Gate를 이 문서로 묶어 한 번 확인한다. 검토 revision에서는 라이브러리 API와 앱 동작을 변경하지 않았다.

## 문제와 구현 경계

`createOverlay`는 visibleItems를 따르는 Line/Point이다. 같은 데이터로 서로 다른 통계/기하를 만드는 Box/Beeswarm/Violin은 이 종속 관계와 다르다. 공개 plot constructor들은 이미 여러 독립 mark를 같은 좌표·scale에 바인딩할 수 있으나, compound source의 실제 원본 필드·단위와 child ownership을 외부 앱이 각각 역추적해야 한다. 생성 후 숫자가 우연히 겹친다는 이유로 scale을 맞추면 안 된다.

원본 plot recipe를 복사해 별도 runtime을 만들지 않는다. 기존 불변 semanticSpec, native materializer, composite ownership, concrete graphicSpec을 재사용한다. renderer는 그대로 유지한다. 기존 follow binding과 snapshot/detach 동작도 보존한다.

## 제안 API (미구현)

```js
program.createLayerPlot({
  id: 'summary',
  source: 'observations',
  plot: { action: 'createBoxPlot', options: {
    width: { band: 0.4 }, outliers: false,
    box: { opacity: 0.25 }
  } },
  placement: 'front'
});
```

- `source`: 현재 view의 기존 독립 plot owner ID. 생략은 기존 current/unique inference만 허용한다. 여러 source 중 첫 번째를 몰래 고르지 않는다.
- `id`: 새 plot owner의 ID. constructor의 `options.id`는 거부한다. repeat 생성은 명시 ID 필요.
- `plot.action/options`: `createAdjacentPlot`과 같은 기존 29종 constructor vocabulary와 각 native options. 이후 새 constructor 추가 시 한 capability registry에 역할 계약을 등록해 layer/adjacent/inspection/UI가 함께 사용한다.
- `placement`: `front | back`, 생략 front. 복합 chart의 모든 owned marks를 한 묶음으로 옮기며 guide는 덮지 않는다. 별도의 저수준 graphic ID 노출은 없다.
- data와 positional field는 source의 실제 원본 역할에서 추론한다. Box의 내부 Q1 필드를 원본값으로 오인하거나 density의 생성 열 이름을 사용하지 않는다. 명시 options는 native validation을 따른다.
- 기존 coordinate와 호환 가능한 native scale resource를 공유한다. 자동 domain은 모든 실제 consumer를 반영하며 한쪽 편집·resize·facet 이후에도 재계산된다. 공유 scale 편집은 양쪽에 적용되고, mark appearance는 지정한 owner만 편집한다.
- 원본 데이터 레이어이다. 원본 mark의 aggregate/bin/pack/stack 결과를 따라가야 할 때는 기존 `createOverlay`를 쓴다. 두 모드를 숨겨서 서로 대체하지 않는다.
- 독립 layer는 기존 constructor별 edit/encoding 함수로 수정한다. layer용 두 번째 chart-state 사본이나 무분별한 `editLayerPlot` API는 만들지 않는다.
- 기존 scoped `target: {childPath}`와 `editFacetSource` 경로를 재사용한다. concat root 전체를 하나의 overlay 좌표계로 취급하지 않는다.

```js
getPlotComposition(program, { target: 'observations' }); // ggaction/inspection
```

- read-only `version: 1`, owner ID/owned mark IDs, source data, coordinate ID/type, channel별 field/fieldType/scale/measurement 역할을 반환한다.
- measurement는 raw field, 집계 연산, count/density/probability/normalized/folded 단위, temporal/bin 해석을 구분한다. chart 종류 문자열만 비교하지 않는다.
- 같은 내부 role resolver를 `createLayerPlot`, native composition compatibility, inspection, 앱 추천에 사용한다. 앱 전용 duplicated allowlist를 만들지 않는다.
- 생성 전 후보의 역할은 동일 registry가 constructor options로부터 계산한다. 추천 목록을 만들기 위해 모든 후보를 실제 렌더링하지 않는다.

## 조합 규칙

| 계열 | 공통 공간에서 허용할 예 | 검증/조건 |
|---|---|---|
| Cartesian Q×Q, T×Q | Scatter + Regression/Line/Area/Text/Rug, Heatmap + points/contours가 아닌 지원된 선·텍스트 | field·시간 단위·scale transform·측정 단위 일치. 자동 생성 bin 경계는 명시 공유. 새 contour 함수는 범위 밖 |
| Cartesian C×Q / Q×C | Beeswarm/Strip/Scatter + Box/Violin/Gradient/Interval/Mean Dot, Raincloud + 추가 통계 | 원본/median/mean/quantile는 원래 측정 단위. sum/count/variance는 원본 distribution과 자동으로 겹치지 않음. 가로·세로 둘 다 검증 |
| 집계 비교 | Bar + Line/Point/Area, Dot/Lollipop/Dumbbell + Interval | 같은 집계·그룹·bin 또는 명시 visibleItems follow. dodge offset과 stack 끝점 의미 보존 |
| 단변량 분포 | Histogram + Density/ECDF/Rug | count·probability mass·density·cumulative probability는 서로 다름. native normalization을 맞춘 경우에만 공통 수치 축. Rug는 측정 축만 필요 |
| 시계열 | Line + Area + points + regression + intervals | temporal unit, group ordering, missing break/connect, positive/negative baseline, smoothing 검증 |
| Polar | Polar Scatter + Polar Line; Rose/RadialBar + 호환 point/line | theta/r 해석·범위와 방향이 같아야 함. Pie share angle과 raw numeric angle은 자동 일치시키지 않음 |
| Radar | 동일 차원·순서·normalization의 profile layers | 다른 차원 순서나 normalization이면 겹치기 거부/명시 편집 필요 |
| Parallel | 동일 차원·순서·scale의 여러 observations/profile | 축별 transform 일치. 서로 다른 dimensionality는 독립 concat |
| Pie / Rose / RadialBar | 동일 angle partition의 annotation/outline 등 의미가 보장되는 native layer | 별도 pie를 단순히 겹쳐 가리는 것을 유효한 비교로 추천하지 않음 |
| Horizon | 동일 band normalization/folding의 compatible layer | 원본 수치와 folded 높이를 같은 Y축으로 취급하지 않음 |
| Concat | 모든 완성된 Cartesian/Polar/Parallel/chart+facet+overlay+concat | 좌우·상하·중첩·panel/group 선택. 공유 불가인 축은 독립. 다른 좌표계도 독립 concat 가능 |

이 표는 타입 목록별 하드코딩 dispatch가 아니라 registry에 기록할 의미별 규칙이다. 수학적으로 의미 없는 겹치기를 성공으로 보이게 하는 것은 목표가 아니다. 후보를 제외할 때 이유를 보존하고 독립 concat 경로를 제공한다.

## 데이터와 수정의 소유권

- 생성 시 shared data resource를 이용하므로 해당 dataset edit/filter는 그 dataset consumer들에 반영된다. 한 mark의 filterMarks는 다른 독립 plot에 전파하지 않는다.
- 같은 scale resource는 domain/type 변경을 공유한다. All에서 같은 scale을 여러 번 편집하지 않도록 resource별로 중복 제거한다.
- position을 다른 변수로 재인코딩할 때 기존 scale의 의미를 몰래 바꾸지 않는다. 별도 호환 scale 또는 명확한 충돌로 처리한다.
- color가 같은 field/type/palette이면 공유하고 범례를 한 번 만든다. 연속값/범주값, grouping과 fill/stroke 차이, combined color/shape legend를 검증한다.
- 같은 데이터가 여러 layer에 있다는 이유로 통계 표본 수를 두 배로 세지 않는다. 통계의 population과 owner는 명시된 source 하나이다.
- opacity와 z-order는 조절할 수 있으나 겹치기에 맞춘 default는 constructor 원래 default와 구분한다.

## 검증과 Gate 증거

`test/gates/layer-composition/manifest.js`가 입력·기존 실행 체인·제안 호출·제목을 단독 소유한다.

```sh
node --test test/gates/layer-composition/layers.test.js test/gates/layer-composition/png.render.js
```

4 tests 통과: 실제 공통 x/y scale, 72개 관측 유지, compound owner, 독립 opacity 편집, resize, 불변 이전 상태, 저장 복원 동일 Canvas scene 및 PNG. Review 그림은 `.artifacts/test/png/review/layer-composition/{beeswarm-box,violin-box-points}/target.png`이다. 아직 신규 함수의 동작을 검증한 것이 아니다.

앱 audit는 8개 실제 데이터셋과 Radar/Horizon deterministic fixture로 29종 생성 후 모든 순서쌍의 hconcat/vconcat Canvas scene을 구성했다. **1,682/1,682 성공**. 이는 서로 독립된 완성 chart의 병치 capability이며, 자동 role inference, UI 카드 도달성, 공유축의 1,682조합 성공을 의미하지 않는다. 재현 스크립트와 분류표는 부모 저장소의 `scripts/audit-composition-space.js`, `docs/composition-expansion.md`에 있다.

승인 후 검증은 constructor×coordinate×measure semantics, reverse orientation, color modes, facet independent/shared, nested concat, source edit/filter/re-encode/resize, compound ordering, immutable failures, native tracing, serialize/replay, type/inspection/docs parity를 포함한다. UI는 Apply-only, 한 카드 한 함수, 독립 Target/All, Undo/Redo, 복원, 빠른 Canvas hover 전환, recommendation cost를 실제 브라우저에서 확인한다.

## 승인 질문

기존 follow `createOverlay`를 유지하면서 위 `createLayerPlot` + `getPlotComposition` 계약과 두 목표 그림을 기준으로 구현할지 확인한다. 위 사용자 응답으로 승인되었으므로 native 구현과 앱 통합을 진행한다. npm publish/Pages deploy는 이 승인에 포함되지 않는다.
