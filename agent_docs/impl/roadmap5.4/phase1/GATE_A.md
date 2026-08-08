# Gate R54-P1-A — Compact Cards and Call Variants

## Gate state

`ready-for-review`

이 Gate는 173개 compact action card의 exactness, coverage와 크기를 승인받는다. 승인 전에는 query를 분해하거나 여러
card를 task packet으로 조합하는 intent resolver를 구현하지 않는다.

## 쉽게 보는 결과

이전 Roadmap 5.3은 action 하나를 찾을 때 17–20KB짜리 장문 resource와 연쇄 type definition을 전달했다. 이번
projection은 action 하나에 필요한 정보만 남겼다.

- 173개 action 모두 card가 있다.
- 최대 card는 1,501B, 중앙값은 993B다. 승인 ceiling 3,072B의 절반 이하다.
- Signature와 option은 사람이 복사하지 않고 현재 TypeScript declaration에서 생성한다.
- Summary와 intent는 영어이며, `createScatterPlot`은 “two fields as points”처럼 chart 결과까지 설명한다.
- 12개 분기형 action은 최대 두 개의 짧은 call pattern을 제공한다.
- 모든 snippet은 syntax 확인뿐 아니라 exact `ChartProgram` type으로 compile된다.

예를 들어 `createScatterPlot` card는 exact signature, `x`와 `y`의 required status, canvas/data prerequisite,
canonical route와 다음 최소 호출을 함께 제공한다.

```javascript
program.createScatterPlot({ x: "x", y: "y" })
```

`encodeAngle`은 point뿐 아니라 tick rotation도 intent에 포함하고, constant와 field branch를 따로 보여준다.

```javascript
encodeAngle({ target?, value })
encodeAngle({ target?, field, fieldType? })
```

## 승인 대상

1. Card schema의 bounded fields와 3,072-byte hard ceiling
2. Exact signature/top-level option을 TypeScript checker에서 생성하는 ownership
3. Human-owned operation/domain/term intent와 targeted override 구조
4. Default 1개, 분기형 action 최대 2개의 short call pattern
5. 모든 action의 minimal typed snippet, 최대 2개의 targeted error/fix와 canonical route
6. Phase 2 resolver가 이 card projection만 읽고 full reference는 unresolved fallback으로 남기는 방향

## Coverage and payload evidence

| Metric | Result | Gate requirement |
| --- | ---: | ---: |
| Action cards | 173 / 173 | 173 / 173 |
| Unclassified actions/terms | 0 | 0 |
| Typed snippets | 173 / 173 | 173 / 173 |
| Cards with one call pattern | 161 | bounded |
| Cards with two branch patterns | 12 | bounded |
| Maximum serialized card | 1,501 bytes | ≤ 3,072 bytes |
| Median serialized card | 993 bytes | informational |
| Cards over ceiling | 0 | 0 |

## Verification

- `node scripts/generate-action-cards.js --check`
- `node scripts/run-tests.js contracts test/contracts/compact-action-cards.test.js` — 3 / 3 pass
- `node scripts/run-tests.js contracts` — 170 / 170 pass
- Existing runtime/source/declaration/renderer output changes — 0
- Dependency, package export/files surface, public/generated docs changes — 0
- Credential reads, external model calls, spend — 0 / 0 / $0

## 발견했지만 이번 범위에서 바꾸지 않은 항목

기존 `scripts/generate-doc-signatures.js`는 class 첫 method 경계를 잡을 때 `constructor`와 state declarations를
`createCanvas` signature 앞에 붙인다. Compact generator는 declaration의 각 action start/end를 직접 경계로 삼아 정확한
`createCanvas(options?: CanvasOptions): ChartProgram;`을 생성한다. Public/generated docs 변경은 Phase 1 승인 범위가
아니므로 기존 docs generator는 수정하지 않았다. Public docs fallback을 여는 Phase에서 별도 수정·검증해야 한다.

## Approval effect

승인은 Phase 2의 constraint decomposition, capability set-cover, bounded task packet과 one-call closure 구현만 연다.
MCP, package/dependency, public docs, corpus freeze, credential read, external call, PR/merge/publish/deploy/release는 승인하지
않는다.

## 승인 전 차단 범위

- Intent resolver와 `search_ggaction` direct adapter
- Multi-action task packet, unresolved policy와 one-call closure corpus
- MCP executable, dependency/package surface와 docs fallback
- Public/generated docs 변경
- Credential read, external model call와 비용 지출

## Evidence identity

- Implementation review target: `73e99a77131adcbff3fdaf242ad816fb32638dd4`
- Remote branch: `codex/roadmap5-4-compact-knowledge`
