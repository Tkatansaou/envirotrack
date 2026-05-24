type BadgeVariant = 'green' | 'amber' | 'red' | 'gray' | 'blue' | 'purple';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
  className?: string;
}

export function StatusBadge({ label, variant, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {label}
    </span>
  );
}
