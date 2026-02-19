import { useWorkflowStore } from '../../stores/workflowStore';
import { PanelContainer } from './PanelContainer';
import { getFieldDescription } from '../../utils/fieldDescriptions';

const snippets = [
  { label: 'Be concise', text: 'Keep your responses brief and to the point.' },
  { label: 'Review code', text: 'Review the code changes for bugs, security issues, and best practices.' },
  { label: 'Create issue', text: 'Create a new issue summarizing your findings.' },
  { label: 'Add comment', text: 'Add a comment on the pull request with your analysis.' },
  { label: 'Check tests', text: 'Run the test suite and report any failures.' },
];

export function InstructionsPanel() {
  const instructions = useWorkflowStore((s) => s.instructions);
  const setInstructions = useWorkflowStore((s) => s.setInstructions);
  const desc = getFieldDescription('instructions');

  return (
    <PanelContainer title={desc.label} description={desc.description}>
      <div className="panel__field">
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Tell the AI what to do in plain English..."
          style={textareaStyle}
          rows={12}
        />
        <div style={counterStyle}>
          {instructions.length} characters
        </div>
      </div>

      <div className="panel__section">
        <div className="panel__section-title">Quick Snippets</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {snippets.map((s) => (
            <button
              key={s.label}
              onClick={() => {
                const sep = instructions.length > 0 ? '\n\n' : '';
                setInstructions(instructions + sep + s.text);
              }}
              style={snippetButtonStyle}
            >
              + {s.label}
            </button>
          ))}
        </div>
      </div>
    </PanelContainer>
  );
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '13px',
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  lineHeight: '1.5',
  border: '1px solid #d0d7de',
  borderRadius: '6px',
  resize: 'vertical',
  minHeight: '200px',
  outline: 'none',
};

const counterStyle: React.CSSProperties = {
  textAlign: 'right',
  fontSize: '12px',
  color: '#656d76',
  marginTop: '4px',
};

const snippetButtonStyle: React.CSSProperties = {
  padding: '5px 12px',
  fontSize: '12px',
  border: '1px solid #d0d7de',
  borderRadius: '16px',
  background: '#f6f8fa',
  color: '#1f2328',
  cursor: 'pointer',
};
