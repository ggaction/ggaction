# Phase 4 — Step 10: Public grouped bar vertical slice

## 목표

Grouped bar 구현을 ordinary chart-authoring API만 사용하는 public example로
확정하고 browser, PNG, tutorial, documentation을 하나의 동일한 action flow로
연결한다.

## 진행 상태

- [x] Standalone public program
- [x] Acceptance contract
- [x] Browser example
- [x] Browser Canvas dimensions와 page error 검증
- [x] High-density PNG regression
- [x] Grouped bar tutorial과 문서 navigation
- [x] Public scope와 LLM reference 갱신
- [x] 전체 regression
- [x] Phase 4 완료 표시
- [x] Commit/push

## 최종 action flow

```text
createCanvas
→ createData
→ createBarMark
→ encodeX
→ encodeY
→ encodeColor
→ encodeBarWidth
→ createGuides
```

Public program은 test helper나 primitive action을 사용하지 않는다. Browser,
acceptance, PNG, tutorial은 모두 같은 program을 가져오거나 같은 action flow를
문서화한다.

## 검증

- Browser Canvas: `720 × 460`
- Browser page errors: `0`
- Browser console errors: `0`
- `npm test`: 313 passed
- `npm run test:render`: 12 passed
- Public PNG: `1440 × 920` at `pixelRatio: 2`
