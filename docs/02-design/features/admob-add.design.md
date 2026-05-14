# Design: admob-add

## 참조
- Plan: `docs/01-plan/features/admob-add.plan.md`
- 관련 파일: `app/(tabs)/exam.tsx`, `lib/ads.ts`, `components/ads/useInterstitialAd.ts`

---

## 1. 아키텍처 결정

### 1.1 기존 광고 인프라 재사용
- `react-native-google-mobile-ads` 이미 설치 및 `app.json` 설정 완료 → 패키지 추가 불필요
- 기존 패턴(`isExpoGo` 분기, `require()` lazy 로드) 그대로 따름
- `components/ads/` 디렉토리에 신규 훅 추가 (기존 `useInterstitialAd.ts`와 동일 위치)

### 1.2 파일 위치
```
lib/ads.ts                              ← REWARDED_AD_UNIT_ID 추가
components/ads/
  useInterstitialAd.ts                  ← 변경 없음
  BannerAdView.tsx                      ← 변경 없음
  useRewardedAd.ts                      ← 신규 (보상형 광고 훅)
app/(tabs)/exam.tsx                     ← 수정 (광고 연동)
```

---

## 2. 광고 ID 설계 (`lib/ads.ts`)

### 추가할 상수

| 상수명 | 테스트 ID | 실제 ID |
|--------|-----------|---------|
| `REWARDED_AD_UNIT_ID` | `ca-app-pub-3940256099942544/5224354917` (Android) | 실제 보상형 광고 ID 발급 후 입력 |

> iOS 실제 ID는 App Store 등록 시 별도 발급 필요. 현재는 Android만 사용.

```typescript
// 추가 부분
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

const PROD_REWARDED_ID = Platform.select({
  android: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY', // 발급 후 교체
  ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
}) ?? TEST_REWARDED_ID;

export const REWARDED_AD_UNIT_ID = IS_PRODUCTION ? PROD_REWARDED_ID : TEST_REWARDED_ID;
```

---

## 3. 보상형 광고 훅 설계 (`components/ads/useRewardedAd.ts`)

### 3.1 인터페이스

```typescript
interface UseRewardedAdReturn {
  showAd: (callbacks: {
    onRewarded: () => void;    // 광고 끝까지 시청 시
    onDismissed?: () => void;  // 보상 없이 닫았을 때
    onError?: () => void;      // 광고 로드 실패 시
  }) => void;
  isAdLoaded: boolean;
}

export const useRewardedAd: () => UseRewardedAdReturn;
```

### 3.2 Expo Go 노옵 구현

```typescript
const useRewardedAdNoop = (): UseRewardedAdReturn => ({
  showAd: ({ onRewarded }) => onRewarded(), // 개발 환경: 광고 없이 바로 통과
  isAdLoaded: false,
});
```

### 3.3 실제 구현 (RewardedAd API)

```typescript
const useRewardedAdReal = (): UseRewardedAdReturn => {
  const { RewardedAd, RewardedAdEventType, AdEventType } = require('react-native-google-mobile-ads');
  const { REWARDED_AD_UNIT_ID } = require('@/lib/ads');

  const [loaded, setLoaded] = useState(false);
  const [ad] = useState(() =>
    RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    })
  );

  // 광고 이벤트 구독 (마운트 시)
  useEffect(() => {
    const unsubLoaded  = ad.addAdEventListener(RewardedAdEventType.LOADED, () => setLoaded(true));
    const unsubError   = ad.addAdEventListener(AdEventType.ERROR, () => setLoaded(false));
    ad.load();
    return () => { unsubLoaded(); unsubError(); };
  }, [ad]);

  // showAd: 콜백 패턴으로 보상/취소/실패 처리
  const showAd = useCallback(({ onRewarded, onDismissed, onError }) => {
    if (!loaded) {
      onError?.();
      return;
    }
    let rewarded = false;

    const unsubReward = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      rewarded = true;
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsubReward();
      unsubClosed();
      setLoaded(false);
      ad.load(); // 다음 광고 사전 로드
      if (rewarded) {
        onRewarded();
      } else {
        onDismissed?.();
      }
    });

    ad.show();
  }, [ad, loaded]);

  return { showAd, isAdLoaded: loaded };
};
```

### 3.4 Expo Go 분기 내보내기

```typescript
export const useRewardedAd = isExpoGo ? useRewardedAdNoop : useRewardedAdReal;
```

---

## 4. exam.tsx 수정 설계

### 4.1 광고 노출 조건 판단 함수

```
showAdRequired(seenCount, quizCanResume, mode):
  처음 도전 → seenCount === 0 && !quizCanResume   → true
  전체 다시 풀기 → mode === 'all'                 → true
  그 외 (이어서/틀린문제/진행중)                  → false
```

### 4.2 `handleExamPress` 수정 (처음 도전)

**현재 코드 (line 94–97):**
```typescript
// 학습 기록이 없으면 바로 진입
if (seenCount === 0 && !quizCanResume) {
  router.push(`/quiz/${item.id}`);
  return;
}
```

**변경 후:**
```typescript
// 처음 도전: 보상형 광고 시청 후 진입
if (seenCount === 0 && !quizCanResume) {
  showAd({
    onRewarded: () => router.push(`/quiz/${item.id}`),
    onDismissed: () => Alert.alert('안내', '광고를 끝까지 시청해야 문제를 풀 수 있습니다.'),
    onError: () => Alert.alert('알림', '광고를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'),
  });
  return;
}
```

### 4.3 `navigateWithMode` 수정 (전체 다시 풀기)

**현재 코드 (line 123–132):**
```typescript
const navigateWithMode = (mode: string) => {
  if (!modalInfo) return;
  const catId = modalInfo.categoryId;
  setModalInfo(null);
  if (mode === 'all') {
    useUserStore.getState().resetCategoryProgress(catId);
  }
  router.push(`/quiz/${catId}?mode=${mode}`);
};
```

**변경 후:**
```typescript
const navigateWithMode = (mode: string) => {
  if (!modalInfo) return;
  const catId = modalInfo.categoryId;

  if (mode === 'all') {
    setModalInfo(null);
    showAd({
      onRewarded: () => {
        useUserStore.getState().resetCategoryProgress(catId);
        router.push(`/quiz/${catId}?mode=${mode}`);
      },
      onDismissed: () => Alert.alert('안내', '광고를 끝까지 시청해야 문제를 풀 수 있습니다.'),
      onError: () => Alert.alert('알림', '광고를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'),
    });
    return;
  }

  setModalInfo(null);
  router.push(`/quiz/${catId}?mode=${mode}`);
};
```

> 주의: `mode === 'all'` 분기에서 `setModalInfo(null)` 을 광고 표시 전에 호출하여 모달이 닫힌 후 광고가 노출되도록 한다.

### 4.4 훅 사용 선언 추가

```typescript
// ExamScreen 함수 상단에 추가
const { showAd } = useRewardedAd();
```

### 4.5 import 추가

```typescript
import { Alert } from 'react-native';                    // 기존 import에 추가
import { useRewardedAd } from '@/components/ads/useRewardedAd';
```

---

## 5. 광고 상태 흐름도

```
[카드 클릭]
    │
    ├─ seenCount === 0 && !quizCanResume
    │       │
    │       └─ showAd()
    │             ├─ 로드 실패 → Alert("광고 불러오기 실패")
    │             ├─ 시청 완료(EARNED_REWARD) → router.push
    │             └─ 닫기(CLOSED, no reward) → Alert("끝까지 시청 필요")
    │
    └─ seenCount > 0 or quizCanResume → 모달 표시
            │
            ├─ 이어서 풀기 → router.push (광고 없음)
            ├─ 틀린 문제 → router.push (광고 없음)
            └─ 전체 다시 풀기
                    │
                    └─ showAd()
                          ├─ 로드 실패 → Alert("광고 불러오기 실패")
                          ├─ 시청 완료(EARNED_REWARD) → resetProgress → router.push
                          └─ 닫기(no reward) → Alert("끝까지 시청 필요")
```

---

## 6. 요구사항 매핑

| FR | 요구사항 | 구현 위치 |
|----|---------|---------|
| FR-01 | 처음 도전 시 보상형 광고 시청 후 진입 | `exam.tsx:handleExamPress` |
| FR-02 | 이미 진행 중인 경우 광고 없이 진입 | `exam.tsx:handleExamPress` (기존 모달 분기 유지) |
| FR-03 | 전체 다시 풀기 시 보상형 광고 재시청 | `exam.tsx:navigateWithMode` |
| FR-04 | 이어서 풀기 / 틀린 문제 풀기는 광고 미적용 | `exam.tsx:navigateWithMode` (분기 제외) |
| FR-05 | 광고 로드 실패 시 에러 안내 | `useRewardedAd.ts:showAd.onError` → Alert |
| FR-06 | 광고 시청 취소 시 퀴즈 진입 불가 | `useRewardedAd.ts:showAd.onDismissed` → Alert |

---

## 7. 구현 순서 (Do Phase 체크리스트)

- [ ] `lib/ads.ts` — `REWARDED_AD_UNIT_ID` 상수 추가
- [ ] `components/ads/useRewardedAd.ts` — 훅 신규 생성
- [ ] `app/(tabs)/exam.tsx` — import 추가, `handleExamPress` 수정, `navigateWithMode` 수정

---

## 8. 엣지 케이스

| 케이스 | 처리 방법 |
|--------|---------|
| 광고 로드 전 카드 클릭 | `isAdLoaded === false` → `onError` 콜백 즉시 호출, Alert 표시 |
| 광고 시청 중 앱 백그라운드 전환 | `CLOSED` 이벤트로 처리 (보상 없이 닫힘) |
| 연속 클릭 방지 | `showAd` 내부에서 `loaded` false 시 early return |
| Expo Go 개발 환경 | `isExpoGo` 노옵 — 광고 없이 `onRewarded()` 즉시 실행 |
