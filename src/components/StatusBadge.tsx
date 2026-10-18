import React from 'react';

interface StatusBadgeProps {
  status:
    | 'SUCCESS'
    | 'FAILED'
    | 'WARNING'
    | 'PENDING'
    | 'RUNNING'
    | 'SKIPPED'
    | 'VALIDATION_ERROR'
    | 'EXPIRED'
    | 'VALID'
    | 'TRUSTED_DEMO'
    | 'DEMO_KEY'
    | 'UNVERIFIED'
    | 'REVOKED'
    | 'UNTRUSTED_CA'
    | 'INVALID'
    | 'healthy'
    | 'degraded'
    | 'error';
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text, size = 'sm' }) => {
  const label = text || status.replace(/_/g, ' ');

  let colorClasses = 'bg-[#E9DFE5] text-[#51404B] border-[#51404B]';

  switch (status) {
    case 'SUCCESS':
    case 'VALID':
    case 'TRUSTED_DEMO':
    case 'DEMO_KEY':
    case 'healthy':
      colorClasses = 'bg-[#dcfce7] text-[#166534] border-[#166534]';
      break;
    case 'FAILED':
    case 'error':
    case 'INVALID':
    case 'REVOKED':
      colorClasses = 'bg-[#fee2e2] text-[#991b1b] border-[#991b1b]';
      break;
    case 'WARNING':
    case 'EXPIRED':
    case 'UNTRUSTED_CA':
    case 'UNVERIFIED':
    case 'degraded':
      colorClasses = 'bg-[#fef3c7] text-[#92400e] border-[#92400e]';
      break;
    case 'VALIDATION_ERROR':
      colorClasses = 'bg-[#ffedd5] text-[#9a3412] border-[#9a3412]';
      break;
    case 'RUNNING':
      colorClasses = 'bg-[#e0e7ff] text-[#3730a3] border-[#3730a3] animate-pulse';
      break;
    case 'PENDING':
    case 'SKIPPED':
      colorClasses = 'bg-[#f3f4f6] text-[#4b5563] border-[#9ca3af]';
      break;
  }

  const sizeClasses = size === 'lg'
    ? 'px-3 py-1 text-sm'
    : size === 'md'
    ? 'px-2.5 py-0.5 text-xs'
    : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wider border-2 rounded-sm shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,0.8)] ${colorClasses} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {label}
    </span>
  );
};
