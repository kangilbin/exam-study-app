/**
 * 퀴즈 라우트 그룹 레이아웃
 */

import { Stack } from 'expo-router';

export default function QuizLayout() {
  return (
    <Stack
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
  );
}
