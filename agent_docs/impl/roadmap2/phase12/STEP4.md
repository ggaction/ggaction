# Roadmap 2 — Phase 12 Step 4: Installed-Consumer Qualification

## 목표

Repository-relative import가 아닌 packed tarball을 fresh consumer projects에 설치해 실제 사용자 경계를 검증한다.

## 진행 상태

- [ ] Temporary consumer installs the exact packed tarball with a clean lockfile
- [ ] ESM import and shortest chart creation through `ggaction` verified
- [ ] Extension subclass/action flow through `ggaction/extension` verified
- [ ] PNG file generation through `ggaction/png` verified
- [ ] TypeScript declarations compile for all public entries
- [ ] Browser bundle/import smoke test proves the default entry is Node-native-free
- [ ] Supported Node-version matrix verified
- [ ] Missing private/internal subpath imports rejected by the export map
- [ ] Consumer tests integrated into local scripts and CI
- [ ] STEP status, conceptual commit and push

## 검증 원칙

Consumer fixture는 repository `src/`를 직접 import하지 않는다. 매 test run이 STEP3의 tarball을 설치하고 package
name으로만 import한다. PNG adapter의 native dependency failure와 browser entry의 accidental Node dependency는
서로 다른 failure로 보고한다.

## 완료 조건

The same tarball intended for npm works as a real JavaScript, extension, PNG and TypeScript dependency outside the
repository.
