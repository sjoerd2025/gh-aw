import { useEffect, useRef, useCallback } from 'react';
import { create } from 'zustand';
import { useWorkflowStore } from '../stores/workflowStore';
import type { WorkflowState } from '../types/workflow';

/* ── Snapshot type (only the serializable workflow data fields) ──── */

type WorkflowSnapshot = Pick<
  WorkflowState,
  | 'name'
  | 'description'
  | 'trigger'
  | 'permissions'
  | 'engine'
  | 'tools'
  | 'toolConfigs'
  | 'instructions'
  | 'safeOutputs'
  | 'network'
  | 'timeoutMinutes'
  | 'imports'
  | 'environment'
  | 'cache'
  | 'strict'
>;

const SNAPSHOT_KEYS: (keyof WorkflowSnapshot)[] = [
  'name', 'description', 'trigger', 'permissions', 'engine',
  'tools', 'toolConfigs', 'instructions', 'safeOutputs', 'network',
  'timeoutMinutes', 'imports', 'environment', 'cache', 'strict',
];

const MAX_HISTORY = 100;
const DEBOUNCE_MS = 500;

function takeSnapshot(state: WorkflowState): WorkflowSnapshot {
  const snap = {} as Record<string, unknown>;
  for (const key of SNAPSHOT_KEYS) {
    snap[key] = state[key];
  }
  return snap as WorkflowSnapshot;
}

/** Shallow-compare the snapshot keys to detect real changes. */
function snapshotsEqual(a: WorkflowSnapshot, b: WorkflowSnapshot): boolean {
  for (const key of SNAPSHOT_KEYS) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/* ── History store ──────────────────────────────────────────────── */

interface HistoryStore {
  past: WorkflowSnapshot[];
  future: WorkflowSnapshot[];
  /** The last snapshot we pushed (used to avoid duplicates). */
  _lastSnapshot: WorkflowSnapshot | null;
  /** Flag to prevent recording during undo/redo apply. */
  _isApplying: boolean;

  pushSnapshot: (snap: WorkflowSnapshot) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  past: [],
  future: [],
  _lastSnapshot: null,
  _isApplying: false,

  pushSnapshot: (snap) => {
    const { _lastSnapshot, _isApplying, past } = get();
    if (_isApplying) return;
    if (_lastSnapshot && snapshotsEqual(_lastSnapshot, snap)) return;

    const newPast = _lastSnapshot ? [...past, _lastSnapshot] : past;
    set({
      past: newPast.length > MAX_HISTORY ? newPast.slice(-MAX_HISTORY) : newPast,
      future: [],
      _lastSnapshot: snap,
    });
  },

  undo: () => {
    const { past, _lastSnapshot } = get();
    if (past.length === 0 || !_lastSnapshot) return;

    const previous = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [_lastSnapshot, ...get().future],
      _lastSnapshot: previous,
      _isApplying: true,
    });
    applySnapshot(previous);
    set({ _isApplying: false });
  },

  redo: () => {
    const { future, _lastSnapshot } = get();
    if (future.length === 0 || !_lastSnapshot) return;

    const next = future[0];
    set({
      past: [...get().past, _lastSnapshot],
      future: future.slice(1),
      _lastSnapshot: next,
      _isApplying: true,
    });
    applySnapshot(next);
    set({ _isApplying: false });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));

/** Apply a snapshot to the workflowStore. */
function applySnapshot(snap: WorkflowSnapshot) {
  useWorkflowStore.getState().loadState(snap);
}

/* ── React hook ─────────────────────────────────────────────────── */

export function useHistory() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to workflowStore and push snapshots with debounce
  useEffect(() => {
    // Capture initial state
    const initial = takeSnapshot(useWorkflowStore.getState());
    useHistoryStore.getState().pushSnapshot(initial);

    const unsubscribe = useWorkflowStore.subscribe((state, prevState) => {
      // Only record when workflow data changes (not UI state)
      const snap = takeSnapshot(state);
      const prevSnap = takeSnapshot(prevState);
      if (snapshotsEqual(snap, prevSnap)) return;

      // Don't record while we're applying undo/redo
      if (useHistoryStore.getState()._isApplying) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        useHistoryStore.getState().pushSnapshot(takeSnapshot(useWorkflowStore.getState()));
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const undo = useCallback(() => useHistoryStore.getState().undo(), []);
  const redo = useCallback(() => useHistoryStore.getState().redo(), []);

  return { undo, redo };
}
