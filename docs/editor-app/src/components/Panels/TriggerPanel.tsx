import { useWorkflowStore } from '../../stores/workflowStore';
import { PanelContainer } from './PanelContainer';
import { getFieldDescription } from '../../utils/fieldDescriptions';
import { HelpTooltip } from '../shared/HelpTooltip';
import { AdvancedSection } from '../shared/AdvancedSection';
import { FieldError, fieldErrorBorder } from '../shared/FieldError';
import { getErrorsForField } from '../../utils/validation';
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
  const validationErrors = useWorkflowStore((s) => s.validationErrors) ?? [];
  const desc = getFieldDescription('on');

  const selectedEvent = trigger.event;
  const availableActivityTypes = selectedEvent ? (activityTypesByEvent[selectedEvent] ?? []) : [];
  const eventErrors = getErrorsForField(validationErrors, 'trigger.event');
  const scheduleErrors = getErrorsForField(validationErrors, 'trigger.schedule');

  return (
    <PanelContainer title={desc.label} description={desc.description}>
      {/* Event type selector */}
      <div className="panel__section" data-field-path="trigger.event">
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
                  borderColor: active ? 'var(--color-accent-fg, #0969da)' : 'var(--color-border-default, #d0d7de)',
                  backgroundColor: active ? 'color-mix(in srgb, var(--color-accent-fg) 12%, transparent)' : 'var(--color-bg-default, #ffffff)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-fg-default, #1f2328)' }}>
                  {fd.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-fg-muted, #656d76)', marginTop: '4px', lineHeight: '1.4' }}>
                  {fd.description}
                </div>
              </button>
            );
          })}
        </div>
        <FieldError errors={eventErrors} />
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
        <div className="panel__section" data-field-path="trigger.schedule">
          <div className="panel__section-title">Schedule (cron)</div>
          <input
            type="text"
            value={trigger.schedule}
            onChange={(e) => setTrigger({ schedule: e.target.value })}
            placeholder="e.g. 0 0 * * *"
            style={{ ...inputStyle, ...fieldErrorBorder(scheduleErrors.length > 0) }}
          />
          <FieldError errors={scheduleErrors} />
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

      {/* Advanced: branches, paths, filters */}
      {selectedEvent && (
        <AdvancedSection configuredCount={advancedConfiguredCount(trigger)}>
          <div className="panel__field" style={{ marginTop: '8px' }}>
            <div className="panel__label">Branches</div>
            <input
              type="text"
              value={trigger.branches.join(', ')}
              onChange={(e) => setTrigger({
                branches: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })}
              placeholder="e.g. main, develop"
              style={inputStyle}
            />
            <div className="panel__help">
              Filter by branch names (comma-separated). Leave empty for all branches.
            </div>
          </div>

          <div className="panel__field" style={{ marginTop: '12px' }}>
            <div className="panel__label">Paths</div>
            <input
              type="text"
              value={trigger.paths.join(', ')}
              onChange={(e) => setTrigger({
                paths: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })}
              placeholder="e.g. src/**, docs/**"
              style={inputStyle}
            />
            <div className="panel__help">
              Filter by file paths (comma-separated glob patterns). Leave empty for all paths.
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
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
                <div style={{ fontSize: '12px', color: 'var(--color-fg-muted, #656d76)', marginTop: '2px', lineHeight: '1.4' }}>
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

            <div className="panel__field" style={{ marginTop: '12px' }}>
              <div className="panel__label">Roles</div>
              <input
                type="text"
                value={trigger.roles.join(', ')}
                onChange={(e) => setTrigger({
                  roles: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })}
                placeholder="e.g. WRITE, ADMIN"
                style={inputStyle}
              />
              <div className="panel__help">
                Only allow users with these roles to trigger (comma-separated).
              </div>
            </div>

            <div className="panel__field" style={{ marginTop: '12px' }}>
              <div className="panel__label">Bots</div>
              <input
                type="text"
                value={trigger.bots.join(', ')}
                onChange={(e) => setTrigger({
                  bots: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })}
                placeholder="e.g. dependabot, renovate"
                style={inputStyle}
              />
              <div className="panel__help">
                Only allow these bots to trigger (comma-separated).
              </div>
            </div>

            <label style={{ ...filterRowStyle, marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={trigger.statusComment}
                onChange={(e) => setTrigger({ statusComment: e.target.checked })}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Status Comment</div>
                <div style={{ fontSize: '12px', color: 'var(--color-fg-muted, #656d76)', marginTop: '2px', lineHeight: '1.4' }}>
                  Post a status comment when the workflow starts.
                </div>
              </div>
            </label>

            {trigger.manualApproval !== undefined && (
              <div className="panel__field" style={{ marginTop: '12px' }}>
                <div className="panel__label">Manual Approval</div>
                <input
                  type="text"
                  value={trigger.manualApproval}
                  onChange={(e) => setTrigger({ manualApproval: e.target.value })}
                  placeholder="e.g. required"
                  style={inputStyle}
                />
                <div className="panel__help">
                  Require manual approval before the workflow runs.
                </div>
              </div>
            )}

            {trigger.reaction !== undefined && (
              <div className="panel__field" style={{ marginTop: '12px' }}>
                <div className="panel__label">Reaction</div>
                <input
                  type="text"
                  value={trigger.reaction}
                  onChange={(e) => setTrigger({ reaction: e.target.value as '' })}
                  placeholder="e.g. +1, rocket"
                  style={inputStyle}
                />
                <div className="panel__help">
                  React to the triggering comment with this emoji.
                </div>
              </div>
            )}
          </div>
        </AdvancedSection>
      )}
    </PanelContainer>
  );
}

function advancedConfiguredCount(trigger: { branches: string[]; paths: string[]; skipBots: boolean; skipRoles: string[]; roles: string[]; bots: string[]; statusComment: boolean; manualApproval: string; reaction: string }): number {
  let count = 0;
  if (trigger.branches.length > 0) count++;
  if (trigger.paths.length > 0) count++;
  if (trigger.skipBots) count++;
  if (trigger.skipRoles.length > 0) count++;
  if (trigger.roles.length > 0) count++;
  if (trigger.bots.length > 0) count++;
  if (trigger.statusComment) count++;
  if (trigger.manualApproval) count++;
  if (trigger.reaction) count++;
  return count;
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '10px',
};

const eventCardStyle: React.CSSProperties = {
  padding: '12px',
  border: '1px solid var(--color-border-default, #d0d7de)',
  borderRadius: '8px',
  cursor: 'pointer',
  textAlign: 'left',
  background: 'var(--color-bg-default, #ffffff)',
  transition: 'border-color 150ms ease, background 150ms ease',
};

const activityChipStyle = (active: boolean): React.CSSProperties => ({
  display: 'inline-block',
  padding: '5px 12px',
  fontSize: '12px',
  borderRadius: '16px',
  border: `1px solid ${active ? 'var(--color-accent-fg, #0969da)' : 'var(--color-border-default, #d0d7de)'}`,
  backgroundColor: active ? 'color-mix(in srgb, var(--color-accent-fg) 12%, transparent)' : 'var(--color-bg-default, #ffffff)',
  color: active ? 'var(--color-accent-fg, #0969da)' : 'var(--color-fg-default, #1f2328)',
  cursor: 'pointer',
  userSelect: 'none',
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  border: '1px solid var(--color-border-default, #d0d7de)',
  borderRadius: '6px',
  outline: 'none',
  backgroundColor: 'var(--color-bg-default, #ffffff)',
  color: 'var(--color-fg-default, #1f2328)',
};

const presetButtonStyle: React.CSSProperties = {
  padding: '5px 12px',
  fontSize: '12px',
  border: '1px solid var(--color-border-default, #d0d7de)',
  borderRadius: '16px',
  background: 'var(--color-bg-subtle, #f6f8fa)',
  color: 'var(--color-fg-default, #1f2328)',
  cursor: 'pointer',
};

const filterRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  padding: '10px 0',
  cursor: 'pointer',
};
