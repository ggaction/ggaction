# ggaction 0.0.8 release record

## 진행 상태

- [x] Roadmap 5 action 확장과 Roadmap 5.1 multi-legend layout closeout
- [x] Package, lockfile, README와 docs version을 `0.0.8`으로 정렬
- [x] Changelog와 generated release notes 준비
- [x] Final candidate commit의 local/remote qualification
- [x] Annotated `v0.0.8` tag 생성과 push
- [x] Exact-tag protected Release workflow와 `npm-release` 승인
- [x] npm, GitHub Release와 GitHub Pages 결과 검증

## Version 결정

`0.0.7` 이후 temporal ordering, moving-window 변환, directional mark encoding, angle encoding과 1D tick
distribution 예시가 추가되었다. Roadmap 5.1에서는 여러 legend의 title, graphical object, label 간격과
top/bottom chart offset을 backend-neutral layout에서 일관되게 정렬했다. 기존 pre-1.0 release sequence와
일치하도록 다음 version을 `0.0.8`로 정하고 package, lockfile, README status, docs config, generated LLM bundle,
package contract test와 changelog를 같은 version으로 정렬했다.

## Qualification 증거

Final release commit은 `15c30db6bfa53843e689b7556f27fd4316f5d3eb`이며 annotated `v0.0.8` tag가 이
commit을 가리킨다. Exact tag ref에서 실행한 Release workflow `30886758323`이 다음 검증을 모두 통과했다.

- 전체 테스트: `2,047/2,047` 통과
- coverage threshold와 critical floor 통과
- generated contract/docs drift, package contents, installed JavaScript/TypeScript consumer 검증 통과
- Browser package와 문서 consumer 검증 통과
- Canvas/PNG renderer regression chart 검증 통과
- 문서: 정적 페이지 `113`, 320/390/768px 브라우저 검증 통과
- canonical package: entry `412`, packed `386,501` bytes, unpacked `1,823,923` bytes

## Release 결과

- Final workflow: `30886758323`, final conclusion `success`, dispatch ref `v0.0.8`
- Canonical tarball SHA-1: `2a2ca964572718a1cedd888100a30a0dbb5503b1`
- Canonical tarball SHA-256: `1352607c1aabec300ed0bd070605fbf84cd79d247826e04d62cc23d85ff01466`
- npm `ggaction@0.0.8`의 `dist.shasum`은 canonical SHA-1과 정확히 일치하며 `latest`는 `0.0.8`이다.
- GitHub Release `v0.0.8`는 draft나 prerelease가 아닌 public release다.
- GitHub Pages는 exact tag에서 빌드되었고 `/ggaction/`가 HTTP 200으로 응답하며 홈페이지의 version,
  release status와 npm 링크가 모두 `0.0.8`을 가리킨다.

## Release 실행 경계

Roadmap 구현 PR `#19`와 release preparation PR `#20`은 각각 required checks를 통과한 뒤 merge했다. Package
publish와 documentation deploy는 사용자의 실행 승인 후 수행했다. Verify job이 exact annotated tag에서 만든
하나의 canonical artifact를 protected publish job이 그대로 재사용했고 npm, GitHub Release와 Pages는 모두 같은
tag commit을 기준으로 생성되었다.

`actions/upload-artifact@v4`, `actions/download-artifact@v5`, `actions/deploy-pages@v4`의 Node 20 deprecation
annotation이 있었지만 GitHub가 Node 24로 실행했고 release 결과에는 영향을 주지 않았다. 이 기록은 release tag
이후의 내부 closeout 변경이며 배포된 package 또는 Pages artifact를 변경하지 않는다.
