/**
 * 루트 레이아웃
 * 앱 전체를 감싸는 최상위 레이아웃 (테마, 폰트 로딩 등)
 * 배너 광고는 여기서 단 1회 마운트 → 화면 이동 시 재로딩 없음
 */

import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAdView } from '@/components/ads/BannerAdView';
import { useAdStore } from '@/store/useAdStore';

export default function RootLayout() {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const setBannerHeight = useAdStore((s) => s.setBannerHeight);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#6366f1' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: '',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="quiz" options={{ headerShown: false }} />
        <Stack.Screen
          name="bookmarks"
          options={{ title: '북마크', presentation: 'card' }}
        />
      </Stack>

      {/* 전역 배너 광고 - 앱 전체에서 단 1개 유지, 재로딩 없음 */}
      <View
        style={{ position: 'absolute', bottom: bottomInset, left: 0, right: 0 }}
        onLayout={(e) => setBannerHeight(e.nativeEvent.layout.height)}
      >
        <BannerAdView />
      </View>
    </View>
  );
}