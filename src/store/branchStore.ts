import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActiveBranch = 'casa' | 'moda' | 'collezione-home';

interface BranchStore {
  branch: ActiveBranch;
  setBranch: (b: ActiveBranch) => void;
}

export const useBranchStore = create<BranchStore>()(
  persist(
    (set) => ({
      branch: 'casa',
      setBranch: (b) => set({ branch: b }),
    }),
    { name: 'onearth-branch' },
  ),
);
