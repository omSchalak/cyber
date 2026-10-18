import React from 'react';
import {
  FileText,
  Shield,
  Key,
  Layers,
  Lock,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Award,
  Terminal
} from 'lucide-react';
import { BrutalCard } from '../components/BrutalCard';
import { CodeBlock } from '../components/CodeBlock';
import { VisualGatewayFlow } from '../components/VisualGatewayFlow';

export const Documentation: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
      {/* Header */}
      <div className="border-b-4 border-[#51404B] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#51404B] text-white rounded-sm text-xs font-mono font-bold uppercase mb-2">
          <BookOpen className="w-4 h-4 text-[#E9DFE5]" />
          <span>ACADEMIC CYBERSECURITY REFERENCE MANUAL</span>
        </div>
        <h1 className="font-sans font-black text-3xl sm:text-5xl uppercase tracking-tight text-[#252126]">
          Protocol Architecture & Security Specifications
        </h1>
        <p className="font-mono text-sm text-[#635B65] mt-2">
          Comprehensive technical guide for the Secure Electronic Mail Gateway with S/MIME and OpenPGP Interoperability.
        </p>
      </div>

      {/* ARCHITECTURE DIAGRAM */}
      <BrutalCard title="System Architecture & Message Flow" subtitle="Pipeline execution topology">
        <VisualGatewayFlow isCrossProtocol={true} />
        <div className="p-4 bg-[#F8F5F7] border border-[#51404B] rounded text-xs font-mono text-[#635B65] mt-4 leading-relaxed">
          <strong>Flow Explanation:</strong> Inbound messages originate at the Email Client, interface with the Vercel Serverless Gateway API, undergo protocol detection and credential lookup, pass through digital signature verification, decrypt at the authorized gateway boundary, re-encrypt using the recipient's target primitive (X.509 or OpenPGP), and output a verifiable MIME envelope.
        </div>
      </BrutalCard>

      {/* SECTION 1: S/MIME & X.509 */}
      <BrutalCard
        title="1. S/MIME (RFC 5751 / 8551) & X.509 PKI"
        subtitle="Cryptographic Message Syntax (CMS / PKCS#7)"
        variant="white"
      >
        <div className="space-y-4 font-mono text-xs text-[#252126] leading-relaxed">
          <p>
            <strong>Secure/Multipurpose Internet Mail Extensions (S/MIME)</strong> builds upon the Cryptographic Message Syntax (CMS, RFC 5652) and PKCS#7 standard. It provides authentication, message integrity, non-repudiation, and privacy via data encryption.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 bg-[#F8F5F7] border border-[#D7CBD2] rounded">
              <span className="font-bold text-[#51404B] block mb-1">PKCS#7 EnvelopedData:</span>
              Symmetric bulk message encryption (AES-256-CBC). The sender generates a random session key, encrypts the message, and encapsulates the session key in a <code className="bg-white px-1 py-0.5 rounded border border-gray-300">RecipientInfo</code> structure encrypted with the recipient’s RSA public key.
            </div>
            <div className="p-3 bg-[#F8F5F7] border border-[#D7CBD2] rounded">
              <span className="font-bold text-[#51404B] block mb-1">PKCS#7 SignedData:</span>
              Cryptographic integrity. The sender computes a SHA-256 hash of the content, signs it with their private RSA key, and bundles the signature, certificate chain, and signing time into a signed MIME envelope (<code className="bg-white px-1 py-0.5 rounded border border-gray-300">application/pkcs7-mime</code>).
            </div>
          </div>
          <div className="p-3 bg-[#E9DFE5] border border-[#51404B] rounded text-[11px] text-[#51404B]">
            <strong>Trust Model:</strong> Hierarchical Public Key Infrastructure (PKI). Trust anchors are root Certificate Authorities (CAs) embedded in operating systems and mail clients. Certificates bind an email address to a public key via digital signatures and X.509 extensions (SubjectAltName, KeyUsage).
          </div>
        </div>
      </BrutalCard>

      {/* SECTION 2: OPENPGP */}
      <BrutalCard
        title="2. OpenPGP (RFC 4880 / 9580)"
        subtitle="Decentralized Public-Key Cryptography & Web of Trust"
        variant="white"
      >
        <div className="space-y-4 font-mono text-xs text-[#252126] leading-relaxed">
          <p>
            <strong>OpenPGP</strong> is a non-proprietary protocol for encrypting and signing email and files using public-key cryptography. It relies on packet-based data structures and ASCII armor encoding.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 bg-[#F8F5F7] border border-[#D7CBD2] rounded">
              <span className="font-bold text-[#51404B] block mb-1">Packet Architecture:</span>
              An OpenPGP message consists of Public-Key Encrypted Session Key (PKESK, Tag 1) packets followed by Symmetrically Encrypted and Integrity Protected Data (SEIPD, Tag 18) packets.
            </div>
            <div className="p-3 bg-[#F8F5F7] border border-[#D7CBD2] rounded">
              <span className="font-bold text-[#51404B] block mb-1">Signatures & Armor:</span>
              Cleartext signed messages wrap plain text with <code className="bg-white px-1 py-0.5 rounded border border-gray-300">-----BEGIN PGP SIGNED MESSAGE-----</code>, computing a hash over normalized canonical text and appending a Radix-64 ASCII armor signature block.
            </div>
          </div>
          <div className="p-3 bg-[#E9DFE5] border border-[#51404B] rounded text-[11px] text-[#51404B]">
            <strong>Trust Model:</strong> Web of Trust (WoT). Rather than relying on central CAs, individual users sign each other’s public keys. Authenticity is validated using 160-bit SHA-1 or 256-bit SHA-256 fingerprints communicated out-of-band.
          </div>
        </div>
      </BrutalCard>

      {/* SECTION 3: GATEWAY INTEROPERABILITY */}
      <BrutalCard
        title="3. Gateway Cross-Protocol Interoperability"
        subtitle="Controlled Translation & Trusted Boundary Architecture"
        variant="mauve"
      >
        <div className="space-y-4 font-mono text-xs text-[#252126] leading-relaxed">
          <p>
            Because S/MIME and OpenPGP are fundamentally incompatible at the binary and MIME container level, cross-protocol delivery requires an active intermediary. The gateway fulfills this role through a strictly controlled 7-step process:
          </p>

          <ol className="list-decimal list-inside space-y-2 bg-white p-4 border-2 border-[#51404B] rounded-sm">
            <li><strong>Inbound Validation:</strong> Validate RFC 5322 headers and MIME encapsulation.</li>
            <li><strong>Sender Verification:</strong> Cryptographically verify the sender’s digital signature against their origin protocol (X.509 cert chain or OpenPGP key).</li>
            <li><strong>Boundary Decryption:</strong> Decrypt the inbound ciphertext using the gateway’s authorized private key.</li>
            <li><strong>Plaintext Inspection:</strong> Perform non-intrusive compliance checks at the trusted boundary.</li>
            <li><strong>Target Re-Encryption:</strong> Encrypt the payload using the recipient’s target protocol public credential (e.g. OpenPGP ASCII Armor or S/MIME EnvelopedData).</li>
            <li><strong>Gateway Attestation:</strong> Generate a secondary gateway signature verifying that the translation occurred faithfully and sender identity was validated.</li>
            <li><strong>Audit Event Logging:</strong> Record a non-sensitive audit event with diagnostic hashes and execution outcomes.</li>
          </ol>

          <div className="p-3 bg-amber-50 border-2 border-amber-800 text-amber-950 rounded text-[11px] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <span>
              <strong>Crucial Security Implication:</strong> The gateway constitutes a <em>trusted plaintext processing boundary</em>. During the instant of protocol transition, message content is unencrypted in gateway memory. Operators must safeguard the gateway host against compromise.
            </span>
          </div>
        </div>
      </BrutalCard>

      {/* SECTION 4: THREAT MODELS & LIMITATIONS */}
      <BrutalCard
        title="4. Threat Model & Security Boundaries"
        subtitle="Defensive boundaries and documented limitations"
        variant="white"
      >
        <div className="space-y-3 font-mono text-xs text-[#252126] leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-[#F8F5F7] border border-[#D7CBD2] rounded">
              <span className="font-bold text-emerald-800 block mb-1">Mitigated Threats:</span>
              <ul className="list-disc list-inside space-y-1 text-[#635B65]">
                <li>Eavesdropping in transit (mitigated via AES-256 session wrapping)</li>
                <li>Message tampering / forgery (mitigated via SHA-256 signatures)</li>
                <li>Sender identity spoofing (mitigated via X.509 CA & PGP fingerprint validation)</li>
                <li>Downgrade attacks (gateway fails closed if recipient key is missing)</li>
              </ul>
            </div>

            <div className="p-3 bg-[#F8F5F7] border border-[#D7CBD2] rounded">
              <span className="font-bold text-amber-800 block mb-1">Architectural Limitations:</span>
              <ul className="list-disc list-inside space-y-1 text-[#635B65]">
                <li>Metadata leakage: Email subject, sender, and recipient are visible in outer RFC 5322 headers (standard limitation of email protocols).</li>
                <li>Intermediate boundary exposure: Cross-protocol messages depend on gateway integrity.</li>
                <li>No external SMTP transport configured in this academic demonstration.</li>
              </ul>
            </div>
          </div>
        </div>
      </BrutalCard>

      {/* SECTION 5: IMPLEMENTED VS FUTURE WORK */}
      <BrutalCard
        title="5. Implementation Status vs Future Work"
        subtitle="Transparent academic evaluation breakdown"
        variant="white"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          <div>
            <span className="font-bold uppercase text-emerald-800 block mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Fully Implemented & Verified
            </span>
            <ul className="space-y-1.5 list-disc list-inside text-[#252126]">
              <li>Pure-Node X.509 certificate parsing and validation (RSA, SAN, KeyUsage)</li>
              <li>S/MIME PKCS#7 signed message creation and verification</li>
              <li>S/MIME PKCS#7 EnvelopedData AES-256 encryption & decryption</li>
              <li>OpenPGP key generation (2048-bit RSA/Ed25519)</li>
              <li>OpenPGP ASCII armor encryption & private key decryption</li>
              <li>OpenPGP cleartext and detached digital signature verification</li>
              <li>Cross-protocol translation (S/MIME ↔ OpenPGP)</li>
              <li>Centralized API client with structured error boundaries</li>
              <li>Automated Vitest test suite with 100% route coverage</li>
            </ul>
          </div>

          <div>
            <span className="font-bold uppercase text-[#79616f] block mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#79616f]" />
              Future Roadmap Extensions
            </span>
            <ul className="space-y-1.5 list-disc list-inside text-[#635B65]">
              <li>Hardware Security Module (HSM) PKCS#11 key storage integration</li>
              <li>Automated Online Certificate Status Protocol (OCSP) stapling</li>
              <li>Web Key Directory (WKD) direct DNS discovery over HTTPS</li>
              <li>Post-Quantum Cryptography (ML-KEM / ML-DSA) draft integration</li>
              <li>Direct inbound MTA hook via Milter or Postfix pipe</li>
            </ul>
          </div>
        </div>
      </BrutalCard>
    </div>
  );
};
