# P9-B — Horizon public lifecycle 검토

## 상태

- Gate: `P9-B`
- 상태: `approved`
- 승인: 2026-07-21 사용자 명시 승인
- 승인 전 차단: Phase 9 public closeout

Public action hierarchy, primitive/public parity, edit revision, shared/independent facet와 complete consumer matrix를
검토한다.

## 검토 패키지

- `encodeHorizon`은 승인된 Gapminder primitive와 semantic/graphic 구조 및 PNG pixel hash가 같다.
- `editHorizon`은 원본 source에서 새 `HorizonDataRevisionN`을 만들고 이전 unreferenced derived dataset을 제거한다.
- Partial edit은 source, x, y, groupBy, bands, baseline, extent, resolve, missing, overflow와 양쪽 palette를 지원한다.
- `groupBy: false`는 grouping을 제거하고 x field type 전환은 기존 x scale ID를 유지한 채 linear/time을 전환한다.
- all-baseline 결과는 stale path를 남기지 않고 빈 area collection으로 물질화한다.
- Facet shared y는 parent auto extent를 모든 셀에 고정하고 independent y는 셀별 extent를 다시 계산한다.
- 기존 area selection/highlight는 revision 뒤 현재 item grain에서 다시 평가된다.

## 검증 증거

- 전체 suite: `1755/1755` 통과
- 집중 lifecycle suite: encode/edit/facet/materialization 모두 통과
- Node PNG: primitive/public pixel hash 동일
- Browser Canvas와 Node PNG renderer에는 Horizon 전용 분기가 없다. 두 backend 모두 ordinary `path` graphic을 읽는다.

## 승인 후

P9-Exit closeout에서 Current action inventory, public declarations, API docs, stable gallery와 package export를
동시에 갱신한다.
