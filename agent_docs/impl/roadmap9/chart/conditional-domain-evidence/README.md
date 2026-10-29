# 조건부 category domain과 browser consumer 수리

같은 categorical field/scale을 일반·조건부 인코딩에 지정했을 때 집계 cell 순서가
원본 행 순서와 다르면 색이 바뀌던 문제를 수리했다. 최종 item eligibility와 inactive
branch 검증을 먼저 유지하고, 유효 category를 원본 등장 순서로 domain에 전달한다.
정확한 동작은 Current ENCODINGS와 공개 encodings 문서가 소유한다.

직접 source module을 읽는 기존 browser fixture도 고정 의존성 목록을 설치해야 한다.
test static host에 repository/installed를 명시하고 공개 example의 loader는 그대로 실행한다.
의존성 별칭·경로는 기존 `exampleImportMap`과 license manifest 한 곳에서 읽는다.

검증한 runtime archive는 `status.json`의 SHA256 하나다. Node20/22/24가 같은 파일을
설치해 각 278 runtime 사례, strict TypeScript, MCP, tutorial과 browser 5 entry를 확인했다.
단위 6787개와 별도 host 4개, 차트 977개, docs 208개, 전체 browser 415개가 통과했다.
Contracts는 최초 758개 중 package ceiling 한 건이 실패했고 한도 측정 뒤 owning file
7개가 통과했다. 최초 실패를 성공으로 덮어쓰지 않는다. Coverage는 변경된 24개 source
owner의 수치이며 전역 release coverage로 주장하지 않는다.

재현은 Node22에서 다음 owning 명령과 canonical suite를 사용한다.

```sh
node scripts/run-tests.js unit unit/actions/conditional-encoding.test.js unit/support/browser-dependencies.test.js
node scripts/run-tests.js contracts contracts/package-artifact.test.js contracts/test-discovery.test.js contracts/example-dependencies.test.js contracts/source-boundaries.test.js
node scripts/run-tests.js charts
node scripts/run-tests.js docs
node scripts/package-artifact.js --pack
GGACTION_PACKAGE_SPEC=/absolute/path/to/the/qualified.tgz node scripts/run-tests.js browser
node scripts/package-consumer.js /absolute/path/to/the/qualified.tgz
```

새 pack은 검토한 archive와 자동으로 byte-identical이라고 가정하지 않는다. 먼저 SHA와
전체 1059개 입력을 대조한다. Source-pinned 문서는 code commit 뒤 생성한다.
장기 공통 시나리오의 독립 패널 수리와 canonical generation/isolation은 별도 통합 의무다.
이 체크포인트로 STEP-077 또는 roadmap 전체 완료를 선언하지 않는다.
