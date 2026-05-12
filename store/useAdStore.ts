import { create } from 'zustand';

interface AdStore {
  bannerHeight: number;
  setBannerHeight: (height: number) => void;
}

export const useAdStore = create<AdStore>()((set) => ({
  bannerHeight: 0,
  setBannerHeight: (height) => set({ bannerHeight: height }),
}));