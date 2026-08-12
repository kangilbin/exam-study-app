# copyright-risk-mitigation 도구 모음

`data/questions/exam-*.json`(모의고사 420문항)의 저작권 리스크를 낮추기 위해 콘텐츠를
재작성하고 회차 간 재배치할 때 쓴 스크립트들이다. **앱 빌드/실행과는 무관**하다 —
`app/`, `features/`, `components/` 등 실제 앱 코드는 이 폴더를 전혀 참조하지 않는다.
문제 데이터를 다시 손보게 될 때를 위한 개발 도구 모음이다.

## 스크립트

### `validate.ts` — 데이터 정합성 검증 (가장 자주 쓰게 될 스크립트)
```
npx tsx scripts/copyright/validate.ts
```
`data/questions/`를 건드릴 때마다 실행해서 회귀가 없는지 확인한다. 7가지를 검사한다:
id 유일성, `changeType`/`changeReason` 필드 존재 여부, 회차별 도메인 구성 수가
`output/domain-counts.json`(기준값)과 일치하는지, `kept`/`rewritten` 판정이 git
HEAD(원본 커밋)의 실제 콘텐츠와 맞는지, `choices` 정합성, 코드 문항 실제
컴파일/실행 결과가 `answer`와 맞는지, 플래시카드 용어/id 중복.

### `domainMap.ts` — 도메인 분류 로직
직접 실행하는 스크립트가 아니라 `validate.ts`/`reallocate.ts`가 가져다 쓰는
분류 함수(`classifyQuestion`)와 수동 오버라이드 표(`QUESTION_ID_OVERRIDES`)가 있는
파일이다. subcategory나 본문 키워드만으로 도메인(코드/SQL/DB/네트워크/OS/SE)을
못 정하는 문항(주로 subcategory가 "종합"인 것)을 id 단위로 강제 지정한다.

**주의**: `QUESTION_ID_OVERRIDES`는 **현재 `data/questions/`의 id 기준**이다.
`reallocate.ts`를 다시 돌려 회차를 재배치하면 id가 전부 바뀌므로, 이 표도
`output/reallocation-map.json`을 참고해서 새 id 기준으로 다시 만들어야 한다
(재배치 후 `validate.ts`에서 "도메인 구성 카운트" 검사가 깨지면 이 표를 안 고친 것).

### `reallocate.ts` — 회차 간 문항 재배치
```
npx tsx scripts/copyright/reallocate.ts
```
420문항을 회차(exam-2020-1 ~ exam-2026-2) 간에 무작위로 섞되, **회차별 도메인
구성 수(코드 N개, SQL N개...)는 `output/domain-counts.json`과 동일하게 유지**한다.
결과는 `data/questions/`에 바로 쓰지 않고 `output/reallocated/*.json`에 스테이징만
하며, 검증 통과 시 `output/reallocation-map.json`(새 id → 원본 id/회차 매핑)도
같이 남긴다. 스테이징 결과가 마음에 들면 수동으로 `data/questions/`에 복사하고,
그다음 `domainMap.ts`의 `QUESTION_ID_OVERRIDES`를 새 id 기준으로 재구성한 뒤
`validate.ts`로 최종 확인한다.

### `analyzeQuestions.ts` — 회차별 도메인 구성 산출 (기준값 생성)
```
npx tsx scripts/copyright/analyzeQuestions.ts
```
현재 `data/questions/`를 분석해서 `output/domain-counts.json`(회차별 도메인
구성 수 — `reallocate.ts`의 입력값)을 새로 만든다. 새 회차를 추가하거나
도메인 분류 기준 자체를 바꿔서 "기준값"을 다시 잡아야 할 때만 실행한다 —
평소에는 건드릴 필요 없다.

### `extractTerms.ts` — 플래시카드 후보 용어 추출 (보류 상태)
```
npx tsx scripts/copyright/extractTerms.ts
```
문항의 정답/보기 용어를 뽑아 기존 플래시카드 523장과 중복 제거한 신규 후보
목록을 만든다. 2026-08-06 시점에 "별도 플래시카드 컬렉션 신설은 범위 제외"로
결정되어 실제 적용은 보류된 상태다 — 도구만 남겨둔 것.

## `output/` 산출물

| 파일 | 용도 | 필요 여부 |
|---|---|---|
| `domain-counts.json` | 회차별 도메인 구성 기준값. `reallocate.ts` 실행 시 반드시 필요 | **유지 필수** |
| `reallocation-map.json` | 가장 최근 재배치의 "새 id → 원본 id/회차" 기록 | 유지 권장(추적용) |
| `reallocated/` | 재배치 스테이징 결과 | 이미 `data/questions/`에 반영했다면 삭제 가능(중복) |
| `flashcard-candidates.json`, `term-frequency.json`, `theory-sql-assignment.json` | 예전 분석 스크래치 산출물 | 안 쓰면 삭제 가능 |

## 전형적인 작업 순서 (문제 데이터를 다시 재배치하고 싶을 때)

1. `data/questions/`에 콘텐츠 수정을 먼저 끝낸다.
2. `npx tsx scripts/copyright/reallocate.ts` 실행 → `output/reallocated/`,
   `output/reallocation-map.json` 생성.
3. 결과 확인 후 `output/reallocated/*.json`을 `data/questions/`에 복사.
4. `reallocation-map.json`을 참고해 `domainMap.ts`의 `QUESTION_ID_OVERRIDES`를
   새 id 기준으로 재구성.
5. `npx tsc --noEmit -p .` 와 `npx tsx scripts/copyright/validate.ts`로 최종 확인.
