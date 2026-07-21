# P15-A — Public docs verification

## 상태

- Gate: `P15-A`
- 상태: `approved`
- 승인: `2026-07-21` 사용자 명시 승인 (`exit까지 달려`)
- D-001 checkpoint: `e710ff5` (`fix documentation fragment offsets`)
- Public audit checkpoint: `0a4db99` (`clarify cumulative public chart contracts`)
- Remote: `origin/main`
- 승인으로 해제: release-readiness report와 P15-Exit 작업

## 승인 대상

1. Sticky topbar, heading fragment와 TOC current-section이 하나의 computed offset을 사용한다.
2. Direct hash, heading permalink와 page TOC가 desktop/mobile의 h2/h3를 topbar 아래에 둔다.
3. Public docs가 point 기본 radius `3`, direct quantitative line의 x/y 양방향 작성, layered rule datum의
   inherited-position precedence를 명시한다.
4. 여덟 facade의 shortest decision, inference, omitted-guide 차이와 edit handoff를 한 표에서 찾을 수 있다.
5. Heatmap pre-gridded/binned ownership, observed-row-only behavior와 explicit text overlay가 유지된다.

## D-001 구현

- `--docs-anchor-offset`은 `--docs-topbar + --docs-anchor-gap`으로 계산한다.
- id가 있는 content h2/h3는 같은 값을 `scroll-margin-top`으로 사용한다.
- TOC JavaScript는 첫 navigation heading의 computed `scrollMarginTop`을 pixel 값으로 읽는다. `rem` 문자열을
  `parseFloat`해 pixel로 오해하던 별도 계산은 제거했다.
- Browser regression은 direct URL hash, heading permalink와 TOC click을 desktop/mobile에서 나눠 검증한다.
  Heading top은 sticky topbar 아래이며 computed scroll margin과 2px 이내여야 한다.

## Public docs 감사 결과

| 범위 | 결과 |
| --- | --- |
| Point materialized default | `createPointMark` 후 별도 size가 없으면 semantic radius를 합성하지 않고 3 logical pixels로 materialize함을 명시 |
| Direct quantitative line | x→y와 y→x가 같은 final layer, resolved scales와 graphics로 수렴하고 incomplete path는 비어 있음을 명시 |
| Layered rule datum | datum y/x가 inherited opposite position만 제거해 horizontal/vertical full-span을 만들며 field/explicit-data 차이를 명시 |
| Facade map | Scatter, Line, Bar, Histogram, Heatmap, Parallel, Box와 Gradient의 shortest decision와 omitted-guide lifecycle을 비교 |
| Heatmap | pre-gridded observed rows, binned generated count ownership, rect fill conflict와 post-facade text escape hatch 확인 |
| Generated surfaces | signatures, capabilities, action metadata/reference, page metadata, search, images와 LLM bundle 재생성 및 freshness 통과 |

## 검증 증거

- Focused runtime contracts — 72/72 pass
  - point default radius
  - direct line x/y order
  - inherited rule datum spans
  - six ordinary facades와 Box/Gradient create/edit lifecycle
- `mise exec ruby@3.2.6 -- npm run docs:verify` — pass
  - docs source/generated tests: 36/36
  - built pages: 110 checked
  - desktop search, navigation, accessibility와 no-JavaScript behavior
  - every built page responsive containment at 320px, 390px와 768px
  - desktop/mobile fragment numeric assertions
- Desktop preview: `.artifacts/docs/fragment-desktop.png`
- Mobile preview: `.artifacts/docs/fragment-mobile.png`
- `git diff --check` — pass

## Non-goals 확인

- Runtime action, semantic/graphic schema, renderer와 chart visual을 변경하지 않았다.
- Version, tag, package publish, PR와 documentation deployment를 수행하지 않았다.
- P15-A 승인 전 release-readiness checksum 작업을 시작하지 않는다.
