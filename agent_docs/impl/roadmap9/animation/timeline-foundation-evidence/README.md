# Timeline 수치 준비 검증

이 private checkpoint는 닫힌 keyframe schedule, 명시 priority overlap과 forward marker crossing을 소유한다. 정확한 source, 지원 Node별 독립9개 검사, critical coverage와 package 실측은 qualification.json에 고정한다. 공개 준비, native target 해석, 현재 frame proof, offline transport와 player marker 연결은 후속 의무다. 설치된 timeline API 결과를 추정하지 않는다.

집중 검사는 `node scripts/run-tests.js unit unit/animation/timeline.test.js`로 재현한다. 같은 파일에 `--experimental-test-coverage --test-coverage-include=src/grammar/animation/timeline.js`와95/90/100 최소 기준을 적용한다. 원 최초 수치·error 문구 기대 실패와 수정 후 통과를 별도로 보존한다.
