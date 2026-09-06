# ggaction 0.0.13 release record

## 진행 상태

- [x] Roadmap 6 Phase 0–11 구현·검증·원장 closeout
- [x] Package, lockfile, README, docs, machine-readable knowledge와 CDN example을 `0.0.13`으로 정렬
- [x] Changelog와 generated release notes 준비
- [ ] Final candidate commit의 local/remote qualification
- [ ] Required checks를 통과한 PR merge
- [ ] Annotated `v0.0.13` tag 생성과 push
- [ ] Exact-tag protected Release workflow와 `npm-release` publish
- [ ] npm, GitHub Release, jsDelivr, GitHub Pages와 Context7 결과 검증

## Version 결정

`0.0.12` 이후 Roadmap 6은 최초 173개 direct action 감사를 기반으로 오류 8건, 설계 문제 20건과 사용자가
선택한 19개 액션군을 구현했다. Complete-chart facade부터 data/mark/encoding/guide/style/extension primitive까지
H0–H4 hierarchy를 연결했고 최종 inventory는 direct 234개, user-facing 228개다. Facet grid, repeat와 named-child
composition, reusable data와 lifecycle 편집, labels/reference/annotation/theme/fitting, Polar·distribution·statistical
chart families가 같은 immutable materialization 경계를 사용한다.

Action-card schema v3가 모든 direct action의 authoring role, direct child/editor, package support, unit, inference와
completion을 공개 discovery와 MCP에 제공한다. 승인 범위의 Planned action/capability는 0이고 F20은 기록된 사용자
결정에 따라 이번 범위에서 제외했다. 기존 pre-1.0 sequence에 맞춰 이 결과를 `0.0.13`으로 릴리스한다.

## Roadmap qualification

Roadmap 6 최종 closeout commit은 `02ec9b9c02106262c4780ca5127bb1025dd7700f`이며
`origin/codex/roadmap6-hierarchical-actions`와 일치한다. Phase 11에서 다음 결과를 확인했다.

- Unit 2,277/2,277, contracts 328/328, charts 578/578, renderer 216/216, docs 47/47,
  browser 73/73, realistic 243/243 통과
- Coverage 95.46% lines, 92.33% branches, 98.96% functions와 critical floor 88/88 통과
- Fresh package 486 entries, packed 591,993 bytes, unpacked 2,948,977 bytes
- Installed Full/Basic/SVG gzip 297,211/152,124/6,418 bytes, MCP cold start 477ms
- Development checkpoint tarball SHA-256
  `9bd997821860075d66557c132931d9f64bebc0eb62a9d25a9025173e1cd64c92`

이 SHA는 version bump 전 개발 checkpoint 증거다. Registry publish에는 exact annotated tag에서 protected workflow가
한 번 생성한 canonical artifact만 사용하고 그 digest를 release 완료 뒤 별도로 기록한다.

Version 정렬 뒤 local packed-package consumer도 486 entries, packed 592,920 bytes, unpacked 2,951,719 bytes와
SHA-256 `22fd010c96eb99cbe4dac77e969db5316bcc7d0e1151dbe74dac388326fac6c6`으로 통과했다. 이 값 역시
pre-tag qualification이며 canonical registry identity는 Release workflow 결과가 소유한다.

## Release 실행 경계

Release commit을 required checks가 보호하는 `main`에 merge한 뒤 그 exact commit에 annotated `v0.0.13` tag를 만든다.
Release workflow는 tag ref를 checkout해 version/tag/commit identity를 확인하고 canonical tarball을 한 번 생성한다.
Publish job은 검증 job의 artifact를 그대로 내려받아 digest와 release notes를 검증한 뒤 npm과 GitHub Release를
갱신한다. Pages와 Context7 refresh는 publish 성공 뒤 같은 release workflow에서 실행한다.
