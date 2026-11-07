# 행 ID token의 중복 파싱 제거

`validateSourceIdentity`가 이미 파싱한 문자열 token을 같은 호출 내부의 private 검사에 전달한다. 외부에서 호출하는 `validateTypedRowKeyToken`은 기존 파싱과 검사를 유지한다. 문자열이 아닌 token은 기존 helper를 다시 호출하여 객체의 coercion 횟수와 오류 순서를 유지한다. Generated key 검사, canonical typed key·중복·필드 일치 검사, caller 입력과 프로그램 불변성은 변경하지 않는다. 공개 API·저장 schema·ownership registry·work 한도는 그대로다.

작은 exact-source A/B는 정상·손상 token과 getter/coercion 88사례의 반환값 및 오류 name/message/details·관측 순서가 같음을 확인했다. 실제 공개 `reviseData`의 32행 keyField 입력에서는 typed token JSON.parse 호출이256→128회로 줄었다. 같은 semantic/graphic 상태·전체 trace·editable 저장 bytes·caller 입력 SHA를 확인했다. 이는4N회 중복 파싱 제거의 작은 비용 증거이며 실행 시간이나 원100k·canonical P95 통과를 뜻하지 않는다.

[검증 기록](data-key-token-evidence/qualification.json)은 관련 105개 및 경계 28개 검사와 실제 source coverage를 보존한다. 동일 canonical archive를 Node20/22/24에 설치해 원1k data load/revise, 특수값·저장 bytes와6개 entry bundle을 검산했다. 공개 API·선언·Current 계약에는 변경이 없다. 원100k data load/revise와 blocking50ms, 최종 합산본 성능·수명·전수검사 의무는 남는다. STEP057–070/077은 미완료다.
