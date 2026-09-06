# ggaction 0.0.13 release record

## 진행 상태

- [x] Roadmap 6 Phase 0–11 구현·검증·원장 closeout
- [x] Package, lockfile, README, docs, machine-readable knowledge와 CDN example을 `0.0.13`으로 정렬
- [x] Changelog와 generated release notes 준비
- [x] Final candidate commit의 local/remote qualification
- [x] Required checks를 통과한 PR merge
- [x] Annotated `v0.0.13` tag 생성과 push
- [x] Exact-tag protected Release workflow와 `npm-release` publish
- [x] npm, GitHub Release, jsDelivr, GitHub Pages와 Context7 결과 검증

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

Roadmap 6 최종 closeout commit은 `02ec9b9c02106262c4780ca5127bb1025dd7700f`이다. Phase 11에서 다음
결과를 확인했다.

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

## 최종 릴리스 결과

- Release PR: [#124](https://github.com/ggaction/ggaction/pull/124)
- 성공한 required-check run:
  [CI 34044874686](https://github.com/ggaction/ggaction/actions/runs/34044874686)
  - `test`, `coverage`, `documentation`, Node 20/22/24 package consumer와 realistic-data + realistic 1–7의
    14개 job이 모두 통과했다.
  - 첫 CI run에서 발견한 Node 20 미지원 test-only `Object.groupBy` 사용은 commit
    `45d14369da5fad93bcd2f0db042dec75913cb400`에서 지원 범위에 맞는 누적 루프로 교체했다.
- Merge commit: `cdad478fbf0d4364202413c14970444729380e11`
- Annotated tag: `v0.0.13`; peeled target은 위 merge commit과 정확히 같다.
- Protected release run:
  [Release 34045531932](https://github.com/ggaction/ggaction/actions/runs/34045531932)
  - `verify` 48분 24초, `publish` 21초, `pages-build` 27초, `context7-refresh` 9초,
    `pages-deploy` 9초로 모두 통과했다.
  - `npm-release` protected environment는 기존 사용자 승인 범위에 따라 승인했고 OIDC trusted publishing과
    Sigstore provenance 생성이 성공했다.
- Canonical artifact identity:
  - filename: `ggaction-0.0.13.tgz`
  - SHA-1: `67962e07b5edd683e90d967f8f6148c32c46eb7e`
  - SHA-256: `5a938478f35735a6d4bfe5a7c1ebf0b9663b1178340d93a66cdeb69da9882f40`
  - 486 entries, packed 594,186 bytes, unpacked 2,951,719 bytes
  - Actions artifact `ggaction-v0.0.13`의 tarball과 npm registry tarball은 `cmp` 기준 byte-identical이다.
- npm: [`ggaction@0.0.13`](https://www.npmjs.com/package/ggaction/v/0.0.13)이 공개됐고 `latest`는
  `0.0.13`이다. Registry `dist.shasum`은 canonical SHA-1과 일치한다.
- GitHub Release: [`v0.0.13`](https://github.com/ggaction/ggaction/releases/tag/v0.0.13)은 draft와
  prerelease가 아닌 공개 release다.
- jsDelivr: `https://cdn.jsdelivr.net/npm/ggaction@0.0.13/+esm`을 실제 실행해 1,070,371 bytes,
  authored actions 5개, trace nodes 256개, graphics 17개와 280px narrow-width 결과를 확인했다.
- GitHub Pages: [공개 문서](https://ggaction.github.io/ggaction/)가 HTTP 200으로 응답하고 문서 안의
  current package version이 `0.0.13`임을 확인했다.
- Context7: release run의 `Refresh /ggaction/ggaction` job이 성공했다.

이 기록을 추가하는 후속 문서 commit은 릴리스 산출물을 변경하지 않는다. `v0.0.13`은 위 merge commit과
canonical artifact를 계속 고정한다.
