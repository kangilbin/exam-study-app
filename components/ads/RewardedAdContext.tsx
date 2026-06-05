/**
 * 단일 보상형 전면 광고 인스턴스를 앱 전체에서 공유
 * 3개 탭이 각자 인스턴스를 만들면 AdMob에 동시 요청이 발생해 재고 경합이 생김
 */

import { createContext, useContext } from 'react';
import { useRewardedInterstitialAd } from './useRewardedInterstitialAd';

interface RewardedAdContextValue {
  showAd: ReturnType<typeof useRewardedInterstitialAd>['showAd'];
  cancelAd: ReturnType<typeof useRewardedInterstitialAd>['cancelAd'];
}

const RewardedAdContext = createContext<RewardedAdContextValue | null>(null);

export function RewardedAdProvider({ children }: { children: React.ReactNode }) {
  const { showAd, cancelAd } = useRewardedInterstitialAd();
  return (
    <RewardedAdContext.Provider value={{ showAd, cancelAd }}>
      {children}
    </RewardedAdContext.Provider>
  );
}

export function useSharedRewardedAd(): RewardedAdContextValue {
  const ctx = useContext(RewardedAdContext);
  if (!ctx) throw new Error('RewardedAdProvider가 상위에 없습니다');
  return ctx;
}