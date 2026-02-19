import { useWorkflowStore } from '../../stores/workflowStore';
import { PanelContainer } from './PanelContainer';
import { getFieldDescription } from '../../utils/fieldDescriptions';
import { HelpTooltip } from '../shared/HelpTooltip';
import type { TriggerEvent } from '../../types/workflow';

interface TriggerOption {
  event: TriggerEvent;
  fieldKey: string;
}

const triggerOptions: TriggerOption[] = [
  { event: 'issues', fieldKey: 'trigger.issues' },
  { event: 'pull_request', fieldKey: 'trigger.pull_request' },
  { event: 'issue_comment', fieldKey: 'trigger.issue_comment' },
  { event: 'discussion', fieldKey: 'trigger.discussion' },
  { event: 'schedule', fieldKey: 'trigger.schedule' },
  { event: 'workflow_dispatch', fieldKey: 'trigger.workflow_dispatch' },
  { event: 'slash_command', fieldKey: 'trigger.slash_command' },
  { event: 'push', fieldKey: 'trigger.push' },
  { event: 'release', fieldKey: 'trigger.release' },
];

const activityTypesByEvent: Record<string, string[]> = {
  issues: ['opened', 'edited', 'closed', 'reopened', 'labeled', 'unlabeled', 'assigned', 'unassigned'],
  pull_request: ['opened', 'edited', 'closed', 'reopened', 'synchronize', 'labeled', 'unlabeled', 'ready_for_review', 'review_requested'],
  issue_comment: ['created', 'edited', 'deleted'],
  discussion: ['created', 'edited', 'answered', 'unanswered', 'labeled', 'unlabeled'],
  release: ['published', 'created', 'edited', 'prereleased', 'released'],
};

const schedulePresets = [
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Daily at midnight', cron: '0 0 * * *' },
  { label: 'Weekly on Monday', cron: '0 0 * * 1' },
  { label: 'Every 6 hours', cron: '0 */6 * * *' },
];

export function TriggerPanel() {
  const trigger = useWorkflowStore((s) => s.trigger);
  const setTrigger = useWorkflowStore((s) => s.setTrigger);
  const desc = getFieldDescription('on');

  const selectedEvent = trigger.event;
  const availableActivityTypes = selectedEvent ? (activityTypesByEvent[selectedEvent] ?? []) : [];

  return (
    <PanelContainer title={desc.label} description={desc.description}>
      {/* Event type selector */}
      <div className="panel__section">
        <div className="panel__section-title">Event Type</div>
        <div style={gridStyle}>
          {triggerOptions.map((opt) => {
            const fd = getFieldDescription(opt.fieldKey);
            const active = selectedEvent === opt.event;
            return (
              <button
                key={opt.event}
                onClick={() => setTrigger({ event: opt.event, activityTypes: [] })}
                style={{
                  ...eventCardStyle,
                  borderColor: active ? '#0969da' : '#d0d7de',
                  backgroundColor: active ? '#ddf4ff' : '#ffffff',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2328' }}>
                  {fd.label}
                </div>
                <div style={{ fontSize: '11px', color: '#656d76', marginTop: '4px', lineHeight: '1.4' }}>
                  {fd.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity types */}
      {availableActivityTypes.length > 0 && (
        <div className="panel__section">
          <div className="panel__section-title">Activity Types</div>
          <div className="panel__help" style={{ marginBottom: '10px', marginTop: '0' }}>
            Select which specific activities should trigger the workflow.
            Leave all unchecked to trigger on any activity.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {availableActivityTypes.map((at) => {
              const active = trigger.activityTypes.includes(at);
              return (
                <label key={at} style={activityChipStyle(active)}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => {
                      const next = active
                        ? trigger.activityTypes.filter((t) => t !== at)
                        : [...trigger.activityTypes, at];
                      setTrigger({ activityTypes: next });
                    }}
                    style={{ display: 'none' }}
                  />
                  {at}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule builder */}
      {selectedEvent === 'schedule' && (
        <div className="panel__section">
          <div className="panel__section-title">Schedule (cron)</div>
          <input
            type="text"
            value={trigger.schedule}
            onChange={(e) => setTrigger({ schedule: e.target.value })}
            placeholder="e.g. 0 0 * * *"
            style={inputStyle}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
            {schedulePresets.map((p) => (
              <button
                key={p.label}
                onClick={() => setTrigger({ schedule: p.cron })}
                style={presetButtonStyle}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slash command name */}
      {selectedEvent === 'slash_command' && (
        <div className="panel__section">
          <div className="panel__label">Command Name</div>
          <input
            type="text"
            value={trigger.slashCommandName}
            onChange={(e) => setTrigger({ slashCommandName: e.target.value })}
            placeholder="e.g. review"
            style={inputStyle}
          />
          <div className="panel__help">
            Users will type /{trigger.slashCommandName || 'command'} in a comment to trigger this.
          </div>
        </div>
      )}

      {/* Filters */}
      {selectedEvent && (
        <div className="panel__section">
          <div className="panel__section-title">
            Filters
            <span style={{ marginLeft: '6px' }}>
              <HelpTooltip text="Control who can trigger this workflow and under what conditions." />
            </span>
          </div>
          <label style={filterRowStyle}>
            <input
              type="checkbox"
              checked={trigger.skipBots}
              onChange={(e) => setTrigger({ skipBots: e.target.checked })}
            />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>
                {getFieldDescription('trigger.skipBots').label}
              </div>
              <div style={{ fontSize: '12px', color: '#656d76', marginTop: '2px', lineHeight: '1.4' }}>
                {getFieldDescription('trigger.skipBots').description}
              </div>
            </div>
          </label>

          <div className="panel__field" style={{ marginTop: '12px' }}>
            <div className="panel__label">
              {getFieldDescription('trigger.skipRoles').label}
            </div>
            <input
              type="text"
              value={trigger.skipRoles.join(', ')}
              onChange={(e) => setTrigger({
                skipRoles: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })}
              placeholder="e.g. NONE, READ"
              style={inputStyle}
            />
            <div className="panel__help">
              {getFieldDescription('trigger.skipRoles').description} (comma-separated)
            </div>
          </div>
        </div>
      )}
    </PanelContainer>
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '10px',
};

const eventCardStyle: React.CSSProperties = {
  padding: '12px',
  border: '1px solid #d0d7de',
  borderRadius: '8px',
  cursor: 'pointer',
  textAlign: 'left',
  background: '#ffffff',
  transition: 'border-color 150ms ease, background 150ms ease',
};

const activityChipStyle = (active: boolean): React.CSSProperties => ({
  display: 'inline-block',
  padding: '5px 12px',
  fontSize: '12px',
  borderRadius: '16px',
  border: `1px solid ${active ? '#0969da' : '#d0d7de'}`,
  backgroundColor: active ? '#ddf4ff' : '#ffffff',
  color: active ? '#0969da' : '#1f2328',
  cursor: 'pointer',
  userSelect: 'none',
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  border: '1px solid #d0d7de',
  borderRadius: '6px',
  outline: 'none',
};

const presetButtonStyle: React.CSSProperties = {
  padding: '5px 12px',
  fontSize: '12px',
  border: '1px solid #d0d7de',
  borderRadius: '16px',
  background: '#f6f8fa',
  color: '#1f2328',
  cursor: 'pointer',
};

const filterRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  padding: '10px 0',
  cursor: 'pointer',
};
