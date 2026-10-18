import React, { useState } from 'react';
import {
  FileCode,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Key,
  FileCheck,
  RefreshCw,
  Copy,
  ArrowRight
} from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { CertificateInfo } from '../types';
import { BrutalCard } from '../components/BrutalCard';
import { StatusBadge } from '../components/StatusBadge';
import { CodeBlock } from '../components/CodeBlock';
import credsData from '../../generated_creds.json';

export const SmimeModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inspector' | 'sign-verify' | 'encrypt-decrypt'>('inspector');

  // Certificate Inspector State
  const [certInput, setCertInput] = useState(credsData.aliceSmime.certPem);
  const [certInfo, setCertInfo] = useState<CertificateInfo | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Sign & Verify State
  const [signContent, setSignContent] = useState('Confidential message requiring S/MIME X.509 digital signature.');
  const [signedPem, setSignedPem] = useState('');
  const [signLoading, setSignLoading] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [verifyContent, setVerifyContent] = useState('');
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Encrypt & Decrypt State
  const [encryptPlaintext, setEncryptPlaintext] = useState('Top secret payload encrypted using recipient S/MIME certificate.');
  const [encryptedPem, setEncryptedPem] = useState('');
  const [encryptLoading, setEncryptLoading] = useState(false);
  const [encryptError, setEncryptError] = useState<string | null>(null);
  const [decryptedText, setDecryptedText] = useState('');
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // Handler: Inspect Certificate
  const handleInspectCertificate = async () => {
    setInspectLoading(true);
    setInspectError(null);
    setCertInfo(null);
    try {
      const res = await apiClient.inspectSmimeCertificate(certInput);
      setCertInfo(res.certificate);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setInspectError(`[${err.code}]: ${err.message}`);
      } else {
        setInspectError(err instanceof Error ? err.message : 'Failed to inspect certificate.');
      }
    } finally {
      setInspectLoading(false);
    }
  };

  // Handler: Sign Message
  const handleSignMessage = async () => {
    setSignLoading(true);
    setSignError(null);
    try {
      const res = await apiClient.signSmime(
        signContent,
        credsData.aliceSmime.certPem,
        credsData.aliceSmime.keyPem
      );
      setSignedPem(res.signedPem);
      setVerifyContent(signContent);
    } catch (err: unknown) {
      setSignError(err instanceof Error ? err.message : String(err));
    } finally {
      setSignLoading(false);
    }
  };

  // Handler: Verify Signature
  const handleVerifySignature = async (tampered = false) => {
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const contentToVerify = tampered ? `${verifyContent} [ALTERED CONTENT]` : verifyContent;
      const res = await apiClient.verifySmimeSignature(signedPem, contentToVerify);
      setVerifyResult(res);
    } catch (err: unknown) {
      setVerifyResult({ valid: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setVerifyLoading(false);
    }
  };

  // Handler: Encrypt
  const handleEncryptMessage = async () => {
    setEncryptLoading(true);
    setEncryptError(null);
    try {
      const res = await apiClient.encryptSmime(encryptPlaintext, credsData.bobSmime.certPem);
      setEncryptedPem(res.encryptedPem);
    } catch (err: unknown) {
      setEncryptError(err instanceof Error ? err.message : String(err));
    } finally {
      setEncryptLoading(false);
    }
  };

  // Handler: Decrypt
  const handleDecryptMessage = async () => {
    setDecryptLoading(true);
    setDecryptError(null);
    setDecryptedText('');
    try {
      const res = await apiClient.decryptSmime(encryptedPem, credsData.bobSmime.keyPem);
      setDecryptedText(res.plaintext);
    } catch (err: unknown) {
      setDecryptError(err instanceof Error ? err.message : String(err));
    } finally {
      setDecryptLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="border-b-4 border-[#51404B] pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#79616f]">
            X.509 PKI // RFC 5751 S/MIME 4.0
          </span>
          <h1 className="font-sans font-black text-3xl sm:text-4xl uppercase tracking-tight text-[#252126]">
            S/MIME Cryptographic Module
          </h1>
          <p className="font-mono text-xs text-[#635B65] mt-1">
            Certificate inspection, PKCS#7 digital signatures, and CMS EnvelopedData encryption.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('inspector')}
            className={`px-4 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 transition ${
              activeTab === 'inspector'
                ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                : 'bg-white text-[#51404B] border-[#51404B] hover:bg-gray-100'
            }`}
          >
            A. Certificate Inspector
          </button>
          <button
            onClick={() => setActiveTab('sign-verify')}
            className={`px-4 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 transition ${
              activeTab === 'sign-verify'
                ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                : 'bg-white text-[#51404B] border-[#51404B] hover:bg-gray-100'
            }`}
          >
            B. Sign & Verify
          </button>
          <button
            onClick={() => setActiveTab('encrypt-decrypt')}
            className={`px-4 py-2 font-mono text-xs font-bold uppercase rounded-sm border-2 transition ${
              activeTab === 'encrypt-decrypt'
                ? 'bg-[#79616f] text-white border-[#51404B] shadow-brutal-sm'
                : 'bg-white text-[#51404B] border-[#51404B] hover:bg-gray-100'
            }`}
          >
            C. Encrypt & Decrypt
          </button>
        </div>
      </div>

      {/* SECTION A: CERTIFICATE INSPECTOR */}
      {activeTab === 'inspector' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <BrutalCard title="X.509 Certificate Input" subtitle="Paste PEM certificate or choose a demonstration identity">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCertInput(credsData.aliceSmime.certPem)}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#E9DFE5] hover:bg-[#d8c7d3] text-[#51404B] border border-[#51404B] rounded"
                >
                  Load Alice (Active Cert)
                </button>
                <button
                  type="button"
                  onClick={() => setCertInput(credsData.gatewaySmime.certPem)}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#E9DFE5] hover:bg-[#d8c7d3] text-[#51404B] border border-[#51404B] rounded"
                >
                  Load Gateway Authority
                </button>
                <button
                  type="button"
                  onClick={() => setCertInput(credsData.expiredSmime.certPem)}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-800 rounded"
                >
                  Load Carol (Expired Cert)
                </button>
              </div>

              <textarea
                rows={12}
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                placeholder="-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----"
                className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#79616f]"
              />

              <button
                type="button"
                onClick={handleInspectCertificate}
                disabled={inspectLoading}
                className="w-full py-3 bg-[#79616f] hover:bg-[#917987] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#51404B] shadow-brutal flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className={`w-4 h-4 ${inspectLoading ? 'animate-spin' : ''}`} />
                {inspectLoading ? 'Parsing X.509...' : 'Parse & Inspect Certificate'}
              </button>
            </div>
          </BrutalCard>

          {/* Inspection Result */}
          <div className="space-y-4">
            {inspectError && (
              <div className="p-4 bg-red-50 border-2 border-red-800 text-red-900 font-mono text-xs rounded-sm shadow-brutal-sm space-y-1">
                <div className="font-bold flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Certificate Inspection Failure</span>
                </div>
                <p>{inspectError}</p>
              </div>
            )}

            {certInfo ? (
              <BrutalCard
                title="Certificate Details"
                subtitle={`Serial: 0x${certInfo.serialNumber}`}
                badge={<StatusBadge status={certInfo.trustStatus} size="md" />}
              >
                <div className="space-y-4 font-mono text-xs">
                  {/* Validation message */}
                  <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded text-[11px]">
                    <strong>Validity Status:</strong> {certInfo.validationMessage}
                  </div>

                  {/* Subject & Issuer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-[#D7CBD2] rounded">
                      <span className="font-bold text-[#51404B] block mb-1">Subject (Owner):</span>
                      <div>CN: {certInfo.subject.commonName || '—'}</div>
                      <div>Org: {certInfo.subject.organization || '—'}</div>
                      <div>Email: {certInfo.subject.emailAddress || '—'}</div>
                      <div>Country: {certInfo.subject.country || '—'}</div>
                    </div>

                    <div className="p-3 bg-white border border-[#D7CBD2] rounded">
                      <span className="font-bold text-[#51404B] block mb-1">Issuer (Authority):</span>
                      <div>CN: {certInfo.issuer.commonName || '—'}</div>
                      <div>Org: {certInfo.issuer.organization || '—'}</div>
                      <div>Country: {certInfo.issuer.country || '—'}</div>
                    </div>
                  </div>

                  {/* Dates & Algorithm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-[#D7CBD2] rounded">
                      <span className="font-bold text-[#51404B] block mb-1">Validity Window:</span>
                      <div>From: {certInfo.validFrom.slice(0, 10)}</div>
                      <div>To: {certInfo.validTo.slice(0, 10)}</div>
                      <div className="mt-1 font-bold">
                        {certInfo.isExpired ? (
                          <span className="text-red-700">STATUS: EXPIRED</span>
                        ) : (
                          <span className="text-emerald-700">STATUS: ACTIVE</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-[#D7CBD2] rounded">
                      <span className="font-bold text-[#51404B] block mb-1">Public Key Info:</span>
                      <div>Algorithm: {certInfo.publicKeyAlgorithm}</div>
                      <div>Key Size: {certInfo.keySize ? `${certInfo.keySize} bits` : 'Standard RSA'}</div>
                    </div>
                  </div>

                  {/* Fingerprints */}
                  <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded">
                    <span className="font-bold text-[#51404B] block mb-1">SHA-256 Fingerprint:</span>
                    <span className="break-all font-mono text-[11px] select-all font-bold">
                      {certInfo.fingerprintSha256}
                    </span>
                  </div>

                  {/* Extensions */}
                  <div className="p-3 bg-white border border-[#D7CBD2] rounded space-y-1.5">
                    <span className="font-bold text-[#51404B] block">X.509 v3 Extensions:</span>
                    <div>Key Usages: {certInfo.extensions.keyUsage?.join(', ') || 'Standard Digital Signature'}</div>
                    <div>Extended Usages: {certInfo.extensions.extKeyUsage?.join(', ') || 'Email Protection (S/MIME)'}</div>
                    {certInfo.extensions.subjectAltName && (
                      <div>SAN Alt Names: {certInfo.extensions.subjectAltName.join(', ')}</div>
                    )}
                  </div>
                </div>
              </BrutalCard>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-[#D7CBD2] rounded-sm font-mono text-xs text-[#635B65]">
                Click "Parse & Inspect Certificate" to extract and validate X.509 structure.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION B: SIGN & VERIFY */}
      {activeTab === 'sign-verify' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Signer */}
          <BrutalCard title="Digital Signature Creation" subtitle="Signs content with Alice's private key and attaches certificate">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                  Message Content to Sign
                </label>
                <textarea
                  rows={4}
                  value={signContent}
                  onChange={(e) => setSignContent(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded text-[11px] font-mono text-[#635B65]">
                Signer Identity: <strong>Alice Smith</strong> &lt;alice@gateway.internal&gt; (RSA 1024 / SHA-256)
              </div>

              <button
                type="button"
                onClick={handleSignMessage}
                disabled={signLoading}
                className="w-full py-3 bg-[#79616f] hover:bg-[#917987] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#51404B] shadow-brutal flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${signLoading ? 'animate-spin' : ''}`} />
                {signLoading ? 'Signing...' : 'Create S/MIME PKCS#7 Signature'}
              </button>

              {signedPem && (
                <div>
                  <span className="font-mono text-xs font-bold uppercase text-[#51404B] block mb-1">
                    Generated PKCS#7 Signed Message
                  </span>
                  <CodeBlock code={signedPem} language="application/pkcs7-mime" maxHeight="max-h-48" />
                </div>
              )}
            </div>
          </BrutalCard>

          {/* Verifier */}
          <BrutalCard title="Signature Verification" subtitle="Validates signed data against sender certificate and message digest">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                  Expected Message Content
                </label>
                <textarea
                  rows={4}
                  value={verifyContent}
                  onChange={(e) => setVerifyContent(e.target.value)}
                  placeholder="Expected original message text..."
                  className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!signedPem || verifyLoading}
                  onClick={() => handleVerifySignature(false)}
                  className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-emerald-950 shadow-brutal-sm disabled:opacity-50"
                >
                  Verify Authentic Signature
                </button>
                <button
                  type="button"
                  disabled={!signedPem || verifyLoading}
                  onClick={() => handleVerifySignature(true)}
                  className="flex-1 py-2.5 bg-red-800 hover:bg-red-900 text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-red-950 shadow-brutal-sm disabled:opacity-50"
                  title="Simulates an attacker modifying 1 byte of the message in transit"
                >
                  Tamper Test (Should Fail)
                </button>
              </div>

              {verifyResult && (
                <div
                  className={`p-4 border-2 rounded-sm font-mono text-xs space-y-2 ${
                    verifyResult.valid
                      ? 'bg-emerald-50 border-emerald-800 text-emerald-950'
                      : 'bg-red-50 border-red-800 text-red-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {verifyResult.valid ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        <span>VALID S/MIME SIGNATURE</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-red-700" />
                        <span>SIGNATURE VERIFICATION FAILED</span>
                      </>
                    )}
                  </div>
                  {verifyResult.valid ? (
                    <div>
                      <div>Signer: <strong>{verifyResult.signerCommonName}</strong> ({verifyResult.signerEmail})</div>
                      <div>Verified at: {new Date(verifyResult.signingTime).toLocaleTimeString()}</div>
                      <div className="mt-2 text-[11px] text-emerald-800 font-bold">
                        ✓ Cryptographic integrity confirmed. Content exactly matches the signature digest.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold">Error: {verifyResult.error}</div>
                      <div className="mt-2 text-[11px] text-red-800">
                        The gateway rejected this payload because message digest does not match the signed hash.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </BrutalCard>
        </div>
      )}

      {/* SECTION C: ENCRYPT & DECRYPT */}
      {activeTab === 'encrypt-decrypt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Encrypt */}
          <BrutalCard title="S/MIME Message Encryption" subtitle="Wraps plaintext in PKCS#7 EnvelopedData for Bob's certificate">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#51404B] mb-1">
                  Plaintext to Encrypt
                </label>
                <textarea
                  rows={4}
                  value={encryptPlaintext}
                  onChange={(e) => setEncryptPlaintext(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#51404B] rounded-sm font-mono text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded text-[11px] font-mono text-[#635B65]">
                Recipient: <strong>Bob Jones</strong> &lt;bob@gateway.internal&gt; (AES-256-CBC EnvelopedData)
              </div>

              <button
                type="button"
                onClick={handleEncryptMessage}
                disabled={encryptLoading}
                className="w-full py-3 bg-[#79616f] hover:bg-[#917987] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#51404B] shadow-brutal flex items-center justify-center gap-2"
              >
                <Lock className={`w-4 h-4 ${encryptLoading ? 'animate-pulse' : ''}`} />
                {encryptLoading ? 'Encrypting...' : 'Encrypt into S/MIME PKCS#7'}
              </button>

              {encryptedPem && (
                <div>
                  <span className="font-mono text-xs font-bold uppercase text-[#51404B] block mb-1">
                    Ciphertext Envelope (PKCS#7 EnvelopedData)
                  </span>
                  <CodeBlock code={encryptedPem} language="application/pkcs7-mime" maxHeight="max-h-48" />
                </div>
              )}
            </div>
          </BrutalCard>

          {/* Decrypt */}
          <BrutalCard title="Authorized S/MIME Decryption" subtitle="Unwraps AES session key using Bob's matching RSA private key">
            <div className="space-y-4">
              <div className="p-3 bg-[#F8F5F7] border border-[#51404B] rounded text-[11px] font-mono text-[#635B65]">
                Authorized Keyholder: <strong>Bob Jones</strong> (Decrypts ciphertext generated in left panel)
              </div>

              <button
                type="button"
                onClick={handleDecryptMessage}
                disabled={!encryptedPem || decryptLoading}
                className="w-full py-3 bg-[#51404B] hover:bg-[#3f313a] text-white font-mono font-bold uppercase text-xs rounded-sm border-2 border-[#252126] shadow-brutal flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Key className={`w-4 h-4 ${decryptLoading ? 'animate-pulse' : ''}`} />
                {decryptLoading ? 'Decrypting with Private Key...' : 'Decrypt with Bob’s Private Key'}
              </button>

              {decryptError && (
                <div className="p-3 bg-red-50 border-2 border-red-800 text-red-900 font-mono text-xs rounded-sm">
                  {decryptError}
                </div>
              )}

              {decryptedText && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-800 text-emerald-950 font-mono text-xs rounded-sm space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>DECRYPTION SUCCESSFUL</span>
                  </div>
                  <div className="p-3 bg-white border border-emerald-300 rounded font-bold text-gray-900">
                    {decryptedText}
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    ✓ Original plaintext recovered cleanly. Session AES key successfully unwrapped.
                  </div>
                </div>
              )}
            </div>
          </BrutalCard>
        </div>
      )}
    </div>
  );
};
