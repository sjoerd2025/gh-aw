import { useEffect } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';
import { useUIStore } from '../stores/uiStore';
import { useHistoryStore } from './useHistory';

/**
 * Central keyboard shortcut handler.
 * Mod = Ctrl (Windows/Linux) or Cmd (macOS).
 *
 * Shortcuts:
 *  - Mod+S         Download .md file
 *  - Mod+E         Toggle view mode (visual <-> markdown)
 *  - Mod+Shift+E   Toggle YAML preview panel
 *  - Delete/Backspace  Delete selected node (visual mode only, no input focused)
 *  - Escape        Deselect node / close panel
 *  - ?             Show keyboard shortcuts help
 *  - Mod+Z         Undo  (added by P2-04)
 *  - Mod+Shift+Z   Redo  (added by P2-04)
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // When the user is typing in an input/textarea, only capture Mod+key combos
      if (isInput && !isMod) return;

      const viewMode = useWorkflowStore.getState().viewMode;
      const isVisual = viewMode === 'visual';

      // --- Mod+S  →  Download .md ------------------------------------------
      if (isMod && e.key === 's') {
        e.preventDefault();
        downloadMarkdown();
        return;
      }

      // --- Mod+E  →  Toggle view mode --------------------------------------
      if (isMod && e.key === 'e' && !e.shiftKey) {
        e.preventDefault();
        const next = isVisual ? 'markdown' : 'visual';
        useWorkflowStore.getState().setViewMode(next);
        return;
      }

      // --- Mod+Shift+E  →  Toggle YAML preview -----------------------------
      if (isMod && e.key === 'E' && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleYamlPreview();
        return;
      }

      // --- Mod+Z  →  Undo ---------------------------------------------------
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useHistoryStore.getState().undo();
        return;
      }

      // --- Mod+Shift+Z  →  Redo ---------------------------------------------
      if (isMod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        useHistoryStore.getState().redo();
        return;
      }

      // --- Escape  →  Deselect node / close shortcuts help ------------------
      if (e.key === 'Escape') {
        // Close shortcuts help if open
        if (useUIStore.getState().showShortcutsHelp) {
          useUIStore.getState().setShowShortcutsHelp(false);
          return;
        }
        useWorkflowStore.getState().selectNode(null);
        return;
      }

      // --- Delete / Backspace  →  Delete selected node (visual mode) --------
      if ((e.key === 'Delete' || e.key === 'Backspace') && isVisual && !isInput) {
        const selectedNodeId = useWorkflowStore.getState().selectedNodeId;
        if (selectedNodeId) {
          e.preventDefault();
          // Dispatch a custom event that the Canvas can listen to
          window.dispatchEvent(
            new CustomEvent('aw:delete-node', { detail: { nodeId: selectedNodeId } }),
          );
        }
        return;
      }

      // --- ?  →  Show shortcuts help ----------------------------------------
      if (e.key === '?' && !isMod && !isInput) {
        useUIStore.getState().setShowShortcutsHelp(true);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

/** Download the compiled markdown as a .md file */
function downloadMarkdown() {
  const { name, compiledMarkdown } = useWorkflowStore.getState();
  if (!compiledMarkdown) return;

  const filename = `${name || 'workflow'}.md`;
  const blob = new Blob([compiledMarkdown], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
