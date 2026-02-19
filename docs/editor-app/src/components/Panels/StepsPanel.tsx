import { useState, useEffect } from 'react';
import { PanelContainer } from './PanelContainer';
import { HelpTooltip } from '../shared/HelpTooltip';

export function StepsPanel() {
  const [preSteps, setPreSteps] = useState('');
  const [postSteps, setPostSteps] = useState('');

  // Steps are stored as raw YAML text for advanced users.
  // In a full implementation, this would read/write from the store.
  useEffect(() => {
    // Initialize from store if needed in the future
  }, []);

  return (
    <PanelContainer
      title="Custom Steps"
      description="Add extra workflow steps that run before or after the AI agent."
    >
      {/* Pre-steps */}
      <div className="panel__section">
        <div className="panel__label">
          Steps before the agent
          <span style={{ marginLeft: '6px' }}>
            <HelpTooltip text="These workflow steps run before the AI agent starts. Use YAML syntax." />
          </span>
        </div>
        <textarea
          value={preSteps}
          onChange={(e) => setPreSteps(e.target.value)}
          placeholder={'- name: Setup environment\n  run: npm install'}
          style={textareaStyle}
          rows={6}
        />
        <div className="panel__help">
          YAML workflow steps that run before the AI agent.
        </div>
      </div>

      {/* Post-steps */}
      <div className="panel__section">
        <div className="panel__label">
          Steps after the agent
          <span style={{ marginLeft: '6px' }}>
            <HelpTooltip text="These workflow steps run after the AI agent finishes. Use YAML syntax." />
          </span>
        </div>
        <textarea
          value={postSteps}
          onChange={(e) => setPostSteps(e.target.value)}
          placeholder={'- name: Cleanup\n  run: echo "Agent finished"'}
          style={textareaStyle}
          rows={6}
        />
        <div className="panel__help">
          YAML workflow steps that run after the AI agent completes.
        </div>
      </div>

      <div className="panel__info">
        ⚠️ This is an advanced feature. Steps must be valid GitHub Actions YAML.
      </div>
    </PanelContainer>
  );
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '12px',
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  lineHeight: '1.5',
  border: '1px solid #d0d7de',
  borderRadius: '6px',
  resize: 'vertical',
  outline: 'none',
  minHeight: '100px',
};
