/**
 * AsyncStorage 래퍼 유틸리티
 * JSON 직렬화/역직렬화를 자동 처리
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AsyncStorage에서 JSON 값 읽기
 */
export async function getStorageItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[Storage] 읽기 실패 (key: ${key}):`, error);
    return null;
  }
}

/**
 * AsyncStorage에 JSON 값 저장
 */
export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    await AsyncStorage.setItem(key, raw);
  } catch (error) {
    console.warn(`[Storage] 쓰기 실패 (key: ${key}):`, error);
  }
}

/**
 * AsyncStorage에서 키 삭제
 */
export async function removeStorageItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn(`[Storage] 삭제 실패 (key: ${key}):`, error);
  }
}
