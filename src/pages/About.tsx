import React from 'react';
import {
  Award,
  Shield,
  Layers,
  Code,
  CheckCircle2,
  Lock,
  Cpu,
  Terminal,
  FileText
} from 'lucide-react';
import { BrutalCard } from '../components/BrutalCard';

export const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
      {/* Header Banner */}
      <div className="border-b-4 border-[#51404B] pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#51404B] text-white rounded-sm text-xs font-mono font-bold uppercase">
          <Award className="w-4 h-4 text-[#E9DFE5]" />
          <span>PROJECT PORTFOLIO // ACADEMIC RESEARCH</span>
        </div>
        <h1 className="font-sans font-black text-3xl sm:text-5xl uppercase tracking-tight text-[#252126]">
          About The Project
        </h1>
        <p className="font-mono text-sm text-[#635B65]">
          Secure Electronic Mail Gateway with S/MIME and OpenPGP Interoperability.
        </p>
      </div>

      {/* Core Project Metadata Card */}
      <BrutalCard
        title="Project Specifications"
        subtitle="Curriculum alignment & architectural purpose"
        variant="white"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded">
            <span className="text-[#635B65] uppercase text-[10px] block">Project Title</span>
            <span className="font-bold text-sm text-[#252126]">
              Secure Electronic Mail Gateway with S/MIME and OpenPGP Interoperability
            </span>
          </div>

          <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded">
            <span className="text-[#635B65] uppercase text-[10px] block">Domain</span>
            <span className="font-bold text-sm text-[#252126]">
              Network Security and Secure Communication Protocols
            </span>
          </div>

          <div className="p-3 bg-[#E9DFE5] border border-[#51404B] rounded">
            <span className="text-[#51404B] uppercase text-[10px] block font-bold">Website Creator & Designer</span>
            <span className="font-bold text-base text-[#51404B]">
              Mansi Chalak
            </span>
          </div>

          <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded">
            <span className="text-[#635B65] uppercase text-[10px] block">Project Type</span>
            <span className="font-bold text-sm text-[#252126]">
              Academic Cybersecurity Demonstration
            </span>
          </div>
        </div>

        <div className="mt-4 p-4 bg-white border-2 border-[#51404B] rounded-sm font-mono text-xs text-[#252126] space-y-2 leading-relaxed">
          <span className="font-bold uppercase text-[#51404B] block">Project Purpose:</span>
          <p>
            This website demonstrates secure electronic mail processing, digital signatures, certificate validation,
            OpenPGP key management, and controlled interoperability between disparate public-key cryptography standards.
          </p>
          <p>
            It is designed to showcase rigorous defensive software architecture, cryptographic safety boundaries,
            and complete parity between local development and cloud serverless deployment.
          </p>
        </div>
      </BrutalCard>

      {/* Technology Architecture */}
      <BrutalCard
        title="Technology Stack & Standards"
        subtitle="Modern, verified, serverless-compatible software stack"
        variant="mauve"
      >
        <div className="space-y-4 font-mono text-xs text-[#252126]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white border border-[#51404B] rounded-sm">
              <span className="font-bold block text-[#51404B] uppercase mb-1">Frontend Layer</span>
              <ul className="space-y-1 text-[#635B65]">
                <li>• React 18 & TypeScript</li>
                <li>• Vite 5 Build Engine</li>
                <li>• Tailwind CSS (Maximalist)</li>
                <li>• React Router v6</li>
                <li>• Lucide React Icons</li>
              </ul>
            </div>

            <div className="p-3 bg-white border border-[#51404B] rounded-sm">
              <span className="font-bold block text-[#51404B] uppercase mb-1">Backend & API Layer</span>
              <ul className="space-y-1 text-[#635B65]">
                <li>• Node.js TypeScript API</li>
                <li>• Vercel Serverless Functions</li>
                <li>• Centralized typed client</li>
                <li>• Vitest Route Coverage</li>
                <li>• Zero-leakage Audit Store</li>
              </ul>
            </div>

            <div className="p-3 bg-white border border-[#51404B] rounded-sm">
              <span className="font-bold block text-[#51404B] uppercase mb-1">Cryptography Engine</span>
              <ul className="space-y-1 text-[#635B65]">
                <li>• OpenPGP.js (RFC 4880)</li>
                <li>• node-forge PKCS#7 & CMS</li>
                <li>• X.509 ASN.1/DER Parser</li>
                <li>• SHA-256 Digest Verification</li>
                <li>• AES-256 Key Unwrapping</li>
              </ul>
            </div>
          </div>
        </div>
      </BrutalCard>

      {/* Ethical and Operational Disclaimer */}
      <BrutalCard
        title="Operational Context & Ethical Disclaimers"
        subtitle="Academic demonstration boundaries"
        variant="white"
      >
        <div className="space-y-3 font-mono text-xs text-[#635B65] leading-relaxed">
          <p>
            • <strong>No External Mail Transmission:</strong> This application executes real cryptographic transformations,
            session key wraps, and digital signatures. However, it operates locally and in serverless API isolation;
            it does not transmit packets to external SMTP mail relays.
          </p>
          <p>
            • <strong>Demonstration Credentials:</strong> The sample certificates and private keys provided for Alice, Bob, and
            the Gateway Authority are synthesized demonstration credentials intended solely for testing and presentation purposes.
          </p>
          <p>
            • <strong>Private Key Security:</strong> Private keys generated through the demonstration key generator are created
            in memory on the server and are never persisted to databases or disclosed to external services.
          </p>
        </div>
      </BrutalCard>
    </div>
  );
};
