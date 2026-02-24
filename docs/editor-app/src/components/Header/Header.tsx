import { useState } from 'react';
import {
  Play, Loader2,
  CircleCheck, CircleAlert, AlertTriangle, PanelLeftClose, PanelLeft,
  LayoutDashboard, Code2, Trash2, FilePlus, Undo, Redo,
} from 'lucide-react';
import { toast } from '../../utils/lazyToast';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useUIStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../hooks/useHistory';
import { ExportMenu } from './ExportMenu';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const name = useWorkflowStore((s) => s.name);
  const setName = useWorkflowStore((s) => s.setName);
  const isCompiling = useWorkflowStore((s) => s.isCompiling);
  const error = useWorkflowStore((s) => s.error);
  const warnings = useWorkflowStore((s) => s.warnings);
  const viewMode = useWorkflowStore((s) => s.viewMode);
  const setViewMode = useWorkflowStore((s) => s.setViewMode);

  const {
    autoCompile, setAutoCompile,
    sidebarOpen, toggleSidebar,
  } = useUIStore();

  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  const [clearHovered, setClearHovered] = useState(false);

  const hasWarnings = warnings.length > 0 && !error;
  const statusIcon = isCompiling
    ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
    : error ? <CircleAlert size={14} />
    : hasWarnings ? <AlertTriangle size={14} />
    : <CircleCheck size={14} />;
  const statusColor = isCompiling ? 'var(--color-accent-fg, #0969da)' : error ? 'var(--color-danger-fg, #cf222e)' : hasWarnings ? 'var(--color-warning-fg, #d4a72c)' : 'var(--color-success-fg, #1a7f37)';
  const statusText = isCompiling ? 'Compiling...' : error ? 'Error' : hasWarnings ? `${warnings.length} warning${warnings.length !== 1 ? 's' : ''}` : 'Ready';

  const handleClear = () => {
    if (!window.confirm('Are you sure? This will clear your entire workflow.')) return;
    useWorkflowStore.getState().reset();
    localStorage.removeItem('workflow-editor-state');
    toast.success('Canvas cleared');
  };

  const handleNewWorkflow = () => {
    if (!window.confirm('Start a new workflow? This will clear your current work.')) return;
    useWorkflowStore.getState().reset();
    localStorage.removeItem('workflow-editor-state');
    useUIStore.getState().setHasSeenOnboarding(false);
    toast.success('Starting new workflow');
  };

  const scrollToErrorPanel = () => {
    document.getElementById('error-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 48,
      borderBottom: '1px solid var(--color-border-default, #d0d7de)',
      background: 'var(--color-bg-default, #ffffff)',
      transition: 'background 0.15s ease, border-color 0.15s ease',
    }}>
      {/* Sidebar toggle */}
      {viewMode === 'visual' && (
        <button
          onClick={toggleSidebar}
          style={iconButtonStyle}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <PanelLeftClose size={16} aria-hidden="true" /> : <PanelLeft size={16} aria-hidden="true" />}
        </button>
      )}

      {/* View mode toggle */}
      <div style={viewToggleContainerStyle} role="radiogroup" aria-label="View mode">
        <button
          onClick={() => setViewMode('visual')}
          style={{ ...viewToggleButtonStyle, ...(viewMode === 'visual' ? viewToggleActiveStyle : {}) }}
          role="radio"
          aria-checked={viewMode === 'visual'}
          aria-label="Visual editor"
        >
          <LayoutDashboard size={14} aria-hidden="true" /> Visual
        </button>
        <button
          onClick={() => setViewMode('markdown')}
          style={{ ...viewToggleButtonStyle, ...(viewMode === 'markdown' ? viewToggleActiveStyle : {}) }}
          role="radio"
          aria-checked={viewMode === 'markdown'}
          aria-label="Code editor"
        >
          <Code2 size={14} aria-hidden="true" /> Editor
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 20, background: 'var(--color-border-default, #d0d7de)', flexShrink: 0 }} />

      {/* Workflow name */}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="workflow-name"
        aria-label="Workflow name"
        className="header-workflow-name"
        style={{
          border: '1px solid transparent', borderRadius: 6, padding: '3px 8px',
          fontSize: 14, fontWeight: 600, background: 'transparent',
          color: 'var(--color-fg-default, #1f2328)', width: 180, outline: 'none',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--color-border-default, #d0d7de)')}
        onBlur={(e) => (e.target.style.borderColor = 'transparent')}
      />

      {/* Status badge */}
      <div
        role={error || hasWarnings ? 'button' : 'status'}
        tabIndex={error || hasWarnings ? 0 : undefined}
        onClick={error || hasWarnings ? scrollToErrorPanel : undefined}
        onKeyDown={error || hasWarnings ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToErrorPanel(); } } : undefined}
        aria-label={`Compilation status: ${statusText}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500,
          color: statusColor, padding: '2px 8px', borderRadius: 12,
          background: `color-mix(in srgb, ${statusColor} 10%, transparent)`,
          cursor: error || hasWarnings ? 'pointer' : 'default',
          transition: 'opacity 0.15s ease',
        }}
      >
        {statusIcon}
        <span>{statusText}</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Auto-compile */}
      <label className="header-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-fg-muted, #656d76)', cursor: 'pointer', userSelect: 'none' }}>
        <input type="checkbox" checked={autoCompile} onChange={(e) => setAutoCompile(e.target.checked)} style={{ accentColor: 'var(--color-accent-fg, #0969da)' }} />
        Auto
      </label>

      {/* Undo / Redo */}
      <button onClick={undo} disabled={!canUndo} style={{ ...iconButtonStyle, opacity: canUndo ? 1 : 0.35, cursor: canUndo ? 'pointer' : 'default' }} title="Undo (Ctrl+Z)" aria-label="Undo (Ctrl+Z)">
        <Undo size={16} aria-hidden="true" />
      </button>
      <button onClick={redo} disabled={!canRedo} style={{ ...iconButtonStyle, opacity: canRedo ? 1 : 0.35, cursor: canRedo ? 'pointer' : 'default' }} title="Redo (Ctrl+Shift+Z)" aria-label="Redo (Ctrl+Shift+Z)">
        <Redo size={16} aria-hidden="true" />
      </button>

      {/* Compile */}
      <button onClick={() => toast.info('Compilation triggered')} disabled={isCompiling}
        aria-label={isCompiling ? 'Compiling...' : 'Compile workflow'}
        style={{ ...actionButtonStyle, opacity: isCompiling ? 0.6 : 1, cursor: isCompiling ? 'not-allowed' : 'pointer' }}>
        <Play size={14} aria-hidden="true" /> <span className="header-btn-label">Compile</span>
      </button>

      {/* New workflow */}
      <button onClick={handleNewWorkflow} className="header-desktop-only" style={actionButtonStyle} title="Start new workflow" aria-label="Start new workflow">
        <FilePlus size={14} aria-hidden="true" /> <span className="header-btn-label">New</span>
      </button>

      {/* Clear canvas */}
      <button onClick={handleClear}
        className="header-desktop-only"
        onMouseEnter={() => setClearHovered(true)} onMouseLeave={() => setClearHovered(false)}
        style={{
          ...actionButtonStyle,
          color: clearHovered ? 'var(--color-danger-fg, #cf222e)' : 'var(--color-fg-muted, #656d76)',
          borderColor: clearHovered ? 'var(--color-danger-fg, #cf222e)' : 'var(--color-border-default, #d0d7de)',
          transition: 'color 0.15s ease, border-color 0.15s ease, background 0.15s ease',
        }}
        title="Clear canvas"
        aria-label="Clear canvas">
        <Trash2 size={14} aria-hidden="true" /> <span className="header-btn-label">Clear</span>
      </button>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Export dropdown */}
      <ExportMenu />

    </header>
  );
}

const iconButtonStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 6, color: 'var(--color-fg-muted, #656d76)', borderRadius: 6,
  width: 32, height: 32,
  transition: 'background 0.15s ease, color 0.15s ease',
};

const actionButtonStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
  fontSize: 13, fontWeight: 500,
  border: '1px solid var(--color-border-default, #d0d7de)', borderRadius: 6,
  background: 'var(--color-bg-default, #ffffff)',
  color: 'var(--color-fg-default, #1f2328)', cursor: 'pointer',
  transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
};

const viewToggleContainerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 0,
  border: '1px solid var(--color-border-default, #d0d7de)', borderRadius: 8,
  overflow: 'hidden', background: 'var(--color-bg-subtle, #f6f8fa)',
};

const viewToggleButtonStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
  fontSize: 12, fontWeight: 500, border: 'none', background: 'transparent',
  color: 'var(--color-fg-muted, #656d76)', cursor: 'pointer',
  transition: 'background 0.15s ease, color 0.15s ease',
};

const viewToggleActiveStyle: React.CSSProperties = {
  background: 'var(--color-bg-default, #ffffff)',
  color: 'var(--color-fg-default, #1f2328)',
  fontWeight: 600,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
};
