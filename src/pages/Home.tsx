import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Key,
  FileCheck,
  RefreshCw,
  Send,
  Lock,
  ArrowRight,
  ShieldAlert,
  Award,
  Layers,
  FileCode,
  ScrollText,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { BrutalCard } from '../components/BrutalCard';
import { VisualGatewayFlow } from '../components/VisualGatewayFlow';

export const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'smime' | 'openpgp' | 'interop'>('smime');

  return (
    <div className="space-y-16">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-[#79616f] text-white border-b-4 border-[#51404B] p-8 sm:p-14 lg:p-20 shadow-brutal-lg rounded-sm">
        {/* Layered geometric accent backgrounds */}
        <div className="absolute -top-12 -right-12 w-64 h-64 border-4 border-white opacity-10 rotate-12 pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-[#51404B] opacity-30 rounded-full pointer-events-none"></div>

        <div className="relative max-w-5xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#51404B] border-2 border-white rounded-sm text-xs font-mono font-bold tracking-widest uppercase shadow-brutal-sm">
            <Award className="w-4 h-4 text-white" />
            <span>ACADEMIC PROJECT DEMONSTRATION // DESIGNED BY MANSI CHALAK</span>
          </div>

          <h1 className="font-sans font-black text-4xl sm:text-6xl lg:text-7xl uppercase tracking-tight leading-none text-white drop-shadow-[3px_3px_0px_#51404B]">
            SECURE EMAIL.<br />
            <span className="text-[#E9DFE5]">TRUSTED COMMUNICATION.</span>
          </h1>

          <p className="font-mono text-lg sm:text-xl text-[#E9DFE5] max-w-3xl font-medium leading-relaxed">
            Bridging S/MIME and OpenPGP through a secure, standards-aware electronic mail gateway.
          </p>

          <p className="font-sans text-sm sm:text-base text-white/90 max-w-2xl leading-relaxed">
            Explore certificate-based email security, OpenPGP encryption, digital signatures,
            and controlled cross-protocol processing in one unified application.
          </p>

          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <Link
              to="/composer"
              className="px-6 py-3.5 bg-white text-[#51404B] border-2 border-[#51404B] font-mono font-bold uppercase tracking-wider text-sm rounded-sm shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg transition flex items-center gap-2"
            >
              <Send className="w-4 h-4 text-[#79616f]" />
              Explore the Gateway
            </Link>
            <Link
              to="/dashboard"
              className="px-6 py-3.5 bg-[#51404B] text-white border-2 border-white font-mono font-bold uppercase tracking-wider text-sm rounded-sm shadow-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg transition flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-[#E9DFE5]" />
              Open Security Dashboard
            </Link>
          </div>

          <div className="pt-4 text-xs font-mono text-[#E9DFE5] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Gateway engine online. All cryptographic routines executed locally and via verified serverless functions.</span>
          </div>
        </div>
      </section>

      {/* PIPELINE ARCHITECTURE SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#79616f]">
              TRANSITION LIFECYCLE
            </span>
            <h2 className="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-[#252126]">
              End-to-End Gateway Processing Flow
            </h2>
          </div>
          <p className="text-xs font-mono text-[#635B65] max-w-md">
            Messages navigate 5 verifiable validation and cryptographic barriers before recipient delivery.
          </p>
        </div>

        <VisualGatewayFlow isCrossProtocol={true} />
      </section>

      {/* 6 FEATURE PANELS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#79616f]">
            CRYPTOGRAPHIC CAPABILITIES
          </span>
          <h2 className="font-sans font-black text-3xl sm:text-4xl uppercase tracking-tight text-[#252126]">
            Architectural Building Blocks
          </h2>
          <p className="text-sm font-mono text-[#635B65]">
            Built with rigorous adherence to RFC 5751 (S/MIME 4.0), RFC 4880 (OpenPGP), and X.509 standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <BrutalCard
            title="S/MIME Certificate Security"
            subtitle="RFC 5751 & X.509 PKI"
            badge={<span className="text-[10px] font-mono font-bold bg-[#E9DFE5] px-2 py-0.5 border border-[#51404B] rounded">PKCS#7 / CMS</span>}
            hoverEffect={true}
          >
            <p className="text-xs font-mono text-[#635B65] leading-relaxed mb-4">
              Hierarchical Trust Model rooted in Certificate Authorities. Validates certificate chains,
              validity periods, Subject Alternative Names (SAN), and email protection key usages.
            </p>
            <Link
              to="/smime"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#79616f] hover:underline"
            >
              Open S/MIME Module <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </BrutalCard>

          {/* Card 2 */}
          <BrutalCard
            title="OpenPGP Encryption"
            subtitle="RFC 4880 & Web of Trust"
            badge={<span className="text-[10px] font-mono font-bold bg-[#E9DFE5] px-2 py-0.5 border border-[#51404B] rounded">ASCII ARMOR</span>}
            hoverEffect={true}
          >
            <p className="text-xs font-mono text-[#635B65] leading-relaxed mb-4">
              Decentralized key management with individual public-key fingerprints. Supports modern 2048-bit RSA,
              Curve25519, cleartext signatures, and detached signature verifications.
            </p>
            <Link
              to="/openpgp"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#79616f] hover:underline"
            >
              Open OpenPGP Module <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </BrutalCard>

          {/* Card 3 */}
          <BrutalCard
            title="Digital Signatures"
            subtitle="Integrity & Non-Repudiation"
            badge={<span className="text-[10px] font-mono font-bold bg-[#E9DFE5] px-2 py-0.5 border border-[#51404B] rounded">SHA-256</span>}
            hoverEffect={true}
          >
            <p className="text-xs font-mono text-[#635B65] leading-relaxed mb-4">
              Cryptographically bounds sender identity to email payload digests. Prevents silent message alteration,
              tampering in transit, or sender identity repudiation.
            </p>
            <Link
              to="/composer"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#79616f] hover:underline"
            >
              Compose Signed Mail <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </BrutalCard>

          {/* Card 4 */}
          <BrutalCard
            title="Secure Gateway Processing"
            subtitle="Controlled Trust Boundary"
            badge={<span className="text-[10px] font-mono font-bold bg-[#E9DFE5] px-2 py-0.5 border border-[#51404B] rounded">STANDARDS-AWARE</span>}
            hoverEffect={true}
          >
            <p className="text-xs font-mono text-[#635B65] leading-relaxed mb-4">
              Acts as an intentional security boundary that decrypts authorized inbound mail, verifies sender
              cryptographic claims, and re-encapsulates payloads for the recipient environment.
            </p>
            <Link
              to="/interop-lab"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#79616f] hover:underline"
            >
              Test Scenarios <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </BrutalCard>

          {/* Card 5 */}
          <BrutalCard
            title="Protocol Interoperability"
            subtitle="Cross-Standard Translation"
            badge={<span className="text-[10px] font-mono font-bold bg-[#E9DFE5] px-2 py-0.5 border border-[#51404B] rounded">S/MIME ↔ PGP</span>}
            hoverEffect={true}
          >
            <p className="text-xs font-mono text-[#635B65] leading-relaxed mb-4">
              S/MIME and OpenPGP are not directly interchangeable ciphertext formats. The gateway resolves
              format mismatches while recording dual signatures to attest to translation integrity.
            </p>
            <Link
              to="/interop-lab"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#79616f] hover:underline"
            >
              Inspect Interop Lab <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </BrutalCard>

          {/* Card 6 */}
          <BrutalCard
            title="Auditable Security Events"
            subtitle="Zero-Secret Diagnostic Trail"
            badge={<span className="text-[10px] font-mono font-bold bg-[#E9DFE5] px-2 py-0.5 border border-[#51404B] rounded">AUDIT LOGS</span>}
            hoverEffect={true}
          >
            <p className="text-xs font-mono text-[#635B65] leading-relaxed mb-4">
              Comprehensive event logging for verification outcomes, protocol transitions, and security warnings.
              Strictly sanitized to exclude passwords, private keys, and plaintexts.
            </p>
            <Link
              to="/audit-logs"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#79616f] hover:underline"
            >
              View Audit Trail <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </BrutalCard>
        </div>
      </section>

      {/* INTERACTIVE PROTOCOL COMPARISON */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <BrutalCard
          title="Protocol Matrix: S/MIME vs OpenPGP"
          subtitle="Comparative analysis of electronic mail security specifications"
          variant="mauve"
        >
          <div className="flex flex-wrap gap-2 mb-6 border-b-2 border-[#51404B] pb-3">
            <button
              onClick={() => setActiveTab('smime')}
              className={`px-4 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 ${
                activeTab === 'smime'
                  ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                  : 'bg-white text-[#51404B] border-[#51404B] hover:bg-[#F8F5F7]'
              }`}
            >
              S/MIME Architecture
            </button>
            <button
              onClick={() => setActiveTab('openpgp')}
              className={`px-4 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 ${
                activeTab === 'openpgp'
                  ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                  : 'bg-white text-[#51404B] border-[#51404B] hover:bg-[#F8F5F7]'
              }`}
            >
              OpenPGP Architecture
            </button>
            <button
              onClick={() => setActiveTab('interop')}
              className={`px-4 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 ${
                activeTab === 'interop'
                  ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                  : 'bg-white text-[#51404B] border-[#51404B] hover:bg-[#F8F5F7]'
              }`}
            >
              Gateway Translation Strategy
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-[#51404B] text-white border-2 border-[#252126]">
                  <th className="p-3 uppercase">Criterion</th>
                  <th className="p-3 uppercase">S/MIME (RFC 5751 / 8551)</th>
                  <th className="p-3 uppercase">OpenPGP (RFC 4880 / 9580)</th>
                  <th className="p-3 uppercase">Gateway Bridge Behavior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7CBD2] bg-white text-[#252126]">
                <tr className="hover:bg-[#F8F5F7]">
                  <td className="p-3 font-bold">Trust Model</td>
                  <td className="p-3">Hierarchical PKI (X.509 Certificate Authorities)</td>
                  <td className="p-3">Decentralized Web of Trust (WoT) & Fingerprints</td>
                  <td className="p-3 text-[#79616f] font-bold">Dual-directory validation</td>
                </tr>
                <tr className="hover:bg-[#F8F5F7]">
                  <td className="p-3 font-bold">Message Format</td>
                  <td className="p-3">ASN.1 / DER PKCS#7 (application/pkcs7-mime)</td>
                  <td className="p-3">RFC 4880 Binary or ASCII Armor (BEGIN PGP MESSAGE)</td>
                  <td className="p-3 text-[#79616f] font-bold">Decapsulates & re-encapsulates</td>
                </tr>
                <tr className="hover:bg-[#F8F5F7]">
                  <td className="p-3 font-bold">Key Discovery</td>
                  <td className="p-3">LDAP directories, Active Directory, in-band certs</td>
                  <td className="p-3">HKP Keyservers, WKD (Web Key Directory), manual</td>
                  <td className="p-3 text-[#79616f] font-bold">Unified Credential Store</td>
                </tr>
                <tr className="hover:bg-[#F8F5F7]">
                  <td className="p-3 font-bold">Signature Attestation</td>
                  <td className="p-3">X.509 certificate bound to sender CN and email</td>
                  <td className="p-3">User IDs self-signed and cross-signed by peers</td>
                  <td className="p-3 text-[#79616f] font-bold">Gateway signs transition record</td>
                </tr>
                <tr className="hover:bg-[#F8F5F7]">
                  <td className="p-3 font-bold">Corporate Adoption</td>
                  <td className="p-3">Standard in Enterprise, Outlook, Apple Mail</td>
                  <td className="p-3">Widely adopted by open-source, activists, journalists</td>
                  <td className="p-3 text-[#79616f] font-bold">Bridges enterprise to community</td>
                </tr>
              </tbody>
            </table>
          </div>
        </BrutalCard>
      </section>

      {/* EDUCATIONAL SECTION: ENCRYPTION VS DIGITAL SIGNATURES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BrutalCard
            title="Confidentiality: Encryption"
            subtitle="Keeping message content readable only by authorized recipients"
            variant="white"
          >
            <div className="space-y-3 font-mono text-xs text-[#252126] leading-relaxed">
              <div className="p-3 bg-[#F8F5F7] border border-[#D7CBD2] rounded">
                <span className="font-bold text-[#51404B] block mb-1">Key Principle:</span>
                Encryption guarantees <strong>Confidentiality</strong>. Plaintext is scrambled using a symmetric
                session key (AES-256), which is then encapsulated (wrapped) using the recipient's public key or certificate.
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-[#635B65]">
                <li>Only the holder of the recipient's private key can decrypt the message.</li>
                <li>Eavesdroppers and intermediaries see only opaque ciphertext.</li>
                <li>Encryption alone <em>does not prove who wrote the message</em>.</li>
              </ul>
            </div>
          </BrutalCard>

          <BrutalCard
            title="Integrity & Authenticity: Digital Signatures"
            subtitle="Proving who authored the message and that content was unaltered"
            variant="white"
          >
            <div className="space-y-3 font-mono text-xs text-[#252126] leading-relaxed">
              <div className="p-3 bg-[#F8F5F7] border border-[#D7CBD2] rounded">
                <span className="font-bold text-[#51404B] block mb-1">Key Principle:</span>
                Digital signatures guarantee <strong>Integrity</strong> and <strong>Non-Repudiation</strong>. The sender computes
                a cryptographic hash (SHA-256) of the plaintext and encrypts the digest with their own private key.
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-[#635B65]">
                <li>Anyone with the sender's public key or certificate can verify the signature.</li>
                <li>Any single bit alteration in transit causes the hash to mismatch and verification to fail.</li>
                <li>Signing alone <em>does not hide message content from eavesdroppers</em>.</li>
              </ul>
            </div>
          </BrutalCard>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <div className="bg-[#51404B] text-white p-8 sm:p-12 border-4 border-[#252126] rounded-sm shadow-brutal-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight">
              Ready to test cryptographic mail routing?
            </h3>
            <p className="font-mono text-xs sm:text-sm text-[#E9DFE5] max-w-xl">
              Compose a signed and encrypted email, inspect live X.509 certificates, or simulate cross-protocol translation scenarios.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/composer"
              className="px-6 py-3 bg-[#79616f] hover:bg-[#917987] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-white shadow-brutal-sm transition"
            >
              Open Email Composer
            </Link>
            <Link
              to="/interop-lab"
              className="px-6 py-3 bg-white text-[#51404B] hover:bg-[#F8F5F7] font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#51404B] shadow-brutal-sm transition"
            >
              Open Interop Lab
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
