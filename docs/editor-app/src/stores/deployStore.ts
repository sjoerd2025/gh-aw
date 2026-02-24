import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DeployStep = 'auth' | 'repo' | 'deploying' | 'success' | 'error';

export interface ProgressItem {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  error?: string;
}

export interface DeployState {
  token: string | null;
  username: string | null;
  isOpen: boolean;
  step: DeployStep;
  repoSlug: string;
  branchName: string;
  baseBranch: string;
  progress: ProgressItem[];
  prUrl: string | null;
  error: string | null;
  rememberToken: boolean;
  isValidatingToken: boolean;
}

export interface DeployActions {
  openDialog: () => void;
  closeDialog: () => void;
  setStep: (step: DeployStep) => void;
  setToken: (token: string | null) => void;
  setUsername: (username: string | null) => void;
  setRepoSlug: (slug: string) => void;
  setBranchName: (name: string) => void;
  setBaseBranch: (branch: string) => void;
  setProgress: (progress: ProgressItem[]) => void;
  updateProgress: (id: string, update: Partial<ProgressItem>) => void;
  setPrUrl: (url: string | null) => void;
  setError: (error: string | null) => void;
  setRememberToken: (remember: boolean) => void;
  setIsValidatingToken: (validating: boolean) => void;
  reset: () => void;
}

const initialState: DeployState = {
  token: null,
  username: null,
  isOpen: false,
  step: 'auth',
  repoSlug: '',
  branchName: '',
  baseBranch: 'main',
  progress: [],
  prUrl: null,
  error: null,
  rememberToken: true,
  isValidatingToken: false,
};

export const useDeployStore = create<DeployState & DeployActions>()(
  persist(
    (set) => ({
      ...initialState,

      openDialog: () => set((s) => ({
        isOpen: true,
        step: s.token && s.username ? 'repo' : 'auth',
        error: null,
        prUrl: null,
        progress: [],
      })),

      closeDialog: () => set({ isOpen: false }),

      setStep: (step) => set({ step }),
      setToken: (token) => set({ token }),
      setUsername: (username) => set({ username }),
      setRepoSlug: (slug) => set({ repoSlug: slug }),
      setBranchName: (name) => set({ branchName: name }),
      setBaseBranch: (branch) => set({ baseBranch: branch }),
      setProgress: (progress) => set({ progress }),
      updateProgress: (id, update) =>
        set((s) => ({
          progress: s.progress.map((p) =>
            p.id === id ? { ...p, ...update } : p
          ),
        })),
      setPrUrl: (url) => set({ prUrl: url }),
      setError: (error) => set({ error }),
      setRememberToken: (remember) => set({ rememberToken: remember }),
      setIsValidatingToken: (validating) => set({ isValidatingToken: validating }),

      reset: () => set({ ...initialState, isOpen: false }),
    }),
    {
      name: 'deploy-store',
      partialize: (state) =>
        state.rememberToken
          ? { token: state.token, username: state.username, rememberToken: state.rememberToken }
          : { rememberToken: state.rememberToken },
    }
  )
);
