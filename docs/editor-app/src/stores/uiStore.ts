import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SidebarTab = 'palette' | 'templates' | 'components';
export type MobilePane = 'canvas' | 'properties' | 'sidebar' | 'export';

export interface UIState {
  // Panel visibility
  sidebarOpen: boolean;
  propertiesPanelOpen: boolean;
  yamlPreviewOpen: boolean;

  // Sidebar tab
  sidebarTab: SidebarTab;

  // Theme
  theme: 'light' | 'dark' | 'auto';

  // Disclosure level
  disclosureLevel: 1 | 2 | 3;

  // Onboarding
  hasSeenOnboarding: boolean;
  guidedTourStep: number | null;

  // Auto-compile toggle
  autoCompile: boolean;

  // Shortcuts help overlay
  showShortcutsHelp: boolean;

  // Mobile layout
  mobilePane: MobilePane;
}

export interface UIActions {
  toggleSidebar: () => void;
  togglePropertiesPanel: () => void;
  toggleYamlPreview: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setDisclosureLevel: (level: 1 | 2 | 3) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
  setGuidedTourStep: (step: number | null) => void;
  setAutoCompile: (enabled: boolean) => void;
  setShowShortcutsHelp: (show: boolean) => void;
  setMobilePane: (pane: MobilePane) => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      propertiesPanelOpen: true,
      yamlPreviewOpen: false,
      sidebarTab: 'palette' as SidebarTab,
      theme: 'auto',
      disclosureLevel: 1,
      hasSeenOnboarding: false,
      guidedTourStep: null,
      autoCompile: true,
      showShortcutsHelp: false,
      mobilePane: 'canvas' as MobilePane,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      togglePropertiesPanel: () => set((s) => ({ propertiesPanelOpen: !s.propertiesPanelOpen })),
      toggleYamlPreview: () => set((s) => ({ yamlPreviewOpen: !s.yamlPreviewOpen })),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      setTheme: (theme) => set({ theme }),
      setDisclosureLevel: (disclosureLevel) => set({ disclosureLevel }),
      setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
      setGuidedTourStep: (guidedTourStep) => set({ guidedTourStep }),
      setAutoCompile: (autoCompile) => set({ autoCompile }),
      setShowShortcutsHelp: (showShortcutsHelp) => set({ showShortcutsHelp }),
      setMobilePane: (mobilePane) => set({ mobilePane }),
    }),
    {
      name: 'workflow-editor-ui',
    }
  )
);
