# 연속 크기 범례 전환 검증

현재 checkpoint는 exact-value 연속 크기 범례의 단일 edge 배치만 완성한다. 범주형·그룹과 동적 reflow는 계속 구현한다. 승인은 `../../AUTHORIZATION.json#remainingApproval`을 재사용한다.

- Native area→radius 계산, linear/log/sqrt/pow mapping, 네 edge 배치, 고정 font query closure, hard-break/hidden labels와 spacing을 같은 layout owner로 재생한다.
- 현재 frame 재기준과 offline circle proof를 위해 root가 위임한 `frameEndpoint` admission의 circle 한 토큰만 추가한다. Root timeline3/shared4의 나머지는 변경하지 않았다.
- `size-legend-coverage-final.log.gz`: 26/26, 신규 owner100/92.06/100. 누적422 중421 통과+잘못된 range-direction 기대1건은 별도 focused 검사에서 수리했다. 누적 실패 로그를 성공으로 고치지 않는다.
- 최초 reverse-range fixture 작성 오류, label fit fixture 오류, circle admission 실패, package entry 초과, Node20 animation gzip 초과를 각각 보존한다. Native range reversal은 유효한 면적 보간이며 domain 방향 변경만 fallback이다.
- 같은 `ee8c91a9…` archive에서 세 Node가 runtime4/strictTS/문서/optional peers 및6entries를 확인한다. Node20 limit-only 실패는 같은 측정으로 보충 검증했다.
- 실제5cohort×9recipe는 원행·원단위·source를 유지한다. Native PNG/PDF와 Browser Canvas/SVG DPR1·2는 같은 중간 radius20의 원을 확인한다.
- 패키지 추가 entry1개. Node20/24 packed1688787, unpacked7619363에 최소cap1688800/7619400; animation gzip272457에272500. 최초 한도 통과로 보고하지 않는다.

## 재현 명령

```sh
node --experimental-test-coverage --test-coverage-include='src/materialization/animation/sizeLegendState.js' --test-coverage-include='src/materialization/animation/legendState.js' --test-coverage-include='src/animation/guideTracks.js' --test test/unit/animation/size-legend-transitions.test.js test/unit/animation/legend-transitions.test.js test/unit/animation/guide-tracks.test.js
node scripts/run-tests.js realistic test/contracts/realistic-guide-transitions.test.js
node --test test/charts/cross-feature-integration/variants/animation/guides.render.js test/browser/animation-guides.browser.js
```

격리 설치 runner 원문은 `qualify-package.mjs.txt`, raw log hash/실측은 `qualification.json`에 보존한다. 설치·배포·최종077 qualification은 구분한다.
