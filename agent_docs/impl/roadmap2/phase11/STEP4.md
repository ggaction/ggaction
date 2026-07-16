# Roadmap 2 — Phase 11 Step 4: Canvas, Plot and Mark Attachment

## 목표

Approved tree를 `createCanvas`와 ordinary mark actions에 연결해 Canvas-first domain flow가 parent parameter 없이
stable plot ownership을 만들게 한다.

## 진행 상태

- [ ] `createCanvas` wrapped creation of Canvas and `plot-main`
- [ ] Plot container identity, idempotence and collision validation
- [ ] Point, line, area, bar and rule automatic plot attachment
- [ ] Mark-before/after-encoding order independence
- [ ] Incomplete mark empty collection attachment
- [ ] Existing extension-authored top-level graphic compatibility
- [ ] Mark create/edit/rematerialize trace hierarchy
- [ ] Unit, type and immutable-state coverage
- [ ] STEP status, conceptual commit and push

## 완료 조건

Every ordinary Canvas-first semantic mark has one stable plot attachment without a new user parameter or duplicated
materialization policy.
