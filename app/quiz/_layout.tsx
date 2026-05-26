/**
 * 퀴즈 라우트 그룹 레이아웃
 * 배너 광고를 Stack 하단에 배치 → [categoryId], result 화면 전체에 자동 적용
 */

import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAdView } from '@/components/ads/BannerAdView';

export default function QuizLayout() {
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Stack
        style={{ flex: 1 }}
        screenOptions={{
          headerStyle: { backgroundColor: '#6366f1' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: '',
        }}
      >
        <Stack.Screen name="[categoryId]" options={{ title: '문제 풀이' }} />
        <Stack.Screen name="result" options={{ title: '풀이 결과' }} />
      </Stack>
      {/* 시스템 네비게이션바 위에 배너 표시 */}
      <View style={{ paddingBottom: bottom }}>
        <BannerAdView />
      </View>
    </View>
  );
}
