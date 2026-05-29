import { MATCH_FORMAT_LABEL, MATCH_FORMAT_OPTIONS, type MatchFormat } from '../types/models';

interface FormatToggleProps {
  value: MatchFormat;
  onChange: (format: MatchFormat) => void;
}

export function FormatToggle({ value, onChange }: FormatToggleProps) {
  return (
    <div className="format-toggle" role="group" aria-label="Formato de partido">
      {MATCH_FORMAT_OPTIONS.map((format) => (
        <button
          key={format}
          type="button"
          className={value === format ? 'active' : ''}
          onClick={() => onChange(format)}
        >
          {MATCH_FORMAT_LABEL[format]}
        </button>
      ))}
    </div>
  );
}
