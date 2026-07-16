# Roadmap 2 — Phase 12 Step 4: Installed-Consumer Qualification

## 목표

Repository-relative import가 아닌 packed tarball을 fresh consumer projects에 설치해 실제 사용자 경계를 검증한다.

## 진행 상태

- [x] Temporary consumer installs the exact packed tarball with a clean lockfile
- [x] ESM import and shortest chart creation through `ggaction` verified
- [x] Extension subclass/action flow through `ggaction/extension` verified
- [x] PNG file generation through `ggaction/png` verified
- [x] TypeScript declarations compile for all public entries
- [x] Browser bundle/import smoke test proves the default entry is Node-native-free
- [x] Supported Node-version matrix configured for Node 20, 22 and 24
- [x] Missing private/internal subpath imports rejected by the export map
- [x] Consumer tests integrated into local scripts and CI
- [x] STEP status, conceptual commit and push

## 검증 원칙

Consumer fixture는 repository `src/`를 직접 import하지 않는다. 매 test run이 STEP3의 tarball을 설치하고 package
name으로만 import한다. PNG adapter의 native dependency failure와 browser entry의 accidental Node dependency는
서로 다른 failure로 보고한다.

## 완료 조건

The same tarball intended for npm works as a real JavaScript, extension, PNG and TypeScript dependency outside the
repository.

## 검증 결과

- `npm run test:package`가 fresh temporary project에 tarball을 설치하고 `ggaction`, `ggaction/extension`,
  `ggaction/png`의 runtime 및 TypeScript declaration을 검증한다.
- `npm run test:browser`가 packed default entry를 import map으로 연결해 Canvas rendering과 browser console error
  부재를 검증한다.
- CI package matrix가 최소 지원 Node 20과 이후 LTS 계열 Node 22, 24에서 같은 artifact/consumer 검증을 실행한다.
- Export map에 없는 `ggaction/src/index.js` package subpath import는 Node consumer에서 거부된다.
