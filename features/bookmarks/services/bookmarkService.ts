/**
 * 북마크 서비스
 * AsyncStorage를 통해 북마크 목록을 관리하는 서비스
 */

import { getStorageItem, setStorageItem } from '@/lib/storage';

/** AsyncStorage 키 */
const BOOKMARKS_KEY = '@bookmarks';

/**
 * 북마크된 문제 ID 목록 조회
 */
export async function getBookmarks(): Promise<string[]> {
  const bookmarks = await getStorageItem<string[]>(BOOKMARKS_KEY);
  return bookmarks ?? [];
}

/**
 * 북마크 추가
 */
export async function addBookmark(questionId: string): Promise<void> {
  const current = await getBookmarks();
  if (!current.includes(questionId)) {
    await setStorageItem(BOOKMARKS_KEY, [...current, questionId]);
  }
}

/**
 * 북마크 제거
 */
export async function removeBookmark(questionId: string): Promise<void> {
  const current = await getBookmarks();
  await setStorageItem(
    BOOKMARKS_KEY,
    current.filter((id) => id !== questionId)
  );
}

/**
 * 특정 문제의 북마크 여부 확인
 */
export async function isBookmarked(questionId: string): Promise<boolean> {
  const current = await getBookmarks();
  return current.includes(questionId);
}

/**
 * 전체 북마크 초기화
 */
export async function clearBookmarks(): Promise<void> {
  await setStorageItem(BOOKMARKS_KEY, []);
}
