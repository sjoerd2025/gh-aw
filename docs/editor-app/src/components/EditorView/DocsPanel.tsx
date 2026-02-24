import { useState, useRef, useEffect, useMemo } from 'react';
import { referenceSections, type RefEntry, type RefSection } from '../../utils/referenceData';

interface DocsPanelProps {
  /** When set, auto-scroll to this key's section. */
  activeDocKey?: string | null;
  /** Called after the panel has scrolled to the active key. */
  onScrollComplete?: () => void;
}

export function DocsPanel({ activeDocKey, onScrollComplete }: DocsPanelProps) {
  const [filter, setFilter] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const entryRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Filter sections based on search input
  const filteredSections = useMemo(() => {
    if (!filter.trim()) return referenceSections;
    const q = filter.toLowerCase();
    const result: RefSection[] = [];
    for (const section of referenceSections) {
      const matched = section.entries.filter(entry => matchesFilter(entry, q));
      if (matched.length > 0) {
        result.push({ ...section, entries: matched });
      }
    }
    return result;
  }, [filter]);

  // Auto-scroll to activeDocKey
  useEffect(() => {
    if (!activeDocKey) return;
    const el = entryRefs.current.get(activeDocKey);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Brief highlight flash
      el.classList.add('docs-entry--highlight');
      const timer = setTimeout(() => {
        el.classList.remove('docs-entry--highlight');
        onScrollComplete?.();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [activeDocKey, onScrollComplete]);

  const registerRef = (key: string, el: HTMLElement | null) => {
    if (el) entryRefs.current.set(key, el);
    else entryRefs.current.delete(key);
  };

  return (
    <div style={styles.container}>
      {/* Search */}
      <div style={styles.searchBox}>
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search fields..."
          style={styles.searchInput}
        />
        {filter && (
          <button
            onClick={() => setFilter('')}
            style={styles.clearBtn}
            aria-label="Clear search"
          >
            x
          </button>
        )}
      </div>

      {/* Table of Contents */}
      {!filter && (
        <nav style={styles.toc}>
          <div style={styles.tocTitle}>Contents</div>
          {referenceSections.map(section => (
            <a
              key={section.id}
              href={`#docs-section-${section.id}`}
              onClick={e => {
                e.preventDefault();
                const el = contentRef.current?.querySelector(`#docs-section-${section.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              style={styles.tocLink}
            >
              {section.title}
            </a>
          ))}
        </nav>
      )}

      {/* Content */}
      <div ref={contentRef} style={styles.content}>
        {filteredSections.length === 0 && (
          <div style={styles.emptyState}>No fields match "{filter}"</div>
        )}
        {filteredSections.map(section => (
          <div key={section.id} id={`docs-section-${section.id}`} style={styles.section}>
            <div style={styles.sectionTitle}>{section.title}</div>
            {section.entries.map(entry => (
              <EntryCard
                key={entry.key}
                entry={entry}
                registerRef={registerRef}
                activeKey={activeDocKey}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  registerRef,
  activeKey,
  depth = 0,
}: {
  entry: RefEntry;
  registerRef: (key: string, el: HTMLElement | null) => void;
  activeKey?: string | null;
  depth?: number;
}) {
  const isActive = activeKey === entry.key;

  return (
    <>
      <div
        ref={el => registerRef(entry.key, el)}
        className={`docs-entry ${isActive ? 'docs-entry--highlight' : ''}`}
        style={{
          ...styles.entry,
          marginLeft: depth * 16,
          borderLeftColor: isActive ? 'var(--color-accent-fg, #0969da)' : 'transparent',
        }}
        id={`docs-entry-${entry.key}`}
      >
        <div style={styles.entryHeader}>
          <code style={styles.entryKey}>{entry.key}</code>
          <span style={styles.typeBadge}>{entry.type}</span>
          {entry.required && <span style={styles.requiredBadge}>required</span>}
        </div>
        <div style={styles.entryTitle}>{entry.title}</div>
        <div style={styles.entryDesc}>{entry.description}</div>
        {entry.examples.map((ex, i) => (
          <pre key={i} style={styles.exampleBlock}>{ex}</pre>
        ))}
        {entry.link && (
          <a href={entry.link} target="_blank" rel="noopener noreferrer" style={styles.docsLink}>
            Full docs &rarr;
          </a>
        )}
      </div>
      {entry.children?.map(child => (
        <EntryCard
          key={child.key}
          entry={child}
          registerRef={registerRef}
          activeKey={activeKey}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

function matchesFilter(entry: RefEntry, query: string): boolean {
  const hay = `${entry.key} ${entry.title} ${entry.description}`.toLowerCase();
  if (hay.includes(query)) return true;
  if (entry.children?.some(c => matchesFilter(c, query))) return true;
  return false;
}

// ── Inline styles (matches editor pane aesthetic) ──

const mono = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  searchBox: {
    position: 'relative',
    padding: '8px 12px',
    borderBottom: '1px solid var(--color-border-default, #d0d7de)',
    flexShrink: 0,
  },
  searchInput: {
    width: '100%',
    padding: '6px 28px 6px 8px',
    fontSize: '12px',
    fontFamily: 'inherit',
    border: '1px solid var(--color-border-default, #d0d7de)',
    borderRadius: '6px',
    background: 'var(--color-bg-default, #fff)',
    color: 'var(--color-fg-default, #1f2328)',
    outline: 'none',
  },
  clearBtn: {
    position: 'absolute',
    right: '18px',
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'var(--color-fg-muted, #656d76)',
    fontSize: '12px',
    lineHeight: 1,
    padding: '2px 4px',
  },
  toc: {
    padding: '8px 12px',
    borderBottom: '1px solid var(--color-border-default, #d0d7de)',
    flexShrink: 0,
  },
  tocTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: 'var(--color-fg-muted, #656d76)',
    marginBottom: '4px',
  },
  tocLink: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--color-accent-fg, #0969da)',
    textDecoration: 'none',
    padding: '2px 0',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 12px 24px',
  },
  emptyState: {
    padding: '24px',
    color: 'var(--color-fg-muted, #656d76)',
    fontSize: '13px',
    textAlign: 'center' as const,
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: 'var(--color-fg-muted, #656d76)',
    paddingBottom: '4px',
    borderBottom: '1px solid var(--color-border-muted, #d8dee4)',
    marginBottom: '8px',
  },
  entry: {
    padding: '10px 12px',
    marginBottom: '8px',
    borderRadius: '6px',
    border: '1px solid var(--color-border-default, #d0d7de)',
    borderLeft: '3px solid transparent',
    background: 'var(--color-bg-default, #fff)',
    transition: 'border-color 0.2s ease, background 0.2s ease',
  },
  entryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
    flexWrap: 'wrap' as const,
  },
  entryKey: {
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: mono,
    color: 'var(--color-accent-fg, #0969da)',
  },
  typeBadge: {
    fontSize: '10px',
    fontWeight: 500,
    fontFamily: mono,
    padding: '1px 6px',
    borderRadius: '10px',
    background: 'var(--color-bg-muted, #eaeef2)',
    color: 'var(--color-fg-muted, #656d76)',
  },
  requiredBadge: {
    fontSize: '10px',
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: '10px',
    background: 'color-mix(in srgb, var(--color-danger-fg, #d1242f) 12%, transparent)',
    color: 'var(--color-danger-fg, #d1242f)',
  },
  entryTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-fg-default, #1f2328)',
    marginBottom: '2px',
  },
  entryDesc: {
    fontSize: '12px',
    color: 'var(--color-fg-muted, #656d76)',
    lineHeight: 1.5,
    marginBottom: '6px',
  },
  exampleBlock: {
    fontSize: '11px',
    fontFamily: mono,
    lineHeight: 1.5,
    padding: '6px 8px',
    borderRadius: '4px',
    background: 'var(--color-bg-subtle, #f6f8fa)',
    border: '1px solid var(--color-border-muted, #d8dee4)',
    overflow: 'auto',
    marginBottom: '4px',
    whiteSpace: 'pre-wrap' as const,
  },
  docsLink: {
    fontSize: '11px',
    color: 'var(--color-accent-fg, #0969da)',
    textDecoration: 'none',
    fontWeight: 500,
  },
};
