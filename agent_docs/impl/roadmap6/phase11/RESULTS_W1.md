# Roadmap 6 Phase 11 W1 결과 — Hierarchical action discovery

## 고정 결과

- 검증된 source commit과 원격 ref는
  `4df800e29395e0979bc2ef52a58ebdad0733db73`이며
  `origin/codex/roadmap6-hierarchical-actions`에 push했다.
- Compact action-card collection과 card schema를 v3로 올리고 234개 direct action 전체에
  `authoringRoles`, `wraps`, `editableVia`, `supports.entryPoints`, `units`, `inference`,
  `completionRequirements`를 필수로 추가했다.
- 119개 generated smoke descriptor와 selection lifecycle을 실행해 234개 direct action을 모두 관측하고
  502개 immediate direct-public child edge를 `knowledge/action-relationships.json`에 고정했다.

## 계층과 완성 상태

| 구분 | 결과 |
| --- | ---: |
| direct cards | 234 |
| H0 complete-chart/composition | 31 |
| H1 analysis/composite | 41 |
| H2 semantic mapping | 62 |
| H3 edit/style/layout | 132 |
| H4 extension primitive | 3 |
| complete | 29 |
| deferred | 2 |
| contextual | 200 |
| not-applicable | 3 |

한 action이 여러 authoring role을 소유할 수 있으므로 role 합계는 card 수와 같지 않다. `createBoxPlot`과
`createGradientPlot`만 deferred이고 필요한 source/canvas와 compatible x/y 역할을 machine-readable하게
기록한다. `editSemantic`, `createGraphics`, `editGraphics`만 H4이자 not-applicable이다.

## Discovery 소비 경계

- Public action reference와 검색 metadata가 H0–H4 역할과 관계를 표시한다.
- Task resolver와 MCP adapter는 card schema v3, collection schema v3, intent taxonomy v2와 resource manifest를
  함께 요구한다.
- `wraps`는 실행 trace에서 관측한 immediate direct public child만 기록한다. Internal materializer branch와
  transitive descendant는 펼치지 않는다.
- Card 최대 크기는 3,122 bytes, median은 1,736 bytes다. 검증 ceiling은 실제 payload에 맞춘
  3,328/1,792 bytes이며 누락이나 truncation으로 크기를 맞추지 않았다.

## 판정

D04의 deferred facade 분류와 D20의 hierarchy/lifecycle/status metadata를 Current discovery surface로
구현했다. 미분류 action, unknown relationship, card/schema drift는 모두 0이다.

