import React from 'react';

interface ProtocolBadgeProps {
  protocol: 'S/MIME' | 'OpenPGP' | 'Cross-Protocol' | 'System' | string;
  size?: 'sm' | 'md';
}

export const ProtocolBadge: React.FC<ProtocolBadgeProps> = ({ protocol, size = 'md' }) => {
  const norm = protocol.toLowerCase();

  let style = 'bg-[#79616f] text-white border-[#51404B]';

  if (norm.includes('openpgp') || norm.includes('pgp')) {
    style = 'bg-[#51404B] text-[#E9DFE5] border-[#252126]';
  } else if (norm.includes('cross')) {
    style = 'bg-[#831843] text-[#fce7f3] border-[#500724]';
  } else if (norm.includes('smime') || norm.includes('s/mime')) {
    style = 'bg-[#79616f] text-white border-[#51404B]';
  } else if (norm.includes('system')) {
    style = 'bg-[#475569] text-white border-[#1e293b]';
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold uppercase tracking-widest border-2 rounded-sm shadow-[2px_2px_0px_0px_#252126] ${style} ${sizeClass}`}
    >
      <span className="opacity-70">#</span>
      {protocol}
    </span>
  );
};
