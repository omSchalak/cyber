import React from 'react';

interface BrutalCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  variant?: 'white' | 'mauve' | 'deep' | 'brand';
  hoverEffect?: boolean;
}

export const BrutalCard: React.FC<BrutalCardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  badge,
  variant = 'white',
  hoverEffect = false
}) => {
  let bgStyles = 'bg-white text-[#252126] border-[#51404B]';
  if (variant === 'mauve') {
    bgStyles = 'bg-[#E9DFE5] text-[#252126] border-[#51404B]';
  } else if (variant === 'deep') {
    bgStyles = 'bg-[#51404B] text-white border-[#252126]';
  } else if (variant === 'brand') {
    bgStyles = 'bg-[#79616f] text-white border-[#51404B]';
  }

  const hoverStyles = hoverEffect
    ? 'transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg'
    : '';

  return (
    <div
      className={`border-2 rounded-sm shadow-brutal p-5 sm:p-6 ${bgStyles} ${hoverStyles} ${className}`}
    >
      {(title || badge) && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-current border-opacity-20">
          <div>
            {title && (
              <h3 className="font-sans font-bold text-lg sm:text-xl uppercase tracking-tight flex items-center gap-2">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs font-mono opacity-80 mt-0.5">{subtitle}</p>
            )}
          </div>
          {badge && <div>{badge}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
