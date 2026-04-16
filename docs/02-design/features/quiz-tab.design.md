# Design: quiz-tab (퀴즈탭 카드형 암기 모드 전환)

## 개요
- **기능명**: quiz-tab
- **Plan 참조**: `docs/01-plan/features/quiz-tab.plan.md`
- **작성일**: 2026-04-13

---

## 1. 데이터 설계

### 1.1 FlashCard 타입 정의

**파일**: `features/flashcards/types.ts`

```typescript
/** 플래시카드 엔티티 */
export interface FlashCard {
  id: string;                          // "card-{categoryId}_{number}" (예: "card-memorize-db_001")
  categoryId: CategoryId;              // memorize-se, memorize-db 등
  subcategory: string;                 // 소분류
  term: string;                        // 용어 (카드 앞면)
  definition: string;                  // 설명 (카드 뒷면)
  mnemonic?: string;                   // 암기법 (예: "도부이결다조")
  relatedTerms?: string[];             // 관련 용어 ID
  source: 'memorize' | 'theory';       // 원본 출처
  sourceQuestionId: string;            // 원본 문제 ID
  tags: string[];
}

/** 카드 암기 상태 */
export type CardStatus = 'unseen' | 'known' | 'unknown';

/** 카드별 진행도 */
export interface CardProgress {
  cardId: string;
  status: CardStatus;
  reviewCount: number;                 // 복습 횟수
  lastReviewAt: string;                // ISO 8601
}

/** 카드 표시 모드 */
export type CardDisplayMode = 'term-first' | 'definition-first';
```

### 1.2 FlashCard JSON 스키마

**파일 위치**: `data/flashcards/flashcards-{subject}.json`

```json
[
  {
    "id": "card-memorize-db_001",
    "categoryId": "memorize-db",
    "subcategory": "트랜잭션",
    "term": "원자성 (Atomicity)",
    "definition": "트랜잭션의 연산이 모두 실행되거나 모두 취소되는 성질 (All or Nothing)",
    "mnemonic": "ACID",
    "relatedTerms": ["card-memorize-db_002", "card-memorize-db_003", "card-memorize-db_004"],
    "source": "memorize",
    "sourceQuestionId": "memorize-db_012",
    "tags": ["트랜잭션", "ACID", "원자성"]
  }
]
```

**4개 파일 생성**:
| 파일명 | 카테고리 | 원본 데이터 |
|--------|----------|-------------|
| `flashcards-se.json` | memorize-se | memorize-se.json + theory-se.json 보기 |
| `flashcards-db.json` | memorize-db | memorize-db.json + theory-db.json 보기 |
| `flashcards-network.json` | memorize-network | memorize-network.json + theory-network.json 보기 |
| `flashcards-os.json` | memorize-os | memorize-os.json + theory-os.json 보기 |

### 1.3 중복 제거 매핑

중복 문제 쌍에서 **상세 버전(pdf 출처, difficulty: 1)**을 유지하고 간략 버전을 제거한다.

| 카테고리 | 제거 대상 (간략) | 유지 대상 (상세) | 주제 |
|----------|:----------------:|:----------------:|------|
| memorize-db | _001 | _012 | ACID |
| memorize-db | _004 | _014 | 이상현상 |
| memorize-db | _005 | _017 | 관계대수 |
| memorize-db | _006 | _015 | 회복기법 |
| memorize-db | _008 | _018 | 키 |
| memorize-network | _002 | _024 | 프로토콜 3요소 |
| memorize-network | _004 | _016 | TCP/UDP |
| memorize-network | _006 | _022 | 라우팅 |
| memorize-network | _007 | _018 | DoS |
| memorize-os | _003 | _018 | 교착상태 조건 |
| memorize-os | _004 | _013 | 교착상태 해결 |
| memorize-os | _005 | _016 | 프로세스 상태 |

### 1.4 복합 문제 세분화 규칙

하나의 원본 문제를 여러 카드로 분리하는 규칙:

**규칙 A: 나열형** - "A, B, C를 쓰시오" → 각각 개별 카드
```
원본: "ACID 특성을 각각 설명하시오" (memorize-db_012)
→ 카드1: 원자성(Atomicity) → 모두 실행되거나 모두 취소
→ 카드2: 일관성(Consistency) → 실행 전후 일관된 상태 유지
→ 카드3: 격리성(Isolation) → 트랜잭션 간 상호 간섭 불가
→ 카드4: 지속성(Durability) → 완료된 결과는 영구적으로 반영
```

**규칙 B: 대비형** - "A와 B의 차이" → 각각 개별 카드
```
원본: "카디널리티와 차수의 차이를 쓰시오" (memorize-db_009)
→ 카드1: 카디널리티(Cardinality) → 튜플(행)의 수
→ 카드2: 차수(Degree) → 속성(열)의 수
```

**규칙 C: 분류형** - "분류별 항목을 쓰시오" → 분류별 카드
```
원본: "SQL의 분류(DDL, DML, DCL, TCL)를 쓰시오" (memorize-db_002)
→ 카드1: DDL → CREATE, ALTER, DROP, TRUNCATE
→ 카드2: DML → SELECT, INSERT, UPDATE, DELETE
→ 카드3: DCL → GRANT, REVOKE
→ 카드4: TCL → COMMIT, ROLLBACK, SAVEPOINT
```

**규칙 D: 순서형** - "단계를 순서대로 나열" → 전체 순서 1장 + 각 단계별 카드
```
원본: "정규화 단계를 순서대로 쓰시오" (memorize-db_011)
→ 카드0: 정규화 순서 → 도부이결다조 (1NF→2NF→3NF→BCNF→4NF→5NF)
→ 카드1: 1NF → 도메인 원자값
→ 카드2: 2NF → 부분함수종속 제거
→ 카드3: 3NF → 이행함수종속 제거
→ 카드4: BCNF → 결정자이면서 후보키가 아닌 것 제거
→ 카드5: 4NF → 다치종속 제거
→ 카드6: 5NF → 조인종속 이용
```

**규칙 E: 단일 용어** - "~란?" → 1장 카드 그대로 변환
```
원본: "싱글톤 패턴이란?" (memorize-se_012)
→ 카드1: 싱글톤 패턴 → 클래스의 인스턴스가 하나만 생성되는 것을 보장하는 생성 패턴
```

### 1.5 theory-* 보기 용어 추출 규칙

theory-* JSON에서 `choices` 배열이 있는 문제의 보기 용어를 카드로 추출한다.

**추출 조건**:
1. `choices` 필드가 존재하는 문제
2. 정답 보기(`isCorrect: true`)는 반드시 추출
3. 오답 보기 중 `explanation`에서 설명이 있는 것도 추출
4. 이미 memorize-* 카드에 동일 용어가 있으면 **제외** (term 문자열 비교)

**추출 예시** (theory-db_002):
```json
// 원본 문제
{ "question": "전체적인 논리적 구조를 정의하며...",
  "choices": [
    { "text": "개념 스키마", "isCorrect": true },
    { "text": "외부 스키마", "isCorrect": false },
    { "text": "내부 스키마", "isCorrect": false },
    { "text": "논리 스키마", "isCorrect": false }
  ],
  "explanation": "외부 스키마: 사용자별 논리적 구조\n개념 스키마: DB 전체 논리적 구조\n내부 스키마: 물리적 저장 구조"
}

// 추출 결과
→ 카드1: 개념 스키마 → DB 전체 논리적 구조 (하나만 존재)
→ 카드2: 외부 스키마 → 사용자별 논리적 구조
→ 카드3: 내부 스키마 → 물리적 저장 구조
```

---

## 2. 컴포넌트 설계

### 2.1 컴포넌트 트리

```
FlashcardScreen (app/quiz/flashcard.tsx)
├── Header
│   ├── BackButton
│   ├── CategoryTitle
│   ├── ProgressText ("12 / 85")
│   └── ToggleButton (용어↔설명 모드 전환)
├── ProgressBar
├── FlashCardDeck
│   └── FlashCard (현재 카드)
│       ├── CardFront (term 또는 definition)
│       └── CardBack (definition 또는 term)
├── ActionButtons
│   ├── UnknownButton ("모르겠어요" - 왼쪽)
│   └── KnownButton ("알아요" - 오른쪽)
└── BannerAdView
```

### 2.2 FlashCard 컴포넌트

**파일**: `components/FlashCard.tsx`

```typescript
interface FlashCardProps {
  card: FlashCard;
  displayMode: CardDisplayMode;    // 'term-first' | 'definition-first'
  isFlipped: boolean;
  onFlip: () => void;
}
```

**동작 설계**:
- **앞면**: `displayMode === 'term-first'` → term 표시 / `'definition-first'` → definition 표시
- **뒷면**: 반대쪽 표시
- **전환 애니메이션**: `react-native-reanimated` 사용, Y축 3D 회전 (rotateY 0→180deg)
- **탭**: 카드 어디든 탭하면 앞↔뒤 전환
- **암기법(mnemonic)**: 뒷면 하단에 회색 텍스트로 표시 (있는 경우만)

**스타일 설계**:
```
┌─────────────────────────────┐
│                             │
│                             │
│       원자성 (Atomicity)     │  ← 앞면: 용어 (큰 텍스트, 중앙)
│                             │
│                             │
│    [탭하여 뒤집기]            │  ← 안내 텍스트 (첫 카드만)
└─────────────────────────────┘

┌─────────────────────────────┐
│                             │
│  트랜잭션의 연산이 모두       │
│  실행되거나 모두 취소되는     │  ← 뒷면: 설명 (본문 텍스트)
│  성질 (All or Nothing)      │
│                             │
│       암기법: ACID           │  ← 암기법 (있는 경우)
└─────────────────────────────┘
```

### 2.3 FlashCardDeck 컴포넌트

**파일**: `components/FlashCardDeck.tsx`

```typescript
interface FlashCardDeckProps {
  cards: FlashCard[];
  currentIndex: number;
  displayMode: CardDisplayMode;
  onKnown: (cardId: string) => void;
  onUnknown: (cardId: string) => void;
  onIndexChange: (index: number) => void;
}
```

**제스처 동작** (`react-native-gesture-handler` + `react-native-reanimated`):
- **좌로 스와이프**: "모르겠어요" → 빨간색 오버레이 → unknown 처리 → 다음 카드
- **우로 스와이프**: "알아요" → 초록색 오버레이 → known 처리 → 다음 카드
- **탭**: 카드 앞↔뒤 전환
- **스와이프 임계값**: 화면 너비의 30% 이상 이동 시 확정

**애니메이션 사양**:
| 제스처 | 애니메이션 | duration | easing |
|--------|-----------|----------|--------|
| 탭 (뒤집기) | rotateY 0↔180° | 300ms | easeInOut |
| 스와이프 확정 | translateX + opacity fadeOut | 200ms | easeOut |
| 다음 카드 진입 | translateX + opacity fadeIn | 200ms | easeOut |

### 2.4 ToggleButton 컴포넌트

**파일**: `components/ToggleButton.tsx`

```typescript
interface ToggleButtonProps {
  isActive: boolean;           // 반전 모드 여부
  onToggle: () => void;
  labels: [string, string];    // ["용어 → 설명", "설명 → 용어"]
}
```

**UI**: 캡슐형 토글 (좌: 용어→설명, 우: 설명→용어)
```
[  용어 → 설명  |  설명 → 용어  ]
   ^^^활성(인디고)  비활성(회색)
```

---

## 3. 화면 설계

### 3.1 FlashcardScreen

**파일**: `app/quiz/flashcard.tsx`

**라우팅**: `/quiz/flashcard?categoryId={id}&mode={mode}`

**파라미터**:
| Param | Type | 설명 |
|-------|------|------|
| categoryId | string | memorize-se, memorize-db 등 |
| mode | string? | 'all' (기본), 'unknown' (모르겠어요만), 'shuffle' |

**화면 레이아웃**:
```
┌──────────────────────────────────┐
│ ← 암기: 데이터베이스    12/45     │ ← Header
│ [용어→설명 | 설명→용어]           │ ← Toggle
├──────────────────────────────────┤
│ ████████████░░░░░░░░░            │ ← ProgressBar (26.7%)
├──────────────────────────────────┤
│                                  │
│  ┌──────────────────────────┐    │
│  │                          │    │
│  │                          │    │
│  │    원자성 (Atomicity)     │    │ ← FlashCard
│  │                          │    │
│  │                          │    │
│  │   [탭하여 뒤집기]         │    │
│  └──────────────────────────┘    │
│                                  │
│  ← 모르겠어요    알아요 →        │ ← ActionButtons + 스와이프 안내
│                                  │
├──────────────────────────────────┤
│          [광고 배너]              │ ← BannerAd
└──────────────────────────────────┘
```

### 3.2 퀴즈탭 카테고리 선택 화면 수정

**파일**: `app/(tabs)/quiz.tsx` (수정)

**변경사항**:
- memorize-* 카테고리: 카드 아이콘 + "암기 카드" 뱃지 + 진행률 표시
- code-*/sql-* 카테고리: 기존 문제 아이콘 + "주관식" 뱃지
- 카테고리 탭 시 라우팅 분기

```typescript
// 라우팅 분기 로직
const isAlgorithmCategory = (id: string) =>
  id.startsWith('code-') || id.startsWith('sql-');

const handleCategoryPress = (categoryId: string) => {
  if (isAlgorithmCategory(categoryId)) {
    router.push(`/quiz/${categoryId}`);          // 기존 주관식
  } else {
    router.push(`/quiz/flashcard?categoryId=${categoryId}`);  // 카드형
  }
};
```

**카테고리 카드 UI 변경**:
```
기존:
[icon] 암기: 데이터베이스           알고리즘(code-*) 카테고리:
       20문제  정답률 85%          [icon] C언어
                                         25문제  정답률 70%

변경 후:
[cards] 암기: 데이터베이스   [암기]  [code] C언어          [주관식]
        45카드  32/45 암기          25문제  정답률 70%
        ████████████░░░ 71%
```

### 3.3 [categoryId].tsx 수정

**파일**: `app/quiz/[categoryId].tsx` (수정)

**변경 범위 최소화**: 기존 로직은 그대로 유지. `isExamCategory` 판단 로직에 알고리즘 카테고리 추가.

```typescript
// 기존
const isExamCategory = categoryId?.startsWith('exam-') || ...;

// 변경: 알고리즘 카테고리도 주관식 처리
const isSubjectiveCategory = categoryId?.startsWith('exam-')
  || categoryId?.startsWith('code-')
  || categoryId?.startsWith('sql-')
  || currentQuestion?.categoryId?.startsWith('exam-')
  || currentQuestion?.categoryId?.startsWith('code-')
  || currentQuestion?.categoryId?.startsWith('sql-')
  || false;
```

**주의**: memorize-* 카테고리는 더 이상 이 화면에 진입하지 않음 (flashcard.tsx로 리다이렉트).
단, 북마크/오답 모드에서 memorize 문제가 포함되면 기존 방식으로 표시.

---

## 4. 상태 관리 설계

### 4.1 useFlashcardStore

**파일**: `store/useFlashcardStore.ts`

```typescript
interface FlashcardState {
  // 현재 세션 상태
  categoryId: CategoryId | null;
  cards: FlashCard[];
  currentIndex: number;
  isFlipped: boolean;
  displayMode: CardDisplayMode;    // 'term-first' | 'definition-first'

  // 카드별 암기 상태 (영속화)
  cardProgress: Record<string, CardProgress>;

  // 액션
  startSession: (categoryId: CategoryId, cards: FlashCard[]) => void;
  flipCard: () => void;
  markKnown: () => void;
  markUnknown: () => void;
  nextCard: () => void;
  prevCard: () => void;
  toggleDisplayMode: () => void;
  resetSession: () => void;

  // 통계
  getSessionStats: () => { known: number; unknown: number; unseen: number; total: number };
  getCategoryProgress: (categoryId: CategoryId) => { known: number; total: number; rate: number };
}
```

**영속화 설정**:
```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: '@flashcard-store',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({
      cardProgress: state.cardProgress,
      displayMode: state.displayMode,
    }),
  }
)
```

**영속화 대상**:
- `cardProgress`: 카드별 암기 상태 (known/unknown) — 앱 재시작 후에도 유지
- `displayMode`: 사용자가 마지막으로 선택한 표시 모드

**영속화 제외 (세션 전용)**:
- `categoryId`, `cards`, `currentIndex`, `isFlipped` — 매 진입 시 초기화

### 4.2 기존 스토어 영향 분석

| 스토어 | 변경 | 내용 |
|--------|------|------|
| useQuizStore | 변경 없음 | 기존 문제 풀이 로직 그대로 유지 |
| useUserStore | 변경 없음 | progress 타입 호환 (카드는 별도 저장) |

---

## 5. 서비스 설계

### 5.1 flashcardService.ts

**파일**: `features/flashcards/services/flashcardService.ts`

```typescript
/** 카테고리별 카드 로드 */
export function loadFlashcards(categoryId: CategoryId): FlashCard[];

/** 카테고리별 카드 수 조회 */
export function getFlashcardCount(categoryId: CategoryId): number;

/** 전체 카드 수 맵 */
export function getFlashcardCountMap(): Record<string, number>;

/** 특정 카드 조회 */
export function getFlashcardById(cardId: string): FlashCard | null;

/** 서브카테고리별 그룹핑 */
export function groupBySubcategory(cards: FlashCard[]): Record<string, FlashCard[]>;
```

**로딩 방식**: `require()` 정적 로딩 (기존 questionService.ts와 동일 패턴)

```typescript
const flashcardData: Record<string, FlashCard[]> = {
  'memorize-se': require('@/data/flashcards/flashcards-se.json'),
  'memorize-db': require('@/data/flashcards/flashcards-db.json'),
  'memorize-network': require('@/data/flashcards/flashcards-network.json'),
  'memorize-os': require('@/data/flashcards/flashcards-os.json'),
};
```

### 5.2 cardConverter.ts (빌드 타임 스크립트)

**파일**: `scripts/convert-to-flashcards.ts`

실행: `npx tsx scripts/convert-to-flashcards.ts`

**변환 파이프라인**:
```
1. memorize-*.json 로드
2. 중복 제거 (1.3절 매핑 테이블 기준)
3. 각 문제에 세분화 규칙 적용 (1.4절)
   - answer/explanation 파싱하여 개별 카드 생성
   - 원본 문제의 subcategory, tags 상속
4. theory-*.json 로드
   - choices 있는 문제에서 보기 용어 추출 (1.5절)
   - 기존 카드와 term 중복 체크
5. ID 부여: card-{categoryId}_{순번 3자리}
6. flashcards-*.json 파일 출력
7. 변환 통계 출력 (원본 수, 제거 수, 생성 수)
```

---

## 6. 라우팅 설계

### 6.1 수정 파일

**`app/quiz/_layout.tsx`**: flashcard 스크린 추가
```typescript
<Stack.Screen name="flashcard" options={{ headerShown: false }} />
```

### 6.2 네비게이션 플로우

```
퀴즈탭 (quiz.tsx)
├── code-*/sql-* 카테고리 탭
│   └── /quiz/{categoryId} (기존 주관식 화면)
│       └── /quiz/result (기존 결과 화면)
└── memorize-* 카테고리 탭
    └── /quiz/flashcard?categoryId={id} (신규 카드 화면)
        └── 완료 시 자체 통계 모달 표시 (별도 라우팅 불필요)
```

### 6.3 CategoryId 타입 확장

**변경 불필요**: 기존 `CategoryId` 타입에 `memorize-se`, `memorize-db`, `memorize-network`, `memorize-os`가 이미 포함되어 있음.

---

## 7. 구현 순서 (Implementation Order)

### Phase 1: 데이터 변환 스크립트 (Day 1)
| 순서 | 작업 | 파일 |
|:----:|------|------|
| 1-1 | FlashCard 타입 정의 | `features/flashcards/types.ts` |
| 1-2 | 변환 스크립트 작성 | `scripts/convert-to-flashcards.ts` |
| 1-3 | 스크립트 실행 → JSON 생성 | `data/flashcards/*.json` |
| 1-4 | flashcardService 구현 | `features/flashcards/services/flashcardService.ts` |

### Phase 2: 카드 UI 구현 (Day 2)
| 순서 | 작업 | 파일 |
|:----:|------|------|
| 2-1 | FlashCard 컴포넌트 | `components/FlashCard.tsx` |
| 2-2 | FlashCardDeck 컴포넌트 | `components/FlashCardDeck.tsx` |
| 2-3 | ToggleButton 컴포넌트 | `components/ToggleButton.tsx` |

### Phase 3: 화면 & 상태 관리 (Day 3)
| 순서 | 작업 | 파일 |
|:----:|------|------|
| 3-1 | useFlashcardStore 생성 | `store/useFlashcardStore.ts` |
| 3-2 | FlashcardScreen 구현 | `app/quiz/flashcard.tsx` |
| 3-3 | quiz/_layout.tsx 수정 | `app/quiz/_layout.tsx` |
| 3-4 | quiz.tsx 라우팅 분기 | `app/(tabs)/quiz.tsx` |

### Phase 4: 진행률 & 복습 (Day 4)
| 순서 | 작업 | 파일 |
|:----:|------|------|
| 4-1 | 카테고리 목록에 진행률 표시 | `app/(tabs)/quiz.tsx` |
| 4-2 | "모르겠어요" 복습 모드 | `app/quiz/flashcard.tsx` |
| 4-3 | 세션 완료 모달 | `app/quiz/flashcard.tsx` |

---

## 8. 신규/수정 파일 전체 목록

### 신규 파일 (10개)
| 파일 | 설명 |
|------|------|
| `features/flashcards/types.ts` | FlashCard 타입 정의 |
| `features/flashcards/services/flashcardService.ts` | 카드 로딩/필터링 서비스 |
| `scripts/convert-to-flashcards.ts` | 문제→카드 변환 스크립트 |
| `data/flashcards/flashcards-se.json` | 소프트웨어공학 카드 데이터 |
| `data/flashcards/flashcards-db.json` | 데이터베이스 카드 데이터 |
| `data/flashcards/flashcards-network.json` | 네트워크/보안 카드 데이터 |
| `data/flashcards/flashcards-os.json` | 운영체제 카드 데이터 |
| `components/FlashCard.tsx` | 카드 컴포넌트 (앞뒤 전환) |
| `components/FlashCardDeck.tsx` | 카드 덱 (스와이프) |
| `store/useFlashcardStore.ts` | 카드 상태 관리 |

### 수정 파일 (3개)
| 파일 | 변경 내용 |
|------|-----------|
| `app/(tabs)/quiz.tsx` | 카테고리별 라우팅 분기, 진행률 UI 추가 |
| `app/quiz/_layout.tsx` | flashcard 스크린 등록 |
| `app/quiz/flashcard.tsx` | 신규 카드형 암기 화면 (app 디렉토리이므로 신규 파일이지만 라우팅 역할) |

### 변경 없는 파일
| 파일 | 이유 |
|------|------|
| `app/quiz/[categoryId].tsx` | 알고리즘 주관식은 기존 로직 100% 유지 |
| `store/useQuizStore.ts` | 기존 문제 풀이 스토어 변경 불필요 |
| `store/useUserStore.ts` | 기존 진행도 스토어 변경 불필요 |
| `features/questions/*` | 기존 문제 서비스 변경 불필요 |

---

## 9. 의존성

### 기존 의존성 (추가 설치 불필요)
- `react-native-reanimated` ~4.1.1 — 카드 뒤집기 애니메이션
- `react-native-gesture-handler` ~2.28.0 — 스와이프 제스처
- `zustand` + `@react-native-async-storage/async-storage` — 상태 영속화

### 신규 의존성: 없음
기존 라이브러리로 모든 기능 구현 가능.

---

## 10. 제약사항 및 결정사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 카드 데이터 포맷 | 별도 JSON (flashcards-*.json) | 기존 Question 스키마와 호환 불가, 분리가 깔끔 |
| 변환 방식 | 빌드 타임 스크립트 | 런타임 변환은 불필요한 복잡도, JSON 정적 로딩 유지 |
| 스와이프 라이브러리 | 기존 gesture-handler 활용 | 추가 의존성 없이 구현 가능 |
| 카드 상태 저장 | 별도 스토어 (useFlashcardStore) | 기존 useUserStore.progress와 스키마 불일치 |
| 알고리즘 주관식 | 기존 [categoryId].tsx 그대로 | 카드형과 별도 흐름, 코드 수정 최소화 |
