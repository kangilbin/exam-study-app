# Design: service-bugfix (서비스 버그 수정 및 개선)

## 개요
- **Plan 참조**: `docs/01-plan/features/service-bugfix.plan.md`
- **작성일**: 2026-04-01
- **영향 파일**: 10개 소스 파일 + 약 20개 데이터 파일

---

## BUG-1: 기출문제 정답 셔플

### 현재 상태
```json
// exam-*.json - 모든 문제에서 choices[0]만 isCorrect: true
"choices": [
  { "label": "1", "text": "정답", "isCorrect": true },
  { "label": "2", "text": "오답A", "isCorrect": false },
  { "label": "3", "text": "오답B", "isCorrect": false },
  { "label": "4", "text": "오답C", "isCorrect": false }
]
```

### 수정 설계
Node.js 스크립트(`scripts/shuffle-exam-choices.js`)를 작성하여 일괄 처리:

```
1. data/questions/exam-*.json 파일 목록 순회
2. 각 파일의 모든 문제에 대해:
   a. choices 배열이 있는 경우만 처리
   b. choices 배열을 Fisher-Yates 셔플
   c. label을 "1","2","3","4"로 재할당 (순서에 맞게)
3. 원본 파일을 셔플된 데이터로 덮어쓰기 (pretty print 2 space)
```

**핵심 규칙**: `isCorrect` 값은 choices 객체에 포함되어 이동하므로 별도 처리 불필요. label만 위치에 맞게 재할당.

### 영향 범위
- `data/questions/exam-*.json` (약 20개 파일)
- 기존 로직(`choices[selectedChoiceIndex]?.isCorrect`)은 인덱스 기반이므로 수정 불필요

---

## BUG-2: 퀴즈 이어풀기

### 현재 상태
- `useQuizStore`: `create()` 사용 (메모리만)
- `[categoryId].tsx`: useEffect에서 매번 `startQuiz()` 호출

### 수정 설계

#### store/useQuizStore.ts 변경

```typescript
// 변경 1: persist 미들웨어 추가
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      // 기존 상태 + 액션 유지
      // ...

      // 변경 2: resumeQuiz 액션 추가
      resumeQuiz: (categoryId: CategoryId) => {
        const state = get();
        // 저장된 상태가 해당 카테고리인지 확인
        return state.categoryId === categoryId && state.questions.length > 0;
      },
    }),
    {
      name: '@quiz-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        categoryId: state.categoryId,
        questions: state.questions,
        currentIndex: state.currentIndex,
        results: state.results,
        startedAt: state.startedAt,
        // selectedChoiceIndex, isAnswered, isExplanationRevealed은 제외
        // (현재 문제의 일시적 상태는 초기화)
      }),
    }
  )
);
```

#### app/quiz/[categoryId].tsx 변경

```typescript
// 변경: useEffect 로직 수정
useEffect(() => {
  if (!categoryId) return;
  const canResume = useQuizStore.getState().resumeQuiz(categoryId as CategoryId);

  if (canResume) {
    // 저장된 상태가 있으면 현재 문제의 UI 상태만 초기화
    set({
      selectedChoiceIndex: null,
      isAnswered: false,
      isExplanationRevealed: false,
    });
  } else {
    // 새로 시작
    let qs = loadQuestionsByCategory(categoryId as CategoryId);
    if (shuffleMode) qs = shuffleQuestions(qs);
    startQuiz(categoryId as CategoryId, qs);
  }
}, [categoryId]);
```

### persist 저장 전략
- **저장 시점**: Zustand persist의 기본 동작 (상태 변경마다 자동)
- **복원 시점**: 앱 재진입 시 hydration
- **제외 필드**: `selectedChoiceIndex`, `isAnswered`, `isExplanationRevealed` (일시적 UI 상태)
- **초기화 시점**: 퀴즈 완료(결과 화면 이동) 시 `resetQuiz()` 호출

---

## BUG-3: 학습탭 진행도 필터링

### 현재 상태
```typescript
// index.tsx:30 - 모든 문제 수 반환
const totalQuestions = getTotalQuestionCount();
```

### 수정 설계

#### questionService.ts에 함수 추가

```typescript
/** 특정 그룹 제외한 문제 수 */
export function getQuestionCountExcludingGroup(excludeGroup: string): number {
  const categories: Category[] = require('@/data/categories.json');
  const excludedIds = categories
    .filter((c) => c.group === excludeGroup)
    .map((c) => c.id);

  return Object.entries(questionFiles)
    .filter(([id]) => !excludedIds.includes(id as CategoryId))
    .reduce((sum, [, questions]) => sum + questions.length, 0);
}

/** 특정 그룹 제외한 문제 ID 목록 */
export function getQuestionIdsExcludingGroup(excludeGroup: string): string[] {
  const categories: Category[] = require('@/data/categories.json');
  const excludedIds = categories
    .filter((c) => c.group === excludeGroup)
    .map((c) => c.id);

  const ids: string[] = [];
  for (const [catId, questions] of Object.entries(questionFiles)) {
    if (!excludedIds.includes(catId as CategoryId)) {
      ids.push(...questions.map((q) => q.id));
    }
  }
  return ids;
}
```

#### index.tsx 수정

```typescript
// 변경: 기출 제외한 문제만 집계
const totalQuestions = getQuestionCountExcludingGroup('exam');

// 변경: 학습 카테고리 문제만 대상으로 통계 계산
const studyQuestionIds = getQuestionIdsExcludingGroup('exam');
const overallStats = useMemo(
  () => calculateOverallStatsFiltered(progress, studyQuestionIds),
  [progress, studyQuestionIds]
);
```

#### progressService.ts에 필터 통계 함수 추가

```typescript
/** 특정 문제 ID 목록 기준 통계 계산 */
export function calculateOverallStatsFiltered(
  progress: Record<string, QuestionProgress>,
  questionIds: string[]
): { totalSeen: number; totalCorrect: number; accuracy: number } {
  let totalSeen = 0;
  let totalCorrect = 0;

  for (const qId of questionIds) {
    const p = progress[qId];
    if (!p) continue;
    if (p.status !== 'unseen') totalSeen++;
    if (p.status === 'correct' || p.status === 'known') totalCorrect++;
  }

  return {
    totalSeen,
    totalCorrect,
    accuracy: totalSeen > 0 ? totalCorrect / totalSeen : 0,
  };
}
```

---

## BUG-4: 내정보탭 기출 통계만 표시

### 수정 설계

#### profile.tsx 수정

```typescript
// 변경: 기출 문제만 대상으로 통계 계산
import { getQuestionIdsByGroup } from '@/features/questions/services/questionService';

const examQuestionIds = getQuestionIdsByGroup('exam');
const overallStats = useMemo(
  () => calculateOverallStatsFiltered(progress, examQuestionIds),
  [progress, examQuestionIds]
);
const totalQuestions = examQuestionIds.length;
```

#### questionService.ts에 함수 추가

```typescript
/** 특정 그룹의 문제 ID 목록 */
export function getQuestionIdsByGroup(group: string): string[] {
  const categories: Category[] = require('@/data/categories.json');
  const groupIds = categories
    .filter((c) => c.group === group)
    .map((c) => c.id);

  const ids: string[] = [];
  for (const [catId, questions] of Object.entries(questionFiles)) {
    if (groupIds.includes(catId as CategoryId)) {
      ids.push(...questions.map((q) => q.id));
    }
  }
  return ids;
}
```

---

## BUG-5: 폰트 크기 반영

### 현재 상태
```typescript
// [categoryId].tsx - 하드코딩
codeText: { fontFamily: 'monospace', fontSize: 13, ... }
```

### 수정 설계

#### app/quiz/[categoryId].tsx 수정

```typescript
// 폰트 크기 매핑 상수 (파일 상단)
const FONT_SIZE_MAP = { small: 11, medium: 13, large: 16 } as const;

// 컴포넌트 내부에서 설정값 구독
const fontSize = useUserStore((s) => s.settings.fontSize);
const codeFontSize = FONT_SIZE_MAP[fontSize];

// 스타일 적용 (인라인 override)
<Text style={[styles.codeText, { fontSize: codeFontSize }]}>
  {question.codeSnippet}
</Text>
```

**변경 최소화**: StyleSheet의 기본값은 유지하고, fontSize만 인라인으로 override.

---

## BUG-6: 뒤로가기 버튼 텍스트

### 현재 상태
```typescript
// _layout.tsx - headerBackTitle 미설정
<Stack screenOptions={{ ... }}>
```

### 수정 설계

#### app/_layout.tsx 수정

```typescript
<Stack
  screenOptions={{
    headerStyle: { backgroundColor: '#6366f1' },
    headerTintColor: '#ffffff',
    headerTitleStyle: { fontWeight: 'bold' },
    headerBackTitle: '',  // 추가: 뒤로가기 텍스트 제거
  }}
>
```

---

## FEAT-7: 틀린 문제 다시 풀기

### 수정 설계

#### profile.tsx에 메뉴 추가

```typescript
// 북마크 메뉴 아래에 추가
<Pressable
  style={styles.menuItem}
  onPress={() => {
    const incorrectQuestions = getIncorrectQuestions(progress);
    if (incorrectQuestions.length === 0) {
      // 틀린 문제가 없으면 알림
      Alert.alert('알림', '틀린 문제가 없습니다.');
      return;
    }
    router.push('/quiz/incorrect');
  }}
>
  <MaterialCommunityIcons name="close-circle-outline" size={24} color={COLORS.danger} />
  <Text style={styles.menuText}>틀린 문제 다시 풀기</Text>
  <Text style={styles.menuBadge}>{incorrectCount}</Text>
  <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.gray[400]} />
</Pressable>
```

#### app/quiz/[categoryId].tsx 수정

`categoryId`가 `'incorrect'`인 경우 특별 처리:

```typescript
useEffect(() => {
  if (!categoryId) return;

  if (categoryId === 'incorrect') {
    // 오답 문제 로드
    const progress = useUserStore.getState().progress;
    const incorrectQs = getIncorrectQuestions(progress);
    if (shuffleMode) incorrectQs = shuffleQuestions(incorrectQs);
    startQuiz('incorrect' as CategoryId, incorrectQs);
    return;
  }

  // 기존 로직 (이어풀기 포함)
  // ...
}, [categoryId]);
```

#### _layout.tsx에 라우트 타이틀 설정

```typescript
// 'incorrect' 카테고리일 때는 타이틀을 동적 설정하거나
// quiz/[categoryId] 내부에서 navigation.setOptions 사용
```

### 오답 수 계산

```typescript
// profile.tsx 내부
const incorrectCount = useMemo(() => {
  return Object.values(progress).filter((p) => p.status === 'incorrect').length;
}, [progress]);
```

---

## 구현 순서

| 순서 | 이슈 | 수정 파일 | 예상 복잡도 |
|:----:|------|----------|:----------:|
| 1 | BUG-1 | `scripts/shuffle-exam-choices.js` + exam-*.json | 중 |
| 2 | BUG-6 | `app/_layout.tsx` | 낮음 |
| 3 | BUG-5 | `app/quiz/[categoryId].tsx` | 낮음 |
| 4 | BUG-3 | `questionService.ts`, `progressService.ts`, `index.tsx` | 중 |
| 5 | BUG-4 | `questionService.ts`, `progressService.ts`, `profile.tsx` | 중 |
| 6 | BUG-2 | `useQuizStore.ts`, `[categoryId].tsx` | 중 |
| 7 | FEAT-7 | `profile.tsx`, `[categoryId].tsx` | 중 |

## 파일 변경 요약

| 파일 | BUG-1 | BUG-2 | BUG-3 | BUG-4 | BUG-5 | BUG-6 | FEAT-7 |
|------|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|:------:|
| `scripts/shuffle-exam-choices.js` | NEW | | | | | | |
| `data/questions/exam-*.json` | MOD | | | | | | |
| `app/_layout.tsx` | | | | | | MOD | |
| `app/quiz/[categoryId].tsx` | | MOD | | | MOD | | MOD |
| `store/useQuizStore.ts` | | MOD | | | | | |
| `features/questions/services/questionService.ts` | | | MOD | MOD | | | |
| `features/questions/services/progressService.ts` | | | MOD | MOD | | | |
| `app/(tabs)/index.tsx` | | | MOD | | | | |
| `app/(tabs)/profile.tsx` | | | | MOD | | | MOD |
