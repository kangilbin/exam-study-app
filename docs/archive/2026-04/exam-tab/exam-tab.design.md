# Design: exam-tab (기출문제 주관식 변환)

## 개요
- **기능명**: exam-tab
- **Plan 참조**: `docs/01-plan/features/exam-tab.plan.md`
- **작성일**: 2026-04-13

## 1. 타입 정의

### 1-1. 답변 유형 (AnswerType)

`features/questions/types.ts`에 추가:

```typescript
/** 주관식 답변 유형 */
export type AnswerType =
  | 'text'           // 일반 한글/텍스트 (세션 하이재킹, 형상관리)
  | 'abbreviation'   // 영문 약어 (CRC, ARP, MD5)
  | 'fullName'       // 영문명 (Observer Pattern, Abstract Factory)
  | 'multiple'       // 복수 답변 ((1) ARP (2) RARP, ㄱ. 도메인 ㄴ. 개체)
  | 'ordering'       // 순서 나열 (기능적 > 통신적 > 시간적 > 우연적)
  | 'codeOutput'     // 코드 출력값 (50758595100, 3\n1\n45)
  | 'sql';           // SQL문 (SELECT ... FROM ...)

/** 복수 답변의 개별 파트 */
export interface AnswerPart {
  label: string;     // "(1)", "(2)" 또는 "ㄱ", "ㄴ"
  answer: string;    // 해당 파트의 정답
}

/** 순서 나열 보기 항목 */
export interface OrderingItem {
  label: string;     // "ㄱ", "ㄴ", "ㄷ", "ㄹ"
  text: string;      // "기능적 응집도", "통신적 응집도"
}

/** 답변 분석 결과 (런타임 생성) */
export interface AnswerMeta {
  type: AnswerType;
  hint: string;                  // 입력칸 placeholder (예: "약어를 입력하세요")
  parts?: AnswerPart[];          // multiple일 때 각 파트
  alternatives?: string[];       // 동의어 (비정규화 → [비정규화, 반정규화])
  orderingItems?: OrderingItem[]; // ordering일 때 보기 목록
  primaryAnswer: string;         // 정규화된 주요 정답
}

/** 주관식 채점 결과 */
export interface GradeResult {
  isCorrect: boolean;
  partResults?: {                // multiple일 때 파트별 결과
    label: string;
    isCorrect: boolean;
    userAnswer: string;
    correctAnswer: string;
  }[];
  correctAnswer: string;         // 표시용 정답 텍스트
}
```

### 1-2. 퀴즈 스토어 확장 타입

`store/useQuizStore.ts`에 추가되는 상태:

```typescript
// 기존 QuizState에 추가
userAnswers: Record<string, string>;  // key: 'main' 또는 'part_0', 'part_1', ...
gradeResult: GradeResult | null;

// 기존 QuizState에 추가되는 액션
setUserAnswer: (key: string, value: string) => void;
submitSubjectiveAnswer: () => void;
```

## 2. 답변 유형 판별 로직

### 2-1. detectAnswerType 함수

`features/questions/services/gradingService.ts` (신규 파일):

```
detectAnswerType(question: Question): AnswerMeta

판별 순서 (우선순위):
┌─────────────────────────────────────────────────────────┐
│ 1. question.type === 'code'                             │
│    → codeOutput (무조건)                                │
│                                                         │
│ 2. answer가 SQL 키워드로 시작                            │
│    (SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)       │
│    → sql                                                │
│                                                         │
│ 3. answer에 복수 패턴 포함                               │
│    /\(\d+\)/ 또는 /[ㄱ-ㅎ]\.\s/ 또는 /^\d+\.\s/         │
│    → multiple (각 파트로 분리)                            │
│                                                         │
│ 4. answer에 '>' 포함                                    │
│    → ordering (항목을 ㄱ,ㄴ,ㄷ 라벨로 변환)              │
│                                                         │
│ 5. answer가 '약어 (Full Name)' 패턴                     │
│    /^[A-Z][A-Za-z0-9]{1,9}\s*\(.*\)$/                  │
│    → abbreviation (약어 부분만 정답)                      │
│                                                         │
│ 6. answer가 순수 영문 대문자 2~10자                      │
│    /^[A-Z][A-Za-z0-9]{1,9}$/                            │
│    → abbreviation                                       │
│                                                         │
│ 7. answer가 영문 단어 조합 (2개 이상)                    │
│    /^[a-zA-Z]+(\s+[a-zA-Z]+)+$/                         │
│    → fullName                                           │
│                                                         │
│ 8. answer에 '영문(한글)' 또는 '영문 패턴' 포함           │
│    예: "Factory Method 패턴", "Control Coupling (제어)"  │
│    → fullName (영문 부분만 정답)                          │
│                                                         │
│ 9. answer에 한글 동의어 '본래어(동의어)' 패턴            │
│    예: "비정규화(반정규화)"                               │
│    → text + alternatives 배열에 동의어 추가              │
│                                                         │
│ 10. 기본값                                               │
│    → text                                               │
└─────────────────────────────────────────────────────────┘
```

### 2-2. 유형별 hint 텍스트

| AnswerType | hint |
|------------|------|
| text | "답을 입력하세요" |
| abbreviation | "약어를 입력하세요" |
| fullName | "영문명을 입력하세요" |
| multiple | 각 파트에 "(1)", "(2)" 등 라벨 표시 |
| ordering | "순서를 기호로 입력하세요 (예: ㄱㄴㄷㄹ)" |
| codeOutput | "출력 결과를 입력하세요" |
| sql | "SQL문을 입력하세요" |

### 2-3. 복수 답변 파싱 (parseMultipleAnswer)

```
입력: "(1) ARP (2) RARP"
출력: [
  { label: "(1)", answer: "ARP" },
  { label: "(2)", answer: "RARP" }
]

입력: "ㄱ. 도메인 ㄴ. 개체 ㄷ. 참조"
출력: [
  { label: "ㄱ", answer: "도메인" },
  { label: "ㄴ", answer: "개체" },
  { label: "ㄷ", answer: "참조" }
]

입력: "1. 결합도  2. 응집도"
출력: [
  { label: "(1)", answer: "결합도" },
  { label: "(2)", answer: "응집도" }
]
```

**파싱 정규식:**
- `\((\d+)\)\s*(.+?)(?=\(\d+\)|$)` → (1), (2) 패턴
- `([ㄱ-ㅎ])\.\s*(.+?)(?=[ㄱ-ㅎ]\.|$)` → ㄱ., ㄴ. 패턴
- `(\d+)\.\s*(.+?)(?=\d+\.|$)` → 1., 2. 패턴

### 2-4. 순서 나열 변환 (parseOrderingAnswer)

```
입력: "기능적 > 통신적 > 시간적 > 우연적"
출력: {
  orderingItems: [
    { label: "ㄱ", text: "기능적" },    // 셔플됨
    { label: "ㄴ", text: "우연적" },    // 셔플됨
    { label: "ㄷ", text: "시간적" },    // 셔플됨
    { label: "ㄹ", text: "통신적" }     // 셔플됨
  ],
  correctOrder: "ㄱㄹㄷㄴ"  // 셔플 결과에 따라 달라짐
}
```

**로직:**
1. answer에서 `>` 기준으로 항목 분리 → 정답 순서 배열
2. 항목들을 셔플하여 ㄱ, ㄴ, ㄷ, ㄹ 라벨 부여
3. 정답: 원래 순서에 해당하는 라벨 조합

### 2-5. 약어 추출 (extractAbbreviation)

```
입력: "RTO (Recovery Time Objective)"
출력: "RTO"

입력: "AJAX (Asynchronous JavaScript and XML)"
출력: "AJAX"

입력: "CRC"
출력: "CRC"
```

### 2-6. 동의어 추출 (extractAlternatives)

```
입력: "비정규화(반정규화)"
출력: { primaryAnswer: "비정규화", alternatives: ["비정규화", "반정규화"] }

입력: "Factory Method 패턴"
출력: { primaryAnswer: "Factory Method", alternatives: ["Factory Method", "Factory Method 패턴"] }

입력: "Control Coupling (제어 결합도)"
출력: { primaryAnswer: "Control Coupling", alternatives: ["Control Coupling", "제어 결합도"] }
```

## 3. 채점 엔진

### 3-1. gradeAnswer 함수

`features/questions/services/gradingService.ts`:

```
gradeAnswer(userAnswer: string, answerMeta: AnswerMeta): GradeResult

유형별 채점 로직:
┌────────────┬──────────────────────────────────────────────┐
│ text       │ 1. trim()                                    │
│            │ 2. 한글 포함 시: 모든 공백 제거              │
│            │ 3. 영문 포함 시: toLowerCase()               │
│            │ 4. alternatives 있으면 각각 비교             │
│            │ 5. 하나라도 일치하면 정답                    │
├────────────┼──────────────────────────────────────────────┤
│ abbrevia-  │ 1. trim()                                    │
│ tion       │ 2. toLowerCase()                             │
│            │ 3. primaryAnswer와 비교                      │
├────────────┼──────────────────────────────────────────────┤
│ fullName   │ 1. trim()                                    │
│            │ 2. toLowerCase()                             │
│            │ 3. 연속 공백 → 단일 공백 정규화             │
│            │ 4. alternatives 각각 비교                    │
├────────────┼──────────────────────────────────────────────┤
│ multiple   │ 1. parts별 개별 채점                        │
│            │ 2. 각 파트의 답변 유형에 맞게 정규화         │
│            │ 3. 전체 정답: 모든 파트 정답                 │
│            │ 4. 부분 정답: partResults로 표시             │
├────────────┼──────────────────────────────────────────────┤
│ ordering   │ 1. 입력에서 기호(ㄱ~ㅎ)만 추출              │
│            │ 2. correctOrder와 순서 비교                  │
├────────────┼──────────────────────────────────────────────┤
│ codeOutput │ 1. trim()                                    │
│            │ 2. 모든 공백/줄바꿈/탭 제거                 │
│            │ 3. 정답도 동일하게 정규화 후 비교            │
├────────────┼──────────────────────────────────────────────┤
│ sql        │ 1. trim()                                    │
│            │ 2. 끝의 세미콜론(;) 제거                    │
│            │ 3. 연속 공백 → 단일 공백                    │
│            │ 4. toLowerCase()                             │
│            │ 5. 정답도 동일하게 정규화 후 비교            │
└────────────┴──────────────────────────────────────────────┘
```

### 3-2. 정규화 헬퍼 함수

```typescript
/** 한글 답변 정규화: 공백 제거 */
function normalizeKorean(s: string): string {
  return s.trim().replace(/\s+/g, '');
}

/** 영문 답변 정규화: 소문자 + 공백 정리 */
function normalizeEnglish(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** 코드 출력 정규화: 모든 공백/줄바꿈 제거 */
function normalizeCodeOutput(s: string): string {
  return s.replace(/\s+/g, '');
}

/** SQL 정규화: 소문자 + 공백 정리 + 세미콜론 제거 */
function normalizeSql(s: string): string {
  return s.trim().replace(/;$/, '').replace(/\s+/g, ' ').toLowerCase();
}

/** 순서 기호 추출: ㄱㄴㄷㄹ만 뽑기 */
function extractOrderSymbols(s: string): string {
  return s.replace(/[^ㄱ-ㅎ]/g, '');
}

/** 답변에 한글 포함 여부 */
function containsKorean(s: string): boolean {
  return /[가-힣]/.test(s);
}
```

## 4. 스토어 변경

### 4-1. useQuizStore 상태 추가

```typescript
// 기존 상태에 추가
userAnswers: Record<string, string>;    // { main: "CRC" } 또는 { part_0: "ARP", part_1: "RARP" }
gradeResult: GradeResult | null;

// 기존 액션에 추가
setUserAnswer: (key: string, value: string) => void;
submitSubjectiveAnswer: () => void;
```

### 4-2. setUserAnswer 구현

```
setUserAnswer(key, value):
  userAnswers = { ...userAnswers, [key]: value }
```

### 4-3. submitSubjectiveAnswer 구현

```
submitSubjectiveAnswer():
  1. currentQuestion 가져오기
  2. detectAnswerType(currentQuestion)으로 AnswerMeta 생성
  3. gradeAnswer(userAnswers, answerMeta) 실행
  4. gradeResult 저장
  5. isAnswered = true
  6. results 배열에 { questionId, isCorrect } 추가
```

### 4-4. nextQuestion 수정

```
nextQuestion():
  기존 로직 + 추가:
  - userAnswers: {}     // 초기화
  - gradeResult: null   // 초기화
```

### 4-5. persist 대상 추가

```typescript
partialize: (state) => ({
  // ... 기존 필드
  userAnswers: state.userAnswers,  // 추가
})
```

### 4-6. startQuiz/resetQuiz 수정

두 함수 모두에 초기값 추가:
```
userAnswers: {},
gradeResult: null,
```

## 5. UI 설계

### 5-1. 기출 카테고리 판별

`app/quiz/[categoryId].tsx`에서:

```typescript
/** 기출 카테고리인지 판별 (주관식 적용 대상) */
const isExamCategory = categoryId?.startsWith('exam-') ?? false;
```

### 5-2. 주관식 렌더링 분기

```
{isExamCategory && currentQuestion
  ? <SubjectiveInput />     // 새 컴포넌트
  : <ChoiceList />          // 기존 객관식
}
```

### 5-3. SubjectiveInput 컴포넌트 구조

**위치**: `app/quiz/[categoryId].tsx` 내부 (별도 파일 분리 불필요)

```
SubjectiveInput 렌더링 로직:

1. answerMeta = detectAnswerType(currentQuestion)

2. 유형별 UI 분기:

  [text / abbreviation / fullName / codeOutput / sql]
  ┌─────────────────────────────────────┐
  │ 💡 {answerMeta.hint}               │  ← 유형 힌트 텍스트
  │ ┌─────────────────────────────────┐ │
  │ │ TextInput (placeholder)         │ │  ← 단일 입력칸
  │ └─────────────────────────────────┘ │
  │         [ 정답 확인 ]               │  ← 제출 버튼
  └─────────────────────────────────────┘

  [multiple]
  ┌─────────────────────────────────────┐
  │ (1) ┌───────────────────────────┐  │
  │     │ TextInput                 │  │  ← 파트별 입력칸
  │     └───────────────────────────┘  │
  │ (2) ┌───────────────────────────┐  │
  │     │ TextInput                 │  │
  │     └───────────────────────────┘  │
  │         [ 정답 확인 ]               │
  └─────────────────────────────────────┘

  [ordering]
  ┌─────────────────────────────────────┐
  │ [보기]                              │
  │  ㄱ. 기능적    ㄴ. 우연적           │  ← 셔플된 보기
  │  ㄷ. 시간적    ㄹ. 통신적           │
  │                                     │
  │ 순서: ┌──────────────────────────┐  │
  │       │ TextInput                │  │  ← 기호 순서 입력
  │       └──────────────────────────┘  │
  │         [ 정답 확인 ]               │
  └─────────────────────────────────────┘
```

### 5-4. 채점 결과 표시 UI

```
[정답]
┌──────────────────────────────────────┐
│ ✅ 정답입니다!                        │  ← 초록색 배경
│ 정답: CRC                            │
└──────────────────────────────────────┘

[오답]
┌──────────────────────────────────────┐
│ ❌ 오답입니다                         │  ← 빨간색 배경
│ 내 답: crs                           │
│ 정답: CRC                            │
└──────────────────────────────────────┘

[복수 답변 - 부분 정답]
┌──────────────────────────────────────┐
│ (1) ✅ ARP                           │  ← 초록색
│ (2) ❌ RAPR → 정답: RARP             │  ← 빨간색
│ (3) ✅ ICMP                          │  ← 초록색
└──────────────────────────────────────┘

[순서 나열]
┌──────────────────────────────────────┐
│ ❌ 오답입니다                         │
│ 내 답: ㄱㄷㄹㄴ                      │
│ 정답: ㄱㄹㄷㄴ (기능적>통신적>시간적>우연적) │
└──────────────────────────────────────┘
```

### 5-5. 입력칸 스타일

```typescript
// TextInput 공통 스타일
subjectiveInput: {
  backgroundColor: '#fff',
  borderRadius: 10,
  padding: 14,
  borderWidth: 2,
  borderColor: COLORS.gray[200],
  fontSize: 16,
  color: COLORS.text,
},
// 포커스 상태
subjectiveInputFocused: {
  borderColor: COLORS.primary,
},
// 정답 상태
subjectiveInputCorrect: {
  borderColor: COLORS.success,
  backgroundColor: COLORS.successLight,
},
// 오답 상태
subjectiveInputIncorrect: {
  borderColor: COLORS.danger,
  backgroundColor: COLORS.dangerLight,
},
```

### 5-6. 정답 확인 버튼

```
[제출 전]
- 입력칸에 텍스트가 있을 때만 활성화
- 스타일: 기존 primaryButton 동일

[제출 후]
- 버튼 사라지고 채점 결과 + "다음 문제" 버튼 표시
- 입력칸 비활성화 (editable={false})
- 입력칸 색상 변경 (정답: 초록, 오답: 빨강)
```

## 6. handleChoicePress → handleSubjectiveSubmit 분기

### 6-1. 기존 handleChoicePress (객관식, 변경 없음)

학습 카테고리용으로 그대로 유지.

### 6-2. 새 handleSubjectiveSubmit (주관식)

```
handleSubjectiveSubmit():
  1. submitSubjectiveAnswer() 호출 (스토어)
  2. gradeResult에서 isCorrect 가져오기
  3. updateProgress(currentQuestion.id, isCorrect ? 'correct' : 'incorrect')
```

## 7. 결과 화면 호환성

`app/quiz/result.tsx`는 변경 불필요.
- `results` 배열에 `{ questionId, isCorrect }` 형식은 객관식/주관식 동일
- `correctCount`, `total` 계산 로직 동일
- 결과 화면에서 정답률/오답수 표시는 그대로 작동

## 8. 파일별 변경 상세

| 파일 | 변경 유형 | 변경 내용 |
|------|----------|----------|
| `features/questions/types.ts` | 수정 | AnswerType, AnswerPart, OrderingItem, AnswerMeta, GradeResult 타입 추가 |
| `features/questions/services/gradingService.ts` | **신규** | detectAnswerType, gradeAnswer, 파싱/정규화 헬퍼 함수 |
| `store/useQuizStore.ts` | 수정 | userAnswers, gradeResult 상태 + setUserAnswer, submitSubjectiveAnswer 액션 추가 |
| `app/quiz/[categoryId].tsx` | 수정 | isExamCategory 분기, 주관식 입력 UI, 채점 결과 UI, 스타일 추가 |

## 9. 구현 순서

```
Step 1: features/questions/types.ts
  → 타입 정의 추가

Step 2: features/questions/services/gradingService.ts (신규)
  → detectAnswerType()
  → parseMultipleAnswer()
  → parseOrderingAnswer()
  → extractAbbreviation()
  → extractAlternatives()
  → gradeAnswer()
  → 정규화 헬퍼 함수들

Step 3: store/useQuizStore.ts
  → userAnswers, gradeResult 상태 추가
  → setUserAnswer, submitSubjectiveAnswer 액션 추가
  → startQuiz, resetQuiz, nextQuestion 초기화 수정

Step 4: app/quiz/[categoryId].tsx
  → isExamCategory 판별
  → 주관식 입력 UI 렌더링 (유형별 분기)
  → handleSubjectiveSubmit 핸들러
  → 채점 결과 표시 UI
  → 스타일 추가
```

## 10. 엣지 케이스 처리

| 케이스 | 처리 방법 |
|--------|----------|
| 코드 문제인데 answer가 영문 약어처럼 보임 (예: "AB") | `question.type === 'code'`이면 무조건 codeOutput |
| "RTO (Recovery Time Objective)" | abbreviation으로 판별, "RTO"만 정답 |
| "비정규화(반정규화)" | text + alternatives: ["비정규화", "반정규화"] |
| "Factory Method 패턴" | fullName, alternatives: ["Factory Method", "Factory Method 패턴"] |
| "Control Coupling (제어 결합도)" | fullName, alternatives: ["Control Coupling", "제어 결합도"] |
| 빈 입력으로 제출 시도 | 제출 버튼 비활성화 (입력값 있을 때만 활성) |
| "1. 물리적 설계  2. 개념적 설계" | multiple (숫자+마침표 패턴도 지원) |
| 줄바꿈 포함 코드출력 "3\n1\n45" | codeOutput, 모든 공백/줄바꿈 제거 후 비교 |
| SQL 답변 세미콜론 유무 | sql, 끝의 ; 제거 후 비교 |
| 순서 입력 시 구분자 ("ㄱ,ㄴ,ㄷ" vs "ㄱㄴㄷ") | 기호(ㄱ~ㅎ)만 추출하여 비교 |
