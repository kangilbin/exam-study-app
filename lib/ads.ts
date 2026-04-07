/**
 * Google AdMob 광고 설정
 * 빌드 프로필에 따라 테스트/실제 광고 ID 자동 전환
 * - development, preview: 테스트 광고 ID
 * - production: 실제 광고 ID
 */

import { Platform } from 'react-native';

const IS_PRODUCTION = process.env.EXPO_PUBLIC_AD_ENV === 'production';

/** 테스트 광고 단위 ID (Google 공식 테스트 ID) */
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/9214589741';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

/** 실제 광고 단위 ID */
const PROD_BANNER_ID = Platform.select({
  android: 'ca-app-pub-3001608230251687/2898773493',
  ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
}) ?? TEST_BANNER_ID;

const PROD_INTERSTITIAL_ID = Platform.select({
  android: 'ca-app-pub-3001608230251687/3828711783',
  ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
}) ?? TEST_INTERSTITIAL_ID;

/** 배너 광고 단위 ID */
export const BANNER_AD_UNIT_ID = IS_PRODUCTION ? PROD_BANNER_ID : TEST_BANNER_ID;

/** 전면 광고 단위 ID */
export const INTERSTITIAL_AD_UNIT_ID = IS_PRODUCTION ? PROD_INTERSTITIAL_ID : TEST_INTERSTITIAL_ID;
