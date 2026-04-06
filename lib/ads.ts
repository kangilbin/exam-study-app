/**
 * Google AdMob 광고 설정
 * 실제 앱 ID와 광고 단위 ID를 여기서 관리
 */

import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

const IS_DEV = __DEV__;

/** 배너 광고 단위 ID */
export const BANNER_AD_UNIT_ID = IS_DEV
  ? TestIds.ADAPTIVE_BANNER
  : Platform.select({
    android: 'ca-app-pub-3001608230251687/2898773493',
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
    }) ?? TestIds.ADAPTIVE_BANNER;

/** 전면 광고 단위 ID */
export const INTERSTITIAL_AD_UNIT_ID = IS_DEV
  ? TestIds.INTERSTITIAL
  : Platform.select({
    android: 'ca-app-pub-3001608230251687/3828711783',
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
    }) ?? TestIds.INTERSTITIAL;
