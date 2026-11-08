# ggaction 0.0.29 공개 배포 종료 기록 (문서 릴리스)

2026-11-08 기록. 사용자 결정 "지금 내자"와 "Release as 0.0.29"에 따른 문서·예제 전용 릴리스다. 런타임은 0.0.27과
같다. 증거는 [release-029-evidence/](release-029-evidence/)에 있다.

## 경과

1. 문서 전면 개선(PR #285)과 0.0.28 준비(PR #286)를 main에 merge했다.
2. 0.0.28 Release workflow의 `verify-documentation`이 실패했다. 문서를 다시 생성한 뒤 byte 동일성을 확인하는 단계에서
   애니메이션 GIF가 Linux에서 다르게 만들어졌다. PNG 그림은 운영체제마다 byte가 달라 이미 비교 대상에서 빠져 있었다.
   publish 전에 멈췄으므로 npm에는 아무것도 나가지 않았다. v0.0.28 tag는 공개하지 않은 tag로 남긴다(0.0.25 선례).
3. 수정(PR #287): GIF를 PNG와 같은 기준으로 제외하고, GIF 형식·크기·frame 수(71)를 검사하는 시험을 추가했다. 프레임은
   PNG 렌더러로 그려 내장 글꼴을 쓴다. 0.0.29로 다시 준비했다.
4. PR #287의 coverage job은 `installed native families` 시험의 15분 제한 초과로 두 번 실패했고 세 번째에 통과했다.
   같은 코드가 main push CI에서도 같은 방식으로 실패·통과를 오가므로 기존 시간 경계 flake로 기록한다. 제한은 바꾸지 않았다.

## 식별자

| 항목 | 값 |
| --- | --- |
| 배포 commit | `a5fd3dc821b1a8cd6dbafd7a8c86ba1fb566fecd` (PR #287 merge) |
| Tag | annotated `v0.0.29` |
| Release workflow | https://github.com/ggaction/ggaction/actions/runs/42502459431 |
| npm | `ggaction@0.0.29`, dist-tag `latest` |
| Tarball SHA-256 | `8f0c062fe255aff329e64a7fc78615602c2a9f3a816489c440fe7ecad65184dd` |
| GitHub Release | https://github.com/ggaction/ggaction/releases/tag/v0.0.29 |

## 확인한 것

- merge commit을 깨끗한 checkout에서 9검사로 확인했다: `npm test` 10,626, realistic 816, coverage 97.45%와
  critical floor 789개, browser 552, render 513, package, platform, package:check, docs:verify. 그 뒤 release와 같은
  문서 재생성 byte 비교도 통과했다.
- 로컬 tarball, workflow artifact, npm registry tarball의 SHA-256이 같다.
- Release workflow의 모든 검증과 publish, pages-build, pages-deploy가 통과했다. 공개 사이트에서 새 갤러리, 홈의
  "Maps, networks, and flows", 인터랙티브 튜토리얼, 지도·분포 페이지, GIF가 HTTP 200으로 열린다.
- npm에서 설치한 0.0.29로 Node 20.20.2, 22.23.1, 24.22.1의 소비자 검사 69개가 모두 통과했다.

## 남은 것

- `context7-refresh`는 Context7 서비스가 "library exceeds the size limit for automatic refresh"(403)로 거절했다.
  Context7에 GitHub issue로 수동 갱신을 요청해야 한다. 배포 자체에는 영향이 없다.
- 렌더 시험 `compound-path/point-only`는 `backends.render.js`와 같은 `primitive.png` 경로를 동시에 쓰는 경쟁이 있다.
  재실행으로 통과했으며 별도 수정이 필요하다.
- `installed native families` 시험은 coverage CI에서 15분 제한 근처에서 실행된다.
