# STEP 10 — Roadmap Closeout and Release-candidate Gate

## 진행 상태

- [x] Planned inventory zero audit
- [x] Full normal/render/browser/coverage/package/docs verification
- [x] Roadmap 3 gallery final pair audit
- [x] Release notes and version recommendation
- [x] 사용자 release-candidate approval (`0.0.3`)
- [x] Exact artifact publish, registry smoke test와 release closeout

Roadmap 3의 모든 assigned capability를 Current, Maybe Future 또는 removed로 해소한다. Release-candidate Gate에서
검증 결과와 version recommendation을 제시하고, 사용자 승인 뒤 확정 version `0.0.3`을 publish했다.

검증 결과와 release 범위는 [`RELEASE_CANDIDATE.md`](./RELEASE_CANDIDATE.md)에 고정한다. 로컬 환경에는 Jekyll
실행 파일이 없어 built-doc 단계만 직접 실행하지 못했지만, 같은 commit의 GitHub CI documentation job에서 Jekyll
build, built-link/asset check와 desktop/mobile browser test가 모두 통과했다.

`v0.0.3` tag의 exact commit에서 Release workflow를 실행했다. Workflow가 생성한 단일 tarball을 검증과 npm
publish에 재사용했으며, protected `npm-release` 승인, GitHub release 생성, npm `latest` 확인과 fresh registry
consumer 검증을 모두 완료했다. Exact artifact 정보는 [`RELEASE_CANDIDATE.md`](./RELEASE_CANDIDATE.md)에 기록한다.
