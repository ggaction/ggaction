# 다른 환경에서 이어서 작업하기

이 디렉터리는 2026-10-27까지의 저장소 연구, 문서·테스트 감사, 릴리스 검증 기록, 최신 기능 확장 보고서와 77개 실행 카드를 보존한다. 최신 계획의 시작점은 [START_HERE](coverage-expansion-2026-10-27/roadmap/START_HERE.ko.md)다. 과거 감사와 릴리스 기록은 당시 관찰이며 현재 지원 상태나 신규 구현 승인이 아니다.

## 바로 읽기

- [상세 로드맵 HTML](coverage-expansion-2026-10-27/ROADMAP.ko.html) / [Markdown](coverage-expansion-2026-10-27/ROADMAP.ko.md)
- [실행 순서](coverage-expansion-2026-10-27/roadmap/EXECUTION_ORDER.ko.md)
- [기계 판독 계획](coverage-expansion-2026-10-27/roadmap/plan.json)
- [기존 종합 조사](coverage-expansion-2026-10-27/REPORT.ko.md)

HTML, 계약, 작업 카드, 기계 판독 계획은 clone 직후 읽을 수 있다. 큰 원시 evidence와 로그는 .study-archives에 gzip으로 저장했다. 원본 파일명·크기·SHA256은 transfer-manifest.json에 있다. 다음 명령은 repository root에서 실행한다.

```sh
python3 study/restore.py --check
python3 study/restore.py
python3 study/coverage-expansion-2026-10-27/scripts/roadmap-next.py
```

복원은 기존 수정 파일을 덮어쓰지 않는다. 복원 파일은 Git에서 ignore되며 압축본이 canonical transfer source다. 압축본 검증은 기능 테스트 통과를 의미하지 않는다.

## 구현 시작

START_HERE와 DECISIONS를 읽고 카드의 선행 조건과 기존 승인 증거를 확인한다. user-confirmed scope는 유지하며 미해결 공개 API·schema·시각 결과는 저장소 AGENTS 지침을 따른다. 이번 인계는 보고서와 작업 기록의 푸시이며 새 chart 기능을 구현하거나 출시한 것이 아니다.

```sh
python3 study/coverage-expansion-2026-10-27/scripts/roadmap-next.py --task STEP-001 --with-contracts
```

진행 증거를 모은 뒤 --progress-dir로 다음 준비된 카드를 선택한다. runtime source와 current contracts가 실제 구현 상태의 정본이다. source-map은 0.0.26 기준 커밋을 보존한다. 후속 구현으로 source가 달라지면 drift를 검토하고 새 evidence를 만든다.

## 문서 재생성

Node와 Python 3, ggaction package-lock의 개발 의존성을 사용한다. 문서 renderer용 marked는 프로젝트 runtime dependency에 추가하지 않는다.

```sh
npm ci
npm install --prefix study/coverage-expansion-2026-10-27/.runtime --ignore-scripts --no-audit --no-fund marked@17.0.5
python3 study/restore.py
python3 study/coverage-expansion-2026-10-27/scripts/roadmap-oracles.py
python3 study/coverage-expansion-2026-10-27/scripts/build-roadmap.py
node study/coverage-expansion-2026-10-27/scripts/build-roadmap-view.mjs
python3 study/coverage-expansion-2026-10-27/scripts/validate-roadmap.py
npx playwright install chromium
node study/coverage-expansion-2026-10-27/scripts/qa-roadmap.mjs
```

최신 스크립트는 repository 위치를 자동 탐지한다. 다른 checkout을 대상으로 하면 GGACTION_SOURCE를 지정하고, 별도 marked 설치를 사용하면 MARKED_MODULE을 지정한다. 문서만 읽는 데는 Node 설치가 필요 없다.

## 과거 조사 재현

외부 저장소 clone, node_modules, 임시 cache는 중복 업로드하지 않았다. 최신 보고서 README의 repository/commit 표가 재현 기준이다. sources/의 정확한 외부 commit들이 필요한 과거 전수 조사와 native 로드맵 검증은 별개다. 과거 audit/release 스크립트·로그의 절대 경로와 당시 결과는 기록으로 보존했다. 역사적 스크립트를 다시 실행할 때 해당 기준 commit과 환경을 먼저 복원하며, 현행 기능의 성공으로 과거 로그를 재사용하지 않는다.

transfer-manifest.json의 originalFiles는 업로드 전 작성 산출물 전수 개수다. 큰 파일은 압축하고 나머지는 원본 형식으로 옮겼다. 이동 후 최신 문서 실행 스크립트와 인계 문서에만 portability 수정을 적용했다. npm 패키지의 files 목록에는 study가 없으므로 이 자료가 runtime 배포에 포함되지 않는다.
