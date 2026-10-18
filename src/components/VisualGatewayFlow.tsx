import React from 'react';
import { Mail, CheckCircle2, ShieldCheck, Key, RefreshCw, Lock, Send } from 'lucide-react';

interface VisualGatewayFlowProps {
  currentStageId?: string;
  isCrossProtocol?: boolean;
}

export const VisualGatewayFlow: React.FC<VisualGatewayFlowProps> = ({
  currentStageId,
  isCrossProtocol = true
}) => {
  const stages = [
    {
      id: '1',
      title: 'Email Composition',
      desc: 'RFC 5322 header and body parsing',
      icon: Mail
    },
    {
      id: '2',
      title: 'Security Validation',
      desc: 'Credential & protocol lookup',
      icon: CheckCircle2
    },
    {
      id: '3',
      title: 'Cryptographic Check',
      desc: 'Signature verification & checks',
      icon: ShieldCheck
    },
    {
      id: '4',
      title: 'Gateway Transition',
      desc: isCrossProtocol ? 'Trusted boundary trans-encryption' : 'Direct protocol routing',
      icon: RefreshCw,
      highlight: isCrossProtocol
    },
    {
      id: '5',
      title: 'Recipient Packaging',
      desc: 'Encapsulated ciphertext output',
      icon: Lock
    },
    {
      id: '6',
      title: 'Gateway Delivery',
      desc: 'Processed locally for recipient',
      icon: Send
    }
  ];

  return (
    <div className="w-full bg-[#E9DFE5] border-2 border-[#51404B] p-5 rounded-sm shadow-brutal my-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b-2 border-[#51404B] pb-2">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-[#51404B]" />
          <span className="font-mono font-bold text-xs uppercase tracking-widest text-[#51404B]">
            GATEWAY PIPELINE ARCHITECTURE // PROTOCOL TRANSITION LIFECYCLE
          </span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 bg-[#79616f] text-white font-bold rounded">
          {isCrossProtocol ? 'CROSS-PROTOCOL ACTIVE' : 'DIRECT TRANSMISSION'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = currentStageId === stage.id;
          const isSpecial = stage.highlight;

          let cardBg = 'bg-white text-[#252126] border-[#51404B]';
          if (isActive) {
            cardBg = 'bg-[#79616f] text-white border-[#51404B] ring-2 ring-[#51404B] shadow-brutal-lg';
          } else if (isSpecial) {
            cardBg = 'bg-[#F4EFF2] text-[#252126] border-[#79616f]';
          }

          return (
            <div
              key={stage.id}
              className={`relative border-2 p-3.5 rounded-sm shadow-brutal-sm flex flex-col justify-between transition-transform duration-150 hover:-translate-y-1 ${cardBg}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-black bg-opacity-10 rounded">
                  STAGE 0{idx + 1}
                </span>
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#79616f]'}`} />
              </div>

              <div>
                <h4 className="font-sans font-bold text-sm tracking-tight leading-tight">
                  {stage.title}
                </h4>
                <p className={`text-[11px] font-mono mt-1 leading-snug ${isActive ? 'text-gray-200' : 'text-[#635B65]'}`}>
                  {stage.desc}
                </p>
              </div>

              {idx < stages.length - 1 && (
                <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-[#51404B] font-bold text-xs pointer-events-none">
                  →
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
