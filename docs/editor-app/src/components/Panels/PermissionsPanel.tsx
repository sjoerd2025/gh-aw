import { useWorkflowStore } from '../../stores/workflowStore';
import { PanelContainer } from './PanelContainer';
import { getFieldDescription } from '../../utils/fieldDescriptions';
import { HelpTooltip } from '../shared/HelpTooltip';
import { FieldError } from '../shared/FieldError';
import { getErrorsForField } from '../../utils/validation';
import type { PermissionScope, PermissionLevel } from '../../types/workflow';

const scopes: PermissionScope[] = [
  'actions',
  'attestations',
  'checks',
  'contents',
  'deployments',
  'discussions',
  'id-token',
  'issues',
  'models',
  'metadata',
  'packages',
  'pages',
  'pull-requests',
  'security-events',
  'statuses',
];

const levels: PermissionLevel[] = ['read', 'write'];

export function PermissionsPanel() {
  const permissions = useWorkflowStore((s) => s.permissions);
  const autoSetPermissions = useWorkflowStore((s) => s.autoSetPermissions);
  const setPermissions = useWorkflowStore((s) => s.setPermissions);
  const validationErrors = useWorkflowStore((s) => s.validationErrors) ?? [];
  const desc = getFieldDescription('permissions');
  const idTokenErrors = getErrorsForField(validationErrors, 'permissions.id-token');

  const setLevel = (scope: PermissionScope, level: PermissionLevel) => {
    setPermissions({ [scope]: level });
  };

  return (
    <PanelContainer title={desc.label} description={desc.description}>
      <div className="panel__info" style={{ marginTop: 0, marginBottom: '16px' }}>
        {desc.tooltip}
      </div>

      <div style={tableStyle} role="table" aria-label="Permission scopes">
        {/* Header */}
        <div style={headerRowStyle} role="row">
          <div style={{ flex: 1 }} role="columnheader">Scope</div>
          {levels.map((l) => (
            <div key={l} style={headerCellStyle} role="columnheader">{capitalize(l)}</div>
          ))}
        </div>

        {/* Rows */}
        {scopes.map((scope) => {
          const fd = getFieldDescription(`permission.${scope}`);
          const current = permissions[scope] ?? 'read';
          const isAutoSet = autoSetPermissions.includes(scope);
          return (
            <div key={scope} style={rowStyle} role="row" data-field-path={`permissions.${scope}`}>
              <div style={{ flex: 1, minWidth: 0 }} role="rowheader">
                <div style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {fd.label || formatScope(scope)}
                  {isAutoSet && <span style={autoBadgeStyle}>Auto</span>}
                  {fd.description && (
                    <HelpTooltip text={fd.description} />
                  )}
                </div>
              </div>
              <div style={segmentedControlStyle} role="radiogroup" aria-label={`${fd.label || formatScope(scope)} permission level`}>
                {levels.map((level) => (
                  <button
                    key={level}
                    onClick={() => setLevel(scope, level)}
                    role="radio"
                    aria-checked={current === level}
                    aria-label={`${capitalize(level)} access`}
                    style={{
                      ...segmentButtonStyle,
                      ...(current === level ? activeSegmentStyle(level) : {}),
                    }}
                  >
                    {capitalize(level)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <FieldError errors={idTokenErrors} />
    </PanelContainer>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatScope(scope: string): string {
  return scope.split('-').map(capitalize).join(' ');
}

function activeSegmentStyle(level: PermissionLevel): React.CSSProperties {
  switch (level) {
    case 'write':
      return { backgroundColor: 'var(--color-accent-bg, #ddf4ff)', color: 'var(--color-accent-fg, #0969da)', borderColor: 'var(--color-accent-fg, #0969da)' };
    case 'read':
    default:
      return { backgroundColor: 'color-mix(in srgb, var(--color-success-fg, #1a7f37) 12%, transparent)', color: 'var(--color-success-fg, #1a7f37)', borderColor: 'var(--color-success-fg, #1a7f37)' };
  }
}

const tableStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '2px solid var(--color-border-default, #d0d7de)',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-fg-muted, #656d76)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const headerCellStyle: React.CSSProperties = {
  width: '54px',
  textAlign: 'center',
  flexShrink: 0,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '1px solid var(--color-border-muted, #d8dee4)',
  gap: '10px',
};

const segmentedControlStyle: React.CSSProperties = {
  display: 'flex',
  flexShrink: 0,
};

const autoBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  fontSize: '10px',
  fontWeight: 500,
  color: 'var(--color-accent-fg, #0969da)',
  backgroundColor: 'var(--color-accent-bg, #ddf4ff)',
  borderRadius: '10px',
  lineHeight: '16px',
};

const segmentButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 500,
  border: '1px solid var(--color-border-default, #d0d7de)',
  background: 'var(--color-bg-default, #ffffff)',
  color: 'var(--color-fg-muted, #656d76)',
  cursor: 'pointer',
  transition: 'background 150ms ease, color 150ms ease',
  marginLeft: '-1px',
};
