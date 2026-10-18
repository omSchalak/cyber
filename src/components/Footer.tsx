import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, FileCode, Award, Terminal } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#51404B] text-[#E9DFE5] border-t-4 border-[#252126] mt-20 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b-2 border-[#79616f]">
          {/* Col 1: Identity */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white text-[#51404B] border-2 border-white rounded-sm flex items-center justify-center font-bold">
                <Shield className="w-5 h-5 text-[#79616f]" />
              </div>
              <span className="font-sans font-black text-white text-lg tracking-tight uppercase">
                SECURE ELECTRONIC MAIL GATEWAY
              </span>
            </div>
            <p className="text-xs font-mono text-[#D7CBD2] max-w-lg leading-relaxed">
              An advanced cybersecurity gateway architecture demonstrating standards-compliant S/MIME X.509
              and OpenPGP RFC 4880 cryptographic operations, digital signatures, and cross-protocol interoperability.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#252126] border border-[#79616f] rounded text-xs font-mono text-white">
              <Award className="w-4 h-4 text-[#E9DFE5]" />
              <span>Project Designer & Developer: <strong>Mansi Chalak</strong></span>
            </div>
          </div>

          {/* Col 2: Modules */}
          <div>
            <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-white mb-3 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#E9DFE5]" />
              CORE ENGINES
            </h4>
            <ul className="space-y-1.5 text-xs font-mono">
              <li>
                <Link to="/smime" className="hover:text-white transition">
                  → S/MIME PKCS#7 Engine
                </Link>
              </li>
              <li>
                <Link to="/openpgp" className="hover:text-white transition">
                  → OpenPGP RFC 4880 Suite
                </Link>
              </li>
              <li>
                <Link to="/interop-lab" className="hover:text-white transition">
                  → Cross-Protocol Interop Lab
                </Link>
              </li>
              <li>
                <Link to="/keys-certificates" className="hover:text-white transition">
                  → Credential Inventory
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: System & Legal */}
          <div>
            <h4 className="font-mono font-bold text-xs uppercase tracking-widest text-white mb-3 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#E9DFE5]" />
              SYSTEM SPECS
            </h4>
            <ul className="space-y-1.5 text-xs font-mono text-[#D7CBD2]">
              <li>Domain: Network Security</li>
              <li>Standard: PKCS#7 / CMS & RFC 4880</li>
              <li>Platform: Vercel Serverless</li>
              <li>Environment: Academic Demonstration</li>
            </ul>
          </div>
        </div>

        {/* Disclaimer and copyright */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-[#D7CBD2]">
          <div>
            © 2026 <strong>Mansi Chalak</strong>. All rights reserved. Built for academic demonstration and research.
          </div>
          <div className="bg-[#252126] px-3 py-1 rounded text-[11px] border border-[#79616f]">
            Notice: Processed locally — no external SMTP mail transport connected.
          </div>
        </div>
      </div>
    </footer>
  );
};
