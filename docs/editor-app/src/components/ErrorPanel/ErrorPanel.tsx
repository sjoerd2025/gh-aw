import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflowStore';
import { parseCompilerError } from '../../utils/errorParser';
import type { CompilerError, LintResult } from '../../types/workflow';

/** Map node IDs to human-readable labels */
const nodeLabels: Record<string, string> = {
  trigger: 'Trigger',
  engine: 'Engine',
  safeOutputs: 'Safe Outputs',
  tools: 'Tools',
  network: 'Network',
  instructions: 'Instructions',
};

/** Default field path for a node when no specific field is available */
const defaultNodeFieldPaths: Record<string, string> = {
  trigger: 'trigger.event',
  engine: 'engine.type',
  safeOutputs: 'safeOutputs',
  network: 'network.allowed',
  tools: 'tools',
};

/** Map lint ruleIds to the field path they relate to */
const lintRuleFieldPaths: Record<string, string> = {
  'write-all-permissions': 'safeOutputs',
  'contents-write-unused': 'safeOutputs',
  'missing-network-config': 'network.allowed',
  'missing-safe-outputs': 'safeOutputs',
  'id-token-write': 'safeOutputs',
  'contents-actions-write': 'safeOutputs',
};

const COLLAPSED_LIMIT = 4;
const SHOW_MORE_CHAR_THRESHOLD = 200;

export function ErrorPanel() {
  const error = useWorkflowStore((s) => s.error);
  const warnings = useWorkflowStore((s) => s.warnings);
  const lintResults = useWorkflowStore((s) => s.lintResults) ?? [];
  const isCompiling = useWorkflowStore((s) => s.isCompiling);
  const setError = useWorkflowStore((s) => s.setError);
  const setWarnings = useWorkflowStore((s) => s.setWarnings);
  const setLintResults = useWorkflowStore((s) => s.setLintResults);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const setHighlightFieldPath = useWorkflowStore((s) => s.setHighlightFieldPath);

  const [warningsExpanded, setWarningsExpanded] = useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);

  // Nothing to display
  if (!error && warnings.length === 0 && lintResults.length === 0 && !isCompiling) {
    return null;
  }

  const showAllWarnings = warningsExpanded || warnings.length <= COLLAPSED_LIMIT;
  const visibleWarnings = showAllWarnings ? warnings : warnings.slice(0, COLLAPSED_LIMIT);
  const hiddenWarningCount = warnings.length - COLLAPSED_LIMIT;

  const showAllSuggestions = suggestionsExpanded || lintResults.length <= COLLAPSED_LIMIT;
  const visibleSuggestions = showAllSuggestions ? lintResults : lintResults.slice(0, COLLAPSED_LIMIT);
  const hiddenSuggestionCount = lintResults.length - COLLAPSED_LIMIT;

  const handleNavigate = (nodeId: string, fieldPath?: string | null) => {
    selectNode(nodeId);
    setHighlightFieldPath(fieldPath ?? defaultNodeFieldPaths[nodeId] ?? null);
  };

  return (
    <div id="error-panel">
      {/* ── Compiling card ── */}
      {isCompiling && (
        <div className="error-card" role="status" aria-live="polite">
          <div className="error-card__stripe error-card__stripe--compiling" />
          <div className="error-card__content">
            <div className="error-card__header">
              <span className="error-card__icon error-card__icon--compiling">
                <Loader2 size={13} className="error-card__spinner" aria-hidden="true" />
              </span>
              <span className="error-card__title">Compiling</span>
              <span className="error-card__message" style={{ marginLeft: 4 }}>Building workflow...</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Error card ── */}
      {error && (
        <ErrorCard
          error={error}
          onDismiss={() => setError(null)}
          onNavigate={handleNavigate}
        />
      )}

      {/* ── Warning cards ── */}
      {visibleWarnings.map((w, i) => (
        <WarningCard
          key={`warn-${i}`}
          message={w}
          onDismiss={() => setWarnings(warnings.filter((_, idx) => idx !== i))}
          onNavigate={handleNavigate}
        />
      ))}
      {warnings.length > COLLAPSED_LIMIT && (
        <button
          className="error-card__expand-btn"
          onClick={() => setWarningsExpanded(!warningsExpanded)}
          aria-expanded={warningsExpanded}
        >
          {showAllWarnings ? (
            <>
              <ChevronUp size={12} aria-hidden="true" />
              Show fewer warnings
            </>
          ) : (
            <>
              <ChevronDown size={12} aria-hidden="true" />
              Show {hiddenWarningCount} more {hiddenWarningCount === 1 ? 'warning' : 'warnings'}
            </>
          )}
        </button>
      )}

      {/* ── Suggestion (lint) cards ── */}
      {visibleSuggestions.map((lint, i) => (
        <SuggestionCard
          key={`lint-${lint.ruleId}-${i}`}
          lint={lint}
          onNavigate={handleNavigate}
        />
      ))}
      {lintResults.length > COLLAPSED_LIMIT && (
        <button
          className="error-card__expand-btn"
          onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
          aria-expanded={suggestionsExpanded}
        >
          {showAllSuggestions ? (
            <>
              <ChevronUp size={12} aria-hidden="true" />
              Show fewer suggestions
            </>
          ) : (
            <>
              <ChevronDown size={12} aria-hidden="true" />
              Show {hiddenSuggestionCount} more
            </>
          )}
        </button>
      )}

      {/* Dismiss all button for warnings/suggestions */}
      {(warnings.length > 1 || lintResults.length > 1) && (
        <button
          className="error-card__expand-btn"
          onClick={() => {
            if (warnings.length > 0) setWarnings([]);
            if (lintResults.length > 0) setLintResults([]);
          }}
        >
          <X size={11} aria-hidden="true" />
          Dismiss all
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Error Card — handles structured CompilerError
   ──────────────────────────────────────────────────────────── */
function ErrorCard({
  error,
  onDismiss,
  onNavigate,
}: {
  error: CompilerError;
  onDismiss: () => void;
  onNavigate: (nodeId: string, fieldPath?: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const msg = error.message;
  const parsed = parseCompilerError(error);

  // Prefer structured fields from CompilerError, fall back to parsed heuristics
  const suggestion = error.suggestion ?? parsed.suggestion;
  const docsUrl = error.docsUrl ?? parsed.docsUrl;
  const fieldPath = error.field ?? parsed.fieldPath;
  const nodeId = parsed.nodeId;
  const isLong = msg.length > SHOW_MORE_CHAR_THRESHOLD;

  // Build a label from the structured error or the parser
  const label = parsed.label;

  return (
    <div className="error-card" role="alert">
      <div className="error-card__stripe error-card__stripe--error" />
      <div className="error-card__content">
        <div className="error-card__header">
          <span className="error-card__icon error-card__icon--error">
            <AlertTriangle size={13} aria-hidden="true" />
          </span>
          <span className="error-card__title">{label}</span>
          {error.line != null && (
            <span className="error-card__severity-badge error-card__severity-badge--info">
              line {error.line}
            </span>
          )}
          <div className="error-card__actions">
            {docsUrl && (
              <a
                className="error-card__learn-link"
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more
                <ExternalLink size={10} aria-hidden="true" />
              </a>
            )}
            {nodeId && (
              <button
                className="error-card__nav-btn"
                onClick={() => onNavigate(nodeId, fieldPath)}
                title={`Go to ${nodeLabels[nodeId] ?? nodeId}`}
              >
                {nodeLabels[nodeId] ?? nodeId}
                <ArrowRight size={11} aria-hidden="true" />
              </button>
            )}
            <button
              className="error-card__dismiss"
              onClick={onDismiss}
              title="Dismiss"
              aria-label="Dismiss error"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={`error-card__message ${isLong && !expanded ? 'error-card__message--truncated' : ''}`}>
          {msg}
        </div>
        {isLong && (
          <button className="error-card__toggle-more" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
        {suggestion && (
          <div className="error-card__suggestion">
            <Lightbulb size={11} aria-hidden="true" />
            <span>{suggestion}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Warning Card — handles plain string warnings
   ──────────────────────────────────────────────────────────── */
function WarningCard({
  message,
  onDismiss,
  onNavigate,
}: {
  message: string;
  onDismiss: () => void;
  onNavigate: (nodeId: string, fieldPath?: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseCompilerError(message);
  const isLong = message.length > SHOW_MORE_CHAR_THRESHOLD;

  return (
    <div className="error-card" role="status">
      <div className="error-card__stripe error-card__stripe--warning" />
      <div className="error-card__content">
        <div className="error-card__header">
          <span className="error-card__icon error-card__icon--warning">
            <AlertCircle size={13} aria-hidden="true" />
          </span>
          <span className="error-card__title">Warning</span>
          <div className="error-card__actions">
            {parsed.nodeId && (
              <button
                className="error-card__nav-btn"
                onClick={() => onNavigate(parsed.nodeId!, parsed.fieldPath)}
                title={`Go to ${nodeLabels[parsed.nodeId] ?? parsed.nodeId}`}
              >
                {nodeLabels[parsed.nodeId] ?? parsed.nodeId}
                <ArrowRight size={11} aria-hidden="true" />
              </button>
            )}
            <button
              className="error-card__dismiss"
              onClick={onDismiss}
              title="Dismiss"
              aria-label="Dismiss warning"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={`error-card__message ${isLong && !expanded ? 'error-card__message--truncated' : ''}`}>
          {parsed.detail}
        </div>
        {isLong && (
          <button className="error-card__toggle-more" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
        {parsed.suggestion && (
          <div className="error-card__suggestion">
            <Lightbulb size={11} aria-hidden="true" />
            <span>{parsed.suggestion}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Suggestion Card (lint result)
   ──────────────────────────────────────────────────────────── */
function SuggestionCard({
  lint,
  onNavigate,
}: {
  lint: LintResult;
  onNavigate: (nodeId: string, fieldPath?: string | null) => void;
}) {
  return (
    <div className="error-card" role="status">
      <div className={`error-card__stripe error-card__stripe--${lint.severity === 'warning' ? 'warning' : 'info'}`} />
      <div className="error-card__content">
        <div className="error-card__header">
          <span className={`error-card__icon error-card__icon--${lint.severity === 'warning' ? 'warning' : 'info'}`}>
            {lint.severity === 'warning' ? (
              <AlertCircle size={13} aria-hidden="true" />
            ) : (
              <Info size={13} aria-hidden="true" />
            )}
          </span>
          <span className={`error-card__severity-badge error-card__severity-badge--${lint.severity}`}>
            {lint.severity}
          </span>
          <span className="error-card__message" style={{ flex: 1 }}>{lint.message}</span>
          <div className="error-card__actions">
            <button
              className="error-card__nav-btn"
              onClick={() => onNavigate(lint.nodeId, lintRuleFieldPaths[lint.ruleId] ?? defaultNodeFieldPaths[lint.nodeId])}
              title={`Go to ${nodeLabels[lint.nodeId] ?? lint.nodeId}`}
            >
              {nodeLabels[lint.nodeId] ?? lint.nodeId}
              <ArrowRight size={11} aria-hidden="true" />
            </button>
          </div>
        </div>
        {lint.suggestion && (
          <div className="error-card__suggestion">
            <Lightbulb size={11} aria-hidden="true" />
            <span>{lint.suggestion}</span>
          </div>
        )}
      </div>
    </div>
  );
}
