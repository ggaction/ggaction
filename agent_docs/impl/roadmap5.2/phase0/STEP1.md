# STEP 1 — Record the 0.0.8 Hardening Baseline

## 진행 상태

- [x] Repository, package, action과 test 규모 기록
- [x] Documentation drift와 mechanical guard gap 기록
- [x] GitHub governance, community와 security state 기록
- [x] Partial coverage risk groups 기록
- [x] Dependency, workflow annotation와 bundle state 기록
- [x] Recommended exact boundary와 non-goals 작성
- [x] Baseline contract verification — `npm run test:contracts`, 161/161 pass
- [x] Remote Gate checkpoint `c4a8cce3` 기록

## Baseline

시작 commit은 `ad5f3f51c7eee74d5af0dace25e63da2db562566`이며 clean `main`에서
`codex/roadmap5-2-hardening` branch를 만들었다. Current package version은 `0.0.8`이다.

| 항목 | 현재 결과 |
| --- | --- |
| Action inventory | 173 actions; user-facing 167, advanced 3, primitive 3 |
| Planned inventory | actions 0, capabilities 0 |
| Source/test size | source 51,655 lines; tests 101,460 lines |
| Release qualification | 2,047/2,047 tests, coverage/docs/package/renderers pass |
| Contract coverage gaps | 47 `⚠️ Partial` lines; 25 actions with `tests: partial` |
| Package artifact | 412 entries; packed 386,501 bytes; unpacked 1,823,923 bytes |
| Browser bundles | full 222,166 gzip; basic 126,454 gzip; SVG below 25,000 budget |
| Production audit | 0 known vulnerabilities |

## Truth findings

1. `SECOND_ARCHITECTURE.md`의 current limitation은 이미 구현·배포된 SVG renderer를 여전히 범위 밖으로 적는다.
2. README는 `ggaction/basic`을 120,000-byte gzip 미만이라고 설명하지만 current measurement는 126,454다.
3. Executable bundle limit은 full 225,000, basic 128,000, SVG 25,000으로 README와 다르다.
4. Generated references는 release Gate로 보호되지만 architecture/README의 수동 fact는 같은 source에서 검증되지 않는다.

Phase 2는 틀린 문장을 단순 교체하는 것에 그치지 않고 renderer/export/budget fact가 다시 어긋나면 contract/docs
test가 실패하게 한다.

## Repository findings

- `main` branch protection과 repository ruleset이 없다.
- Required CI jobs는 존재하지만 settings가 merge를 강제하지 않는다.
- `delete_branch_on_merge`는 비활성화되어 있다.
- GitHub community profile은 50%다.
- CONTRIBUTING, LICENSE와 README는 있지만 issue template, PR template와 Code of Conduct가 없다.
- Secret scanning, push protection과 Dependabot security updates가 비활성화되어 있다.
- `npm-release` protected environment approval과 exact-tag release workflow는 정상 동작한다.

## Coverage findings

47개 `Partial`은 다음 위험군으로 나뉜다.

1. Canvas resize와 multiple guide/title/shared scale 조합
2. Axis/grid/legend repeated edit와 nested option transitions
3. Density/regression/window/bin numeric boundaries와 performance bounds
4. Encoding/scale/coordinate representative pairwise combinations
5. Primitive semantic/graphic schema leaf와 backend boundary values
6. Data ownership, nested values와 unusual scalar cases
7. Mark appearance zero/one/near-zero boundaries

모든 Cartesian product를 작성하지 않는다. Public behavior에 직접 영향을 주는 case는 focused test를 추가하고,
aggregate action이 child validation을 그대로 재사용하는 경우에는 delegation을 executable evidence로 고정한다.
Schema vocabulary는 table-driven test로 전체 leaf를 닫는다.

## Workflow and dependency findings

- Release workflow는 성공하지만 artifact upload/download와 Pages deploy action에서 Node 20 deprecation annotation이
  발생한다.
- Production dependency audit는 0건이다.
- `@napi-rs/canvas`와 Playwright에는 compatible patch/minor update가 있다.
- `es-module-lexer`와 Vite에는 major update가 있지만 이번 Roadmap에서 무조건 올리지 않는다.
- Native package 분리와 optional dependency redesign은 package boundary 변경이므로 이번 범위 밖이다.

## Recommended exact policy

### Repository rules

- `main` 변경은 pull request를 통한다.
- CI의 package Node 20/22/24, test, coverage와 documentation jobs를 required로 둔다.
- Solo maintainer deadlock을 피하기 위해 required approval count는 0으로 둔다.
- Force push와 branch deletion은 막는다.
- Maintainer emergency bypass는 허용하되 ordinary work는 PR/check path를 따른다.
- Merge 뒤 head branch는 자동 삭제한다.

### Community and security

- Bug report, feature request와 PR template를 추가한다.
- Contributor Covenant 기반 Code of Conduct와 private-report 중심 Security Policy를 추가한다.
- Dependabot alerts/security updates, secret scanning과 push protection을 지원 범위에서 활성화한다.

### Coverage completion

- 47개 `Partial` 각각을 direct coverage, executable delegation, bounded pairwise/schema coverage 또는 explicit narrowed
  non-goal 중 하나로 해결한다.
- ACTION_INDEX의 `tests: partial` 25개를 0개로 만든다.
- 단지 상태 문자열만 바꾸는 commit은 허용하지 않는다.

### Dependency and bundle

- Patch/minor dependency update는 focused package/browser evidence와 함께 진행한다.
- Major update는 same Phase의 별도 compatibility result가 clean할 때만 반영하고 아니면 명시적으로 연기한다.
- Basic bundle은 README 약속을 유지해 120,000-byte gzip 이하로 되돌린다.
- Full과 SVG는 current limit을 넘지 않으며 measured facts와 limits를 한 canonical source에서 검증한다.
- Optimization이 public state, action trace 또는 rendered pixels를 바꾸면 중단하고 별도 사용자 결정을 요청한다.

## Compatibility and architecture impact

- Phase 0은 계획 문서와 navigation state만 바꾸며 runtime, declarations, package와 public docs를 바꾸지 않는다.
- Roadmap 전체도 public API나 persisted schema 변경을 계획하지 않는다.
- Source module ownership, semantic/graphic state boundary와 renderer boundary는 유지한다.
- 만약 bundle work가 package boundary 변경을 요구하면 이번 Roadmap에서 제외하고 별도 architectural proposal로
  돌린다.
