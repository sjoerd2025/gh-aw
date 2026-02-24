import { useEffect, useRef, lazy, Suspense } from 'react';
import { Header } from './components/Header/Header';
import { ErrorPanel } from './components/ErrorPanel/ErrorPanel';
import { MobileTabBar } from './components/shared/MobileTabBar';
import { useUIStore } from './stores/uiStore';
import { useWorkflowStore } from './stores/workflowStore';
import { useAutoCompile } from './hooks/useAutoCompile';
import { useFieldHighlight } from './hooks/useFieldHighlight';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useHistory } from './hooks/useHistory';
import { initCompiler } from './utils/compiler';
import { parseHash, decodeState } from './utils/deepLink';
import { toast } from './utils/lazyToast';
import './styles/globals.css';
import './styles/nodes.css';
import './styles/panels.css';

// Lazy-load heavy components that are not needed for initial render
const Sidebar = lazy(() => import('./components/Sidebar/Sidebar').then(m => ({ default: m.Sidebar })));
const PropertiesPanel = lazy(() => import('./components/Panels/PropertiesPanel').then(m => ({ default: m.PropertiesPanel })));
const EditorView = lazy(() => import('./components/EditorView/EditorView').then(m => ({ default: m.EditorView })));
const YamlPreview = lazy(() => import('./components/YamlPreview/YamlPreview').then(m => ({ default: m.YamlPreview })));
const WelcomeModal = lazy(() => import('./components/Onboarding/WelcomeModal').then(m => ({ default: m.WelcomeModal })));
const LazyToaster = lazy(() => import('sonner').then(m => ({ default: m.Toaster })));
const ShortcutsHelp = lazy(() => import('./components/shared/ShortcutsHelp').then(m => ({ default: m.ShortcutsHelp })));
const GuidedTour = lazy(() => import('./components/Onboarding/GuidedTour').then(m => ({ default: m.GuidedTour })));

// Canvas is large (~220KB with ReactFlow) -- lazy load with a loading skeleton
const CanvasWithProvider = lazy(() => import('./components/Canvas/CanvasWithProvider'));

/** Lightweight placeholder shown while the canvas (ReactFlow ~220KB) loads */
function CanvasPlaceholder() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-subtle, #f6f8fa)',
      color: 'var(--color-fg-muted, #656d76)',
      fontSize: 14,
    }}>
      Loading canvas...
    </div>
  );
}

export default function App() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const propertiesPanelOpen = useUIStore((s) => s.propertiesPanelOpen);
  const yamlPreviewOpen = useUIStore((s) => s.yamlPreviewOpen);
  const hasSeenOnboarding = useUIStore((s) => s.hasSeenOnboarding);
  const guidedTourStep = useUIStore((s) => s.guidedTourStep);
  const theme = useUIStore((s) => s.theme);

  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const viewMode = useWorkflowStore((s) => s.viewMode);
  const isCompiling = useWorkflowStore((s) => s.isCompiling);
  const error = useWorkflowStore((s) => s.error);
  const warnings = useWorkflowStore((s) => s.warnings);
  const setIsReady = useWorkflowStore((s) => s.setIsReady);
  const setError = useWorkflowStore((s) => s.setError);

  // Aria-live status announcements
  const statusRef = useRef('');
  const prevCompilingRef = useRef(false);

  useEffect(() => {
    if (isCompiling && !prevCompilingRef.current) {
      statusRef.current = 'Compiling workflow...';
    } else if (!isCompiling && prevCompilingRef.current) {
      if (error) {
        statusRef.current = `Compilation failed: ${error.message}`;
      } else if (warnings.length > 0) {
        statusRef.current = `Compilation completed with ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`;
      } else {
        statusRef.current = 'Compilation succeeded';
      }
    }
    prevCompilingRef.current = isCompiling;
  }, [isCompiling, error, warnings]);

  // Initialize WASM compiler in background -- does NOT block UI render
  useEffect(() => {
    const wasmPath = `${import.meta.env.BASE_URL}wasm/`;
    initCompiler(wasmPath)
      .then(() => setIsReady(true))
      .catch((err) => {
        setError({ message: `Compiler initialization failed: ${err instanceof Error ? err.message : String(err)}`, severity: 'error' });
      });
  }, [setIsReady, setError]);

  useAutoCompile();
  useFieldHighlight();
  useKeyboardShortcuts();
  useHistory();

  // Load workflow from URL hash on mount
  useEffect(() => {
    const { mode, value } = parseHash();
    if (mode === 'b64' && value) {
      const state = decodeState(value);
      if (state) {
        useWorkflowStore.getState().loadState(state);
        toast.success('Workflow loaded from share link');
      }
    } else if (mode === 'url' && value) {
      fetch(value)
        .then((r) => r.text())
        .then((md) => {
          useWorkflowStore.getState().setCompiledMarkdown(md);
          useWorkflowStore.getState().setViewMode('markdown');
          toast.success('Workflow loaded from URL');
        })
        .catch(() => toast.error('Failed to load workflow from URL'));
    }
  }, []);

  // Dark/light mode: respect uiStore theme setting
  useEffect(() => {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-color-mode', theme);
      return;
    }
    // 'auto' — follow system preference
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.setAttribute('data-color-mode', mq.matches ? 'dark' : 'light');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const isVisualMode = viewMode === 'visual';
  const showProperties = isVisualMode && propertiesPanelOpen && selectedNodeId !== null;

  const layoutClasses = [
    'app-layout',
    !isVisualMode ? 'editor-mode' : '',
    sidebarOpen && isVisualMode ? '' : 'sidebar-collapsed',
    showProperties ? 'properties-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* Skip navigation links */}
      <a href="#canvas-region" className="skip-nav">Skip to canvas</a>
      <a href="#properties-region" className="skip-nav" style={{ left: 160 }}>Skip to properties</a>
      <a href="#sidebar-region" className="skip-nav" style={{ left: 320 }}>Skip to sidebar</a>

      {/* Aria-live region for status announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {statusRef.current}
      </div>

      <div className={layoutClasses}>
        <div className="app-header">
          <Header />
        </div>
        {isVisualMode ? (
          <>
            {/* Overlay backdrop for tablet/mobile sidebar and properties */}
            {(sidebarOpen || showProperties) && (
              <div
                className="overlay-backdrop"
                onClick={() => {
                  if (sidebarOpen) useUIStore.getState().toggleSidebar();
                  if (showProperties) useUIStore.getState().togglePropertiesPanel();
                }}
              />
            )}
            <nav className="app-sidebar" id="sidebar-region" aria-label="Workflow components">
              {sidebarOpen && (
                <Suspense fallback={null}>
                  <Sidebar />
                </Suspense>
              )}
            </nav>
            <main className="app-canvas" id="canvas-region" aria-label="Workflow canvas">
              <Suspense fallback={<CanvasPlaceholder />}>
                <CanvasWithProvider />
              </Suspense>
            </main>
            {showProperties && (
              <aside className="app-properties" id="properties-region" aria-label="Node properties">
                <Suspense fallback={null}>
                  <PropertiesPanel />
                </Suspense>
              </aside>
            )}
          </>
        ) : (
          <main className="app-editor" aria-label="Workflow editor">
            <Suspense fallback={null}>
              <EditorView />
            </Suspense>
          </main>
        )}
        {/* In editor mode, errors/warnings are shown inline in the YAML pane */}
        {isVisualMode && (
          <div className="app-error-panel" role="status">
            <ErrorPanel />
          </div>
        )}
        {isVisualMode && <MobileTabBar />}
      </div>
      {isVisualMode && yamlPreviewOpen && (
        <Suspense fallback={null}>
          <YamlPreview />
        </Suspense>
      )}
      {!hasSeenOnboarding && (
        <Suspense fallback={null}>
          <WelcomeModal />
        </Suspense>
      )}
      {guidedTourStep !== null && (
        <Suspense fallback={null}>
          <GuidedTour />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <ShortcutsHelp />
      </Suspense>
      <Suspense fallback={null}>
        <LazyToaster position="bottom-right" theme={theme === 'auto' ? 'system' : theme} />
      </Suspense>
    </>
  );
}
