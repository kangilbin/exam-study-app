# Plan: service-bugfix (서비스 버그 수정 및 개선)

## 개요
- **기능명**: service-bugfix
- **유형**: 버그 수정 + 기능 개선
- **우선순위**: 높음
- **작성일**: 2026-04-01

## 이슈 목록

### BUG-1: 기출문제 정답이 모두 1번 [높음]

**현상**: `data/questions/exam-*.json` 파일들에서 `choices[0]`(1번)만 `isCorrect: true`로 설정됨
**원인**: 데이터 생성 단계에서 정답 셔플이 누락됨. 모든 기출 파일(exam-2020-1 ~ exam-2025-3)에서 동일한 문제 발생
**수정 방안**: 각 문제의 choices 배열을 랜덤 셔플하여 정답 위치를 분산시키는 스크립트 작성 및 실행
**영향 범위**: `data/questions/exam-*.json` (약 20개 파일)

### BUG-2: 문제 풀다 나가면 이어서 풀 수 없음 [높음]

**현상**: 퀴즈 진행 중 탭 전환/앱 종료 시 진행 상태 소실
**원인**: `store/useQuizStore.ts`에 `persist` 미들웨어 미적용. `app/quiz/[categoryId].tsx`의 useEffect에서 매번 `startQuiz()`로 초기화
**수정 방안**:
1. `useQuizStore`에 Zustand `persist` 미들웨어 추가 (AsyncStorage)
2. `[categoryId].tsx` 진입 시 저장된 진행 상태가 있으면 복원, 없으면 새로 시작
3. "이어서 풀기" / "처음부터" 선택 UI 추가
**영향 범위**: `store/useQuizStore.ts`, `app/quiz/[categoryId].tsx`

### BUG-3: 학습탭 전체 진행도에 기출문제 포함 [중간]

**현상**: 학습탭 상단 전체 진행도가 기출 카테고리(group: "exam") 문제까지 포함하여 계산
**원인**: `app/(tabs)/index.tsx`에서 `getTotalQuestionCount()`가 모든 문제를 반환. 학습 카테고리 필터링 없음
**수정 방안**:
1. `questionService.ts`에 `getTotalQuestionCountByGroup(excludeGroup)` 함수 추가 또는 기존 함수에 필터 파라미터 추가
2. `index.tsx`에서 `group !== 'exam'`인 카테고리 문제만 집계
3. `calculateOverallStats`에 해당 카테고리 문제 ID 목록 기준 필터링
**영향 범위**: `features/questions/services/questionService.ts`, `app/(tabs)/index.tsx`

### BUG-4: 내정보탭 학습 통계에 기출문제만 표시되어야 함 [중간]

**현상**: 내정보탭 통계가 학습+기출 모든 문제를 혼합하여 표시
**요구사항**: 내정보탭에서는 **기출문제에 대한 학습 통계만** 표시
**수정 방안**:
1. `progressService.ts`에 그룹별 통계 계산 함수 추가
2. `profile.tsx`에서 기출(exam) 카테고리 문제만 필터링하여 통계 표시
3. 기출 회차별 점수/정답률 표시 고려
**영향 범위**: `features/questions/services/progressService.ts`, `app/(tabs)/profile.tsx`

### BUG-5: 폰트 크기 변경 미반영 [낮음]

**현상**: 내정보에서 폰트 크기를 small/medium/large로 변경해도 코드 블록 등에 반영 안 됨
**원인**: `app/quiz/[categoryId].tsx`의 `codeText` 스타일에서 `fontSize: 13` 하드코딩
**수정 방안**:
1. `settings.fontSize` 값에 따라 동적 fontSize 적용
2. 매핑: small → 11, medium → 13, large → 16
3. StyleSheet.create() 대신 동적 스타일 객체 사용 (코드 블록 영역)
**영향 범위**: `app/quiz/[categoryId].tsx`

### BUG-6: 뒤로가기 버튼에 "< (tab)" 텍스트 표시 [낮음]

**현상**: 퀴즈 화면 등에서 헤더 뒤로가기 버튼 옆에 "(tab)" 텍스트가 표시됨
**원인**: expo-router Stack에서 headerBackTitle 미설정 시 이전 화면 라우트명이 자동 표시
**수정 방안**: `app/_layout.tsx`에서 `headerBackTitle: ' '` (빈 문자열) 설정
**영향 범위**: `app/_layout.tsx`

### FEAT-7: 틀린 문제 다시 풀기 메뉴 [낮음]

**현상**: 오답 문제를 다시 풀 수 있는 경로가 없음
**현재 상태**: `questionService.ts`에 `getIncorrectQuestions()` 함수는 이미 존재. UI 메뉴만 없음
**수정 방안**:
1. `profile.tsx` 메뉴 섹션에 "틀린 문제 다시 풀기" 항목 추가
2. 클릭 시 오답 문제만 필터링하여 퀴즈 화면으로 이동
3. `useQuizStore.startQuiz()`에 커스텀 문제 목록 전달 지원
**영향 범위**: `app/(tabs)/profile.tsx`, `store/useQuizStore.ts`, `app/quiz/[categoryId].tsx`

## 구현 순서 (우선순위)

```
1. BUG-1 (정답 데이터 수정) ← 앱 사용성에 가장 치명적
2. BUG-6 (뒤로가기 버튼) ← 간단 수정
3. BUG-5 (폰트 크기) ← 간단 수정
4. BUG-3 (학습탭 진행도) ← BUG-4와 연관
5. BUG-4 (내정보 통계) ← BUG-3과 함께 진행
6. BUG-2 (퀴즈 이어풀기) ← 스토어 변경 필요
7. FEAT-7 (오답 다시 풀기) ← 새 기능 추가
```

## 영향받는 파일 목록

| 파일 | 수정 이유 |
|------|----------|
| `data/questions/exam-*.json` (약 20개) | BUG-1: 정답 셔플 |
| `app/_layout.tsx` | BUG-6: headerBackTitle 설정 |
| `app/quiz/[categoryId].tsx` | BUG-2, BUG-5: persist 복원 + 동적 폰트 |
| `store/useQuizStore.ts` | BUG-2, FEAT-7: persist 추가 + 커스텀 문제 지원 |
| `features/questions/services/questionService.ts` | BUG-3: 그룹별 문제 수 함수 |
| `features/questions/services/progressService.ts` | BUG-4: 그룹별 통계 함수 |
| `app/(tabs)/index.tsx` | BUG-3: 학습 전용 진행도 |
| `app/(tabs)/profile.tsx` | BUG-4, FEAT-7: 기출 통계 + 오답 메뉴 |
