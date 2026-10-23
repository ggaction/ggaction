# 원격 재현

## 현재 실행 가능한 범위

`primitive-reference-v2.mjs`는 **기존 숫자 offset**만 사용한다. 이 기준 그림은 새 객체형
offset의 구현이나 전체 원본 차트의 통과를 뜻하지 않는다. `proposed-public.mjs`는 승인 후
구현할 API의 목표이며 지금 실행하면 안 된다. 이미지는 열거나 VLM으로 검사하지 않는다.

고정 baseline은 `55c8a634e144fd95bb754f1222e44a700e75a448`이다. package manifest는
0.0.23이지만 **미출시 candidate**이며 npm registry의0.0.23과 다르다. 로컬 archive의
SHA256은 `94fcb5460d1c1d6c59f7e0da9e3b6544b7473c870966330df6477986c2947171`이다.
압축 헤더가 플랫폼마다 달라지면 archive 바이트 일치를 주장하지 말고 전체624개
상대경로·내용·mode inventory를 비교한다. package-builder의 기존 승인 한도를 늘리지 않는다.

## 이 workspace의 재현 명령

P의 storage guard 안에서 실행한다. 마지막 output 경로는 아직 없는 경로여야 한다.
기존 첫 실행 결과는 보존하고 무제한 variant나 전체 workspace 복사본을 만들지 않는다.
`TRANSLATION_WORKSPACE`는 현재 storage guard가 설치된 번역 workspace의 절대경로로
미리 설정한다. 이 라이브러리 문서에는 외부 source 제품명의 로컬 경로를 넣지 않는다.

```sh
cd "$TRANSLATION_WORKSPACE"
TZ=UTC npm run storage:run -- node \
  /Users/hyeonjeon/Projects/ggaction-release1336-integration/agent_docs/impl/axis-title-label-relative-offset/render-reference-v2.mjs \
  "$TRANSLATION_WORKSPACE/artifacts/runtime-releases/ggaction-v13-facet-axis-gaps-55c8a634/package" \
  /Users/hyeonjeon/Projects/ggaction-release1336-integration/.artifacts/test/png/review/axis-title-label-relative-offset/four-independent-label-widths-recheck
```

이 helper는 명시한 isolated package의 exports로 esbuild alias를 만들고 Chromium에서
공개 program을 렌더한다. P의 node_modules 또는 공유 I/src로 대체하지 않는다. 결과는
`reference.svg`, `reference.png`, `variant.json`, `proof.json`이다. proof는 입력 fixture,
program, helper와 bundle의 실제 runtime 입력 SHA를 기록하고 전후 입력 동일성을 확인한다.

이번 첫 성공 실행은
`.artifacts/test/png/review/axis-title-label-relative-offset/four-independent-label-widths/`다.
그 결과 SHA와 geometry는 [REFERENCE_EVIDENCE.json](REFERENCE_EVIDENCE.json)에 고정했다.
1016×302, title local anchor X 네 개와 Y159.5가 정확히 일치해야 한다. 출력 자원 ID나
다른 OS의 font raster 차이 때문에 과거 PNG/SVG 파일 SHA 자체를 원격 성공 기준으로 삼지 않는다.

## 다른 컴퓨터 / CI

이 Gate 문서가 commit/push되면 ROOT가 해당 **정확한 review revision**을 기록한다.
현재는 미커밋 상태이므로 가짜 commit이나 공개 URL을 적지 않는다. 다음 순서는 그
revision이 존재한 뒤 독립된 깨끗한 checkout에서 수행한다. 공유 로컬 checkout을 reset하거나
checkout하지 않는다.

1. ggaction baseline55c8을 깨끗하게 준비하고 그 revision의 `npm ci`를 실행한다.
   Gate 폴더만 review revision에서 가져온다. 예: review revision의 이 폴더를 `git archive`
   로 추출한다. runtime 소스/lockfile은 baseline55c8을 유지한다.
2. baseline의 `scripts/package-artifact.js`가 export하는
   `createPackageArtifact({cwd: absoluteBaselineRoot, outputDirectory: absoluteFreshDirectory})`
   로 archive 하나를 만든다. 실행 예시는 아래와 같다. 이 모듈의 위치도 baseline이어야 한다.
3. archive를 새 작은 출력 폴더에 추출하고 canonical manifest/file inventory를 확인한다.
   manifest version만 보고 published artifact로 부르지 않는다. 로컬 원본 package와 비교할
   때는 [REFERENCE_EVIDENCE.json](REFERENCE_EVIDENCE.json)의 inventory/proof SHA를 사용한다.
4. baseline의 esbuild와 Playwright 의존성을 사용한다. Chromium이 없으면 그 Playwright
   버전에 맞는 Chromium을 설치하고 browser/OS/font 환경을 결과에 기록한다.
5. `node <Gate>/render-reference-v2.mjs <isolated-package> <fresh-output>`을 실행한다.
   고정 geometry를 확인하고 결과·입력 SHA를 보존한다. 원격 CI는 자신의 자원 한도를 지키고,
   위 Projects workspace에서 실행하는 큰 작업은 반드시 P storage guard를 사용한다.

```js
// baseline checkout 안에서 node --input-type=module 로 실행하는 예시.
import path from "node:path";
import { createPackageArtifact } from "./scripts/package-artifact.js";
const artifact = await createPackageArtifact({
  cwd: process.cwd(),
  outputDirectory: path.resolve(".artifacts/review-label-relative-baseline")
});
console.log(JSON.stringify(artifact));
```

builder는 npm이 배포할 파일만 담으며, 이 Gate 문서와 output PNG를 package에 추가하지 않는다.
검토 후 구현에서는 같은 환경·같은 실행 안에서 숫자형 기준과 객체형 공개 program을 각각
렌더하고 **decoded RGBA 전체 exact equality**와 명시 geometry를 검사한다. SVG namespace만
다르다는 이유로 숫자나 픽셀 허용오차를 늘리지 않는다. 구현 전에는 객체형 경로의 성공을
표기하지 않는다.

## 실패 보존

처음 v1은 존재하지 않는 `chart().hconcat`을 불렀다. standalone `hconcat`을 쓰는 v2가
정정이며, 실패한 helper/program과 `FAILED_REFERENCE_ATTEMPT_V1.json`은 그대로 남겼다.
실패 v1은 ggaction의 기능 미지원이나 성공 증거에 포함하지 않는다. 모든 실행은 School0,
admission0이며 현재 실행 중인 번역 controls/config/runtime에는 쓰지 않는다.
