/**
 * 루트 레이아웃
 * 앱 전체를 감싸는 최상위 레이아웃 (테마, 폰트 로딩 등)
 * 배너 광고는 (tabs)/_layout.tsx의 tabBar prop에서 탭바 위에 렌더링
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function RootLayout() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

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
    </View>
  );
}