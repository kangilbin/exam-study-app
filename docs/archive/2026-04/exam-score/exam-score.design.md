# Design: 기출문제 점수 및 합격 표시

> Plan: [exam-score.plan.md](../../01-plan/features/exam-score.plan.md)

## 변경 파일

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `app/(tabs)/exam.tsx` | 수정 | 모달에 점수 결과 UI 추가, ResumeInfo에 점수 필드 추가 |

## 상세 설계

### 1. ResumeInfo 인터페이스 확장

`exam.tsx` 내부의 `ResumeInfo`에 점수 관련 필드를 추가한다.

```typescript
interface ResumeInfo {
  // 기존 필드
  categoryId: CategoryId;
  categoryName: string;
  totalCount: number;
  seenCount: number;
  unseenCount: number;
  canResume: boolean;
  resumeIndex: number;
  resumeTotal: number;
  // 추가 필드 (FR-01, FR-02)
  correctCount: number;    // 정답 수
  incorrectCount: number;  // 오답 수
  score: number;           // 점수 (0~100)
  isPassed: boolean;       // 합격 여부 (score >= 60)
  isCompleted: boolean;    // 100% 완료 여부 (unseenCount === 0)
}
```

### 2. handleExamPress 수정

모달 정보 생성 시 `getCategoryStats()`를 호출하여 점수 데이터를 계산한다.

```typescript
const handleExamPress = (item: Category) => {
  // ... 기존 로직 ...
  const stats = useUserStore.getState().getCategoryStats(item.id);
  const score = allQs.length > 0
    ? Math.round((stats.correctCount / allQs.length) * 100)
    : 0;

  setModalInfo({
    // ... 기존 필드 ...
    correctCount: stats.correctCount,
    incorrectCount: stats.incorrectCount,
    score,
    isPassed: score >= 60,
    isCompleted: unseenQs.length === 0,
  });
};
```

### 3. 모달 UI 분기 (FR-03)

`isCompleted` 여부에 따라 모달 통계 영역을 분기 렌더링한다.

#### 3-1. 완료 시: 점수 결과 카드

`unseenCount === 0` (100% 완료)일 때 기존 통계 영역 대신 점수 결과를 표시한다.

```
┌──────────────────────────────┐
│          85점                 │  ← 큰 폰트, 중앙 정렬
│        합격                   │  ← 합격: 초록 배지 / 불합격: 빨간 배지
│                               │
│   정답 17개     오답 3개       │  ← 정답(초록), 오답(빨간) 컬러
└──────────────────────────────┘
```

**스타일 규칙:**
- 점수: `fontSize: 36, fontWeight: '800'`
- 합격 배지: `backgroundColor: COLORS.successLight, color: COLORS.success`
- 불합격 배지: `backgroundColor: COLORS.dangerLight, color: COLORS.danger`
- 정답/오답 행: 기존 `modalStatItem` 스타일 재활용

#### 3-2. 미완료 시: 기존 통계 유지

`unseenCount > 0`이면 기존 "전체 | 학습완료 | 미학습" 표시를 그대로 유지한다.

### 4. 버튼 영역 (FR-04: 틀린 문제만 다시 풀기 추가)

버튼 로직:
- `unseenCount > 0` → "이어서 풀기" + "전체 다시 풀기"
- `unseenCount === 0 && incorrectCount > 0` → "틀린 문제만 다시 풀기" (primary) + "전체 다시 풀기" (outline)
- `unseenCount === 0 && incorrectCount === 0` → "전체 다시 풀기"만 표시

#### 4-1. 틀린 문제 필터링 (quiz 화면)

`mode=incorrect`로 진입 시 해당 카테고리에서 `status === 'incorrect'`인 문제만 필터링한다.

```typescript
// app/quiz/[categoryId].tsx 에 mode=incorrect 분기 추가
if (mode === 'incorrect') {
  const userProgress = useUserStore.getState().progress;
  const incorrectQs = allQs.filter((q) => {
    const p = userProgress[q.id];
    return p?.status === 'incorrect';
  });
  let qs = incorrectQs.length > 0 ? incorrectQs : allQs;
  if (shuffleMode) qs = shuffleQuestions(qs);
  startQuiz(categoryId as CategoryId, qs);
  return;
}
```

### 5. 추가 스타일

```typescript
// 점수 결과 스타일 (modalStats 영역 내부)
scoreValue: {
  fontSize: 36,
  fontWeight: '800',
  color: COLORS.text,
  textAlign: 'center',
},
scoreSuffix: {
  fontSize: 20,
  fontWeight: '600',
  color: COLORS.textSecondary,
},
passBadge: {
  paddingHorizontal: 16,
  paddingVertical: 4,
  borderRadius: 20,
  marginTop: 8,
},
passBadgeText: {
  fontSize: 14,
  fontWeight: '700',
},
scoreDetailRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 24,
  marginTop: 12,
},
scoreDetailItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
},
scoreDetailText: {
  fontSize: 14,
  fontWeight: '600',
},
```

## 구현 순서

1. `ResumeInfo` 인터페이스에 점수 필드 추가
2. `handleExamPress`에서 점수 계산 로직 추가
3. 모달 통계 영역에 `isCompleted` 분기 렌더링 추가
4. 새 스타일 정의 추가

## 데이터 흐름

```
handleExamPress(item)
  ├─ loadQuestionsByCategory(item.id) → allQs
  ├─ useUserStore.getCategoryStats(item.id) → stats
  ├─ score = Math.round((stats.correctCount / allQs.length) * 100)
  └─ setModalInfo({ ..., score, isPassed, isCompleted })

Modal 렌더링
  └─ modalInfo.isCompleted?
       ├─ true  → 점수 카드 (점수, 합격 배지, 정답/오답 수)
       └─ false → 기존 통계 (전체, 학습완료, 미학습)
```
