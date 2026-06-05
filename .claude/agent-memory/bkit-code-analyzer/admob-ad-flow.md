---
name: admob-ad-flow
description: How the rewarded-interstitial AdMob flow is wired across hooks and tab screens, and its structural weak points
metadata:
  type: project
---

The rewarded-interstitial ad flow spans: `components/ads/useRewardedInterstitialAd.ts` (low-level ad lifecycle), `components/ads/useAdGate.ts` (loading overlay + countdown fallback), `components/ads/AdGateOverlay.tsx` (UI), and is consumed independently in `app/(tabs)/index.tsx`, `app/(tabs)/profile.tsx`, and `features/questions/hooks/useExamCategories.ts` (used by the exam tab).

**Why:** Each screen calls `useAdGate()` which calls `useRewardedInterstitialAd()`, so 3 separate `RewardedInterstitialAd` instances are created and each calls `ad.load()` on mount. This is by design (ads load eagerly per screen) but creates duplicate inventory requests and means non-active screens still hold ad instances.

**How to apply:** When reviewing ad changes, key structural risks to re-check: (1) `AdEventType.ERROR` is used both for load-errors (in useEffect) and show-errors (in executeShow) on the *same* ad object, disambiguated only by the `isShowingRef` flag — fragile. (2) Neither hook guards setState against unmount (no isMounted ref). (3) `executeShow` registers CLOSED/ERROR listeners but only unsubscribes inside its own cleanup, not on hook unmount — if user navigates away mid-show, listeners leak. (4) useAdGate countdown timer is cleaned up correctly but pendingNavRef callback (router.push) can fire after unmount.
