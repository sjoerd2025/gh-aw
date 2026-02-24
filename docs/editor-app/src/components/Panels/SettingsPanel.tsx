import { useWorkflowStore } from '../../stores/workflowStore';
import { PanelContainer } from './PanelContainer';
import { getFieldDescription } from '../../utils/fieldDescriptions';
import { HelpTooltip } from '../shared/HelpTooltip';

const PLATFORM_OPTIONS = [
  { value: '', label: 'Default (ubuntu-latest)' },
  { value: 'ubuntu-latest', label: 'Ubuntu (Latest)' },
  { value: 'ubuntu-24.04', label: 'Ubuntu 24.04' },
  { value: 'ubuntu-22.04', label: 'Ubuntu 22.04' },
  { value: 'macos-latest', label: 'macOS (Latest)' },
  { value: 'macos-15', label: 'macOS 15' },
  { value: 'macos-14', label: 'macOS 14' },
  { value: 'windows-latest', label: 'Windows (Latest)' },
  { value: 'windows-2022', label: 'Windows 2022' },
];

export function SettingsPanel() {
  const concurrency = useWorkflowStore((s) => s.concurrency) ?? { group: '', cancelInProgress: false };
  const rateLimit = useWorkflowStore((s) => s.rateLimit) ?? { max: '', window: '' };
  const platform = useWorkflowStore((s) => s.platform) ?? '';
  const timeoutMinutes = useWorkflowStore((s) => s.timeoutMinutes);
  const setConcurrency = useWorkflowStore((s) => s.setConcurrency);
  const setRateLimit = useWorkflowStore((s) => s.setRateLimit);
  const setPlatform = useWorkflowStore((s) => s.setPlatform);
  const desc = getFieldDescription('settings');

  return (
    <PanelContainer title={desc.label} description={desc.description}>
      {/* Platform */}
      <div className="panel__section">
        <div className="panel__section-title">Runner</div>
        <div className="panel__field">
          <div className="panel__label">
            {getFieldDescription('platform').label}
            {getFieldDescription('platform').tooltip && (
              <HelpTooltip text={getFieldDescription('platform').tooltip!} />
            )}
          </div>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            style={selectStyle}
          >
            {PLATFORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="panel__help">{getFieldDescription('platform').description}</div>
        </div>
      </div>

      {/* Concurrency */}
      <div className="panel__section">
        <div className="panel__section-title">
          {getFieldDescription('concurrency').label}
        </div>
        <div className="panel__field">
          <div className="panel__label">
            {getFieldDescription('concurrency.group').label}
            {getFieldDescription('concurrency.group').tooltip && (
              <HelpTooltip text={getFieldDescription('concurrency.group').tooltip!} />
            )}
          </div>
          <input
            type="text"
            value={concurrency.group}
            onChange={(e) => setConcurrency({ group: e.target.value })}
            placeholder="${{ github.workflow }}-${{ github.ref }}"
            style={inputStyle}
          />
          <div className="panel__help">{getFieldDescription('concurrency.group').description}</div>
        </div>

        <div className="panel__field" style={{ marginTop: '12px' }}>
          <label style={toggleRowStyle}>
            <span className="panel__label" style={{ marginBottom: 0 }}>
              {getFieldDescription('concurrency.cancelInProgress').label}
            </span>
            <div
              onClick={() => setConcurrency({ cancelInProgress: !concurrency.cancelInProgress })}
              style={{
                ...toggleTrackStyle,
                backgroundColor: concurrency.cancelInProgress ? '#0969da' : '#d0d7de',
              }}
            >
              <div style={{
                ...toggleThumbStyle,
                transform: concurrency.cancelInProgress ? 'translateX(16px)' : 'translateX(0)',
              }} />
            </div>
          </label>
          <div className="panel__help">{getFieldDescription('concurrency.cancelInProgress').description}</div>
        </div>
      </div>

      {/* Rate Limit */}
      <div className="panel__section">
        <div className="panel__section-title">
          {getFieldDescription('rateLimit').label}
        </div>
        <div className="panel__field">
          <div className="panel__label">{getFieldDescription('rateLimit.max').label}</div>
          <input
            type="number"
            min={1}
            value={rateLimit.max}
            onChange={(e) => setRateLimit({ max: e.target.value ? parseInt(e.target.value, 10) : '' })}
            placeholder="e.g. 10"
            style={{ ...inputStyle, width: '100px' }}
          />
          <div className="panel__help">{getFieldDescription('rateLimit.max').description}</div>
        </div>
        <div className="panel__field" style={{ marginTop: '12px' }}>
          <div className="panel__label">{getFieldDescription('rateLimit.window').label}</div>
          <input
            type="text"
            value={rateLimit.window}
            onChange={(e) => setRateLimit({ window: e.target.value })}
            placeholder="e.g. 1h, 24h"
            style={{ ...inputStyle, width: '120px' }}
          />
          <div className="panel__help">{getFieldDescription('rateLimit.window').description}</div>
        </div>
      </div>

      {/* Timeout (secondary location — also shown in the Steps panel) */}
      <div className="panel__section">
        <div className="panel__section-title">Limits</div>
        <div className="panel__field">
          <div className="panel__label">
            {getFieldDescription('timeout-minutes').label}
            {getFieldDescription('timeout-minutes').tooltip && (
              <HelpTooltip text={getFieldDescription('timeout-minutes').tooltip!} />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range"
              min={1}
              max={360}
              value={timeoutMinutes}
              onChange={(e) =>
                useWorkflowStore.getState().loadState({ timeoutMinutes: parseInt(e.target.value, 10) })
              }
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1f2328', minWidth: '40px', textAlign: 'right' }}>
              {timeoutMinutes}m
            </span>
          </div>
          <div className="panel__help">{getFieldDescription('timeout-minutes').description}</div>
        </div>
      </div>
    </PanelContainer>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  border: '1px solid #d0d7de',
  borderRadius: '6px',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
};

const toggleTrackStyle: React.CSSProperties = {
  width: '34px',
  height: '18px',
  borderRadius: '9px',
  position: 'relative',
  transition: 'background-color 150ms ease',
  cursor: 'pointer',
  flexShrink: 0,
};

const toggleThumbStyle: React.CSSProperties = {
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  backgroundColor: '#ffffff',
  position: 'absolute',
  top: '2px',
  left: '2px',
  transition: 'transform 150ms ease',
  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
};
