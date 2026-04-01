/**
 * 북마크 커스텀 훅
 * 북마크 상태를 관리하고 추가/제거 기능을 제공하는 훅
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getBookmarks,
  addBookmark,
  removeBookmark,
  clearBookmarks,
} from '../services/bookmarkService';

interface UseBookmarksReturn {
  /** 북마크된 문제 ID 목록 */
  bookmarks: string[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 특정 문제의 북마크 여부 확인 */
  isBookmarked: (questionId: string) => boolean;
  /** 북마크 추가/제거 토글 */
  toggleBookmark: (questionId: string) => Promise<void>;
  /** 전체 북마크 초기화 */
  clearAllBookmarks: () => Promise<void>;
}

export const useBookmarks = (): UseBookmarksReturn => {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 북마크 목록 로드
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const saved = await getBookmarks();
        setBookmarks(saved);
      } catch (error) {
        console.warn('[useBookmarks] 북마크 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookmarks();
  }, []);

  /** 특정 문제의 북마크 여부 확인 */
  const isBookmarked = useCallback(
    (questionId: string): boolean => bookmarks.includes(questionId),
    [bookmarks]
  );

  /** 북마크 추가/제거 토글 */
  const toggleBookmark = useCallback(
    async (questionId: string): Promise<void> => {
      try {
        if (bookmarks.includes(questionId)) {
          await removeBookmark(questionId);
          setBookmarks((prev) => prev.filter((id) => id !== questionId));
        } else {
          await addBookmark(questionId);
          setBookmarks((prev) => [...prev, questionId]);
        }
      } catch (error) {
        console.warn('[useBookmarks] 북마크 토글 실패:', error);
      }
    },
    [bookmarks]
  );

  /** 전체 북마크 초기화 */
  const clearAllBookmarks = useCallback(async (): Promise<void> => {
    try {
      await clearBookmarks();
      setBookmarks([]);
    } catch (error) {
      console.warn('[useBookmarks] 북마크 초기화 실패:', error);
    }
  }, []);

  return { bookmarks, isLoading, isBookmarked, toggleBookmark, clearAllBookmarks };
};
