import type { ValidationError } from '../../utils/validation';

interface FieldErrorProps {
  errors: ValidationError[];
}

export function FieldError({ errors }: FieldErrorProps) {
  if (errors.length === 0) return null;

  return (
    <div style={{ marginTop: '4px' }}>
      {errors.map((err, i) => (
        <div
          key={i}
          style={{
            fontSize: '12px',
            lineHeight: '1.4',
            color: err.severity === 'error' ? '#cf222e' : '#bf8700',
            marginTop: i > 0 ? '2px' : 0,
          }}
        >
          {err.message}
        </div>
      ))}
    </div>
  );
}

/** Inline style mixin for inputs with errors — adds red border */
export function fieldErrorBorder(hasError: boolean): React.CSSProperties {
  if (!hasError) return {};
  return {
    borderColor: '#cf222e',
    boxShadow: '0 0 0 1px rgba(207, 34, 46, 0.3)',
  };
}
