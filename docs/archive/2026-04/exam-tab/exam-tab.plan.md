# Plan: exam-tab (기출문제 주관식 변환)

## 개요
- **기능명**: exam-tab
- **유형**: 기능 변경 (객관식 → 주관식)
- **우선순위**: 높음
- **작성일**: 2026-04-13

## 목표
기출문제 탭에서 문제 풀이 방식을 객관식(선택지)에서 주관식(텍스트 입력)으로 변환하여, 실제 시험 환경에 가깝게 학습할 수 있도록 한다.

## 요구사항

### R-1: 기본 주관식 변환
- 기출문제(exam-* 카테고리) 풀이 시 선택지(choices) 대신 텍스트 입력칸 표시
- 학습탭(code, sql, theory, memorize 카테고리)은 기존 객관식 유지

### R-2: 답변 유형별 채점 규칙

| 답변 유형 | 채점 규칙 | 예시 |
|----------|----------|------|
| 한글 답변 | 띄어쓰기 무시하여 채점 | "세션 하이재킹" = "세션하이재킹" ✅ |
| 영문 답변 | 대소문자 무시하여 채점 | "crc" = "CRC" ✅ |
| 영문 약어 | "약어" 라벨 표시 | 힌트: "답을 약어로 입력하세요" |
| 영문 전체명 | "영문명" 라벨 표시 | 힌트: "답을 영문명으로 입력하세요" |

### R-3: 복수 답변 처리
- 문제에 빈칸이 여러 개인 경우 ((1), (2) 또는 ㄱ, ㄴ, ㄷ), 각 빈칸별 개별 입력칸 제공
- 각 입력칸은 독립 채점 (부분 정답 가능)
- 예시: "(1) ARP (2) RARP" → 입력칸 2개, 각각 "ARP", "RARP" 개별 채점

### R-4: 순서 나열 문제 처리
- 나열해야 할 항목들을 ㄱ, ㄴ, ㄷ, ㄹ 등의 기호로 라벨링하여 보기 제공
- 사용자가 올바른 순서를 기호로 입력 (예: "ㄱ, ㄴ, ㄷ, ㄹ")
- 채점 시 구분자(>, 쉼표, 공백 등) 무시하고 기호 순서만 비교
- 예시 문제: "응집도를 높은 순서로 나열하시오" → 보기: ㄱ.기능적 ㄴ.통신적 ㄷ.시간적 ㄹ.우연적 → 정답: "ㄱㄴㄷㄹ"

### R-5: 코드 출력/SQL 결과 문제
- 텍스트 입력칸에 직접 출력값 입력
- 채점 시 앞뒤 공백 제거(trim) 후 비교
- 한글 답변이면 띄어쓰기 무시 규칙 적용

### R-6: 답변 유형 자동 판별
- 기존 `answer` 필드를 분석하여 답변 유형을 런타임에 판별:
  - **영문 약어**: 답이 대문자 알파벳 2~5글자 (예: CRC, ARP, TCP)
  - **영문명**: 답이 영문 단어 2개 이상 (예: Session Hijacking)
  - **복수 답변**: 답에 (1), (2) 또는 ㄱ., ㄴ. 패턴 포함
  - **순서 나열**: 답에 `>` 구분자 포함
  - **일반 한글**: 위에 해당하지 않는 경우
- JSON 데이터 수정 없이 기존 `answer` 필드 기반으로 동작

## 구현 범위

### 변경 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `app/quiz/[categoryId].tsx` | 기출 카테고리일 때 주관식 UI 분기, 텍스트 입력 UI, 채점 로직 |
| `store/useQuizStore.ts` | 주관식 상태 추가 (userAnswer, answerType 등) |
| `features/questions/services/questionService.ts` | 답변 유형 판별 함수, 채점 함수 추가 |
| `features/questions/types.ts` | 주관식 관련 타입 정의 추가 |

### 변경하지 않는 것
- `data/questions/exam-*.json`: 기존 JSON 데이터 구조 유지 (수정 없음)
- 학습탭 (code, sql, theory, memorize): 기존 객관식 동작 유지
- `app/(tabs)/exam.tsx`: 기출 목록 화면은 변경 없음

## 답변 유형 판별 로직 (상세)

```
function detectAnswerType(answer: string): AnswerType {
  // 1. 복수 답변 체크
  if (/\(\d\)/.test(answer) || /[ㄱ-ㅎ]\./.test(answer))
    → 'multiple'

  // 2. 순서 나열 체크
  if (answer.includes('>'))
    → 'ordering'

  // 3. 영문 약어 체크 (대문자 2~5글자)
  if (/^[A-Z]{2,5}$/.test(answer.trim()))
    → 'abbreviation'

  // 4. 영문명 체크 (영문 단어 조합)
  if (/^[a-zA-Z\s]+$/.test(answer.trim()) && answer.trim().split(/\s+/).length >= 2)
    → 'fullName'

  // 5. 기본: 일반 텍스트
  → 'text'
}
```

## 채점 로직 (상세)

```
function gradeAnswer(userAnswer: string, correctAnswer: string, type: AnswerType): boolean {
  switch(type) {
    case 'abbreviation':
    case 'fullName':
      // 영문: 대소문자 무시, 앞뒤 공백 제거
      return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

    case 'text':
      // 한글 포함: 띄어쓰기 제거 후 비교
      return normalize(userAnswer) === normalize(correctAnswer);
      // normalize = trim + 공백 제거 + (영문이면 toLowerCase)

    case 'multiple':
      // 각 항목별 개별 채점 (별도 처리)

    case 'ordering':
      // 기호만 추출하여 순서 비교
      return extractSymbols(userAnswer) === extractSymbols(correctAnswer);
  }
}
```

## 주관식 UI 구조

### 일반 문제 (단일 답변)
```
┌─────────────────────────────┐
│ Q1. 다음 설명의 용어를 ...     │
│                              │
│ [답을 약어로 입력하세요    ]    │  ← 유형별 힌트
│                              │
│      [ 정답 확인 ]            │  ← 제출 버튼
└─────────────────────────────┘
```

### 복수 답변
```
┌─────────────────────────────┐
│ Q2. 괄호 안에 알맞은 ...       │
│                              │
│ (1) [          ]              │  ← 입력칸 1
│ (2) [          ]              │  ← 입력칸 2
│ (3) [          ]              │  ← 입력칸 3
│                              │
│      [ 정답 확인 ]            │
└─────────────────────────────┘
```

### 순서 나열
```
┌─────────────────────────────┐
│ Q3. 높은 순서로 나열하시오      │
│                              │
│ [보기]                        │
│  ㄱ. 기능적  ㄴ. 통신적        │
│  ㄷ. 시간적  ㄹ. 우연적        │
│                              │
│ 순서: [ㄱ, ㄴ, ㄷ, ㄹ     ]   │  ← 기호 순서 입력
│                              │
│      [ 정답 확인 ]            │
└─────────────────────────────┘
```

### 채점 결과 표시
```
정답인 경우:  ✅ 정답! [초록색 배경]
오답인 경우:  ❌ 오답 | 정답: CRC [빨간색 배경 + 정답 표시]
복수 부분정답: (1) ✅ ARP  (2) ❌ 정답: RARP
```

## 구현 순서

```
1단계: 타입 정의 (types.ts)
  - AnswerType 타입 추가
  - SubjectiveState 인터페이스 추가

2단계: 서비스 로직 (questionService.ts)
  - detectAnswerType() 답변 유형 판별 함수
  - gradeAnswer() 채점 함수
  - parseMultipleAnswer() 복수 답변 파싱
  - parseOrderingAnswer() 순서 답변 파싱

3단계: 스토어 확장 (useQuizStore.ts)
  - userAnswers 상태 추가 (단일/복수 답변 지원)
  - submitSubjectiveAnswer 액션 추가
  - 기존 객관식 로직과 공존

4단계: 퀴즈 화면 UI (quiz/[categoryId].tsx)
  - 기출 카테고리 판별 → 주관식 UI 렌더링
  - 답변 유형별 입력 UI 분기
  - 채점 결과 표시 UI
  - 기존 객관식 UI는 학습 카테고리용으로 유지
```

## 리스크 & 주의사항

1. **답변 유형 판별 정확도**: `answer` 필드만으로 판별하므로 엣지 케이스 존재 가능
   - 예: 코드 출력값 "AB" → 영문 약어로 오판별 가능
   - 대응: `type: 'code'`인 문제는 무조건 `text` 타입으로 처리
2. **복수 답변 파싱**: answer 필드의 형식이 문제마다 다를 수 있음
   - "(1) ARP (2) RARP" vs "ㄱ. 도메인 ㄴ. 개체 ㄷ. 참조"
   - 두 패턴 모두 지원하는 파서 필요
3. **기존 진행도 호환**: 기존에 객관식으로 푼 기록과의 호환성 유지
   - `QuestionProgress.status`는 그대로 사용
