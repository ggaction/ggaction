# Roadmap 2 — Phase 2 Step 2: Concrete Path-Command Foundation

## 목표

모든 path-based mark가 renderer-ready `M | L | C | Z` command만 canonical geometry로 저장하도록 공통
schema, materializer와 Canvas renderer를 이관한다.

## 진행 상태

- [ ] `ConcretePathCommand` shared schema와 validation
- [ ] `path.commands` graphical property와 edit/render parity
- [ ] Canvas command execution과 state isolation
- [ ] Line path의 point-array → linear commands migration
- [ ] Area/density/regression path migration
- [ ] Closed point-shape path migration
- [ ] Old/new duplicate canonical geometry 제거
- [ ] Invalid/incomplete command와 atomic edit coverage
- [ ] Existing chart semantic/graphic/render regression
- [ ] TypeScript와 extension primitive docs
- [ ] `SECOND_ARCHITECTURE.md` path representation 갱신
- [ ] Conceptual commit와 push

## 구조 결정

Pure command builder는 program과 trace를 모르고 deterministic command array를 반환한다. Mark materializer가
그 결과를 wrapped `editGraphics`로 저장한다. Renderer는 command를 실행할 뿐 interpolation이나 closure를
추론하지 않는다.

## 완료 조건

기존 여섯 public chart와 primitive chart의 visual output이 유지되고 `graphicSpec` path에는 canonical
`commands`만 남는다.
