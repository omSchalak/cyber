import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { BrutalCard } from '../components/BrutalCard';

export const NotFound: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
      <BrutalCard title="404 — Route Not Found" subtitle="Client-Side Routing Exception" variant="white">
        <div className="space-y-4 font-mono text-xs text-[#635B65] py-4">
          <ShieldAlert className="w-16 h-16 text-[#79616f] mx-auto animate-bounce" />
          <p className="text-sm font-bold text-[#252126]">
            The requested application page could not be located on this gateway.
          </p>
          <p>
            Please check the URL path or return to one of the verified gateway modules.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Link
              to="/"
              className="px-5 py-2.5 bg-[#79616f] text-white font-mono font-bold uppercase rounded-sm border-2 border-[#51404B] shadow-brutal flex items-center gap-2 hover:bg-[#917987]"
            >
              <Home className="w-4 h-4" />
              Return Home
            </Link>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-white text-[#51404B] font-mono font-bold uppercase rounded-sm border-2 border-[#51404B] shadow-brutal hover:bg-gray-100"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </BrutalCard>
    </div>
  );
};
