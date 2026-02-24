import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { AlertTriangle } from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useUIStore } from '../../stores/uiStore';
import { generateMarkdown } from '../../utils/markdownGenerator';
import { compile, isCompilerReady } from '../../utils/compiler';
import { DocsPanel } from './DocsPanel';
import { getRefEntry } from '../../utils/referenceData';

/* ── Markdown tokenizer ──
 * Parses markdown text into spans with type annotations for syntax highlighting.
 * Handles: frontmatter delimiters, YAML keys/values inside frontmatter, headings,
 * lists, bold, italic, inline code, code fences, comments, and links.
 */
type TokenType =
  | 'plain'
  | 'frontmatter-delimiter'
  | 'frontmatter-key'
  | 'frontmatter-colon'
  | 'frontmatter-value'
  | 'heading-marker'
  | 'heading-text'
  | 'list-marker'
  | 'bold'
  | 'italic'
  | 'inline-code'
  | 'code-fence'
  | 'comment'
  | 'link-bracket'
  | 'link-text'
  | 'link-paren'
  | 'link-url';

interface MdToken {
  type: TokenType;
  content: string;
}

/** Tokenize inline markdown elements within a string (bold, italic, code, links). */
function tokenizeInline(text: string): MdToken[] {
  const tokens: MdToken[] = [];
  // Regex matches: inline code, bold (**), italic (*), or markdown links [text](url)
  const inlineRe = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]*\]\([^)]*\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'plain', content: text.slice(lastIndex, match.index) });
    }
    const m = match[0];
    if (match[1]) {
      // Inline code
      tokens.push({ type: 'inline-code', content: m });
    } else if (match[2]) {
      // Bold
      tokens.push({ type: 'bold', content: m });
    } else if (match[3]) {
      // Italic
      tokens.push({ type: 'italic', content: m });
    } else if (match[4]) {
      // Link [text](url)
      const bracketEnd = m.indexOf(']');
      tokens.push({ type: 'link-bracket', content: '[' });
      tokens.push({ type: 'link-text', content: m.slice(1, bracketEnd) });
      tokens.push({ type: 'link-bracket', content: ']' });
      tokens.push({ type: 'link-paren', content: '(' });
      tokens.push({ type: 'link-url', content: m.slice(bracketEnd + 2, m.length - 1) });
      tokens.push({ type: 'link-paren', content: ')' });
    }
    lastIndex = match.index + m.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'plain', content: text.slice(lastIndex) });
  }
  return tokens;
}

/** Full-line tokenizer: returns an array of token arrays, one per line. */
function tokenizeMarkdown(source: string): MdToken[][] {
  const lines = source.split('\n');
  const result: MdToken[][] = [];
  let inFrontmatter = false;
  let frontmatterCount = 0; // how many --- delimiters we've seen
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // Detect frontmatter delimiters (must be exactly "---" at the start)
    if (!inCodeBlock && /^---\s*$/.test(trimmed)) {
      if (!inFrontmatter && frontmatterCount === 0) {
        // Opening delimiter
        inFrontmatter = true;
        frontmatterCount = 1;
        result.push([{ type: 'frontmatter-delimiter', content: line }]);
        continue;
      } else if (inFrontmatter && frontmatterCount === 1) {
        // Closing delimiter
        inFrontmatter = false;
        frontmatterCount = 2;
        result.push([{ type: 'frontmatter-delimiter', content: line }]);
        continue;
      }
    }

    // Inside frontmatter: highlight YAML keys and values
    if (inFrontmatter) {
      const keyMatch = line.match(/^(\s*)([\w][\w.-]*)(\s*:\s*)(.*)/);
      if (keyMatch) {
        const tokens: MdToken[] = [];
        if (keyMatch[1]) tokens.push({ type: 'plain', content: keyMatch[1] });
        tokens.push({ type: 'frontmatter-key', content: keyMatch[2] });
        tokens.push({ type: 'frontmatter-colon', content: keyMatch[3] });
        if (keyMatch[4]) tokens.push({ type: 'frontmatter-value', content: keyMatch[4] });
        result.push(tokens);
      } else if (/^\s*#/.test(line)) {
        result.push([{ type: 'comment', content: line }]);
      } else if (/^\s*-\s/.test(line)) {
        // YAML list item inside frontmatter
        const dashMatch = line.match(/^(\s*-\s)(.*)/);
        if (dashMatch) {
          result.push([
            { type: 'list-marker', content: dashMatch[1] },
            { type: 'frontmatter-value', content: dashMatch[2] },
          ]);
        } else {
          result.push([{ type: 'frontmatter-value', content: line }]);
        }
      } else {
        result.push([{ type: 'frontmatter-value', content: line }]);
      }
      continue;
    }

    // Code fence (``` or ~~~)
    if (/^(`{3,}|~{3,})/.test(trimmed)) {
      inCodeBlock = !inCodeBlock;
      result.push([{ type: 'code-fence', content: line }]);
      continue;
    }

    if (inCodeBlock) {
      result.push([{ type: 'inline-code', content: line }]);
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6}\s)(.*)/);
    if (headingMatch) {
      const tokens: MdToken[] = [
        { type: 'heading-marker', content: headingMatch[1] },
      ];
      tokens.push(...tokenizeInline(headingMatch[2]).map(t =>
        t.type === 'plain' ? { ...t, type: 'heading-text' as TokenType } : t
      ));
      result.push(tokens);
      continue;
    }

    // Unordered list items
    const listMatch = line.match(/^(\s*[-*+]\s)(.*)/);
    if (listMatch) {
      result.push([
        { type: 'list-marker', content: listMatch[1] },
        ...tokenizeInline(listMatch[2]),
      ]);
      continue;
    }

    // Ordered list items
    const orderedMatch = line.match(/^(\s*\d+\.\s)(.*)/);
    if (orderedMatch) {
      result.push([
        { type: 'list-marker', content: orderedMatch[1] },
        ...tokenizeInline(orderedMatch[2]),
      ]);
      continue;
    }

    // HTML comments
    if (/^\s*<!--/.test(trimmed)) {
      result.push([{ type: 'comment', content: line }]);
      continue;
    }

    // Default: inline tokenization
    result.push(tokenizeInline(line));
  }

  return result;
}

/** Map token types to CSS colors — light theme (GitHub-like palette). */
const lightTokenColors: Record<TokenType, string> = {
  'plain':                 '#1f2328',
  'frontmatter-delimiter': '#cf222e',
  'frontmatter-key':       '#0550ae',
  'frontmatter-colon':     '#1f2328',
  'frontmatter-value':     '#0a3069',
  'heading-marker':        '#cf222e',
  'heading-text':          '#1f2328',
  'list-marker':           '#cf222e',
  'bold':                  '#1f2328',
  'italic':                '#1f2328',
  'inline-code':           '#0550ae',
  'code-fence':            '#6e7781',
  'comment':               '#6e7781',
  'link-bracket':          '#1f2328',
  'link-text':             '#0969da',
  'link-paren':            '#1f2328',
  'link-url':              '#0550ae',
};

/** Map token types to CSS colors — dark theme (GitHub dark palette). */
const darkTokenColors: Record<TokenType, string> = {
  'plain':                 '#e6edf3',
  'frontmatter-delimiter': '#f85149',
  'frontmatter-key':       '#79c0ff',
  'frontmatter-colon':     '#e6edf3',
  'frontmatter-value':     '#a5d6ff',
  'heading-marker':        '#f85149',
  'heading-text':          '#e6edf3',
  'list-marker':           '#f85149',
  'bold':                  '#e6edf3',
  'italic':                '#e6edf3',
  'inline-code':           '#79c0ff',
  'code-fence':            '#8b949e',
  'comment':               '#8b949e',
  'link-bracket':          '#e6edf3',
  'link-text':             '#58a6ff',
  'link-paren':            '#e6edf3',
  'link-url':              '#79c0ff',
};

const tokenFontWeight: Partial<Record<TokenType, number>> = {
  'heading-marker': 700,
  'heading-text':   700,
  'bold':           700,
  'frontmatter-key': 600,
};

const tokenFontStyle: Partial<Record<TokenType, string>> = {
  'italic':  'italic',
  'comment': 'italic',
};

const lightTokenBg: Partial<Record<TokenType, string>> = {
  'inline-code': 'rgba(175,184,193,0.2)',
};

const darkTokenBg: Partial<Record<TokenType, string>> = {
  'inline-code': 'rgba(110,118,129,0.4)',
};

/** Helper hook: resolve whether dark mode is active from the UI store. */
function useIsDark(): boolean {
  const theme = useUIStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    if (theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return theme === 'dark' || (theme === 'auto' && systemDark);
}

/**
 * Side-by-side editor view: editable markdown on the left, compiled YAML on the right.
 * The markdown is compiled via WASM on a 500ms debounce.
 */
export type RightPaneTab = 'yaml' | 'reference';

export function EditorView() {
  const isDark = useIsDark();
  const [markdown, setMarkdown] = useState('');
  const [yaml, setYaml] = useState('');
  const [lastValidYaml, setLastValidYaml] = useState('');
  const [compileError, setCompileError] = useState<import('../../types/workflow').CompilerError | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [rightPaneTab, setRightPaneTab] = useState<RightPaneTab>('yaml');
  const [activeDocKey, setActiveDocKey] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markdownRef = useRef('');

  // Keep ref in sync for the isReady watcher
  markdownRef.current = markdown;

  // Direct compile helper (no debounce) for initial/on-ready compilation
  const doCompile = useCallback(async (md: string) => {
    if (!isCompilerReady() || !md.trim()) return;
    setIsCompiling(true);
    try {
      const result = await compile(md);
      setCompileError(result.error);
      setWarnings(result.warnings);
      if (!result.error && result.yaml) {
        // Success: update both yaml and lastValidYaml
        setYaml(result.yaml);
        setLastValidYaml(result.yaml);
      } else if (result.error) {
        // Error: clear current yaml but keep lastValidYaml for stale display
        setYaml('');
      }
      const s = useWorkflowStore.getState();
      s.setCompiledYaml(result.yaml);
      s.setCompiledMarkdown(md);
      s.setWarnings(result.warnings);
      s.setError(result.error);
    } catch (err) {
      setCompileError({ message: err instanceof Error ? err.message : String(err), severity: 'error' });
      setYaml('');
    } finally {
      setIsCompiling(false);
    }
  }, []);

  // On mount, generate markdown from the current store state and compile if needed
  useEffect(() => {
    const state = useWorkflowStore.getState();
    const md = generateMarkdown(state);
    setMarkdown(md);
    setYaml(state.compiledYaml || '');
    if (state.compiledYaml) setLastValidYaml(state.compiledYaml);
    setCompileError(state.error);
    setWarnings(state.warnings || []);
    // If we have markdown but no compiled YAML (e.g. after page reload), compile immediately
    if (md.trim() && !state.compiledYaml) {
      doCompile(md);
    }
  }, [doCompile]);

  // When the WASM compiler becomes ready, compile if we have markdown but no YAML yet
  const isReady = useWorkflowStore((s) => s.isReady);
  useEffect(() => {
    if (isReady && markdownRef.current.trim() && !yaml) {
      doCompile(markdownRef.current);
    }
  }, [isReady, doCompile, yaml]);

  // Compile markdown on changes (debounced 500ms)
  const compileMarkdown = useCallback((md: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => doCompile(md), 500);
  }, [doCompile]);

  const handleMarkdownChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setMarkdown(value);
      compileMarkdown(value);
    },
    [compileMarkdown]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Navigate to a frontmatter key's docs
  const handleKeyClick = useCallback((key: string) => {
    setRightPaneTab('reference');
    setActiveDocKey(key);
  }, []);

  return (
    <div className="editor-view">
      {/* Left pane: editable markdown with syntax highlighting */}
      <div className="editor-pane editor-pane-left">
        <div className="editor-pane-header">
          <span className="editor-pane-title">Markdown Source</span>
          {isCompiling && (
            <span className="editor-compiling-badge">Compiling...</span>
          )}
        </div>
        <MarkdownEditor
          value={markdown}
          onChange={handleMarkdownChange}
          onKeyClick={handleKeyClick}
          isDark={isDark}
        />
      </div>

      {/* Divider */}
      <div className="editor-divider" />

      {/* Right pane: tabbed YAML / Reference */}
      <div className="editor-pane editor-pane-right">
        <div className="editor-pane-header">
          <div className="editor-tab-bar">
            <button
              className={`editor-tab-btn ${rightPaneTab === 'yaml' ? 'editor-tab-btn--active' : ''}`}
              onClick={() => setRightPaneTab('yaml')}
            >
              YAML
            </button>
            <button
              className={`editor-tab-btn ${rightPaneTab === 'reference' ? 'editor-tab-btn--active' : ''}`}
              onClick={() => setRightPaneTab('reference')}
            >
              Reference
            </button>
          </div>
          {rightPaneTab === 'yaml' && warnings.length > 0 && (
            <span className="editor-warning-count">
              {warnings.length} warning{warnings.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {rightPaneTab === 'yaml' ? (
          <>
            {/* Compact inline error banner */}
            {compileError && (
              <div className="editor-inline-error">
                <AlertTriangle size={12} />
                <span>{compileError.message}</span>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="editor-warnings">
                {warnings.map((w, i) => (
                  <div key={i} className="editor-warning-line">{w}</div>
                ))}
              </div>
            )}

            {/* YAML output: show last valid YAML dimmed when there's an error */}
            <div className={`yaml-output${!yaml && compileError && lastValidYaml ? ' yaml-output--stale' : ''}`}>
              {yaml ? (
                <YamlHighlighted code={yaml} isDark={isDark} />
              ) : lastValidYaml && compileError ? (
                <YamlHighlighted code={lastValidYaml} isDark={isDark} />
              ) : (
                <div className="yaml-empty-state">
                  Edit the markdown on the left to see compiled YAML here.
                </div>
              )}
            </div>
          </>
        ) : (
          <DocsPanel
            activeDocKey={activeDocKey}
            onScrollComplete={() => setActiveDocKey(null)}
          />
        )}
      </div>
    </div>
  );
}

/* ── Markdown Editor with syntax highlighting ──
 * Uses the "transparent textarea over highlighted pre" technique:
 *  - A <pre> renders the syntax-highlighted code underneath
 *  - A <textarea> sits on top with transparent text so the caret is visible
 *  - Both share identical font metrics so text lines up exactly
 */
/** Given text content and a character offset, return the frontmatter key at that position (or null). */
function getFrontmatterKeyAtPos(text: string, pos: number): string | null {
  const lines = text.split('\n');
  let offset = 0;
  let inFrontmatter = false;
  let fmCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i].length;
    const trimmed = lines[i].trimEnd();

    if (/^---\s*$/.test(trimmed)) {
      if (!inFrontmatter && fmCount === 0) { inFrontmatter = true; fmCount = 1; }
      else if (inFrontmatter && fmCount === 1) { inFrontmatter = false; fmCount = 2; }
    }

    if (offset + lineLen >= pos) {
      if (inFrontmatter) {
        const col = pos - offset;
        const keyMatch = lines[i].match(/^(\s*)([\w][\w.-]*)(\s*:)/);
        if (keyMatch) {
          const keyStart = keyMatch[1].length;
          const keyEnd = keyStart + keyMatch[2].length;
          if (col >= keyStart && col < keyEnd) {
            return keyMatch[2];
          }
        }
      }
      return null;
    }
    offset += lineLen + 1;
  }
  return null;
}

interface TooltipState {
  key: string;
  description: string;
  x: number;
  y: number;
}

function MarkdownEditor({
  value,
  onChange,
  onKeyClick,
  isDark,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyClick?: (key: string) => void;
  isDark: boolean;
}) {
  const tokenColors = isDark ? darkTokenColors : lightTokenColors;
  const tokenBg = isDark ? darkTokenBg : lightTokenBg;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize scroll between textarea and highlighted pre
  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    // Hide tooltip on scroll
    setTooltip(null);
  }, []);

  // Tokenize the markdown for highlighting
  const highlightedLines = useMemo(() => tokenizeMarkdown(value), [value]);

  // Detect clicks on frontmatter keys
  const handleTextareaClick = useCallback(() => {
    if (!onKeyClick || !textareaRef.current) return;
    const key = getFrontmatterKeyAtPos(textareaRef.current.value, textareaRef.current.selectionStart);
    if (key) onKeyClick(key);
  }, [onKeyClick]);

  // Hover tooltip: detect frontmatter key under mouse position
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea || !containerRef.current) return;

    // Map mouse Y to line number, then check if mouse X falls on a key
    const containerRect = containerRef.current.getBoundingClientRect();
    const lineHeight = 20.8; // matches .md-editor-line min-height
    const paddingTop = 12;
    const scrollTop = textarea.scrollTop;
    const relY = e.clientY - containerRect.top - paddingTop + scrollTop;
    const lineIndex = Math.floor(relY / lineHeight);

    const lines = textarea.value.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) {
      if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
      setTooltip(null);
      return;
    }

    // Check if the line is inside frontmatter
    let inFrontmatter = false;
    let fmCount = 0;
    for (let i = 0; i <= lineIndex; i++) {
      if (/^---\s*$/.test(lines[i].trimEnd())) {
        if (!inFrontmatter && fmCount === 0) { inFrontmatter = true; fmCount = 1; }
        else if (inFrontmatter && fmCount === 1) { inFrontmatter = false; fmCount = 2; }
      }
    }

    if (inFrontmatter) {
      const keyMatch = lines[lineIndex].match(/^(\s*)([\w][\w.-]*)(\s*:)/);
      if (keyMatch) {
        const keyName = keyMatch[2];
        // Approximate character width: ~7.8px for 13px monospace
        const charWidth = 7.8;
        const lineNumberWidth = 40;
        const scrollLeft = textarea.scrollLeft;
        const relX = e.clientX - containerRect.left - lineNumberWidth + scrollLeft;
        const colStart = keyMatch[1].length;
        const colEnd = colStart + keyMatch[2].length;
        const xStart = colStart * charWidth;
        const xEnd = colEnd * charWidth;

        if (relX >= xStart && relX < xEnd) {
          const ref = getRefEntry(keyName);
          if (ref) {
            if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
            tooltipTimerRef.current = setTimeout(() => {
              setTooltip({
                key: keyName,
                description: ref.description,
                x: e.clientX - containerRect.left,
                y: e.clientY - containerRect.top - 8,
              });
            }, 400);
            return;
          }
        }
      }
    }

    // Not on a key — clear tooltip
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    setTooltip(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (tooltipTimerRef.current) { clearTimeout(tooltipTimerRef.current); tooltipTimerRef.current = null; }
    setTooltip(null);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  return (
    <div className="md-editor-container" ref={containerRef}>
      {/* Highlighted layer (underneath) */}
      <pre
        ref={preRef}
        className="md-editor-highlight"
        aria-hidden="true"
      >
        {highlightedLines.map((lineTokens, i) => (
          <div key={i} className="md-editor-line">
            <span className="editor-line-number">{i + 1}</span>
            <span className="md-editor-line-content">
              {lineTokens.length === 0 ? (
                '\n'
              ) : (
                lineTokens.map((tok, j) => (
                  <span
                    key={j}
                    className={tok.type === 'frontmatter-key' ? 'md-frontmatter-key-token' : undefined}
                    style={{
                      color: tokenColors[tok.type],
                      fontWeight: tokenFontWeight[tok.type],
                      fontStyle: tokenFontStyle[tok.type],
                      backgroundColor: tokenBg[tok.type],
                      borderRadius: tokenBg[tok.type] ? '3px' : undefined,
                      padding: tokenBg[tok.type] ? '0.1em 0.3em' : undefined,
                    }}
                  >
                    {tok.content}
                  </span>
                ))
              )}
            </span>
          </div>
        ))}
        <div className="md-editor-line">&nbsp;</div>
      </pre>

      {/* Transparent textarea (on top, captures input) */}
      <textarea
        ref={textareaRef}
        className="md-editor-textarea"
        value={value}
        onChange={onChange}
        onClick={handleTextareaClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onScroll={handleScroll}
        spellCheck={false}
        placeholder="Write your workflow markdown here..."
      />

      {/* Hover tooltip — clamped to stay within viewport */}
      {tooltip && (
        <TooltipClamped
          tooltip={tooltip}
          containerRef={containerRef}
        />
      )}
    </div>
  );
}

/**
 * Tooltip that clamps itself to stay fully visible within the viewport.
 * Positioned above the cursor by default, shifts right/left/below as needed.
 */
function TooltipClamped({
  tooltip,
  containerRef,
}: {
  tooltip: TooltipState;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' });

  useEffect(() => {
    const el = tipRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const containerRect = container.getBoundingClientRect();
    const tipRect = el.getBoundingClientRect();
    const tipW = tipRect.width;
    const tipH = tipRect.height;
    const margin = 8;

    // Desired position: centered above cursor in container coordinates
    let left = tooltip.x;
    let top = tooltip.y;
    let transform = 'translate(-50%, -100%)';

    // Convert to viewport coordinates to check bounds
    const vpLeft = containerRect.left + left - tipW / 2;
    const vpRight = vpLeft + tipW;
    const vpTop = containerRect.top + top - tipH;

    // If tooltip goes off the left edge of viewport
    if (vpLeft < margin) {
      left = tipW / 2 + margin - containerRect.left;
      if (left < margin) left = margin;
    }

    // If tooltip goes off the right edge of viewport
    if (vpRight > window.innerWidth - margin) {
      const shift = vpRight - (window.innerWidth - margin);
      left = left - shift;
    }

    // If tooltip goes above the viewport, show below cursor instead
    if (vpTop < margin) {
      top = tooltip.y + 24;
      transform = 'translate(-50%, 0)';
    }

    // Ensure left stays non-negative in container
    if (left < margin) left = margin;

    setPos({ left, top, transform });
  }, [tooltip.x, tooltip.y, containerRef]);

  return (
    <div
      ref={tipRef}
      className="md-key-tooltip"
      style={{
        left: pos.left,
        top: pos.top,
        transform: pos.transform,
      }}
    >
      <strong>{tooltip.key}</strong>
      <span>{tooltip.description}</span>
    </div>
  );
}

/* ── YAML Highlighted output ── */
function YamlHighlighted({ code, isDark }: { code: string; isDark: boolean }) {
  const yamlTheme = isDark ? themes.nightOwl : themes.github;
  return (
    <Highlight theme={yamlTheme} code={code} language="yaml">
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre style={{ ...style, ...yamlPreStyle }}>
          {tokens.map((line, i) => {
            const lineProps = getLineProps({ line });
            return (
              <div key={i} {...lineProps} style={{ ...lineProps.style, display: 'flex' }}>
                <span className="editor-line-number">{i + 1}</span>
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

const yamlPreStyle: React.CSSProperties = {
  margin: 0,
  padding: '12px',
  fontSize: '13px',
  lineHeight: '1.6',
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  overflow: 'auto',
  minHeight: '100%',
  background: 'transparent',
};
