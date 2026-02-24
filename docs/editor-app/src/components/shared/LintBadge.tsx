import { memo } from 'react';

interface LintBadgeProps {
  count: number;
}

export const LintBadge = memo(function LintBadge({ count }: LintBadgeProps) {
  if (count === 0) return null;

  return (
    <span style={badgeStyle}>
      {count}
    </span>
  );
});

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '18px',
  height: '18px',
  padding: '0 5px',
  borderRadius: '9px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#ffffff',
  backgroundColor: '#d4a72c',
  flexShrink: 0,
};
