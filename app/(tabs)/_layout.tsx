/**
 * 탭 네비게이션 레이아웃
 * 3개 탭: 학습, 기출, 내정보
 *
 * 배너 광고 구조:
 * - custom tabBar로 [BannerAdView][BottomTabBar] 순서로 렌더링
 * - safeAreaInsets, 수동 height 계산 없음
 * - React Navigation이 전체 높이 자동 측정 → 콘텐츠 패딩 자동 처리
 * - BottomTabBar가 자체적으로 safe area 처리
 */

import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BannerAdView } from '@/components/ads/BannerAdView';
import { RewardedAdProvider } from '@/components/ads/RewardedAdContext';

export default function TabLayout() {
  return (
    <RewardedAdProvider>
    <Tabs
      tabBar={(props: BottomTabBarProps) => (
        <View>
          <BannerAdView />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '학습',
          headerTitle: '정보처리기사 실기',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-variant" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="exam"
        options={{
          title: '기출',
          headerTitle: '기출문제',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          href: null,
          title: '풀이',
          headerTitle: '문제 풀이',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내정보',
          headerTitle: '학습 현황',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
    </RewardedAdProvider>
  );
}