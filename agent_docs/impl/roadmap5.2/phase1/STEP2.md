# STEP 2 — Give Contributors and Security Reports One Clear Entry Path

## 진행 상태

- [x] Structured bug report form
- [x] Problem-first feature request form
- [x] Pull request verification checklist
- [x] Contributor Covenant-based Code of Conduct
- [x] Private-report-first Security Policy
- [x] AI-assisted contribution responsibility
- [x] Monthly npm/GitHub Actions/Bundler Dependabot policy with major updates excluded
- [x] GitHub feature enablement and community profile verification

## Contributor flow

1. Existing issue와 supported features를 확인한다.
2. Bug는 exact version, environment, affected outputs와 minimal program을 제공한다.
3. Material API/state/renderer/package change는 implementation 전에 feature issue에서 direction을 합의한다.
4. PR은 한 conceptual change만 포함하고 focused/cumulative verification을 적는다.
5. Rendered output이 바뀌면 Canvas/SVG/PNG/PDF evidence를 제공한다.
6. AI assistance는 허용하지만 contributor가 모든 변경을 이해하고 책임진다.

## Security flow

- Public issue form은 vulnerability를 private advisory로 보낸다.
- `SECURITY.md`는 latest release policy, required report details와 seven-day acknowledgement target을 설명한다.
- Private vulnerability reporting, Dependabot alerts/security updates, secret scanning과 push protection을 repository가
  지원하는 범위에서 활성화한다.

## Dependency update policy

Dependabot은 npm, GitHub Actions와 Bundler를 monthly로 확인한다. Patch/minor는 묶어서 제안하고 major는 자동 PR에서
제외한다. Major update는 Roadmap Phase 4 또는 별도 compatibility change가 exact evidence를 소유한다.

## Applied result

- Dependabot alerts, security updates and automated security fixes are enabled.
- Secret scanning and push protection are enabled.
- Private vulnerability reporting is enabled and both public issue entry points route security reports to it.
- Dependabot checks npm, GitHub Actions and Bundler monthly while excluding semantic-version major updates.
- Enabling Dependabot surfaced one pre-existing medium alert in the development-only transitive `postcss` dependency
  (`GHSA-fxqj-rqcc-2cmp`, patched in `8.5.23`). Phase 1 does not change dependencies; Phase 4 owns the compatible update and
  verification.
- GitHub's default-branch community profile remains 50% until this branch is merged because the API evaluates `main`, not
  the review branch. The stable repository-governance contract verifies the complete pending file set before merge; the
  profile must be checked again from `main` at Roadmap closeout.
