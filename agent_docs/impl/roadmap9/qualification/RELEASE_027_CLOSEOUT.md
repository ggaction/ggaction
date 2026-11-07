# ggaction 0.0.27 공개 배포 종료 기록 (STEP-077)

2026-11-07 기록. [배포 승인](RELEASE_APPROVAL_20261106.json)에 따라 알려진 한계를 기록한 채 배포했다. 증거는
[published/](release-027-evidence/published/)에 있다.

## 식별자

| 항목 | 값 |
| --- | --- |
| PR | https://github.com/ggaction/ggaction/pull/283 (merge commit) |
| 배포 commit | `4ed72704f7f700c1a36722b2f6ee9f2e3310b829` (PR head `cfa798c4f`와 tree 동일) |
| Tag | annotated `v0.0.27` (tag object `f701d875727f152792b686e96a9998d3ea25f150`) |
| Release workflow | https://github.com/ggaction/ggaction/actions/runs/42346658838 (`--ref v0.0.27 -f tag=v0.0.27`) |
| npm | `ggaction@0.0.27`, dist-tag `latest` |
| npm integrity | `sha512-Biq3iT5ReHMuR9ZURS3ZeumQl8WdoSimC+cn3d61DL3Nr72NdT1ZeOFkvUzzQO1IdeBibn1qgs458fkvZmHslw==` |
| npm shasum | `95790850b0c5a06ca1340dfa0cb3f67c04a2f71b` |
| Tarball SHA-256 | `9f1f7af35e55a46416570015e283e945069a5d43404b8d9a2849c8e8c4566a74` |
| Provenance | SLSA v1 provenance, sigstore log index 3741289154 |
| GitHub Release | https://github.com/ggaction/ggaction/releases/tag/v0.0.27 |
| Public docs | https://ggaction.github.io/ggaction/ |

## 확인한 것

1. **PR CI.** 다섯 번째 실행에서 필수 20개 job이 모두 통과한 뒤 merge했다. 앞선 네 번의 실패와 수정은
   [후보 기록](CANDIDATE_076.md) 이후 commit 이력에 남아 있다.
2. **Merge commit 재검증.** 깨끗한 worktree(`npm ci`)에서 9검사를 실행했고 모두 exit 0, 실행 전후 변경 파일 0개였다.
   `npm test` 10617/10617, `test:realistic` 816/816, `test:coverage` 97.45% lines·95.6% branches·99.32% functions와
   critical floor 789개, `test:browser` 531/531, `test:render` 513/513, `test:package`, `test:platform`,
   `package:check`(1288 entries, 1894810 packed, 8474183 unpacked), `docs:verify`.
   [로그](release-027-evidence/published/merge-candidate/)
3. **같은 archive.** 로컬 후보, Release workflow의 `candidate` artifact, npm registry tarball의 SHA-256이 모두
   `9f1f7af3…6a74`로 같다. Registry tarball을 workflow manifest와 함께
   `node scripts/release-candidate.js --verify candidate.json v0.0.27`(`GITHUB_REF=refs/tags/v0.0.27`)로 검증해
   name·version·tag·commit·sha1·sha256·CHANGELOG release notes 일치를 확인했다. [결과](release-027-evidence/published/registry-verify.json)
4. **Release workflow.** candidate, verify-source, coverage, browsers(firefox·webkit), platform(macOS·Windows),
   package, realistic 7개 shard, documentation이 통과한 뒤 protected `npm-release` 환경에서 사용자가 승인했다.
   이후 publish, context7 refresh, pages-build, pages-deploy가 통과했다. [기록](release-027-evidence/published/release-run.json)
5. **Registry 설치 소비자.** 공개 registry의 `ggaction@0.0.27`을 새 디렉터리에 설치해
   `scripts/package-consumer.js`를 Node 20.20.2, 22.23.1, 24.22.1에서 실행했고 69개 검사가 모두 통과했다
   (Node/ESM, TypeScript, PNG·SVG·PDF, tutorial, 7개 browser bundle 크기, 설치된 MCP). [로그](release-027-evidence/published/registry-consumers/)
6. **GitHub Release 본문.** `gh release view`의 본문이 workflow release notes와 같다. 차이는 `gh` 출력이 붙이는 마지막
   개행 하나뿐이다.
7. **공개 docs.** 주요 페이지 9개가 HTTP 200이고, version 페이지에 0.0.27, performance 페이지에 Known limits가 있다.
   [기록](release-027-evidence/published/docs-check.txt)

## 알려진 한계 (해결되지 않음)

배포 승인대로 기준값을 바꾸지 않고 공개 문서(`docs/performance.md#known-limits`, CHANGELOG)에 기록했다.

- AT-56: data 100k 분할 revise/load의 최장 구간 50ms 초과, Geo 100k camera preview 약 145ms/frame.
- AT-82: density bundling 시간 목표 미달, force-directed 10k 미달, 일부 취소 100ms 초과.
- AT-60: 지속 owner 미배정으로 대기.
- 독점 실행 창에서의 P95 측정은 하지 않았다.

## 복구

없음. npm publish는 한 번에 성공했고 registry 반영까지 약 8분 걸렸다. Registry 소비자 첫 실행은 세 번 모두 Node 22로
실행된 harness 실수가 있어 Node 20·24를 실제 binary로 다시 실행했다. 위 결과는 재실행 결과다.

## 판정

AT-61(같은 candidate tarball을 CI·설치·출판·docs에서 hash 대조)은 충족했다. STEP-077 배포 절차는 끝났다.
Roadmap 9 전체 완료는 위 알려진 한계와 AT-60을 남긴 상태로 기록한다.
