/**
 * 루트 레이아웃
 * 앱 전체를 감싸는 최상위 레이아웃 (테마, 폰트 로딩 등)
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';


export default function RootLayout() {
  return (
    <>
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
    </>
  );
}
