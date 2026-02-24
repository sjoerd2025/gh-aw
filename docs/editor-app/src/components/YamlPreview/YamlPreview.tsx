import { useState, useCallback, useMemo } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { useWorkflowStore } from '../../stores/workflowStore';
import { MarkdownSource } from './MarkdownSource';
import { DiffView } from './DiffView';
import { computeDiff, countChanges } from '../../utils/diffView';

type TabId = 'yaml' | 'markdown' | 'diff';

export function YamlPreview() {
  const [activeTab, setActiveTab] = useState<TabId>('yaml');
  const [copied, setCopied] = useState(false);
  const compiledYaml = useWorkflowStore((s) => s.compiledYaml);
  const compiledMarkdown = useWorkflowStore((s) => s.compiledMarkdown);
  const previousYaml = useWorkflowStore((s) => s.previousYaml);
  const error = useWorkflowStore((s) => s.error);
  const warnings = useWorkflowStore((s) => s.warnings);
  const isCompiling = useWorkflowStore((s) => s.isCompiling);

  const diffChangeCount = useMemo(() => {
    if (!previousYaml && !compiledYaml) return 0;
    return countChanges(computeDiff(previousYaml, compiledYaml));
  }, [previousYaml, compiledYaml]);

  const currentContent = activeTab === 'yaml' ? compiledYaml : activeTab === 'markdown' ? compiledMarkdown : '';

  const handleCopy = useCallback(async () => {
    if (!currentContent) return;
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = currentContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentContent]);

  const handleDownload = useCallback(() => {
    if (!currentContent) return;
    const ext = activeTab === 'yaml' ? 'yml' : 'md';
    const mimeType = activeTab === 'yaml' ? 'text/yaml' : 'text/markdown';
    const blob = new Blob([currentContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentContent, activeTab]);

  return (
    <div style={containerStyle}>
      {/* Tab bar */}
      <div style={tabBarStyle}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <TabButton
            active={activeTab === 'yaml'}
            onClick={() => setActiveTab('yaml')}
          >
            YAML Output
          </TabButton>
          <TabButton
            active={activeTab === 'markdown'}
            onClick={() => setActiveTab('markdown')}
          >
            Markdown Source
          </TabButton>
          <TabButton
            active={activeTab === 'diff'}
            onClick={() => setActiveTab('diff')}
          >
            Diff
            {diffChangeCount > 0 && (
              <span style={diffBadgeStyle}>{diffChangeCount}</span>
            )}
          </TabButton>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {isCompiling && (
            <span style={{ fontSize: '12px', color: '#0969da' }}>Compiling...</span>
          )}
          <ActionButton onClick={handleCopy} title="Copy to clipboard">
            {copied ? 'Copied!' : 'Copy'}
          </ActionButton>
          <ActionButton onClick={handleDownload} title="Download file">
            Download
          </ActionButton>
        </div>
      </div>

      {/* Warnings banner */}
      {warnings.length > 0 && (
        <div style={warningBannerStyle}>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '12px' }}>{w}</div>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={errorBannerStyle}>
          <strong>Compilation Error:</strong> {error.message}
        </div>
      )}

      {/* Content area */}
      <div style={contentAreaStyle}>
        {activeTab === 'yaml' ? (
          <YamlHighlighted code={compiledYaml} />
        ) : activeTab === 'markdown' ? (
          <MarkdownSource code={compiledMarkdown} />
        ) : (
          <DiffView oldText={previousYaml} newText={compiledYaml} />
        )}
      </div>
    </div>
  );
}

function YamlHighlighted({ code }: { code: string }) {
  if (!code) {
    return (
      <div style={emptyStateStyle}>
        No YAML output yet. Configure your workflow to see the compiled output.
      </div>
    );
  }

  return (
    <Highlight theme={themes.github} code={code} language="yaml">
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre style={{ ...style, ...preStyle }}>
          {tokens.map((line, i) => {
            const lineProps = getLineProps({ line });
            return (
              <div key={i} {...lineProps} style={{ ...lineProps.style, display: 'flex' }}>
                <span style={lineNumberStyle}>{i + 1}</span>
                <span style={{ flex: 1 }}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: active ? 600 : 400,
        border: 'none',
        borderBottom: active ? '2px solid #0969da' : '2px solid transparent',
        background: 'none',
        color: active ? '#1f2328' : '#656d76',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function ActionButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '4px 10px',
        fontSize: '12px',
        border: '1px solid #d0d7de',
        borderRadius: '6px',
        background: '#f6f8fa',
        color: '#1f2328',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderLeft: '1px solid #d0d7de',
  backgroundColor: '#ffffff',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 8px',
  borderBottom: '1px solid #d0d7de',
  backgroundColor: '#f6f8fa',
  minHeight: '40px',
};

const contentAreaStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
};

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: '12px',
  fontSize: '13px',
  lineHeight: '1.6',
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  overflow: 'auto',
  minHeight: '100%',
};

const lineNumberStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '40px',
  paddingRight: '12px',
  textAlign: 'right',
  color: '#8c959f',
  userSelect: 'none',
  flexShrink: 0,
};

const emptyStateStyle: React.CSSProperties = {
  padding: '24px',
  color: '#656d76',
  fontSize: '14px',
  textAlign: 'center',
};

const warningBannerStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#fff8c5',
  borderBottom: '1px solid #d4a72c',
  color: '#9a6700',
};

const errorBannerStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#ffebe9',
  borderBottom: '1px solid #d1242f',
  color: '#d1242f',
};

const diffBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 4,
  minWidth: 18,
  height: 18,
  padding: '0 5px',
  fontSize: 10,
  fontWeight: 600,
  borderRadius: 9,
  background: 'var(--color-accent-fg, #0969da)',
  color: '#ffffff',
};
