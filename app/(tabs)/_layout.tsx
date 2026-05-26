/**
 * 탭 네비게이션 레이아웃
 * 3개 탭: 학습, 기출, 내정보
 *
 * 배너 광고 구조:
 * - tabBar prop을 사용해 배너를 탭바 바로 위에 자연스럽게 배치
 * - React Navigation이 (배너 + 탭바) 전체 높이를 자동 계산 → 콘텐츠 패딩 자동 처리
 * - Edge-to-Edge(시스템 네비바)는 BottomTabBar가 내부에서 자동 처리
 *
 * 이전 방식의 문제: position:absolute 배너 + marginBottom 수동계산 → 계속 충돌
 * 현재 방식: flex 레이아웃으로 [배너][탭바] 자연스럽게 쌓기 → 버그 없음
 */

import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BannerAdView } from '@/components/ads/BannerAdView';

export default function TabLayout() {
  // Edge-to-Edge 대응: 시스템 네비바 높이를 탭바 height/padding에 반영
  const { bottom: bottomInset } = useSafeAreaInsets();

  return (
    <Tabs
      // React Navigation 자동 safe area 비활성화 → tabBarStyle에서 직접 관리
      safeAreaInsets={{ bottom: 0 }}
      // 배너를 탭바 위에 배치: [BannerAdView][BottomTabBar] 순서로 flex 렌더링
      // React Navigation이 전체 높이(배너+탭바)를 자동 계산해 콘텐츠 여백 처리
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
          paddingBottom: 4 + bottomInset,   // 시스템 네비바 높이 포함
          height: 80 + bottomInset,          // 시스템 네비바 높이 포함
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
  );
}
