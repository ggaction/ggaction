# Roadmap 2 — Phase 11 Step 1: Hierarchy and Migration Audit

## 목표

Current create/edit primitive, tree walker, Canvas renderer와 every domain-created graphic consumer를 감사해
Phase 11 migration 범위와 기존 public behavior boundary를 구현 전에 고정한다.

## 진행 상태

- [ ] `graphicSpec.order`, named `children` and drawable `items` current schema audit
- [ ] `createGraphics(parent/before/after)` and subtree removal behavior audit
- [ ] Canvas renderer depth-first traversal and invalid-tree behavior audit
- [ ] Mark, grid, axis, legend, title and composite creation-site inventory
- [ ] Flat-root assumptions in actions, layout, selectors, tests and docs inventory
- [ ] Canvas-first public examples and extension top-level compatibility boundary
- [ ] Canonical regression baseline state, Canvas calls and PNG lock
- [ ] Executable migration inventory contract
- [ ] STEP status, conceptual commit and push

## 완료 조건

Every named graphical consumer has one intended parent, placement policy, migration owner and executable baseline before
the target tree is authored.
