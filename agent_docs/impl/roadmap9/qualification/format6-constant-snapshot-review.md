# Format6 compound constant 복원 소유권 검토

상태: read-only prototype. 제품 source에 적용하지 않았다. 원100k의 native 준비·순수 sample·전 좌표 및 export quota는 통과했지만, 같은 프로세스 offline 단계에서 소유권 registry의 재해시가 정체되어 전체 기능은 실패 상태다. 실패를 단계별 새 프로세스로 나누어 통과 처리하지 않는다.

## 관측과 범위

원100000 입력 SHA-256은 `b68cab72c1abb6094e715d6e5caa84c54aacf18750ad4a22fb63e3b8c5b2c39f`이다. 최초 물리 envelope 한도 실패 후, format6 encoder만 exact owned compound constant를 선택하도록 root가 채택했다. 내부 record-column이 있어 기존 cell 부담을 줄이는 compound는 그 최적화에서 제외했다. v3–v5 encoder/reader, envelope1 및 columns@2 schema는 그대로다.

재실행 PID19119는 native 준비180119ms, GC 후 순수 sample167.439ms, 별도 전좌표 oracle5.097ms였다. 준비 work97911711, 논리 values7600057, cellVisits7600004, physical304549였다. 한 번의 진단이며 P95/SLO가 아니다. 두 offline OS sample은 각각760/760,758/758 주 스택이 WeakSet.add→EphemeronHashTable::Rehash였다. 약12분 후 TERM(exit143)했고 `.artifacts/format6/first-offline-rehash.log`, `first-offline-rehash-partial.json`, `offline.sample.txt`, `offline-second.sample.txt`를 보존했다. 원50ms 및100cycle 의무는 미충족이다.

## 구체 최소안

[정확 patch](format6-constant-snapshot-evidence/prototype.patch)는 두 파일만 바꾼다.

- `columnCodec.js`에 private format6 전용 validator 진입점을 추가한다. 기존 v1/v2 함수는 이전 분기를 그대로 사용한다.
- physical/descriptor/expanded/cell 검사와 모든 node validation이 끝난 뒤에만 compound constant를 exact reference마다 한 번 snapshot한다. constant의 논리 크기×반복 길이는 기존과 같이 검산한다.
- 별도 작은 copier는 `isOwned`를 신뢰하지 않고 모든 자손을 복사한다. 따라서 caller의 shallow-owned/frozen object가 자손 소유권을 위조하지 못한다. sparse array, undefined, bigint, -0 및 키 순서를 보존한다. 미리 통과한 enumerable own-data만 읽고 닫힌 새 자손부터 freezeOwned한다.
- 복원 row가 참조하는 것은 완전히 소유한 constant snapshot이다. 후속 기존 cloneAndFreeze가 이를 안전하게 공유한다. mutable input alias를 반환하지 않으며, holder의 input은 삭제하고 transient map은 비운다. 기존 column proof의 수명은 한 번의 복원에 한정된다.
- planner는 version6에서만 새 validator를 선택한다. 기존 strict semantic/geometry 검증과 offline native authority0은 모두 뒤에서 그대로 실행된다. 새 public export·옵션·schema·global registry·한도 변경은 없다.

이 변경은 registry 자체를 교체하거나 arbitrary owned data의 검증을 생략하지 않는다. 객체 생성량 감소가 원100k 정체를 해결하는지는 같은 프로세스 원100k 재검증으로 판단해야 한다.

## 작은 검증

[loader](format6-constant-snapshot-evidence/loader.mjs)는 source를 쓰지 않고 정확 anchor를 바꾼다. [hashes](format6-constant-snapshot-evidence/source-hashes.json)는 현재 WIP source와 후보 각각을 식별한다.

[oracle](format6-constant-snapshot-evidence/oracle.mjs) / [결과](format6-constant-snapshot-evidence/oracle.json):1000행의 모든 metric·값·키순서·hole·-0가 원 validator와 같다. 새 snapshot은 공유되지만 raw constant와 분리되고, validation 후 caller 변경 및 shallow-owned 자손 변경에도 고정된다. 악성 field/reference/cycle/function/symbol/길이 입력의 오류 및 실패 이전 freeze 수는 기존과 같고 getter 읽기0이다.12M 초과 반복 constant는 snapshot 이전에 거부한다.

추가 loader 실행에서 actual1k의 linear/time/log/pow/sqrt/symlog·fallback·timeline·혼합9경로는 whole frame/native/offline/rebase/timeline 동등성을 통과했다(`.artifacts/format6/constant-snapshot-one-k.log`). column/storage/numeric durable32개도 통과했다(`constant-snapshot-durable.log`). 원100k에 적용하거나 통과했다고 주장하지 않는다.

## Root 채택 및 제품 반영

Root는 위 정확한2파일 patch와 oracle을 읽고 `AUTHORIZATION.json#remainingApproval` 범위에서 채택했다. 새 public API/schema/registry를 추가하지 않고, 모든 preflight 뒤 한 번의 deep snapshot과 shallow-owned/alias 격리, 기존v3–v5 reader 유지 조건을 확인했다. 이 승인에 따라 제품에 적용한다. 원100k는 같은 프로세스 전체 경로로 다시 검증하며, 이전 실패를 지우거나100cycle 완료로 간주하지 않는다.
