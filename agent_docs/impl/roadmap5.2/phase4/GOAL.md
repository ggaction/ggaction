# Roadmap 5.2 Phase 4 — CI, Dependency, and Bundle Hardening

## 목표

현재 public API, program state, action trace와 renderer output을 유지하면서 release workflow의 deprecated Node runtime,
compatible dependency drift와 Basic browser bundle의 120,000-byte gzip promise를 함께 닫는다.

## 진행 상태

- [x] Phase 3 approval과 Phase 4 scope 확인
- [x] Official GitHub Action runtime/release와 npm outdated/audit 기준선 재확인
- [x] Supported Node 24 GitHub Action revisions 적용 및 workflow contract 검증
- [x] Compatible dependency update와 audit/package/browser 검증
- [x] Basic browser bundle 120,000-byte gzip 이하 복원
- [x] Full/basic/SVG executable ceilings와 documentation truth 동기화
- [x] Focused, cumulative, coverage, package와 renderer verification
- [x] R52-P4-A remote checkpoint
- [x] 사용자 explicit approval — 2026-08-05

## 적용 경계

- `actions/upload-artifact`, `download-artifact`, `configure-pages`, `upload-pages-artifact`, `deploy-pages`를 official
  Node 24-compatible release로 갱신한다.
- `@napi-rs/canvas`와 Playwright는 current semver range의 patch/minor만 갱신한다.
- 취약한 transitive PostCSS는 patched compatible revision으로 갱신해 full audit도 0으로 만든다.
- Vite 8과 `es-module-lexer` 2는 major compatibility change이므로 이번 Phase에 섞지 않고 명시적으로 연기한다.
- Basic entry는 같은 public export와 capability set을 유지한 채 120,000 gzip bytes 이하를 만족해야 한다.
- Full과 SVG ceiling은 각각 225,000과 25,000 gzip bytes를 유지한다.

## Gate R52-P4-A

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다.

### 승인 전 차단

- Phase 5 integration/closeout
- PR creation, merge, publish, documentation deployment와 release
- Public package entry, API, state schema 또는 renderer output 변경
