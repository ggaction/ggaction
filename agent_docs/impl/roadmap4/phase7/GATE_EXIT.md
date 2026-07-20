# Gate P7-Exit — Phase 7 cumulative closeout

## 상태

- Gate: `P7-Exit`
- 상태: `approved`
- 사용자 승인: `2026-07-20`
- 검토 대상 remote checkpoint: `9776541` (`origin/main`)
- 승인 전 차단: Roadmap 4 Phase 8 categorical density placement production source

## 승인 대상

Phase 7의 ordered-path capability가 임시 primitive나 Gate 전용 구현이 아니라 Current public vertical slice로 닫혔는지
검토한다.

- `pathOrder`는 position/appearance와 분리된 scale 없는 semantic topology encoding이다.
- `encodePathOrder`는 각 compatible Cartesian line/ranged-area series를 explicit quantitative field로 stable sort한다.
- 같은 order 값은 source order를 유지하고 repeated position도 별도 vertex로 보존한다.
- `removePathOrder`는 semantic branch를 제거하고 기존 automatic independent-position sort로 복귀한다.
- Renderer는 order field를 해석하지 않고 materialized concrete path commands만 그린다.

## Lifecycle와 consumer evidence

- Explicit target, current compatible path, unique compatible path 순서로만 추론하며 ambiguity는 오류다.
- Encode-before-position과 encode-after-position이 같은 final state로 수렴한다.
- Field/direction reassignment와 removal은 earlier program을 바꾸지 않고 owning path를 다시 materialize한다.
- Canvas, scale, row-preserving data/filter, mark filter, selection/highlight와 facet child replay에서 explicit order가
  보존된다.
- ordinary Cartesian line과 ranged area를 지원한다.
- Aggregate line, Polar line, density/error/regression generated path와 non-row-preserving transform은 다른 topology
  owner를 가지므로 atomic validation error를 낸다.
- Missing/non-number/non-finite order는 일부 vertex만 제거하지 않고 전체 action을 거부한다.

## Stable vertical slice와 public surface

- Stable chart tests: `test/charts/gapminder-development-trajectories/`
- Runnable public example: `examples/gapminder-development-trajectories/`
- Public wiki: `docs/api/encodings.md`, `docs/api/series-encodings.md`
- Current contract: `agent_docs/contract/current/ENCODINGS.md`
- Current architecture: `agent_docs/SECOND_ARCHITECTURE.md`
- Runtime registrar, strict declarations, root package types, Current action inventory와 generated references가 동일한
  API/value vocabulary를 사용한다.
- Phase-local action `2/2`가 `implemented`이며 Current inventory에도 모두 `implemented`다. Planned 잔여 action은 없다.
- Active Gate test는 없고 active-review gallery는 0개다.

## Exact parity와 visual evidence

- Gapminder China, South Africa, United States의 1955–2005 trajectory 3개를 year ascending으로 연결한다.
- Primitive/public `semanticSpec`, `graphicSpec`, graphic tree, draw order와 Canvas calls가 exact equality다.
- Logical/physical size: `760×500` / `1520×1000`.
- Primitive/public PNG file과 decoded pixels가 exact equality다.
- 공통 SHA-256:
  `1d1603387becd3bea819166222a45c451588811aab2bd7eea67b9e61d85242a9`.
- Stable artifact:
  `.artifacts/test/png/charts/path-order/gapminder-development-trajectories/year-ordered/`.

## 누적 검증 증거

| 검증 | 결과 |
| --- | --- |
| Full normal suite | `1,708/1,708` pass |
| Contract suite | `122/122` pass |
| Browser Canvas와 packed-browser consumer | `35/35` pass |
| Node PNG render suite | `119/119` pass |
| Approved artifact gallery | `118` variants verified |
| Active-review gallery | `0` variants verified |
| Coverage | lines `94.61%`, branches `89.94%`, functions `98.62%`; critical floors `56/56` pass |
| Documentation source/generator suite | `32/32` pass |
| Package artifact | `353` entries, packed `313058` bytes, unpacked `1468205` bytes |
| Installed-package consumer | Node/extension/PNG/path-order/TypeScript/tutorial/private-export checks pass |
| Catalog/docs generation freshness | pass |

Chromium/localhost 검증은 macOS sandbox 권한 밖에서 동일 repository command로 통과했다. Docs source와 generated
assets는 갱신했지만 문서 배포나 package publish는 수행하지 않았다.

## 호환성과 남은 limitation

- Existing API, explicit-order omission과 모든 기존 automatic path sort는 유지된다.
- 새 actions/types/schema branch는 additive다.
- Categorical/string order, Polar theta topology, aggregate grain order와 generated statistical sample order는 지원하지
  않는다.
- Series draw order나 mark z-order를 바꾸는 기능이 아니다.
- Package source responsibility 3개 추가를 반영해 entry budget을 350에서 360으로 조정했고 실제 artifact는 353개다.

P7-Exit 승인으로 Phase 7을 `completed`로 닫았다. 다음 작업은 Phase 8 categorical density placement의 exact
contract와 Gate 계획을 구체화하는 것이다.
