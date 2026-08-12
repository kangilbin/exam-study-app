/**
 * AdMob 싱글톤 서비스
 * - 인스턴스를 모듈 레벨에서 1회 생성하여 재사용 (매번 새로 생성 X)
 * - initializeAdMob()에서 리스너 등록 + 첫 load() 호출
 * - CLOSED 후 같은 인스턴스에 load() 재호출
 * - 로드 실패 시 지수 백오프(1s→2s→4s) 자동 재시도
 */

import Constants, { ExecutionEnvironment } from 'expo-constants';
import mobileAds, {
  RewardedInterstitialAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { REWARDED_INTERSTITIAL_AD_UNIT_ID } from '@/lib/ads';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export type AdState = { loaded: boolean; isLoading: boolean };

// initialize() 완료 후 생성 (이전에 만들면 native 이벤트 브릿지 미연결)
let _ad: ReturnType<typeof RewardedInterstitialAd.createForAdRequest> | null = null;

let _isInitialized = false;
let _snapshot: AdState = { loaded: false, isLoading: false };
let _retryCount = 0;

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000; // 1s → 2s → 4s
// 짧은 간격 재시도가 의미 있는 "일시적" 에러만 허용(화이트리스트).
// no-fill(재고 없음)·invalid-request(설정 오류) 등은 몇 초 내 재시도해도
// 대부분 또 실패 → 요청수만 늘고 일치율을 갉아먹으므로 재시도하지 않음.
const RETRIABLE_ERROR_CODES = ['network-error', 'internal-error'];

const _listeners = new Set<() => void>();
function _setState(next: Partial<AdState>): void {
  _snapshot = { ..._snapshot, ...next };
  _listeners.forEach(l => l());
}

export function subscribeAdState(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

export function getAdState(): AdState {
  return _snapshot;
}

export function getAd() {
  return _ad;
}

/** 재시도 소진 후 showAd() 호출 시 강제 재시도 */
export function triggerLoad(): void {
  _retryCount = 0;
  _loadAd();
}

function _scheduleRetry(): void {
  if (_retryCount >= MAX_RETRIES) return;
  const delay = RETRY_BASE_MS * Math.pow(2, _retryCount);
  _retryCount++;
  setTimeout(() => _loadAd(), delay);
}

function _loadAd(): void {
  if (!_isInitialized || !_ad || _snapshot.isLoading || _snapshot.loaded) return;
  _setState({ loaded: false, isLoading: true });
  _ad.load();
}

/** 앱 최상위 useEffect에서 1회 호출 */
export async function initializeAdMob(): Promise<void> {
  if (isExpoGo || _isInitialized) return;

  try {
    await mobileAds().initialize();
    if (_isInitialized) return; // Strict Mode 이중 실행 방지
    _isInitialized = true;

    // initialize() 완료 후 인스턴스 생성 + 리스너 등록
    // 개인화 광고 요청(false) → 입찰 광고주 풀 확대로 일치율/eCPM 상승 (한국 전용 배포)
    _ad = RewardedInterstitialAd.createForAdRequest(REWARDED_INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: false,
    });

    _ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      _retryCount = 0;
      _setState({ loaded: true, isLoading: false });
    });

    _ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {});

    _ad.addAdEventListener(AdEventType.ERROR, (error) => {
      _setState({ loaded: false, isLoading: false });
      // SDK가 준 error.code 기준으로 재시도 여부 결정.
      // 화이트리스트에 없는 에러(no-fill 등)는 재시도하지 않아 요청 낭비를 막는다.
      const code = (error as { code?: string })?.code ?? '';
      if (RETRIABLE_ERROR_CODES.some((c) => code.includes(c))) {
        _scheduleRetry();
      }
    });

    _ad.addAdEventListener(AdEventType.CLOSED, () => {
      _setState({ loaded: false, isLoading: false });
      _loadAd();
    });

    _loadAd(); // 첫 광고 로드
  } catch {
    _isInitialized = false;
  }
}