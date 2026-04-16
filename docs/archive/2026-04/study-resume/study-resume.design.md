# Design: study-resume (학습탭 이어서 학습 기능)

## 개요
- **기능명**: study-resume
- **Plan 참조**: `docs/01-plan/features/study-resume.plan.md`
- **작성일**: 2026-04-14

## 수정 대상 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `store/useFlashcardStore.ts` | 수정 | `goToPrevious()`, `lastSession` 영속화, `saveSession()` 추가 |
| `app/(tabs)/index.tsx` | 수정 | 카테고리 클릭 시 모달 로직 + UI 추가 |
| `app/quiz/[categoryId].tsx` | 수정 | 뒤로가기 동작 변경, 이전/다음 버튼 추가, 세션 저장 |
| `features/flashcards/types.ts` | 수정 | `LastSession` 타입 추가 |

> 신규 파일 없음. 기존 파일 확장으로 구현.

---

## 1. 타입 확장 (`features/flashcards/types.ts`)

### 추가 타입

```typescript
/** 마지막 학습 세션 정보 (영속화 대상) */
export interface LastSession {
  categoryId: CategoryId;
  cardIds: string[];      // 카드 순서 보존 (셔플 결과 유지)
  currentIndex: number;   // 마지막 학습 위치
  savedAt: string;        // ISO 8601 저장 시각
}
```

기존 타입 변경 없음. `LastSession`만 추가.

---

## 2. 스토어 확장 (`store/useFlashcardStore.ts`)

### 2-1. 상태 추가

```typescript
interface FlashcardState {
  // --- 기존 유지 ---
  categoryId: CategoryId | null;
  cards: FlashCard[];
  currentIndex: number;
  isFlipped: boolean;
  displayMode: CardDisplayMode;
  cardProgress: Record<string, CardProgress>;

  // --- 신규 ---
  lastSession: LastSession | null;  // 마지막 세션 (영속화)

  // --- 기존 액션 유지 ---
  startSession: (categoryId: CategoryId, cards: FlashCard[]) => void;
  flipCard: () => void;
  markKnown: () => void;
  markUnknown: () => void;
  toggleDisplayMode: () => void;
  resetSession: () => void;
  getSessionStats: () => { known: number; unknown: number; unseen: number; total: number };
  getCategoryProgress: (categoryId: CategoryId, totalCards: number) => { known: number; total: number; rate: number };

  // --- 신규 액션 ---
  goToPrevious: () => void;         // 이전 카드로 이동
  goToNext: () => void;             // 다음 카드로 이동 (암기 상태 변경 없음)
  resumeSession: () => boolean;     // lastSession 복원, 성공 여부 반환
  saveSession: () => void;          // 현재 세션을 lastSession에 저장
}
```

### 2-2. 신규 액션 상세

#### `goToPrevious()`
```typescript
goToPrevious: () => {
  const { currentIndex } = get();
  if (currentIndex <= 0) return;  // 첫 카드면 무시
  set({
    currentIndex: currentIndex - 1,
    isFlipped: false,              // 카드 앞면으로 리셋
  });
},
```

#### `goToNext()`
```typescript
goToNext: () => {
  const { currentIndex, cards } = get();
  if (currentIndex >= cards.length - 1) return;  // 마지막 카드면 무시
  set({
    currentIndex: currentIndex + 1,
    isFlipped: false,
  });
},
```

#### `saveSession()`
```typescript
saveSession: () => {
  const { categoryId, cards, currentIndex } = get();
  if (!categoryId || cards.length === 0) return;
  set({
    lastSession: {
      categoryId,
      cardIds: cards.map((c) => c.id),
      currentIndex,
      savedAt: nowISO(),
    },
  });
},
```

#### `resumeSession()`
```typescript
resumeSession: () => {
  const { lastSession } = get();
  if (!lastSession) return false;

  // lastSession의 cardIds로 카드 복원 (순서 유지)
  const allCards = loadFlashcards(lastSession.categoryId);
  const cardMap = new Map(allCards.map((c) => [c.id, c]));
  const restoredCards = lastSession.cardIds
    .map((id) => cardMap.get(id))
    .filter((c): c is FlashCard => c !== undefined);

  // 카드가 모두 삭제된 경우 등 예외 처리
  if (restoredCards.length === 0) return false;

  const safeIndex = Math.min(lastSession.currentIndex, restoredCards.length - 1);
  set({
    categoryId: lastSession.categoryId,
    cards: restoredCards,
    currentIndex: safeIndex,
    isFlipped: false,
  });
  return true;
},
```

### 2-3. 기존 액션 수정

#### `markKnown()` / `markUnknown()` — 자동 세션 저장 추가
```typescript
markKnown: () => {
  const { cards, currentIndex, cardProgress } = get();
  const card = cards[currentIndex];
  if (!card) return;

  const existing = cardProgress[card.id];
  const newIndex = currentIndex + 1;
  set({
    cardProgress: {
      ...cardProgress,
      [card.id]: {
        cardId: card.id,
        status: 'known',
        reviewCount: (existing?.reviewCount || 0) + 1,
        lastReviewAt: nowISO(),
      },
    },
    currentIndex: newIndex,
    isFlipped: false,
  });

  // 세션 자동 저장 (신규 추가)
  get().saveSession();
},
```

`markUnknown()`도 동일하게 마지막에 `get().saveSession()` 호출 추가.

#### `startSession()` — lastSession 갱신
```typescript
startSession: (categoryId, cards) => {
  set({
    categoryId,
    cards,
    currentIndex: 0,
    isFlipped: false,
    // lastSession은 건드리지 않음 — saveSession()이 진행 중 자동 갱신
  });
  // 새 세션 시작 시 바로 저장
  get().saveSession();
},
```

#### `resetSession()` — lastSession 초기화 하지 않음
```typescript
resetSession: () => {
  set({
    categoryId: null,
    cards: [],
    currentIndex: 0,
    isFlipped: false,
    // lastSession은 유지 — 나중에 "이어서 학습" 가능하도록
  });
},
```

### 2-4. 영속화 확장

```typescript
partialize: (state) => ({
  cardProgress: state.cardProgress,
  displayMode: state.displayMode,
  lastSession: state.lastSession,   // 신규 추가
}),
```

---

## 3. 학습탭 모달 (`app/(tabs)/index.tsx`)

### 3-1. 모달 정보 인터페이스

```typescript
/** 학습 모달에 표시할 정보 */
interface StudyResumeInfo {
  categoryId: CategoryId;
  categoryName: string;
  isCard: boolean;            // memorize 카테고리 여부

  // 암기 카테고리 (isCard=true)
  totalCards: number;
  knownCount: number;
  unknownCount: number;
  unseenCount: number;
  canResume: boolean;         // lastSession 존재 여부

  // 일반 카테고리 (isCard=false)
  totalQuestions: number;
  seenCount: number;
  correctCount: number;
  incorrectCount: number;
}
```

### 3-2. 카테고리 클릭 핸들러 수정

**기존:**
```typescript
const handleCategoryPress = (categoryId: string) => {
  if (isMemorizeCategory(categoryId)) {
    router.push(`/quiz/flashcard?categoryId=${categoryId}`);
  } else {
    router.push(`/quiz/${categoryId}`);
  }
};
```

**변경 후:**
```typescript
const [modalInfo, setModalInfo] = useState<StudyResumeInfo | null>(null);

const handleCategoryPress = (categoryId: CategoryId) => {
  const isCard = isMemorizeCategory(categoryId);
  const category = categories.find((c) => c.id === categoryId);

  if (isCard) {
    // 암기 카테고리: cardProgress에서 학습 기록 확인
    const flashcardTotal = getFlashcardCount(categoryId);
    const { known } = getCategoryProgress(categoryId, flashcardTotal);
    const lastSession = useFlashcardStore.getState().lastSession;
    const canResume = lastSession?.categoryId === categoryId;

    // 학습 기록 없고 세션 없으면 바로 진입
    if (known === 0 && !canResume) {
      router.push(`/quiz/${categoryId}`);
      return;
    }

    // 카드별 상태 계산
    const allCards = loadFlashcards(categoryId);
    let knownCount = 0, unknownCount = 0, unseenCount = 0;
    for (const card of allCards) {
      const p = cardProgress[card.id];
      if (!p || p.status === 'unseen') unseenCount++;
      else if (p.status === 'known') knownCount++;
      else unknownCount++;
    }

    setModalInfo({
      categoryId,
      categoryName: category?.name || '',
      isCard: true,
      totalCards: flashcardTotal,
      knownCount,
      unknownCount,
      unseenCount,
      canResume,
      totalQuestions: 0,
      seenCount: 0,
      correctCount: 0,
      incorrectCount: 0,
    });
  } else {
    // 일반 카테고리: userStore progress에서 학습 기록 확인
    const stats = useUserStore.getState().getCategoryStats(categoryId);

    // 학습 기록 없으면 바로 진입
    if (stats.seenCount === 0) {
      router.push(`/quiz/${categoryId}?mode=unseen`);
      return;
    }

    setModalInfo({
      categoryId,
      categoryName: category?.name || '',
      isCard: false,
      totalCards: 0,
      knownCount: 0,
      unknownCount: 0,
      unseenCount: 0,
      canResume: false,
      totalQuestions: stats.totalQuestions,
      seenCount: stats.seenCount,
      correctCount: stats.correctCount,
      incorrectCount: stats.incorrectCount,
    });
  }
};
```

### 3-3. 모달에서 선택 후 네비게이션

```typescript
const navigateFromModal = (mode: string) => {
  if (!modalInfo) return;
  const catId = modalInfo.categoryId;
  setModalInfo(null);

  if (modalInfo.isCard) {
    // 암기 카테고리 네비게이션
    switch (mode) {
      case 'resume':
        // 이어서 학습 — resumeSession은 [categoryId].tsx에서 처리
        router.push(`/quiz/${catId}?mode=resume`);
        break;
      case 'all':
        // 처음부터 — lastSession 초기화 후 진입
        router.push(`/quiz/${catId}`);
        break;
      case 'unknown':
        // 모르는 카드만
        router.push(`/quiz/${catId}?mode=unknown`);
        break;
    }
  } else {
    // 일반 카테고리 네비게이션
    if (mode === 'all') {
      useUserStore.getState().resetCategoryProgress(catId);
    }
    router.push(`/quiz/${catId}?mode=${mode}`);
  }
};
```

### 3-4. 모달 UI 구조

기출문제탭(`exam.tsx`)의 바텀시트 모달 패턴을 재활용한다.
스타일은 `exam.tsx`의 `modalOverlay`, `modalContent` 등을 동일하게 사용.

```
┌──────────────────────────────────┐
│  [아이콘] 카테고리명              │  ← modalHeader
│                                  │
│  ┌─────┬─────┬─────┐            │  ← modalStats (암기 카테고리)
│  │ 120 │  85 │  20 │            │
│  │전체 │알아요│모르겠│            │
│  └─────┴─────┴─────┘            │
│                                  │
│  [▶ 이어서 학습 (35장 남음)]     │  ← primary 버튼 (canResume일 때)
│  [✕ 모르는 카드만 (20장)]        │  ← outline 버튼 (unknownCount > 0)
│  [↻ 처음부터]                    │  ← outline 버튼
│                                  │
│            취소                   │
└──────────────────────────────────┘
```

일반 카테고리의 경우:
```
┌──────────────────────────────────┐
│  [아이콘] 카테고리명              │
│                                  │
│  ┌─────┬─────┬─────┐            │
│  │ 30  │  22 │   8 │            │
│  │전체 │학습완│미학습│            │
│  └─────┴─────┴─────┘            │
│                                  │
│  [▶ 이어서 학습 (8문제 남음)]    │  ← unseen > 0일 때
│  [✕ 틀린 문제만 (5문제)]         │  ← incorrectCount > 0일 때
│  [↻ 처음부터]                    │
│                                  │
│            취소                   │
└──────────────────────────────────┘
```

---

## 4. 카드 학습 화면 수정 (`app/quiz/[categoryId].tsx`)

### 4-1. 세션 초기화 변경 (카드 모드)

**기존 useEffect:**
```typescript
useEffect(() => {
  if (!isCardMode || !categoryId) return;
  let cards = loadFlashcards(categoryId as CategoryId);
  if (mode === 'unknown') {
    cards = cards.filter((c) => { ... });
  }
  if (cards.length === 0) cards = loadFlashcards(categoryId as CategoryId);
  fcStartSession(categoryId as CategoryId, cards);
}, [categoryId, isCardMode]);
```

**변경 후:**
```typescript
useEffect(() => {
  if (!isCardMode || !categoryId) return;

  // mode=resume → lastSession 복원 시도
  if (mode === 'resume') {
    const success = fcResumeSession();
    if (success) return;  // 복원 성공 시 완료
    // 실패 시 아래로 fallthrough → 전체 카드로 시작
  }

  let cards = loadFlashcards(categoryId as CategoryId);
  if (mode === 'unknown') {
    cards = cards.filter((c) => {
      const p = fcCardProgress[c.id];
      return p && p.status === 'unknown';
    });
  }
  if (cards.length === 0) cards = loadFlashcards(categoryId as CategoryId);
  fcStartSession(categoryId as CategoryId, cards);
}, [categoryId, isCardMode]);
```

### 4-2. 이전/다음 네비게이션 버튼 추가

기존 하단 "모르겠어요 / 알아요" 버튼 영역 위에 이전/다음 네비게이션을 추가.

```typescript
const fcGoToPrevious = useFlashcardStore((s) => s.goToPrevious);
const fcGoToNext = useFlashcardStore((s) => s.goToNext);

// --- 렌더링 ---
{/* 이전/다음 네비게이션 */}
{!fcIsComplete && fcCards.length > 0 && (
  <View style={styles.fcNavRow}>
    <Pressable
      style={[styles.fcNavBtn, fcCurrentIndex === 0 && styles.fcNavBtnDisabled]}
      onPress={fcGoToPrevious}
      disabled={fcCurrentIndex === 0}
    >
      <MaterialCommunityIcons
        name="chevron-left"
        size={20}
        color={fcCurrentIndex === 0 ? COLORS.gray[300] : COLORS.text}
      />
      <Text style={[
        styles.fcNavText,
        fcCurrentIndex === 0 && styles.fcNavTextDisabled
      ]}>이전</Text>
    </Pressable>

    <Text style={styles.fcNavCounter}>
      {fcCurrentIndex + 1} / {fcCards.length}
    </Text>

    <Pressable
      style={[styles.fcNavBtn, fcCurrentIndex >= fcCards.length - 1 && styles.fcNavBtnDisabled]}
      onPress={fcGoToNext}
      disabled={fcCurrentIndex >= fcCards.length - 1}
    >
      <Text style={[
        styles.fcNavText,
        fcCurrentIndex >= fcCards.length - 1 && styles.fcNavTextDisabled
      ]}>다음</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={fcCurrentIndex >= fcCards.length - 1 ? COLORS.gray[300] : COLORS.text}
      />
    </Pressable>
  </View>
)}
```

**UI 레이아웃:**
```
┌─────────────────────────────────────┐
│  ← 카테고리명     3/120   용어→설명 │  ← fcHeader
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← fcProgressBg
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │        [카드 앞/뒷면]         │    │  ← FlashCardDeck
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  < 이전        3 / 120       다음 > │  ← fcNavRow (신규)
│                                     │
│  [✕ 모르겠어요]    [✓ 알아요]       │  ← fcActionRow (기존)
│                                     │
│  [광고 배너]                        │
└─────────────────────────────────────┘
```

### 4-3. 뒤로가기 동작 변경

**기존 handleGoBack:**
```typescript
const handleGoBack = () => {
  fcResetSession();
  router.back();
};
```

**변경 후:**
```typescript
const [showExitModal, setShowExitModal] = useState(false);

const handleGoBack = () => {
  if (fcCurrentIndex > 0) {
    // 첫 카드가 아니면 → 이전 카드로 이동
    fcGoToPrevious();
  } else {
    // 첫 카드면 → 종료 확인 모달
    setShowExitModal(true);
  }
};

const handleConfirmExit = () => {
  setShowExitModal(false);
  fcSaveSession();    // 세션 저장
  fcResetSession();   // 세션 정리
  router.back();
};

const handleCancelExit = () => {
  setShowExitModal(false);
};
```

### 4-4. 종료 확인 모달

```typescript
{/* 종료 확인 모달 */}
<Modal visible={showExitModal} transparent animationType="fade">
  <Pressable style={styles.fcModalOverlay} onPress={handleCancelExit}>
    <Pressable style={styles.exitModalContent} onPress={() => {}}>
      <MaterialCommunityIcons name="bookmark-check" size={40} color={COLORS.primary} />
      <Text style={styles.exitModalTitle}>학습을 종료하시겠습니까?</Text>
      <Text style={styles.exitModalDesc}>진행 상태는 저장됩니다.</Text>
      <Pressable
        style={[styles.fcModalBtn, { backgroundColor: COLORS.primary }]}
        onPress={handleConfirmExit}
      >
        <Text style={styles.fcModalBtnText}>나가기</Text>
      </Pressable>
      <Pressable
        style={[styles.fcModalBtn, styles.fcModalBtnOutline]}
        onPress={handleCancelExit}
      >
        <Text style={[styles.fcModalBtnText, { color: COLORS.text }]}>계속 학습</Text>
      </Pressable>
    </Pressable>
  </Pressable>
</Modal>
```

### 4-5. 완료 모달 "목록으로 돌아가기" 수정

**기존:**
```typescript
const handleGoBack = () => {
  fcResetSession();
  router.back();
};
```

완료 모달의 "목록으로 돌아가기" 버튼은 세션 저장 없이(학습 완료했으므로) `lastSession`을 null로 정리.

```typescript
const handleExitAfterComplete = () => {
  // 학습 완료 → lastSession 클리어 (이어서 학습할 필요 없음)
  set({ lastSession: null });
  fcResetSession();
  router.back();
};
```

---

## 5. 스타일 추가

### `app/quiz/[categoryId].tsx` 신규 스타일

```typescript
// 이전/다음 네비게이션
fcNavRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 8,
},
fcNavBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 8,
  gap: 4,
},
fcNavBtnDisabled: {
  opacity: 0.4,
},
fcNavText: {
  fontSize: 14,
  fontWeight: '600',
  color: COLORS.text,
},
fcNavTextDisabled: {
  color: COLORS.gray[300],
},
fcNavCounter: {
  fontSize: 13,
  color: COLORS.textSecondary,
  fontWeight: '500',
},

// 종료 확인 모달
exitModalContent: {
  backgroundColor: '#fff',
  borderRadius: 20,
  padding: 28,
  alignItems: 'center',
  marginHorizontal: 40,
  gap: 12,
},
exitModalTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: COLORS.text,
},
exitModalDesc: {
  fontSize: 14,
  color: COLORS.textSecondary,
  marginBottom: 8,
},
```

### `app/(tabs)/index.tsx` 모달 스타일

`exam.tsx`의 모달 스타일(`modalOverlay`, `modalContent`, `modalHeader`, `modalStats`, `modalStatItem`, `modalStatValue`, `modalStatLabel`, `modalStatDivider`, `modalButtons`, `modalButton`, `modalButtonPrimary`, `modalButtonPrimaryText`, `modalButtonOutline`, `modalButtonOutlineText`, `modalClose`, `modalCloseText`)을 그대로 복사하여 사용.

> 공통 컴포넌트 추출은 이번 스코프 외. 향후 리팩토링 대상.

---

## 6. 데이터 흐름도

### 이어서 학습 플로우 (암기 카테고리)

```
[학습탭] 카테고리 클릭
    │
    ├── 학습 기록 없음 (known=0, canResume=false)
    │     └── router.push(`/quiz/${catId}`)
    │           └── [categoryId].tsx → fcStartSession() → 처음부터
    │
    └── 학습 기록 있음 → 모달 표시
          │
          ├── "이어서 학습"
          │     └── router.push(`/quiz/${catId}?mode=resume`)
          │           └── [categoryId].tsx → fcResumeSession()
          │                 ├── 성공 → lastSession.currentIndex부터 시작
          │                 └── 실패 → fcStartSession() fallback
          │
          ├── "처음부터"
          │     └── router.push(`/quiz/${catId}`)
          │           └── [categoryId].tsx → fcStartSession() → 처음부터
          │
          └── "모르는 카드만"
                └── router.push(`/quiz/${catId}?mode=unknown`)
                      └── [categoryId].tsx → unknown 필터 후 fcStartSession()
```

### 카드 학습 중 네비게이션 플로우

```
[카드 학습 화면]
    │
    ├── 좌 스와이프 → onUnknown → markUnknown() → index++ → saveSession()
    ├── 우 스와이프 → onKnown  → markKnown()  → index++ → saveSession()
    │
    ├── "이전" 버튼 → goToPrevious() → index-- (상태 변경 없음)
    ├── "다음" 버튼 → goToNext()     → index++ (상태 변경 없음)
    │
    ├── 뒤로가기 (index > 0) → goToPrevious()
    ├── 뒤로가기 (index === 0) → 종료 확인 모달
    │     ├── "나가기"    → saveSession() → resetSession() → router.back()
    │     └── "계속 학습" → 모달 닫기
    │
    └── 학습 완료 (index >= cards.length) → 완료 모달
          ├── "모르겠어요 다시" → unknown 필터 후 재시작
          ├── "전체 다시"      → 셔플 후 재시작
          └── "목록으로"       → lastSession=null → resetSession() → router.back()
```

---

## 7. 구현 순서 (Do 가이드)

### Step 1: 타입 추가
- `features/flashcards/types.ts`에 `LastSession` 인터페이스 추가

### Step 2: 스토어 확장
- `store/useFlashcardStore.ts`:
  - `lastSession` 상태 추가
  - `goToPrevious()`, `goToNext()`, `saveSession()`, `resumeSession()` 액션 추가
  - `markKnown()`, `markUnknown()` 에 `saveSession()` 호출 추가
  - `startSession()` 에 `saveSession()` 호출 추가
  - `partialize`에 `lastSession` 추가

### Step 3: 카드 학습 화면 수정
- `app/quiz/[categoryId].tsx`:
  - `mode=resume` 처리 로직 추가
  - 이전/다음 네비게이션 버튼 UI 추가
  - `handleGoBack` 로직 변경 (이전 카드 or 종료 모달)
  - 종료 확인 모달 추가
  - 완료 모달의 "목록으로 돌아가기" 에서 `lastSession` 클리어

### Step 4: 학습탭 모달
- `app/(tabs)/index.tsx`:
  - `StudyResumeInfo` 인터페이스 및 `modalInfo` 상태 추가
  - `handleCategoryPress` 로직 변경
  - 바텀시트 모달 UI 추가 (암기/일반 카테고리 분기)
  - `navigateFromModal` 핸들러 구현

---

## 8. 엣지 케이스

| 케이스 | 처리 방법 |
|--------|----------|
| lastSession의 카드가 데이터 업데이트로 삭제됨 | `resumeSession()`에서 cardIds 필터링, 빈 배열이면 false 반환 |
| lastSession이 다른 카테고리의 세션임 | `canResume` 판별 시 `lastSession.categoryId === categoryId` 체크 |
| 모든 카드가 known인데 "이어서 학습" 클릭 | currentIndex가 cards.length 이상 → 완료 모달 즉시 표시 |
| 앱 강제 종료 중 세션 미저장 | `markKnown`/`markUnknown`마다 저장하므로 최대 1장 손실 |
| 뒤로가기 연타 | goToPrevious에서 index <= 0 가드, 종료 모달에서 중복 호출 방지 |
