import { useState, useMemo } from 'react';
import { computeDiff, countChanges, type DiffLine } from '../../utils/diffView';

interface DiffViewProps {
  oldText: string;
  newText: string;
}

export function DiffView({ oldText, newText }: DiffViewProps) {
  const [changesOnly, setChangesOnly] = useState(false);

  const diff = useMemo(() => computeDiff(oldText, newText), [oldText, newText]);
  const changeCount = useMemo(() => countChanges(diff), [diff]);

  if (!oldText && !newText) {
    return (
      <div style={emptyStyle}>
        No YAML output yet. Compile your workflow to see changes.
      </div>
    );
  }

  if (changeCount === 0) {
    return (
      <div style={emptyStyle}>
        No changes since last compilation.
      </div>
    );
  }

  const visibleLines = changesOnly
    ? diff.filter((line) => line.type !== 'unchanged')
    : diff;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <span style={{ fontSize: 12, color: 'var(--color-fg-muted, #656d76)' }}>
          {changeCount} change{changeCount !== 1 ? 's' : ''}
        </span>
        <label style={toggleLabelStyle}>
          <input
            type="checkbox"
            checked={changesOnly}
            onChange={(e) => setChangesOnly(e.target.checked)}
            style={{ accentColor: 'var(--color-accent-fg, #0969da)' }}
          />
          Changes only
        </label>
      </div>

      {/* Diff content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <pre style={preStyle}>
          {visibleLines.map((line, i) => (
            <DiffLineRow key={i} line={line} />
          ))}
        </pre>
      </div>
    </div>
  );
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const bgColor =
    line.type === 'add'
      ? 'var(--diff-add-bg, #dafbe1)'
      : line.type === 'remove'
        ? 'var(--diff-remove-bg, #ffebe9)'
        : 'transparent';

  const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';

  return (
    <div style={{ display: 'flex', background: bgColor, minHeight: '20.8px' }}>
      <span style={lineNumStyle}>
        {line.oldLineNum ?? ''}
      </span>
      <span style={lineNumStyle}>
        {line.newLineNum ?? ''}
      </span>
      <span style={prefixStyle}>
        {prefix}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        {line.content}
      </span>
    </div>
  );
}

// Styles
const emptyStyle: React.CSSProperties = {
  padding: 24,
  color: 'var(--color-fg-muted, #656d76)',
  fontSize: 14,
  textAlign: 'center',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 12px',
  borderBottom: '1px solid var(--color-border-default, #d0d7de)',
  background: 'var(--color-bg-subtle, #f6f8fa)',
  minHeight: 32,
};

const toggleLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  color: 'var(--color-fg-muted, #656d76)',
  cursor: 'pointer',
  userSelect: 'none',
};

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: '4px 0',
  fontSize: 13,
  lineHeight: '1.6',
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  minHeight: '100%',
};

const lineNumStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 40,
  paddingRight: 8,
  textAlign: 'right',
  color: 'var(--color-fg-subtle, #6e7781)',
  userSelect: 'none',
  flexShrink: 0,
  fontSize: 12,
};

const prefixStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 16,
  textAlign: 'center',
  flexShrink: 0,
  fontWeight: 600,
};
