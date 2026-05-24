interface ProgressBarProps {
  value: number; // 0–100
  label?: string;
  className?: string;
}

export function ProgressBar({ value, label, className = '' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
          <span>{label}</span>
          <span className="font-semibold text-gray-700">{pct}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-600 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
